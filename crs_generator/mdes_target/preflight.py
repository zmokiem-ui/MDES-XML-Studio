"""Check a delivery against the instance it is going to, before building it.

Every check names the MDES error it predicts. That is the point: a refusal here
should read as *"this would come back as 50004"*, not *"invalid configuration"*,
because the tester's next question is always which error they were about to
provoke.

The check that justifies the whole feature is
:func:`_check_signing_certificate_matches`. MDES verifies an incoming signature
against the certificate stored for the **sender country** in ``DOORGEEFLANDEN``.
On the local ``MDES-D-LOCAL``, thirteen partner countries have the *Netherlands*
certificate registered against them, so signing as IT with the genuine Italian
certificate produces a file that is faultless and still rejected. Nothing in the
XML, the ZIP or the certificate store can reveal that — only the database can.
"""

from __future__ import annotations

import os
import ssl
import warnings
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from functools import lru_cache

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.utils import CryptographyDeprecationWarning

from ..cts import certificates as cert_store
from ..cts.certificates import CertificateStoreError
from .profile import TargetResolution


class CheckOutcome(str, Enum):
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"
    SKIP = "skip"


@dataclass
class Check:
    """One rule, and what breaking it costs."""

    id: str
    title: str
    outcome: CheckOutcome
    detail: str
    mdes_error: str | None = None
    remedy: str | None = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "outcome": self.outcome.value,
            "detail": self.detail,
            "mdesError": self.mdes_error,
            "remedy": self.remedy,
        }


@dataclass
class PreflightResult:
    """The verdict, plus the settings a caller should actually use."""

    checks: list[Check] = field(default_factory=list)
    sender: str = ""
    receiver: str = ""
    communication_type: str = "CRS"
    tax_year: int | None = None
    doctype_indics: list[str] = field(default_factory=list)

    @property
    def blocked(self) -> bool:
        return any(c.outcome is CheckOutcome.FAIL for c in self.checks)

    @property
    def failures(self) -> list[Check]:
        return [c for c in self.checks if c.outcome is CheckOutcome.FAIL]

    @property
    def warnings(self) -> list[Check]:
        return [c for c in self.checks if c.outcome is CheckOutcome.WARN]

    def to_dict(self) -> dict:
        return {
            "blocked": self.blocked,
            "checks": [c.to_dict() for c in self.checks],
            "sender": self.sender,
            "receiver": self.receiver,
            "communicationType": self.communication_type,
            "taxYear": self.tax_year,
            "docTypeIndics": self.doctype_indics,
            "predictedErrors": sorted({
                c.mdes_error for c in self.failures if c.mdes_error
            }),
        }


# Alias kept short for callers that only want the verdict type.
Preflight = PreflightResult


# --- Individual checks ------------------------------------------------------


