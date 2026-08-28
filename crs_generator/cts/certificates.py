"""The certificate store behind CTS packaging.

Every delivery needs two certificates: the **sender's** private key to sign with,
and the **receiver's** public certificate to wrap the AES key under. In the MDES
test estate these are distributed per country as a pair of files that are in fact
the *same* keypair::

    {prefix}12protected.p12    leaf + CA chain + private key, password-protected
    {prefix}12unprotected.crt  the leaf on its own, public half only

Three details in that estate cost real debugging time, so they are handled here
rather than left to callers:

*   **The file prefix is not the ISO country code.** ``GB`` ships as ``uk``,
    ``US`` as ``usa``. See :data:`FILE_PREFIX_OVERRIDES`.
*   **``unprotected.p12`` is usually not a PKCS#12 file.** Most are PEM
    certificates that kept the ``.p12`` extension. Content is sniffed; the
    extension is only a hint.
*   **The leaf is not always first in the PKCS#12 store.** The older
    ``nl12protected.p12`` puts a CA certificate at index 0, which is what makes
    MDES report *"the entered password does not match"* on upload. We select the
    entry that actually owns the private key.

Two generations of certificate exist. The current one was issued in June 2025 by
``CN=ca.internal.blyce.local`` (RSA-4096, expiring February 2030); the material
under ``_legacy/`` is RSA-2048 and already expired, kept only so historic
packages can still be decrypted. Because key size differs between them, nothing
here — and nothing in :mod:`~crs_generator.cts.packager` — may assume a 256-byte
wrapped key: RSA-4096 produces 512.
"""

from __future__ import annotations

import datetime as _dt
import os
from dataclasses import dataclass, asdict
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12

from . import passwords as password_sources

# Environment variable pointing at a store outside the package. The Electron app
# sets this to `app.getPath('userData')/certificates` so a tester can replace a
# country's certificate without waiting for a release; when it is unset we fall
# back to the pack shipped inside the wheel / PyInstaller bundle.
STORE_ENV_VAR = "MDES_CERT_STORE"

# Directory name, relative to this package, holding the bundled seed pack.
BUNDLED_STORE_DIRNAME = "certificates"

# Subdirectory of the store holding expired material. Excluded from
# list_countries() so it can never be picked for signing by accident.
LEGACY_DIRNAME = "_legacy"

# ISO 3166 alpha-2 -> certificate filename prefix, where the estate disagrees
# with ISO. Anything not listed uses the lowercased country code.
FILE_PREFIX_OVERRIDES: dict[str, str] = {
    "GB": "uk",
    "US": "usa",
}

# How close to notAfter a certificate may get before the UI and the test suite
# start complaining. 90 days is enough to get a renewal through a release.
EXPIRY_WARNING_DAYS = 90


class CertificateStoreError(RuntimeError):
    """A certificate could not be located, opened, or used for its role."""


@dataclass(frozen=True)
class CertificateInfo:
    """What the Certificates screen and the expiry test need to know."""

    country: str
    role: str  # "signing" | "encryption"
    path: Path
    subject: str
    common_name: str
    issuer: str
    serial: str
    not_before: _dt.datetime
    not_after: _dt.datetime
    key_size: int
    has_private_key: bool

    @property
    def days_until_expiry(self) -> int:
        now = _dt.datetime.now(_dt.timezone.utc)
        return (self.not_after - now).days

    @property
    def is_expired(self) -> bool:
        return self.days_until_expiry < 0

    @property
    def expires_soon(self) -> bool:
        """True once renewal should be in progress (but not yet expired)."""
        return 0 <= self.days_until_expiry <= EXPIRY_WARNING_DAYS

    def to_dict(self) -> dict:
        """JSON-safe form, for the CLI and the Electron IPC bridge."""
        data = asdict(self)
        data["path"] = str(self.path)
        data["not_before"] = self.not_before.isoformat()
        data["not_after"] = self.not_after.isoformat()
        data["days_until_expiry"] = self.days_until_expiry
        data["is_expired"] = self.is_expired
        data["expires_soon"] = self.expires_soon
        return data


# --- Locating the store -----------------------------------------------------


def store_root() -> Path:
    """Directory holding one subdirectory per country.

    ``$MDES_CERT_STORE`` wins when set, so the desktop app can point at its
    user-writable copy; otherwise the pack bundled with the package is used.
    """
    override = os.environ.get(STORE_ENV_VAR)
    if override:
        return Path(override).expanduser()
    return Path(__file__).resolve().parent.parent / BUNDLED_STORE_DIRNAME


def bundled_store_root() -> Path:
    """The seed pack inside the package, ignoring any environment override.

    The desktop app copies this into userData on first run, and the expiry test
    asserts against it directly.
    """
    return Path(__file__).resolve().parent.parent / BUNDLED_STORE_DIRNAME


