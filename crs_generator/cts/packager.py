"""Assemble and open CTS / IDES delivery packages.

The layering is described in :mod:`crs_generator.cts`. This module is the part
that actually builds it, and its inverse — :func:`unpack` exists because it is
the only honest way to test :func:`pack`, and because MDES sends status messages
and notifications back in the same format.

Two invariants are worth restating where the code enforces them:

*   The wrapped key is **48 bytes of plaintext**: a 32-byte AES key followed by
    its 16-byte IV. MDES error 50013 lists every way of getting this wrong.
*   The payload is a **ZIP** before it is encrypted, not the bare signed XML.
    MDES error 50003 is what a bare XML payload earns.

The RSA ciphertext length follows the receiver's key — 256 bytes for the legacy
RSA-2048 certificates, 512 for the RSA-4096 generation issued in June 2025. Both
appear in the wild, so nothing here checks for a fixed size.
"""

from __future__ import annotations

import datetime as _dt
import io
import os
import zipfile
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Iterable

from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import padding as asym_padding, rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from . import metadata as metadata_mod
from . import naming
from .certificates import load_encryption_certificate, load_signing_material
from .signing import SignatureVerification, sign_document, verify_document

AES_KEY_BYTES = 32
AES_IV_BYTES = 16
AES_BLOCK_BYTES = 16

# The IRS entity id every FATCA report is addressed to. Captured deliveries all
# carry this regardless of the receiving country passed on the command line,
# because a FATCA report always goes to the US.
IDES_IRS_RECEIVER_ID = "000000.00000.TA.840"


class PackagingError(RuntimeError):
    """A package could not be built or opened."""


class Defect(str, Enum):
    """Deliberate faults, for exercising MDES's file-level error codes.

    Each maps to the error MDES should raise. Nothing in the normal path sets
    any of these; they exist so the negative-test phase has a seam to build on
    rather than a rewrite.
    """

    ECB_MODE = "ecb_mode"                      # 50013 - cipher mode other than CBC
    SHORT_KEY = "short_key"                    # 50013 - key without the IV appended
    UNCOMPRESSED_PAYLOAD = "uncompressed_payload"  # 50003 - payload not zipped
    TAMPER_SIGNATURE = "tamper_signature"      # 50004 - signature no longer verifies
    WRONG_RECEIVER = "wrong_receiver"          # 50012 - metadata names another country
    CORRUPT_KEY = "corrupt_key"                # 50002 - key file cannot be unwrapped


@dataclass
class PackageResult:
    """Everything the caller might want after building a package."""

    filename: str
    data: bytes
    entries: dict[str, str]
    metadata: bytes
    sender_file_id: str
    signed_xml: bytes
    aes_key: bytes
    aes_iv: bytes
    defects: tuple[Defect, ...] = ()

    def write(self, destination: str | os.PathLike[str]) -> Path:
        """Write the package. A directory target gets :attr:`filename` appended."""
        target = Path(destination)
        if target.is_dir():
            target = target / self.filename
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(self.data)
        return target


@dataclass
class UnpackResult:
    """What came out of a package."""

    entries: list[str]
    metadata: dict[str, str]
    raw_metadata: bytes
    signed_xml: bytes | None = None
    source_xml: bytes | None = None
    signature: SignatureVerification | None = None
    aes_key: bytes | None = None
    aes_iv: bytes | None = None
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    checks: list[dict[str, str]] = field(default_factory=list)
    identity: dict[str, str] = field(default_factory=dict)


# --- Symmetric layer --------------------------------------------------------


def _pkcs7_pad(data: bytes) -> bytes:
    pad = AES_BLOCK_BYTES - (len(data) % AES_BLOCK_BYTES)
    return data + bytes([pad]) * pad


def _pkcs7_unpad(data: bytes) -> bytes:
    if not data or len(data) % AES_BLOCK_BYTES:
        raise PackagingError("Decrypted payload is not a whole number of AES blocks.")
    pad = data[-1]
    if not 1 <= pad <= AES_BLOCK_BYTES or data[-pad:] != bytes([pad]) * pad:
        raise PackagingError(
            "Decrypted payload has invalid PKCS#7 padding - wrong key, or not "
            "AES-256-CBC."
        )
    return data[:-pad]