def _check_cts_assembly(resolution: TargetResolution) -> Check:
    facts = resolution.facts
    if facts is None:
        return Check(
            "cts-assembly", "CTS.CLR assembly", CheckOutcome.SKIP,
            "The database was not reachable, so the assembly could not be checked.",
        )
    assembly = facts.cts_assembly
    if assembly is None:
        return Check(
            "cts-assembly", "CTS.CLR assembly", CheckOutcome.FAIL,
            f"No CTS.CLR assembly is deployed in {facts.database}. This instance "
            f"cannot decrypt a CTS upload at all, however correct the package is.",
            mdes_error="upload cannot be decrypted",
            remedy="Deploy CTS.CLR to this database, or pick a target that has it.",
        )

    version = assembly.version or f"unrecognised build (md5 {assembly.md5[:12]})"

    # A registered assembly is not a working one. The portal's own
    # DecryptAndUpdateCTS calls DecryptCTSNotification; where that procedure was
    # never created, the EXEC raises straight into the surrounding CATCH and the
    # portal reports "Decryption failed" (50002) for every upload it is given -
    # including packages that are perfectly correct and that decrypt cleanly
    # against this same instance's own private key. Nothing about the file can
    # reveal this, which is exactly why it is checked here.
    if assembly.missing_entry_points:
        missing = ", ".join(assembly.missing_entry_points)
        return Check(
            "cts-assembly", "CTS.CLR assembly", CheckOutcome.FAIL,
            f"CTS.CLR {version} is deployed in {facts.database}, but the "
            f"procedure(s) its own T-SQL calls are missing: {missing}. Every CTS "
            f"upload to this instance fails during decryption regardless of how "
            f"the package was built.",
            mdes_error="50002",
            remedy=f"Deploy {missing} to {facts.database} - the CTS.CLR "
                   f"registration is incomplete - or pick a target that has it.",
        )

    if assembly.entry_point_issues:
        issues = "; ".join(assembly.entry_point_issues)
        return Check(
            "cts-assembly", "CTS.CLR assembly", CheckOutcome.FAIL,
            f"CTS.CLR {version} is deployed in {facts.database}, but its T-SQL "
            f"wrapper cannot call the CLR binding: {issues}. SQL fails before "
            f"decryption starts, and the portal reports 50002 for every upload.",
            mdes_error="50002",
            remedy="Recreate the affected CLR procedure binding from the official "
                   "deployment SQL, including every parameter default, or pick a "
                   "target with a callable CTS deployment.",
        )

    columns = assembly.columns["begin"]
    populated = sum(1 for p in facts.partners if p.accepted_now)
    if populated == 0 and facts.partners:
        return Check(
            "cts-assembly", "CTS.CLR assembly", CheckOutcome.FAIL,
            f"CTS.CLR {version} reads {columns}, but no partner jurisdiction in "
            f"{facts.database} has a currently valid certificate in that column. "
            f"No sender would be accepted.",
            mdes_error="50004",
            remedy="Check whether the deployed assembly matches the database "
                   "schema - the column pair changed in CTS.CLR 1.6.9.0.",
        )
    return Check(
        "cts-assembly", "CTS.CLR assembly", CheckOutcome.PASS,
        f"CTS.CLR {version} deployed, reading {columns}; "
        f"{populated} partner jurisdiction(s) currently valid.",
    )


def _mismatched_pairing(resolution: TargetResolution) -> tuple[str, str] | None:
    """``(props_country, database_country)`` when the two halves disagree.

    A target is a properties file *and* a database, and they have to describe the
    same instance. Pairing MH's properties file with a CW database is not a
    certificate problem, even though a certificate check is where it first shows
    up - and "replace the certificate" would be the wrong repair.
    """
    properties = resolution.properties
    facts = resolution.facts
    if properties is None or facts is None or not properties.own_country:
        return None
    candidates = facts.own_country_candidates()
    if not candidates:
        return None
    database_country = candidates[0][0]
    if database_country and database_country != properties.own_country:
        return properties.own_country, database_country
    return None


def _check_database_readable(resolution: TargetResolution) -> Check:
    """Could we read the instance at all?

    Without this, an unreachable database makes every other check skip, and a
    preflight of nothing but skips reads as "all clear" — the app would then
    offer to build a package it has verified nothing about. Not being able to
    check is a refusal, not a pass.
    """
    facts = resolution.facts
    if facts is None:
        return Check(
            "database", "Database", CheckOutcome.FAIL,
            "; ".join(resolution.errors)
            or "The database could not be read, so none of the instance's rules "
               "could be checked.",
            remedy="Fix the connection under Settings, MDES target, then preflight "
                   "again. Nothing can be promised about a package built blind.",
        )
    if facts.problems:
        return Check(
            "database", "Database", CheckOutcome.WARN,
            "Read, but some facts were unavailable: " + "; ".join(facts.problems),
            remedy="Usually an older MDES schema. The checks that depend on those "
                   "facts are reported as skipped below.",
        )
    return Check(
        "database", "Database", CheckOutcome.PASS,
        f"Read {facts.database}: {len(facts.partners)} partner jurisdiction(s).",
    )


