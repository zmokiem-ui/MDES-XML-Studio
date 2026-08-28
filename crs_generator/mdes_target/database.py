"""Read-only access to an MDES database.

The database is the only place that knows which certificate MDES will verify an
incoming delivery against. Signing a package with the *right* certificate for a
country and having MDES reject it is entirely possible: on the local
``MDES-D-LOCAL``, thirteen partner countries have the Netherlands certificate
registered against them, so signing as IT with the real Italian certificate is
error 50004 and the file itself is faultless.

Everything here is derived from queries that ``CTS.CLR.dll`` — MDES's own SQL CLR
assembly — issues verbatim. They were read out of the assembly rather than
guessed, which is what makes the answers authoritative:

    SELECT CERTIFICAATDOCUMENTID FROM dbo.DOORGEEFLANDEN
    WHERE TWEELETTERCODE = @Code AND CERTIFICAATDOCUMENTID IS NOT NULL
      AND deleted = 0
      AND GETDATE() BETWEEN CERTIFICAATBEGINDATUM AND CERTIFICAATEINDDATUM

**That query changed in CTS.CLR 1.6.9.0.** Versions up to 1.6.8.0 read
``DOORGEEFLAND_CERTIFICATE_ID`` / ``DOORGEEFLAND_CERTIFICATE_BEGINDATUM`` instead.
Since every local database populates only the newer columns, pairing one with an
older assembly means no partner certificate is ever found and every upload fails
for a reason nothing in the file explains. So the column pair is chosen by
inspecting the **deployed** assembly's own bytes, not by looking at which columns
happen to hold data.

Two hard rules for this module:

*   Connections are opened read-only and every statement is a ``SELECT``. This
    application must never be able to write to an MDES database.
*   ``pyodbc`` is optional. Without it the packaging built in
    :mod:`crs_generator.cts` keeps working and only this feature reports itself
    unavailable.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

try:  # pragma: no cover - exercised by absence, not presence
    import pyodbc
except ImportError:  # pragma: no cover
    pyodbc = None

from cryptography import x509
from cryptography.hazmat.primitives import hashes

# Known CTS.CLR builds, by MD5 of the assembly. Only used to *name* the version
# in the UI; behaviour is detected from the assembly's own content below, so an
# unrecognised build still works.
CTS_ASSEMBLY_VERSIONS: dict[str, str] = {
    "ba41f1025f5b1028b4cad057e8fd23ad": "1.5.12.0",
    "400907d3b4125eded581b4da248db740": "1.6.1.0",
    "318673166c2b396107542238e9b66513": "1.6.4.0",
    "4dc9a952495519335724f1d3d0bc51ae": "1.6.5.0",
    "521e5e40a56886f2dbc5a0f0472a8046": "1.6.7.0",
    "6fbb2f736e401f9b73266a44316e917d": "1.6.8.0",
    "5a993e01ef27b71b6e13607e5a3c9008": "1.6.9.0",
}

# The two column sets DOORGEEFLANDEN has been queried with.
MODERN_COLUMNS = {
    "document_id": "CERTIFICAATDOCUMENTID",
    "begin": "CERTIFICAATBEGINDATUM",
    "end": "CERTIFICAATEINDDATUM",
}
LEGACY_COLUMNS = {
    "document_id": "DOORGEEFLAND_CERTIFICATE_ID",
    "begin": "DOORGEEFLAND_CERTIFICATE_BEGINDATUM",
    "end": "DOORGEEFLAND_CERTIFICATE_EINDDATUM",
}

# Tables that together identify a database as an MDES portal database.
MDES_MARKER_TABLES = ("DOORGEEFLANDEN", "DS_CA_CERTIFICATE", "CMFDOCUMENT")

DEFAULT_DRIVERS = (
    "ODBC Driver 18 for SQL Server",
    "ODBC Driver 17 for SQL Server",
    "SQL Server Native Client 11.0",
    "SQL Server",
)


class DatabaseUnavailable(RuntimeError):
    """The driver is missing, or the database could not be reached."""


# --- Connecting -------------------------------------------------------------


def available_drivers() -> list[str]:
    if pyodbc is None:
        return []
    installed = set(pyodbc.drivers())
    return [d for d in DEFAULT_DRIVERS if d in installed]


def build_connection_string(
    server: str,
    database: str,
    *,
    driver: str | None = None,
    username: str | None = None,
    password: str | None = None,
) -> str:
    """Assemble a connection string, preferring Windows authentication.

    ``TrustServerCertificate`` is set because these are local development
    instances with self-signed TLS; Driver 18 refuses to connect otherwise.
    """
    if driver is None:
        drivers = available_drivers()
        if not drivers:
            raise DatabaseUnavailable(
                "No SQL Server ODBC driver is installed. Install 'ODBC Driver 18 "
                "for SQL Server' to connect to an MDES database."
            )
        driver = drivers[0]

    parts = [f"DRIVER={{{driver}}}", f"SERVER={server}", f"DATABASE={database}",
             "TrustServerCertificate=yes"]
    if username:
        parts.append(f"UID={username}")
        parts.append(f"PWD={password or ''}")
    else:
        parts.append("Trusted_Connection=yes")
    return ";".join(parts)


def connect(connection_string: str, timeout: int = 10):
    """Open a read-only connection.

    ``readonly=True`` is a declaration to the driver rather than a guarantee, so
    it is backed by this module simply containing no non-SELECT statement.
    """
    if pyodbc is None:
        raise DatabaseUnavailable(
            "pyodbc is not installed, so MDES targets are unavailable. "
            "Install it with: pip install pyodbc"
        )
    try:
        return pyodbc.connect(connection_string, timeout=timeout, readonly=True)
    except Exception as exc:  # pyodbc.Error and friends
        raise DatabaseUnavailable(str(exc).strip()) from exc


# --- Records ----------------------------------------------------------------


@dataclass(frozen=True)
class CertificateRecord:
    """A certificate MDES holds, and enough to compare it with one of ours."""

    document_id: int
    filename: str
    subject: str
    issuer: str
    common_name: str
    fingerprint_sha256: str
    key_size: int
    not_before: datetime | None
    not_after: datetime | None

    def to_dict(self) -> dict:
        return {
            "documentId": self.document_id,
            "filename": self.filename,
            "subject": self.subject,
            "issuer": self.issuer,
            "commonName": self.common_name,
            "fingerprint": self.fingerprint_sha256,
            "keySize": self.key_size,
            "notBefore": self.not_before.isoformat() if self.not_before else None,
            "notAfter": self.not_after.isoformat() if self.not_after else None,
        }


@dataclass(frozen=True)
class PartnerJurisdiction:
    """A row of ``DOORGEEFLANDEN`` as MDES itself would read it."""

    country: str
    name: str
    document_id: int | None
    valid_from: datetime | None
    valid_until: datetime | None
    accepted_now: bool
    certificate: CertificateRecord | None
    automatic_exchange: bool

    def to_dict(self) -> dict:
        return {
            "country": self.country,
            "name": self.name,
            "documentId": self.document_id,
            "validFrom": self.valid_from.isoformat() if self.valid_from else None,
            "validUntil": self.valid_until.isoformat() if self.valid_until else None,
            "acceptedNow": self.accepted_now,
            "automaticExchange": self.automatic_exchange,
            "certificate": self.certificate.to_dict() if self.certificate else None,
        }


@dataclass(frozen=True)
class ClrAssembly:
    """The CTS.CLR assembly deployed inside the database."""

    name: str
    md5: str
    version: str | None
    source_path: str | None
    uses_modern_columns: bool
    # A deployed assembly is not the same thing as a callable one. The portal's
    # T-SQL can fail because an entry point is absent, or because the binding's
    # parameter contract does not match the call (for example, a recreated
    # @isDebug parameter without the official default of 0).
    missing_entry_points: tuple[str, ...] = ()
    entry_point_issues: tuple[str, ...] = ()

    @property
    def columns(self) -> dict[str, str]:
        return MODERN_COLUMNS if self.uses_modern_columns else LEGACY_COLUMNS

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "md5": self.md5,
            "version": self.version or "unknown",
            "sourcePath": self.source_path,
            "usesModernColumns": self.uses_modern_columns,
            "certificateColumns": self.columns,
            "missingEntryPoints": list(self.missing_entry_points),
            "entryPointIssues": list(self.entry_point_issues),
        }


@dataclass
class DatabaseFacts:
    """Everything the preflight checks need from one database."""

    database: str
    cts_assembly: ClrAssembly | None
    own_certificate: CertificateRecord | None
    own_private_certificate_name: str | None
    partners: list[PartnerJurisdiction] = field(default_factory=list)
    recent_deliveries: list[dict] = field(default_factory=list)
    receiver_history: dict[str, int] = field(default_factory=dict)
    # Facts we could not read, and why. A schema that differs from the one a
    # query assumes degrades that fact rather than the whole target.
    problems: list[str] = field(default_factory=list)

    @property
    def accepted_senders(self) -> list[str]:
        """Countries MDES would find a valid certificate for, right now."""
        return [p.country for p in self.partners if p.accepted_now]

    def partner(self, country: str) -> PartnerJurisdiction | None:
        code = (country or "").strip().upper()
        return next((p for p in self.partners if p.country == code), None)

    def own_country_candidates(self) -> list[tuple[str, str]]:
        """Evidence for which country this instance is, strongest first.

        The private certificate MDES uploaded for itself is the most reliable
        signal; delivery history is the weakest, because a restored database
        carries deliveries addressed to whatever country it used to serve.
        """
        candidates: list[tuple[str, str]] = []
        name = (self.own_private_certificate_name or "").lower()
        match = re.match(r"([a-z]{2,3})12", name)
        if match:
            prefix = match.group(1)
            code = {"uk": "GB", "usa": "US"}.get(prefix, prefix.upper())
            candidates.append((code, f"own certificate {self.own_private_certificate_name}"))
        # The certificate subject is deliberately *not* used as evidence: every
        # certificate in this estate carries C=NL regardless of which authority
        # it represents, so it would contradict the correct answer every time.
        if self.receiver_history:
            top = max(self.receiver_history.items(), key=lambda kv: kv[1])
            candidates.append((top[0], f"{top[1]} deliveries addressed to it"))
        return [(c, why) for c, why in candidates if c]

    def to_dict(self) -> dict:
        return {
            "database": self.database,
            "ctsAssembly": self.cts_assembly.to_dict() if self.cts_assembly else None,
            "ownCertificate": self.own_certificate.to_dict() if self.own_certificate else None,
            "ownPrivateCertificateName": self.own_private_certificate_name,
            "partners": [p.to_dict() for p in self.partners],
            "acceptedSenders": self.accepted_senders,
            "recentDeliveries": self.recent_deliveries,
            "problems": self.problems,
            "ownCountryCandidates": [
                {"country": c, "evidence": why} for c, why in self.own_country_candidates()
            ],
        }


# --- Reading ----------------------------------------------------------------


def _table_exists(cursor, name: str) -> bool:
    cursor.execute("SELECT OBJECT_ID(?)", name)
    return cursor.fetchone()[0] is not None


def _column_exists(cursor, table: str, column: str) -> bool:
    """Older MDES schemas are missing columns newer ones have.

    ``MDES 3.3`` has a ``BEHEER_EIGENSCHAPPEN`` with no ``DELETED`` column, and
    a query assuming it took the whole database read down with it.
    """
    cursor.execute(
        "SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID(?) AND name = ?",
        table, column,
    )
    return cursor.fetchone()[0] > 0


def _parse_certificate(blob: bytes | None) -> x509.Certificate | None:
    """Read a certificate out of whatever the document store holds.

    ``DOORGEEFLANDEN`` points at bare PEM certificates, but ``DS_CA_CERTIFICATE``
    points at the CA's own **PKCS#12**, private key and all. That store is
    password-protected and the password lives encrypted in ``DS_CA_WW``, so the
    public half is only recoverable when it happens to be unprotected. When it is
    not, the caller falls back to the instance's own row in ``DOORGEEFLANDEN``,
    which is the public half of the same keypair.
    """
    if not blob:
        return None
    data = bytes(blob)
    for loader in (x509.load_pem_x509_certificate, x509.load_der_x509_certificate):
        try:
            return loader(data)
        except Exception:
            continue
    try:
        from cryptography.hazmat.primitives.serialization import pkcs12

        _key, cert, _extras = pkcs12.load_key_and_certificates(data, None)
        return cert
    except Exception:
        return None


def _certificate_record(document_id, filename, blob) -> CertificateRecord | None:
    cert = _parse_certificate(blob)
    if cert is None:
        return None
    try:
        common_name = cert.subject.get_attributes_for_oid(
            x509.oid.NameOID.COMMON_NAME
        )[0].value
    except (IndexError, ValueError):
        common_name = ""
    return CertificateRecord(
        document_id=int(document_id) if document_id is not None else -1,
        filename=filename or "",
        subject=cert.subject.rfc4514_string(),
        issuer=cert.issuer.rfc4514_string(),
        common_name=str(common_name),
        fingerprint_sha256=cert.fingerprint(hashes.SHA256()).hex(),
        key_size=getattr(cert.public_key(), "key_size", 0),
        not_before=cert.not_valid_before_utc,
        not_after=cert.not_valid_after_utc,
    )


def read_cts_assembly(cursor) -> ClrAssembly | None:
    """Identify the deployed CTS.CLR, and which columns it reads.

    Behaviour comes from the assembly's own bytes: the SQL it runs is stored as
    UTF-16 string literals, so searching for the column name it references is
    exact and survives builds we have never seen.
    """
    cursor.execute(
        """
        SELECT a.name, af.name, CONVERT(varbinary(max), af.content)
        FROM sys.assemblies a
        JOIN sys.assembly_files af ON af.assembly_id = a.assembly_id
        WHERE a.is_user_defined = 1 AND a.name = 'CTS.CLR'
        """
    )
    row = cursor.fetchone()
    if row is None:
        return None
    name, source_path, content = row
    data = bytes(content) if content else b""
    md5 = hashlib.md5(data).hexdigest()

    modern = MODERN_COLUMNS["begin"].encode("utf-16-le") in data
    legacy = LEGACY_COLUMNS["begin"].encode("utf-16-le") in data
    # If the probe is inconclusive, fall back on the version we recognise, and
    # then on "modern" - every build from 1.6.9.0 onward, i.e. everything current.
    if modern == legacy:
        version = CTS_ASSEMBLY_VERSIONS.get(md5)
        modern = version is None or version >= "1.6.9.0"

    return ClrAssembly(
        name=name,
        md5=md5,
        version=CTS_ASSEMBLY_VERSIONS.get(md5),
        source_path=source_path,
        uses_modern_columns=bool(modern),
        missing_entry_points=read_missing_entry_points(cursor),
        entry_point_issues=read_entry_point_contract_issues(cursor),
    )


# The portal procedures that do the CTS work, and the CLR procedure each one
# calls. Read from the T-SQL rather than hard-coded, so a renamed entry point in
# a future build is still checked correctly.
CTS_ENTRY_POINT_CALLERS = ("DecryptAndUpdateCTS", "EncryptAndUpdateCTS")

_EXEC_CALL_RE = re.compile(
    r"\bEXEC(?:UTE)?\s+(?:@\w+\s*=\s*)?"
    r"(?P<procedure>(?:\[?\w+\]?\.)?\[?\w+\]?)"
    r"(?P<arguments>.*?)(?:;|$)",
    re.I | re.S,
)


def _procedure_calls(body: str) -> list[tuple[str, set[str]]]:
    """Return static procedure calls and the named parameters each supplies."""
    calls: list[tuple[str, set[str]]] = []
    for match in _EXEC_CALL_RE.finditer(body):
        called = match.group("procedure").replace("[", "").replace("]", "")
        if called.lower() == "sp_executesql":
            continue
        supplied = {
            name.lower()
            for name in re.findall(r"(@\w+)\s*=", match.group("arguments"), re.I)
        }
        calls.append((called, supplied))
    return calls


def read_missing_entry_points(cursor) -> tuple[str, ...]:
    """CLR procedures the portal calls but the database does not have.

    Found by reading what ``DecryptAndUpdateCTS`` and ``EncryptAndUpdateCTS``
    actually ``EXEC``, then asking whether each of those exists. A missing one
    is fatal to every upload and invisible from the file's side, which is the
    only reason this is worth a database round trip.
    """
    missing: list[str] = []
    for caller in CTS_ENTRY_POINT_CALLERS:
        cursor.execute("SELECT OBJECT_DEFINITION(OBJECT_ID(?))", caller)
        row = cursor.fetchone()
        body = row[0] if row else None
        if not body:
            continue
        for called, _supplied in _procedure_calls(body):
            cursor.execute("SELECT OBJECT_ID(?)", called)
            if cursor.fetchone()[0] is None and called not in missing:
                missing.append(called)
    return tuple(missing)


def read_entry_point_contract_issues(cursor) -> tuple[str, ...]:
    """Find present entry points that the portal cannot call successfully.

    SQL Server records whether a procedure parameter has a default. Compare
    that contract with the named arguments in the portal's own wrapper calls.
    This catches a partial or hand-recreated CLR binding which exists but raises
    SQL error 201 before the CLR method can run.
    """
    issues: list[str] = []
    for caller in CTS_ENTRY_POINT_CALLERS:
        cursor.execute("SELECT OBJECT_DEFINITION(OBJECT_ID(?))", caller)
        row = cursor.fetchone()
        body = row[0] if row else None
        if not body:
            continue
        for called, supplied in _procedure_calls(body):
            cursor.execute("SELECT OBJECT_ID(?)", called)
            row = cursor.fetchone()
            if not row or row[0] is None:
                # Absence is reported by read_missing_entry_points().
                continue
            # The MDES wrappers use named arguments. If a future wrapper uses
            # only positional arguments, do not guess at its binding contract.
            if not supplied:
                continue
            cursor.execute(
                """
                SELECT name, has_default_value
                FROM sys.parameters
                WHERE object_id = OBJECT_ID(?) AND parameter_id > 0
                ORDER BY parameter_id
                """,
                called,
            )
            for name, has_default in cursor.fetchall():
                if name.lower() in supplied or bool(has_default):
                    continue
                issue = (
                    f"{caller} calls {called} without required {name}; "
                    "the binding has no default"
                )
                if issue not in issues:
                    issues.append(issue)
    return tuple(issues)


def read_own_certificate(cursor) -> CertificateRecord | None:
    """The instance's own certificate, by MDES's own DS_CA_CERTIFICATE query."""
    if not _table_exists(cursor, "DS_CA_CERTIFICATE"):
        return None
    cursor.execute(
        """
        SELECT TOP 1 d.ID, d.FILENAME, CONVERT(varbinary(max), d.DOCUMENTDATA)
        FROM DS_CA_CERTIFICATE c
        JOIN CMFDOCUMENT d ON d.ID = c.CA_CERTIFICATE_DOCUMENT_ID
        WHERE GETDATE() BETWEEN c.CA_CERTIFICATE_BEGINDATUM
              AND ISNULL(c.CA_CERTIFICATE_EINDDATUM,
                         DATETIMEFROMPARTS(9999, 12, 31, 23, 59, 59, 0))
          AND c.deleted = 0
        ORDER BY c.CA_CERTIFICATE_BEGINDATUM DESC
        """
    )
    row = cursor.fetchone()
    return _certificate_record(*row) if row else None


def read_own_private_certificate_name(cursor) -> str | None:
    """Filename of the p12 the CA uploaded as its own signing certificate.

    ``cw12protected.p12`` on every local database, which is the strongest single
    clue to the instance's country.
    """
    if not _table_exists(cursor, "BEHEER_EIGENSCHAPPEN"):
        return None
    # MDES 3.3-era schemas have no DELETED column here.
    not_deleted = (
        "ISNULL(DELETED, 0) = 0 AND"
        if _column_exists(cursor, "BEHEER_EIGENSCHAPPEN", "DELETED") else ""
    )
    cursor.execute(
        f"""
        SELECT TOP 1 PERSOONLIJKCERTIFICAATNAAM
        FROM BEHEER_EIGENSCHAPPEN
        WHERE {not_deleted} PERSOONLIJKCERTIFICAATNAAM IS NOT NULL
        ORDER BY DATUMGEUPLOAD DESC
        """
    )
    row = cursor.fetchone()
    return row[0] if row else None


def read_partners(cursor, assembly: ClrAssembly | None) -> list[PartnerJurisdiction]:
    """Every partner jurisdiction, flagged with whether MDES would accept it now.

    The column names come from the deployed assembly, so ``accepted_now`` answers
    the question that actually matters: would *this* CLR find a certificate.
    """
    if not _table_exists(cursor, "DOORGEEFLANDEN"):
        return []
    columns = assembly.columns if assembly else MODERN_COLUMNS

    cursor.execute(
        f"""
        SELECT dl.TWEELETTERCODE, dl.LAND, dl.[{columns['document_id']}],
               dl.[{columns['begin']}], dl.[{columns['end']}],
               dl.AUTOMATISCHEUITWISSELING,
               d.ID, d.FILENAME, CONVERT(varbinary(max), d.DOCUMENTDATA)
        FROM DOORGEEFLANDEN dl
        LEFT JOIN CMFDOCUMENT d ON d.ID = dl.[{columns['document_id']}]
        WHERE ISNULL(dl.deleted, 0) = 0
        ORDER BY dl.TWEELETTERCODE
        """
    )
    now = datetime.now(timezone.utc)
    partners: list[PartnerJurisdiction] = []
    for (code, land, doc_id, begin, end, automatic,
         cert_id, cert_name, cert_blob) in cursor.fetchall():
        begin_utc = begin.replace(tzinfo=timezone.utc) if begin else None
        end_utc = end.replace(tzinfo=timezone.utc) if end else None
        accepted = bool(
            doc_id is not None
            and begin_utc is not None and end_utc is not None
            and begin_utc <= now <= end_utc
        )
        partners.append(PartnerJurisdiction(
            country=(code or "").strip().upper(),
            name=(land or "").strip(),
            document_id=int(doc_id) if doc_id is not None else None,
            valid_from=begin_utc,
            valid_until=end_utc,
            accepted_now=accepted,
            certificate=_certificate_record(cert_id, cert_name, cert_blob),
            automatic_exchange=str(automatic).strip().lower() in ("true", "j", "y", "1"),
        ))
    return partners


def read_delivery_history(cursor, limit: int = 10) -> tuple[list[dict], dict[str, int]]:
    """Recent CTS deliveries, and a tally of who they were addressed to.

    Used to seed sensible defaults for the one-click path. It records what was
    *received*, not what was accepted, so it never decides a rule on its own.
    """
    if not _table_exists(cursor, "CTS_METAINFORMATIE"):
        return [], {}

    cursor.execute(
        f"""
        SELECT TOP {int(limit)} CTSSENDERCOUNTRYCD, CTSRECEIVERCOUNTRYCD,
               CTSCOMMUNICATIONTYPECD, TAXYEAR, FILECREATETS
        FROM CTS_METAINFORMATIE
        WHERE ISNULL(deleted, 0) = 0
        ORDER BY FILECREATETS DESC
        """
    )
    recent = [
        {
            "sender": (r[0] or "").strip().upper(),
            "receiver": (r[1] or "").strip().upper(),
            "communicationType": (r[2] or "").strip(),
            "taxYear": int(r[3]) if r[3] is not None else None,
            "createdAt": r[4],
        }
        for r in cursor.fetchall()
    ]

    cursor.execute(
        """
        SELECT CTSRECEIVERCOUNTRYCD, COUNT(*)
        FROM CTS_METAINFORMATIE
        WHERE ISNULL(deleted, 0) = 0 AND CTSRECEIVERCOUNTRYCD IS NOT NULL
        GROUP BY CTSRECEIVERCOUNTRYCD
        """
    )
    history = {(r[0] or "").strip().upper(): int(r[1]) for r in cursor.fetchall() if r[0]}
    return recent, history


def message_ref_id_in_use(cursor, message_ref_id: str) -> bool:
    """Whether a MessageRefId has been seen before (MDES 50009).

    Checks the CRS and CbC message tables that exist; a database missing them
    simply reports False rather than failing the whole preflight.
    """
    if not message_ref_id:
        return False
    candidates = (
        ("CRS_DOCUMENT_PROPERTIES", "MESSAGEREFID"),
        ("CSM_MESSAGESPEC", "MESSAGEREFID"),
        ("CBC_UPLOAD_MESSAGE", "MESSAGEREFID"),
        ("CBCSM_MESSAGESPEC", "MESSAGEREFID"),
    )
    for table, column in candidates:
        if not _table_exists(cursor, table):
            continue
        cursor.execute(
            f"SELECT TOP 1 1 FROM [{table}] WHERE [{column}] = ?", message_ref_id
        )
        if cursor.fetchone():
            return True
    return False


def read_facts(connection, database: str) -> DatabaseFacts:
    """Everything preflight needs, in one pass."""
    cursor = connection.cursor()

    def attempt(label, fn, default):
        """One unreadable table must not take the whole database read with it.

        The schema varies across MDES versions, so a query that works on a 3.4
        database can fail on a 3.3 one. Degrade that single fact and record why;
        preflight then reports what it could not check rather than pretending
        everything is fine.
        """
        try:
            return fn()
        except Exception as exc:
            problems.append(f"{label}: {str(exc).strip()}")
            return default

    problems: list[str] = []
    assembly = attempt("CTS.CLR assembly", lambda: read_cts_assembly(cursor), None)
    recent, history = attempt(
        "delivery history", lambda: read_delivery_history(cursor), ([], {})
    )
    facts = DatabaseFacts(
        database=database,
        cts_assembly=assembly,
        own_certificate=attempt(
            "own certificate", lambda: read_own_certificate(cursor), None),
        own_private_certificate_name=attempt(
            "own private certificate", lambda: read_own_private_certificate_name(cursor), None),
        partners=attempt(
            "partner jurisdictions", lambda: read_partners(cursor, assembly), []),
        recent_deliveries=recent,
        receiver_history=history,
        problems=problems,
    )
    if facts.own_certificate is None:
        # DS_CA_CERTIFICATE holds a password-protected p12 we cannot open. The
        # public half of the same keypair is the instance's own row in
        # DOORGEEFLANDEN - and that is precisely the certificate a delivery has
        # to be encrypted to, so it is the one worth comparing against.
        for country, _why in facts.own_country_candidates():
            partner = facts.partner(country)
            if partner and partner.certificate:
                facts.own_certificate = partner.certificate
                break
    return facts


# --- Discovery --------------------------------------------------------------


def list_mdes_databases(connection_string_for_master: str) -> list[dict]:
    """Databases on a server that look like MDES portal databases.

    Identified by their tables rather than their names, since the local estate
    calls them everything from ``MDES-DEMO`` to ``BE_MDES-CI``.

    Each result also says whether CTS.CLR is deployed, because a database
    without it cannot decrypt an upload at all — which makes it a bad default to
    offer someone setting up a target for the first time.
    """
    connection = connect(connection_string_for_master)
    cursor = connection.cursor()
    cursor.execute(
        "SELECT name FROM sys.databases WHERE database_id > 4 AND state = 0 ORDER BY name"
    )
    names = [row[0] for row in cursor.fetchall()]

    found: list[dict] = []
    for name in names:
        try:
            cursor.execute(
                f"SELECT COUNT(*) FROM [{name}].sys.tables WHERE name IN (?, ?, ?)",
                *MDES_MARKER_TABLES,
            )
            if cursor.fetchone()[0] != len(MDES_MARKER_TABLES):
                continue
            cursor.execute(
                f"SELECT COUNT(*) FROM [{name}].sys.assemblies "
                f"WHERE is_user_defined = 1 AND name = 'CTS.CLR'"
            )
            found.append({"database": name, "hasCtsAssembly": cursor.fetchone()[0] > 0})
        except Exception:
            continue  # no permission, offline, or not a normal database
    return found