def _encrypt(payload: bytes, key: bytes, iv: bytes, use_ecb: bool) -> bytes:
    mode = modes.ECB() if use_ecb else modes.CBC(iv)
    encryptor = Cipher(algorithms.AES(key), mode).encryptor()
    return encryptor.update(_pkcs7_pad(payload)) + encryptor.finalize()


def _decrypt(payload: bytes, key: bytes, iv: bytes) -> bytes:
    decryptor = Cipher(algorithms.AES(key), modes.CBC(iv)).decryptor()
    return _pkcs7_unpad(decryptor.update(payload) + decryptor.finalize())


def _zip_payload(signed_xml: bytes, entry_name: str, when: _dt.datetime) -> bytes:
    """Deflate the signed document into a one-entry ZIP. Skipping this is 50003."""
    buffer = io.BytesIO()
    info = zipfile.ZipInfo(entry_name, date_time=when.timetuple()[:6])
    info.compress_type = zipfile.ZIP_DEFLATED
    # Regular file, rw-r--r--. zipfile leaves this at 0 for a bare ZipInfo, which
    # some readers render as a directory entry.
    info.external_attr = 0o644 << 16
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(info, signed_xml)
    return buffer.getvalue()


# --- Building ---------------------------------------------------------------


def pack(
    source_xml: bytes,
    *,
    sender: str,
    receiver: str,
    communication_type: str,
    tax_year: int | str,
    signing_key: rsa.RSAPrivateKey,
    signing_certificate: x509.Certificate,
    encryption_certificate: x509.Certificate,
    when: _dt.datetime | None = None,
    message_ref_id: str | None = None,
    filename_suffix: str | None = None,
    ides_sender_id: str | None = None,
    ides_receiver_id: str = IDES_IRS_RECEIVER_ID,
    defects: Iterable[Defect] = (),
) -> PackageResult:
    """Build a delivery package around ``source_xml``.

    ``sender`` and ``receiver`` are ISO country codes; for FATCA they still name
    the countries, while the entity ids that go in the metadata come from
    ``ides_sender_id`` / ``ides_receiver_id``.

    ``message_ref_id`` defaults to the one inside the document, which is what
    makes ``SenderFileId`` line up with the file MDES is about to validate.
    """
    defect_set = set(defects)
    when = when or _dt.datetime.now(_dt.timezone.utc)
    sender = sender.strip().upper()
    receiver = receiver.strip().upper()
    module = naming.base_module(communication_type)

    names = naming.entry_names(sender, receiver, communication_type)

    # 1. Sign.
    signed_xml = sign_document(source_xml, signing_key, signing_certificate)
    if Defect.TAMPER_SIGNATURE in defect_set:
        signed_xml = _tamper(signed_xml)

    # 2. Compress (unless we are deliberately provoking 50003).
    if Defect.UNCOMPRESSED_PAYLOAD in defect_set:
        payload_plaintext = signed_xml
    else:
        payload_plaintext = _zip_payload(signed_xml, names["inner_payload"], when)

    # 3. Encrypt.
    aes_key = os.urandom(AES_KEY_BYTES)
    aes_iv = os.urandom(AES_IV_BYTES)
    encrypted_payload = _encrypt(
        payload_plaintext, aes_key, aes_iv, use_ecb=Defect.ECB_MODE in defect_set
    )

    # 4. Wrap key || iv under the receiver's public key. 48 bytes, always.
    key_material = aes_key if Defect.SHORT_KEY in defect_set else aes_key + aes_iv
    wrapped_key = encryption_certificate.public_key().encrypt(
        key_material, asym_padding.PKCS1v15()
    )
    if Defect.CORRUPT_KEY in defect_set:
        wrapped_key = bytes([wrapped_key[0] ^ 0xFF]) + wrapped_key[1:]

    # 5. Metadata.
    if module == "FATCA":
        file_id = naming.ides_sender_file_id(sender, when)
        metadata_bytes = metadata_mod.build_ides_metadata(
            sender_id=ides_sender_id or sender,
            receiver_id=ides_receiver_id,
            sender_file_id=file_id,
            file_create_ts=when,
            tax_year=tax_year,
        )
    else:
        ref_id = message_ref_id or naming.extract_message_ref_id(source_xml)
        if not ref_id:
            raise PackagingError(
                "The source document has no MessageRefId, so SenderFileId cannot be "
                "built. Pass message_ref_id explicitly if this is intentional."
            )
        metadata_receiver = "ZZ" if Defect.WRONG_RECEIVER in defect_set else receiver
        file_id = naming.sender_file_id(
            sender, metadata_receiver, communication_type, ref_id
        )
        metadata_bytes = metadata_mod.build_cts_metadata(
            sender_country=sender,
            receiver_country=metadata_receiver,
            communication_type=communication_type,
            sender_file_id=file_id,
            file_create_ts=when,
            tax_year=tax_year,
        )

    # 6. Outer ZIP. Entry order is metadata, key, payload — as the reference tool
    #    writes it, and as every captured delivery has it.
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for entry, blob in (
            (names["metadata"], metadata_bytes),
            (names["key"], wrapped_key),
            (names["payload"], encrypted_payload),
        ):
            info = zipfile.ZipInfo(entry, date_time=when.timetuple()[:6])
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, blob)

    return PackageResult(
        filename=naming.outer_zip_name(
            sender, communication_type, when, filename_suffix
        ),
        data=buffer.getvalue(),
        entries=names,
        metadata=metadata_bytes,
        sender_file_id=file_id,
        signed_xml=signed_xml,
        aes_key=aes_key,
        aes_iv=aes_iv,
        defects=tuple(sorted(defect_set, key=lambda d: d.value)),
    )