def _check_target_pairing(resolution: TargetResolution) -> Check:
    """Are the properties file and the database the same instance?

    Run before everything else, because when this fails the later checks are all
    describing the symptom rather than the cause.
    """
    if resolution.properties is None or resolution.facts is None:
        return Check(
            "target-pairing", "Target pairing", CheckOutcome.SKIP,
            "Needs both a properties file and a reachable database.",
        )
    mismatch = _mismatched_pairing(resolution)
    if mismatch is None:
        return Check(
            "target-pairing", "Target pairing", CheckOutcome.PASS,
            f"The properties file and {resolution.facts.database} both describe "
            f"a {resolution.own_country} instance.",
        )

    props_country, database_country = mismatch
    properties_name = resolution.properties.path.name
    evidence = "; ".join(
        f"{country} ({why})" for country, why in resolution.facts.own_country_candidates()
    )
    return Check(
        "target-pairing", "Target pairing", CheckOutcome.FAIL,
        f"This target pairs {properties_name}, which configures a "
        f"{props_country} instance, with {resolution.facts.database}, which is a "
        f"{database_country} database ({evidence}). They are different instances, "
        f"so no package built from this target can be right.",
        remedy=f"Point the target at the properties file for the "
               f"{database_country} instance, or at a {props_country} database. "
               f"Nothing needs changing in the database or the certificate store.",
    )


def _check_receiver(resolution: TargetResolution, receiver: str) -> Check:
    own = resolution.own_country
    if not own:
        return Check(
            "receiver", "Receiving country", CheckOutcome.WARN,
            "Could not determine which country this instance is, so the receiver "
            "could not be checked.",
        )
    if _mismatched_pairing(resolution) is not None:
        return Check(
            "receiver", "Receiving country", CheckOutcome.SKIP,
            "Cannot be checked until the target pairs a properties file and a "
            "database that describe the same instance.",
        )
    if receiver.upper() != own:
        return Check(
            "receiver", "Receiving country", CheckOutcome.FAIL,
            f"This instance is {own}, but the delivery is addressed to "
            f"{receiver.upper()}. MDES treats a delivery meant for another "
            f"jurisdiction as misrouted.",
            mdes_error="50012",
            remedy=f"Set the receiver to {own}.",
        )
    return Check(
        "receiver", "Receiving country", CheckOutcome.PASS,
        f"Addressed to {own}, which is what this instance is.",
    )


def _check_encryption_certificate(resolution: TargetResolution, receiver: str) -> Check:
    facts = resolution.facts
    if facts is None or facts.own_certificate is None:
        return Check(
            "encryption-certificate", "Encryption certificate", CheckOutcome.SKIP,
            "The instance's own certificate could not be read from the database.",
        )
    try:
        ours = cert_store.load_encryption_certificate(receiver)
    except CertificateStoreError as exc:
        return Check(
            "encryption-certificate", "Encryption certificate", CheckOutcome.FAIL,
            str(exc), mdes_error="50002",
            remedy=f"Import {receiver.upper()}'s certificate under Settings, Certificates.",
        )

    theirs = facts.own_certificate
    if ours.fingerprint(hashes.SHA256()).hex() != theirs.fingerprint_sha256:
        # A mis-paired target surfaces here first, and the honest repair is to
        # fix the pairing. Advising a certificate swap would corrupt a correct
        # certificate store to paper over a configuration mistake.
        if _mismatched_pairing(resolution) is not None:
            return Check(
                "encryption-certificate", "Encryption certificate", CheckOutcome.SKIP,
                f"We would encrypt to '{ours.subject.rfc4514_string()}' while this "
                f"database's own certificate is '{theirs.common_name}'. That is the "
                f"target pairing above, not a certificate problem - do not change "
                f"any certificate to make this pass.",
            )
        return Check(
            "encryption-certificate", "Encryption certificate", CheckOutcome.FAIL,
            f"We would encrypt to '{_subject(ours)}', but this instance's own "
            f"certificate is '{theirs.common_name}' ({theirs.filename}). It would "
            f"not be able to unwrap the AES key.",
            mdes_error="50002",
            remedy=f"Import the certificate this instance actually holds "
                   f"({theirs.filename}) as {receiver.upper()}'s certificate under "
                   f"Settings, Certificates.",
        )
    return Check(
        "encryption-certificate", "Encryption certificate", CheckOutcome.PASS,
        f"Matches the instance's own certificate ({theirs.common_name}).",
    )