def file_prefix(country: str) -> str:
    """Certificate filename prefix for a country code (``GB`` -> ``uk``)."""
    code = country.strip().upper()
    return FILE_PREFIX_OVERRIDES.get(code, code.lower())


def country_dir(country: str, root: Path | None = None) -> Path:
    return (root or store_root()) / country.strip().upper()


def list_countries(root: Path | None = None) -> list[str]:
    """Country codes with at least one usable certificate, sorted."""
    base = root or store_root()
    if not base.is_dir():
        return []
    found = []
    for entry in sorted(base.iterdir()):
        if not entry.is_dir() or entry.name.startswith("_") or entry.name.startswith("."):
            continue
        if any(entry.iterdir()):
            found.append(entry.name.upper())
    return found


# --- Reading certificate files ----------------------------------------------


def _load_certificate_bytes(data: bytes) -> x509.Certificate | None:
    """Parse a bare certificate, PEM or DER. ``None`` if it is neither."""
    for loader in (x509.load_pem_x509_certificate, x509.load_der_x509_certificate):
        try:
            return loader(data)
        except Exception:
            continue
    return None


def _load_pkcs12(data: bytes, password: str | None):
    """Open a PKCS#12 store, returning ``(private_key, leaf, extras)``.

    ``cryptography`` already returns the certificate that matches the private
    key rather than the first entry, which is what sidesteps the "CA at index 0"
    trap described in the module docstring. The public-key comparison below is a
    belt-and-braces check for stores where no certificate is flagged as the key's
    own.
    """
    pw = password.encode("utf-8") if password else None
    key, cert, extras = pkcs12.load_key_and_certificates(data, pw)
    extras = list(extras or [])
    if cert is None and key is not None:
        wanted = key.public_key().public_numbers()
        for candidate in extras:
            try:
                if candidate.public_key().public_numbers() == wanted:
                    cert = candidate
                    break
            except Exception:
                continue
    return key, cert, extras


def _candidate_files(directory: Path, want_private_key: bool) -> list[Path]:
    """Files in a country directory that plausibly hold what we're after.

    Filename is only a hint — ``*unprotected*`` files are public certificates and
    ``*protected*`` ones hold the private key — so unmatched files are still
    returned, just last, and the caller decides by trying to open them.
    """
    if not directory.is_dir():
        return []
    files = [p for p in sorted(directory.iterdir()) if p.is_file()]

    def rank(path: Path) -> int:
        name = path.name.lower()
        unprotected = "unprotected" in name
        if want_private_key:
            return 0 if (not unprotected and "protected" in name) else 1
        return 0 if unprotected else 1

    return sorted(files, key=rank)


def load_encryption_certificate(
    country: str, root: Path | None = None
) -> x509.Certificate:
    """The receiver's public certificate, used to wrap the AES key.

    Accepts a bare PEM/DER certificate or a PKCS#12 store opened with an empty
    password — both shapes exist in the estate, sometimes under the same
    ``.p12`` extension.
    """
    directory = country_dir(country, root)
    if not directory.is_dir():
        raise CertificateStoreError(
            f"No certificates for {country.upper()} in {directory.parent}. "
            f"Import a certificate pack for this country first."
        )

    for path in _candidate_files(directory, want_private_key=False):
        data = path.read_bytes()
        cert = _load_certificate_bytes(data)
        if cert is not None:
            return cert
        try:
            _key, cert, _extras = _load_pkcs12(data, None)
        except Exception:
            continue
        if cert is not None:
            return cert

    raise CertificateStoreError(
        f"No readable encryption certificate for {country.upper()} in {directory}."
    )