def pack_from_store(
    source: str | os.PathLike[str] | bytes,
    *,
    sender: str,
    receiver: str,
    communication_type: str,
    tax_year: int | str,
    signing_password: str | None,
    store: Path | None = None,
    **kwargs,
) -> PackageResult:
    """:func:`pack`, with both certificates resolved from the certificate store."""
    if isinstance(source, bytes):
        source_xml = source
    else:
        source_xml = Path(source).read_bytes()

    signing_key, signing_certificate = load_signing_material(
        sender, signing_password, store
    )
    encryption_certificate = load_encryption_certificate(receiver, store)
    return pack(
        source_xml,
        sender=sender,
        receiver=receiver,
        communication_type=communication_type,
        tax_year=tax_year,
        signing_key=signing_key,
        signing_certificate=signing_certificate,
        encryption_certificate=encryption_certificate,
        **kwargs,
    )


def _tamper(signed_xml: bytes) -> bytes:
    """Break a signature without breaking well-formedness.

    Flips one character of the digest so the document still parses and still
    looks signed, which is what makes it a useful 50004 probe.
    """
    marker = b"<DigestValue>"
    start = signed_xml.find(marker)
    if start < 0:
        return signed_xml
    pos = start + len(marker)
    original = signed_xml[pos : pos + 1]
    replacement = b"A" if original != b"A" else b"B"
    return signed_xml[:pos] + replacement + signed_xml[pos + 1 :]


# --- Opening ----------------------------------------------------------------


def _find_entry(names: list[str], suffix: str) -> str | None:
    """Locate an entry the way MDES does: by suffix, not by exact name."""
    for name in names:
        if name.endswith(suffix):
            return name
    return None


def _inspection_check(
    check_id: str, outcome: str, detail: str,
) -> dict[str, str]:
    """Use one small serialisable shape for renderer and CLI inspection."""
    return {"id": check_id, "outcome": outcome, "detail": detail}