def _check_sender_accepted(resolution: TargetResolution, sender: str) -> Check:
    facts = resolution.facts
    if facts is None:
        return Check(
            "sender-accepted", "Sending country", CheckOutcome.SKIP,
            "The database was not reachable, so the sender could not be checked.",
        )
    if not sender:
        return Check(
            "sender-accepted", "Sending country", CheckOutcome.FAIL,
            f"No sending country could be chosen. {facts.database} has "
            f"{len(facts.accepted_senders)} partner(s) with a valid certificate, "
            f"and none of them has a certificate matching one we hold.",
            mdes_error="50004",
            remedy="Import the certificate this instance holds for a partner "
                   "country, or register one of ours in the portal.",
        )
    partner = facts.partner(sender)
    if partner is None:
        return Check(
            "sender-accepted", "Sending country", CheckOutcome.FAIL,
            f"{sender.upper()} is not a partner jurisdiction in {facts.database}. "
            f"Accepted senders: {', '.join(facts.accepted_senders) or 'none'}.",
            mdes_error="50004",
            remedy="Register the country in the portal, or send as one that is.",
        )
    if not partner.accepted_now:
        window = (
            f"{partner.valid_from:%Y-%m-%d} to {partner.valid_until:%Y-%m-%d}"
            if partner.valid_from and partner.valid_until
            else "no certificate registered"
        )
        return Check(
            "sender-accepted", "Sending country", CheckOutcome.FAIL,
            f"{sender.upper()} has no currently valid certificate ({window}), so "
            f"MDES would find nothing to verify the signature against.",
            mdes_error="50004",
            remedy=f"Upload a valid certificate for {sender.upper()} in the portal.",
        )
    return Check(
        "sender-accepted", "Sending country", CheckOutcome.PASS,
        f"{sender.upper()} is a partner with a valid certificate "
        f"(until {partner.valid_until:%Y-%m-%d}).",
    )


def _check_signing_certificate_matches(resolution: TargetResolution, sender: str) -> Check:
    """The check the whole feature exists for.

    A perfectly-formed package signed with the genuinely correct national
    certificate is still rejected if the instance has a different certificate
    registered for that country - which is the normal state of a test estate.
    """
    facts = resolution.facts
    if facts is None:
        return Check(
            "signing-certificate", "Signing certificate", CheckOutcome.SKIP,
            "The database was not reachable.",
        )
    partner = facts.partner(sender)
    if partner is None or partner.certificate is None:
        return Check(
            "signing-certificate", "Signing certificate", CheckOutcome.SKIP,
            f"No certificate is stored for {sender.upper()}, so there is nothing "
            f"to compare against.",
        )
    try:
        ours = cert_store.load_encryption_certificate(sender)
    except CertificateStoreError as exc:
        return Check(
            "signing-certificate", "Signing certificate", CheckOutcome.FAIL,
            str(exc), mdes_error="50004",
            remedy=f"Import {sender.upper()}'s certificate under Settings, Certificates.",
        )

    theirs = partner.certificate
    if ours.fingerprint(hashes.SHA256()).hex() != theirs.fingerprint_sha256:
        return Check(
            "signing-certificate", "Signing certificate", CheckOutcome.FAIL,
            f"We would sign as {sender.upper()} with '{_subject(ours)}', but this "
            f"instance verifies {sender.upper()} against '{theirs.common_name}' "
            f"({theirs.filename}). The signature would not validate.",
            mdes_error="50004",
            remedy=f"Either sign as a country whose certificate matches, or upload "
                   f"our {sender.upper()} certificate to the portal for {sender.upper()}.",
        )
    return Check(
        "signing-certificate", "Signing certificate", CheckOutcome.PASS,
        f"Our {sender.upper()} certificate is the one this instance verifies against.",
    )


def _check_module(resolution: TargetResolution, communication_type: str) -> Check:
    properties = resolution.properties
    if properties is None or not properties.modules:
        return Check(
            "module", "Treaty", CheckOutcome.SKIP,
            "The properties file did not list any treaties.",
        )
    module = communication_type.upper().replace("STATUS", "")
    if module == "RPT":
        module = "FATCA"
    if module not in properties.modules:
        return Check(
            "module", "Treaty", CheckOutcome.FAIL,
            f"This instance accepts {', '.join(properties.modules)}; {module} is "
            f"not enabled.",
            remedy="Pick a module the instance handles, or enable it in Verdrag.",
        )
    return Check(
        "module", "Treaty", CheckOutcome.PASS,
        f"{module} is enabled on this instance.",
    )