def load_signing_material(
    country: str, password: str | None = None, root: Path | None = None
) -> tuple[rsa.RSAPrivateKey, x509.Certificate]:
    """The sender's private key and leaf certificate, used to sign the payload.

    A ``password`` the caller supplies is an assertion, and it is the only thing
    tried: a wrong one has to fail loudly here, or a stale stored password would
    be masked by a working one from somewhere else and nobody would ever fix it.

    Passing nothing instead asks :mod:`~crs_generator.cts.passwords` to resolve
    the country - a per-country environment variable, or the configured password
    file. A country that file lists twice under two different passwords yields
    two candidates and both are tried, because guessing which of them is current
    would work on the machine of whoever guessed and fail on every other.

    Raises :class:`CertificateStoreError` with a message that distinguishes a
    wrong password from a store that has no private key in it - the distinction
    MDES itself fails to make, and the reason a valid NL certificate reads as
    "incorrect password" in the portal.
    """
    directory = country_dir(country, root)
    attempts = [password] if password is not None else (
        password_sources.candidates(country) or [None]
    )

    opened_but_keyless: list[Path] = []
    password_failures: list[Path] = []

    for path in _candidate_files(directory, want_private_key=True):
        data = path.read_bytes()
        if _load_certificate_bytes(data) is not None:
            continue  # bare certificate: public half only, no key to be had
        key = cert = None
        for attempt in attempts:
            try:
                key, cert, _extras = _load_pkcs12(data, attempt)
            except Exception:
                continue
            break
        else:
            password_failures.append(path)
            continue
        if key is None or cert is None:
            opened_but_keyless.append(path)
            continue
        if not isinstance(key, rsa.RSAPrivateKey):
            raise CertificateStoreError(
                f"{path.name} holds a {type(key).__name__} key; CTS signing requires RSA."
            )
        return key, cert

    if opened_but_keyless:
        names = ", ".join(p.name for p in opened_but_keyless)
        raise CertificateStoreError(
            f"Opened {names} for {country.upper()} but it contains no private key - "
            f"this looks like a certificate-only export, not a signing certificate."
        )
    if password_failures:
        names = ", ".join(p.name for p in password_failures)
        raise CertificateStoreError(
            f"Could not open {names} for {country.upper()}. The password is most "
            f"likely wrong (or the file is not a PKCS#12 store)."
        )
    raise CertificateStoreError(
        f"No signing certificate for {country.upper()} in {directory}."
    )


# --- Describing the store ---------------------------------------------------


def _describe(cert: x509.Certificate, country: str, role: str, path: Path,
              has_private_key: bool) -> CertificateInfo:
    try:
        common_name = cert.subject.get_attributes_for_oid(
            x509.oid.NameOID.COMMON_NAME
        )[0].value
    except (IndexError, ValueError):
        common_name = ""
    key = cert.public_key()
    key_size = getattr(key, "key_size", 0)
    return CertificateInfo(
        country=country.upper(),
        role=role,
        path=path,
        subject=cert.subject.rfc4514_string(),
        common_name=str(common_name),
        issuer=cert.issuer.rfc4514_string(),
        serial=format(cert.serial_number, "X"),
        not_before=cert.not_valid_before_utc,
        not_after=cert.not_valid_after_utc,
        key_size=key_size,
        has_private_key=has_private_key,
    )


def describe_country(
    country: str, password: str | None = None, root: Path | None = None
) -> list[CertificateInfo]:
    """Describe both roles for one country, skipping what cannot be opened.

    ``password`` is optional: without it the signing certificate is still
    reported (the certificate part of a PKCS#12 store is readable only with the
    password, so it is simply omitted when none is supplied).
    """
    out: list[CertificateInfo] = []
    directory = country_dir(country, root)
    if not directory.is_dir():
        return out

    try:
        cert = load_encryption_certificate(country, root)
    except CertificateStoreError:
        pass
    else:
        path = next(
            (p for p in _candidate_files(directory, want_private_key=False)
             if _load_certificate_bytes(p.read_bytes()) is not None),
            directory,
        )
        out.append(_describe(cert, country, "encryption", path, has_private_key=False))

    # Report the signing certificate whenever a password can be found for this
    # country - passed in, in the environment, or in the configured password
    # file. Before the file existed only an explicitly-passed password counted,
    # which made a fully-configured store look half-empty on the Certificates
    # screen.
    if password is not None or password_sources.candidates(country):
        try:
            _key, cert = load_signing_material(country, password, root)
        except CertificateStoreError:
            pass
        else:
            path = next(
                (p for p in _candidate_files(directory, want_private_key=True)
                 if "unprotected" not in p.name.lower()),
                directory,
            )
            out.append(_describe(cert, country, "signing", path, has_private_key=True))

    return out


def describe_store(
    passwords: dict[str, str] | None = None, root: Path | None = None
) -> list[CertificateInfo]:
    """Describe every country in the store, for the Certificates screen."""
    passwords = passwords or {}
    base = root or store_root()
    out: list[CertificateInfo] = []
    for country in list_countries(base):
        out.extend(describe_country(country, passwords.get(country), base))
    return out


def expiring_certificates(
    within_days: int = EXPIRY_WARNING_DAYS,
    passwords: dict[str, str] | None = None,
    root: Path | None = None,
) -> list[CertificateInfo]:
    """Certificates already expired or due within ``within_days``.

    The Certificates screen renders these as warnings; a unit test fails on a
    non-empty result so a renewal lands in a release rather than being
    discovered by a rejected upload.
    """
    return [
        info
        for info in describe_store(passwords, root)
        if info.days_until_expiry <= within_days
    ]