def _layout_checks(
    names: list[str], metadata: dict[str, str], identity: dict[str, str],
) -> list[dict[str, str]]:
    """Check the parts MDES finds by filename, including their order.

    A suffix-only lookup is useful for opening a foreign package, but it is too
    forgiving for an upload-readiness verdict: duplicate members, directories,
    extra members, or a key addressed to a different receiver must be visible.
    """
    checks: list[dict[str, str]] = []
    unique_names = len(names) == len(set(names))
    has_directories = any(name.endswith("/") or "/" in name or "\\" in name for name in names)
    if len(names) == 3 and unique_names and not has_directories:
        checks.append(_inspection_check(
            "zip-structure", "pass", "The outer ZIP has exactly three regular members."
        ))
    else:
        reasons = []
        if len(names) != 3:
            reasons.append(f"found {len(names)} members, expected 3")
        if not unique_names:
            reasons.append("contains duplicate member names")
        if has_directories:
            reasons.append("contains a directory or nested member path")
        checks.append(_inspection_check(
            "zip-structure", "fail", "The outer ZIP layout is not MDES-shaped: "
            + "; ".join(reasons) + "."
        ))

    metadata_sender = identity.get("sender", "")
    metadata_receiver = identity.get("metadataReceiver", "")
    key_receiver = identity.get("keyReceiver", "")
    communication_type = identity.get("communicationType", "")
    if "CTSSenderCountryCd" in metadata:
        if key_receiver and metadata_receiver and key_receiver != metadata_receiver:
            checks.append(_inspection_check(
                "receiver-consistency", "fail",
                f"Metadata addresses {metadata_receiver}, but the key member is addressed "
                f"to {key_receiver}; MDES will treat this as a receiver mismatch (50012).",
            ))
        elif metadata_receiver and key_receiver:
            checks.append(_inspection_check(
                "receiver-consistency", "pass",
                f"Metadata receiver and key receiver both identify {metadata_receiver}.",
            ))
        else:
            checks.append(_inspection_check(
                "receiver-consistency", "fail",
                "Could not establish both the metadata receiver and key receiver.",
            ))
    else:
        checks.append(_inspection_check(
            "receiver-consistency", "warn",
            "IDES metadata uses an entity ID while the key member uses a country "
            "label; receiver consistency must be confirmed by the target mapping.",
        ))

    # CTS names encode all of the country/module facts. FATCA uses entity IDs in
    # metadata while its members use country-shaped labels, so only the receiver
    # consistency check above is meaningful for that dialect.
    if "CTSSenderCountryCd" in metadata:
        expected = naming.entry_names(
            metadata_sender, metadata_receiver, communication_type
        ) if metadata_sender and metadata_receiver and communication_type else None
        if expected and names == [expected["metadata"], expected["key"], expected["payload"]]:
            checks.append(_inspection_check(
                "entry-names", "pass", "CTS member names and order match the metadata."
            ))
        else:
            expected_text = ", ".join(
                [expected[key] for key in ("metadata", "key", "payload")]
            ) if expected else "the metadata-derived CTS names"
            checks.append(_inspection_check(
                "entry-names", "fail",
                "CTS member names/order do not match the metadata. Expected: "
                + expected_text + ".",
            ))
    else:
        checks.append(_inspection_check(
            "entry-names", "warn",
            "IDES member names use country-shaped labels while metadata uses entity IDs; "
            "the names cannot be fully cross-checked without an IDES country mapping.",
        ))
    return checks