def _check_doctype_range(
    resolution: TargetResolution,
    module: str,
    package_doctype_indics: list[str] | None = None,
) -> Check:
    properties = resolution.properties
    if properties is None:
        return Check(
            "doctype", "DocTypeIndic range", CheckOutcome.SKIP,
            "The properties file could not be read.",
        )
    allowed = properties.doctype_indics(module)
    kind = "test" if properties.is_test_environment else "production"
    error = "50011" if properties.is_test_environment else "50010"
    actual = sorted({item.upper() for item in (package_doctype_indics or []) if item})
    if actual:
        unsupported = sorted(set(actual) - set(allowed))
        if unsupported:
            return Check(
                "doctype", "DocTypeIndic range", CheckOutcome.FAIL,
                f"This is a {kind} environment and accepts {', '.join(allowed)}, "
                f"but the package contains {', '.join(actual)}; "
                f"{', '.join(unsupported)} would be rejected.",
                mdes_error=error,
                remedy=f"Use the {kind} DocTypeIndic range: {', '.join(allowed)}.",
            )
        return Check(
            "doctype", "DocTypeIndic range", CheckOutcome.PASS,
            f"This is a {kind} environment; the package uses {', '.join(actual)} "
            f"from the allowed range {', '.join(allowed)}.",
            mdes_error=error,
        )
    return Check(
        "doctype", "DocTypeIndic range", CheckOutcome.PASS,
        f"This is a {kind} environment, so the file must use "
        f"{', '.join(allowed)}. Using the other range comes back as {error}.",
        mdes_error=error,
    )


def _check_tax_year(resolution: TargetResolution, tax_year: int | None) -> Check:
    properties = resolution.properties
    if properties is None or tax_year is None:
        return Check("tax-year", "Tax year", CheckOutcome.SKIP, "Not enough information.")
    first = properties.first_delivery_year
    if first is not None and tax_year < first:
        return Check(
            "tax-year", "Tax year", CheckOutcome.FAIL,
            f"This instance accepts deliveries from {first} onwards; {tax_year} is "
            f"before that.",
            remedy=f"Use a tax year of {first} or later.",
        )
    return Check("tax-year", "Tax year", CheckOutcome.PASS, f"{tax_year} is accepted.")


def _is_local_sql_server(server: str) -> bool:
    host = (server or "").split("\\", 1)[0].split(",", 1)[0].strip().lower()
    local_names = {".", "(local)", "localhost", "127.0.0.1", "::1"}
    computer_name = os.environ.get("COMPUTERNAME", "").strip().lower()
    if computer_name:
        local_names.add(computer_name)
    return host in local_names


@lru_cache(maxsize=1)
def _windows_root_subjects() -> frozenset[str] | None:
    """Subjects trusted by Windows on this machine, or None if unavailable."""
    if not hasattr(ssl, "enum_certificates"):
        return None
    subjects: set[str] = set()
    try:
        certificates = ssl.enum_certificates("ROOT")
    except (OSError, ssl.SSLError):
        return None
    for data, encoding, _trust in certificates:
        if encoding != "x509_asn":
            continue
        try:
            # The Windows root store can contain old platform certificates with
            # non-positive serials. They are unrelated to this check and should
            # not leak deprecation noise into CLI JSON output.
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", CryptographyDeprecationWarning)
                cert = x509.load_der_x509_certificate(data)
        except ValueError:
            continue
        subjects.add(cert.subject.rfc4514_string())
    return frozenset(subjects)


def _issuer_is_trusted_locally(issuer: str) -> bool | None:
    roots = _windows_root_subjects()
    return None if roots is None else issuer in roots