def unpack(
    package: str | os.PathLike[str] | bytes,
    private_key: rsa.RSAPrivateKey | None = None,
    *,
    strict: bool = True,
) -> UnpackResult:
    """Open a delivery package, decrypting as far as the caller's key allows.

    Without ``private_key`` only the metadata is readable, which is still enough
    to identify a package. With the receiver's key the payload is decrypted,
    decompressed and signature-checked.
    """
    data = package if isinstance(package, bytes) else Path(package).read_bytes()
    warnings: list[str] = []

    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise PackagingError(f"Not a ZIP file: {exc}") from exc

    names = archive.namelist()
    metadata_name = _find_entry(names, "_Metadata.xml")
    key_name = _find_entry(names, "_Key")
    payload_name = _find_entry(names, "_Payload")
    if metadata_name is None:
        raise PackagingError(
            f"No *_Metadata.xml entry in the package (found: {', '.join(names)})."
        )

    try:
        raw_metadata = archive.read(metadata_name)
        metadata = metadata_mod.parse_metadata(raw_metadata)
    except Exception as exc:
        raise PackagingError(f"Metadata entry could not be parsed: {exc}") from exc

    identity = naming.infer_package_identity(names, metadata)
    result = UnpackResult(
        entries=names,
        metadata=metadata,
        raw_metadata=raw_metadata,
        warnings=warnings,
        identity=identity,
    )
    result.checks.extend(_layout_checks(names, metadata, identity))

    if key_name is None or payload_name is None:
        message = "Package is missing a *_Key or *_Payload entry."
        warnings.append(message)
        result.errors.append(message)
        result.checks.append(_inspection_check("encrypted-payload", "fail", message))
        return result
    if private_key is None:
        result.checks.extend([
            _inspection_check(
                "decryption", "pending",
                "Private key not supplied; only metadata and ZIP structure were inspected.",
            ),
            _inspection_check(
                "signature", "pending", "Decrypt the payload before checking its signature."
            ),
            _inspection_check(
                "xml-validation", "pending",
                "Decrypt the payload before validating the source XML.",
            ),
        ])
        return result

    wrapped = archive.read(key_name)
    try:
        key_material = private_key.decrypt(wrapped, asym_padding.PKCS1v15())
    except Exception as exc:
        message = (
            f"Could not unwrap the AES key - this is the receiver's key file, so "
            f"it needs {result.metadata.get('CTSReceiverCountryCd', 'the receiver')}'s "
            f"private key. ({exc})"
        )
        if strict:
            raise PackagingError(message) from exc
        result.errors.append(message)
        result.checks.append(_inspection_check("decryption", "fail", message))
        return result

    short_key = False
    if len(key_material) == AES_KEY_BYTES + AES_IV_BYTES:
        aes_key, aes_iv = (
            key_material[:AES_KEY_BYTES],
            key_material[AES_KEY_BYTES:],
        )
    elif len(key_material) == AES_KEY_BYTES:
        # MDES rejects this with 50013; we still decrypt so a deliberately broken
        # package can be inspected.
        short_key = True
        aes_key, aes_iv = key_material, b"\x00" * AES_IV_BYTES
        warnings.append(
            "Key file holds 32 bytes with no IV - MDES rejects this with 50013."
        )
    else:
        message = (
            f"Key file unwrapped to {len(key_material)} bytes; MDES requires 48 "
            f"(a 32-byte AES key followed by a 16-byte IV)."
        )
        if strict:
            raise PackagingError(message)
        result.errors.append(message)
        result.checks.append(_inspection_check("decryption", "fail", message))
        return result
    result.aes_key, result.aes_iv = aes_key, aes_iv

    try:
        plaintext = _decrypt(archive.read(payload_name), aes_key, aes_iv)
    except PackagingError as exc:
        if strict:
            raise
        result.errors.append(str(exc))
        result.checks.append(_inspection_check("decryption", "fail", str(exc)))
        return result
    result.checks.append(_inspection_check(
        "decryption", "pass", "The payload decrypted with the selected receiver private key."
    ))

    # A deliberately short key has no authentic IV. The zero IV is only a
    # diagnostic placeholder; attempting to parse the resulting random bytes
    # as a ZIP would obscure the useful 50013 finding with a secondary ZIP
    # exception.
    if short_key:
        result.signed_xml = plaintext
        result.checks.append(_inspection_check(
            "payload-compression", "fail",
            "The key has no IV, so the decrypted payload cannot be trusted; "
            "MDES rejects this key shape with 50013.",
        ))
        return result

    if zipfile.is_zipfile(io.BytesIO(plaintext)):
        try:
            with zipfile.ZipFile(io.BytesIO(plaintext)) as inner:
                inner_names = inner.namelist()
                if not inner_names:
                    raise PackagingError("Payload ZIP is empty.")
                if len(inner_names) != 1 or inner_names[0].endswith("/"):
                    result.warnings.append(
                        "Payload ZIP should contain exactly one regular XML member."
                    )
                    result.checks.append(_inspection_check(
                        "payload-compression", "fail",
                        "Payload ZIP must contain exactly one regular XML member.",
                    ))
                else:
                    result.checks.append(_inspection_check(
                        "payload-compression", "pass",
                        "The encrypted payload contains the required one-entry ZIP.",
                    ))
                result.signed_xml = inner.read(inner_names[0])
        except (zipfile.BadZipFile, KeyError, PackagingError) as exc:
            message = f"Payload ZIP could not be read: {exc}"
            if strict:
                raise PackagingError(message) from exc
            result.errors.append(message)
            result.checks.append(_inspection_check("payload-compression", "fail", message))
            return result
    else:
        message = (
            "Payload was not compressed before encryption - MDES rejects this "
            "with 50003."
        )
        warnings.append(message)
        result.checks.append(_inspection_check("payload-compression", "fail", message))
        result.signed_xml = plaintext

    try:
        result.signature = verify_document(result.signed_xml)
    except Exception as exc:
        message = f"Signed XML could not be verified: {exc}"
        if strict:
            raise PackagingError(message) from exc
        result.errors.append(message)
        result.checks.append(_inspection_check("signature", "fail", message))
        return result
    result.source_xml = result.signature.payload or None
    if not result.signature.valid:
        message = f"Signature check failed: {result.signature.reason}"
        warnings.append(message)
        result.checks.append(_inspection_check("signature", "fail", message))
    else:
        result.checks.append(_inspection_check(
            "signature", "pass", "The signed XML signature verifies."
        ))

    return result