def _check_certificate_expiry(resolution: TargetResolution, sender: str, receiver: str) -> Check:
    properties = resolution.properties
    if properties is None:
        return Check("expiry", "Certificate validity", CheckOutcome.SKIP, "No properties file.")
    if not properties.checks_certificate_validity:
        return Check(
            "expiry", "Certificate validity", CheckOutcome.PASS,
            "This test instance verifies the signature against the sender "
            "certificate stored in MDES, but does not ask Windows to validate "
            "that certificate's CA chain or dates (checkValidityCertificate=0).",
        )
    now = datetime.now(timezone.utc)
    expired: list[str] = []
    for country in {sender.upper(), receiver.upper()}:
        try:
            cert = cert_store.load_encryption_certificate(country)
        except CertificateStoreError:
            continue
        if cert.not_valid_after_utc < now:
            expired.append(f"{country} expired {cert.not_valid_after_utc:%Y-%m-%d}")
    if expired:
        return Check(
            "expiry", "Certificate validity", CheckOutcome.FAIL,
            "This instance enforces validity dates and " + "; ".join(expired) + ".",
            remedy="Replace the expired certificate under Settings, Certificates.",
        )

    # Fatca.Cipher.Standalone calls SignedXml.CheckSignature(cert,
    # verifySignatureOnly: false) when checkValidityCertificate=1. That performs
    # Windows trust-chain validation as well as checking dates. A matching leaf
    # fingerprint is therefore not enough. For a local SQL Server the app can
    # inspect the same machine's root store; for a remote server it must state
    # that the remote service account's trust store remains unverified.
    facts = resolution.facts
    partner = facts.partner(sender) if facts is not None else None
    certificate = partner.certificate if partner is not None else None
    if certificate is not None and _is_local_sql_server(resolution.profile.server):
        trusted = _issuer_is_trusted_locally(certificate.issuer)
        if trusted is False:
            return Check(
                "expiry", "Certificate validity", CheckOutcome.FAIL,
                f"The certificate dates are valid, but {sender.upper()}'s issuer "
                f"'{certificate.issuer}' is not in this machine's Windows trusted "
                f"root store. With checkValidityCertificate=1, MDES reports the "
                f"otherwise-correct signature as invalid.",
                mdes_error="50004",
                remedy="Install the issuing CA in Trusted Root Certification "
                       "Authorities for the SQL Server host/service context. For an "
                       "explicitly configured non-production test instance, its "
                       "approved checkValidityCertificate=0 setting verifies the "
                       "signature but skips Windows chain validation.",
            )
        if trusted is None:
            return Check(
                "expiry", "Certificate validity", CheckOutcome.WARN,
                "Certificate dates are valid, but the Windows trusted-root store "
                "could not be inspected. checkValidityCertificate=1 also requires "
                "the sender's CA chain to be trusted by SQL Server.",
                mdes_error="50004",
            )
    elif certificate is not None:
        return Check(
            "expiry", "Certificate validity", CheckOutcome.WARN,
            "Certificate dates are valid. This database is remote, so the app "
            "cannot prove that the SQL Server service trusts the sender's CA chain; "
            "checkValidityCertificate=1 will reject it as 50004 if it does not.",
            mdes_error="50004",
        )
    return Check(
        "expiry", "Certificate validity", CheckOutcome.PASS,
        "Both certificates are within their validity period and the local Windows "
        "root store contains the sender certificate's issuer.",
    )


def _check_message_ref_id(resolution: TargetResolution, message_ref_id: str | None) -> Check:
    if not message_ref_id:
        return Check(
            "message-ref-id", "MessageRefId", CheckOutcome.SKIP,
            "No MessageRefId supplied; it is generated at build time.",
        )
    facts = resolution.facts
    if facts is None:
        return Check("message-ref-id", "MessageRefId", CheckOutcome.SKIP, "Database unavailable.")
    try:
        from .database import message_ref_id_in_use

        connection = connect_for(resolution)
        if connection is None:
            return Check("message-ref-id", "MessageRefId", CheckOutcome.SKIP,
                         "Database unavailable.")
        if message_ref_id_in_use(connection.cursor(), message_ref_id):
            return Check(
                "message-ref-id", "MessageRefId", CheckOutcome.FAIL,
                f"'{message_ref_id}' has already been used on this instance.",
                mdes_error="50009",
                remedy="Generate a new MessageRefId.",
            )
    except Exception as exc:
        return Check("message-ref-id", "MessageRefId", CheckOutcome.SKIP,
                     f"Could not check: {exc}")
    return Check(
        "message-ref-id", "MessageRefId", CheckOutcome.PASS,
        f"'{message_ref_id}' has not been used here before.",
    )


def connect_for(resolution: TargetResolution, password: str | None = None):
    """A fresh connection for a resolved target, or ``None`` if unavailable."""
    from .database import DatabaseUnavailable, connect

    try:
        return connect(resolution.profile.connection_string(password))
    except (DatabaseUnavailable, Exception):
        return None


def _subject(certificate) -> str:
    return certificate.subject.rfc4514_string()


# --- Entry point ------------------------------------------------------------


def run_preflight(
    resolution: TargetResolution,
    *,
    sender: str | None = None,
    receiver: str | None = None,
    communication_type: str = "CRS",
    tax_year: int | None = None,
    message_ref_id: str | None = None,
    package_doctype_indics: list[str] | None = None,
) -> PreflightResult:
    """Check a delivery against a target, filling in whatever was not supplied.

    Called with nothing but a target it answers "what would work here?", which is
    what the one-click path uses; called with a full set it answers "would this
    work?".
    """
    receiver = (receiver or resolution.own_country or "").upper()
    sender = (sender or _default_sender(resolution, receiver)).upper()
    module = communication_type.upper().replace("STATUS", "")
    if module == "RPT":
        module = "FATCA"

    if tax_year is None:
        tax_year = _default_tax_year(resolution)

    checks = [
        _check_database_readable(resolution),
        _check_target_pairing(resolution),
        _check_cts_assembly(resolution),
        _check_receiver(resolution, receiver),
        _check_encryption_certificate(resolution, receiver),
        _check_sender_accepted(resolution, sender),
        _check_signing_certificate_matches(resolution, sender),
        _check_module(resolution, communication_type),
        _check_doctype_range(resolution, module, package_doctype_indics),
        _check_tax_year(resolution, tax_year),
        _check_certificate_expiry(resolution, sender, receiver),
        _check_message_ref_id(resolution, message_ref_id),
    ]

    for error in resolution.errors:
        checks.insert(0, Check(
            "target", "Target", CheckOutcome.WARN, error,
            remedy="Fix the target under Settings, MDES target.",
        ))

    doctypes = list(
        resolution.properties.doctype_indics(module)
    ) if resolution.properties else []

    return PreflightResult(
        checks=checks,
        sender=sender,
        receiver=receiver,
        communication_type=communication_type,
        tax_year=tax_year,
        doctype_indics=doctypes,
    )


def _default_tax_year(resolution: TargetResolution) -> int | None:
    """The tax year most likely to be wanted.

    The last delivery this instance received is the best guide. Failing that,
    last year — clamped to what the instance accepts. Falling back to
    ``FirstYearDelivery`` instead would generate a 2012 file on an instance that
    simply has no history yet, which is nobody's intent.
    """
    facts = resolution.facts
    if facts is not None:
        from_history = next(
            (d["taxYear"] for d in facts.recent_deliveries if d.get("taxYear")), None
        )
        if from_history:
            return int(from_history)

    candidate = datetime.now(timezone.utc).year - 1
    first = resolution.properties.first_delivery_year if resolution.properties else None
    if first is not None:
        candidate = max(candidate, first)
    return candidate


def _default_sender(resolution: TargetResolution, receiver: str) -> str:
    """Pick a sender that would actually work.

    Preference order: a partner whose stored certificate matches ours (so the
    signature will verify), then any accepted partner, then nothing. This is what
    makes the one-click path produce an acceptable file without being told who to
    send as.
    """
    facts = resolution.facts
    if facts is None:
        return ""
    for partner in facts.partners:
        if not partner.accepted_now or partner.country == receiver:
            continue
        if partner.certificate is None:
            continue
        try:
            ours = cert_store.load_encryption_certificate(partner.country)
        except CertificateStoreError:
            continue
        if ours.fingerprint(hashes.SHA256()).hex() == partner.certificate.fingerprint_sha256:
            return partner.country
    return next(
        (c for c in facts.accepted_senders if c != receiver),
        "",
    )
