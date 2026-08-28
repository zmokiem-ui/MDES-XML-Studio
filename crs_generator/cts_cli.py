"""CTS CLI - build and open MDES delivery packages.

Sits alongside ``cli.py`` / ``cbc_cli.py`` / ``fatca_cli.py`` and follows the
same contract: a JSON object on stdout, exit code 0 on success and 1 on failure,
so the Electron bridge can treat it like every other backend command.

    python -m crs_generator.cts_cli pack --source out/crs.xml \\
        --sender NL --receiver GL --type CRS --tax-year 2024 --output out/

    python -m crs_generator.cts_cli unpack --package out/NL_CRS_....zip \\
        --country NL

    python -m crs_generator.cts_cli certificates

The signing password never belongs in ``argv`` — it would be visible to every
process on the machine — so ``--signing-password`` is a convenience for
interactive use only. Prefer ``$MDES_SIGNING_PASSWORD`` or
``--signing-password-stdin``, both of which the desktop app uses.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from .cts import certificates as cert_store
from .cts import naming
from .cts import passwords
from .cts.certificates import CertificateStoreError, load_signing_material
from .cts.packager import Defect, PackagingError, pack_from_store, unpack
from .cts.source_validation import validate_foreign_crs, validate_foreign_crs_bytes

PASSWORD_ENV_VAR = "MDES_SIGNING_PASSWORD"


def _fail(message: str, **extra) -> int:
    print(json.dumps({"success": False, "error": message, **extra}, indent=2))
    return 1


def _resolve_password(args) -> str | None:
    """Password, in order of least to most exposed."""
    if getattr(args, "signing_password_stdin", False):
        return sys.stdin.readline().rstrip("\r\n")
    env = os.environ.get(PASSWORD_ENV_VAR)
    if env:
        return env
    return getattr(args, "signing_password", None)


def _store_path(args) -> Path | None:
    return Path(args.store) if getattr(args, "store", None) else None


# --- pack -------------------------------------------------------------------


def cmd_pack(args) -> int:
    source = Path(args.source)
    if not source.is_file():
        return _fail(f"Source file not found: {source}")

    source_xml = source.read_bytes()

    sender = args.sender
    receiver = args.receiver
    if not sender or not receiver:
        detected_sender, detected_receiver = naming.extract_countries(source_xml)
        sender = sender or detected_sender
        receiver = receiver or detected_receiver
    if not sender or not receiver:
        return _fail(
            "Sender and receiver could not be determined. Pass --sender/--receiver, "
            "or use a document that carries TransmittingCountry/ReceivingCountry."
        )

    communication_type = args.type
    module = naming.base_module(communication_type)
    if module not in naming.MODULES:
        return _fail(
            f"Unknown communication type {communication_type!r}. "
            f"Expected one of: "
            + ", ".join(t for ts in naming.COMMUNICATION_TYPES.values() for t in ts)
        )

    # The CRS package screen accepts a complete foreign delivery only. Derive
    # every load-bearing value from the XML and reject attempts to override it.
    if communication_type == "CRS":
        validation = validate_foreign_crs(source)
        if not validation.valid:
            detail = "\n".join(f"- {item}" for item in validation.errors)
            return _fail(
                "The selected XML is not a packageable foreign CRS delivery:\n" + detail
            )
        facts = validation.facts
        requested = {
            "sender": (sender or "").upper(),
            "receiver": (receiver or "").upper(),
            "tax year": str(args.tax_year or ""),
        }
        derived = {
            "sender": facts.sender,
            "receiver": facts.receiver,
            "tax year": facts.tax_year,
        }
        mismatches = [
            f"{name} was {requested[name]!r}, but the XML says {value!r}"
            for name, value in derived.items()
            if requested[name] and requested[name] != value
        ]
        if args.message_ref_id and args.message_ref_id != facts.message_ref_id:
            mismatches.append(
                "MessageRefId override differs from the immutable XML MessageRefId"
            )
        if mismatches:
            return _fail(
                "Package facts cannot override the selected XML: " + "; ".join(mismatches)
            )
        sender, receiver, args.tax_year = facts.sender, facts.receiver, facts.tax_year

    try:
        defects = tuple(Defect(d) for d in (args.defect or ()))
    except ValueError as exc:
        return _fail(f"Unknown defect: {exc}")

    try:
        result = pack_from_store(
            source_xml,
            sender=sender,
            receiver=receiver,
            communication_type=communication_type,
            tax_year=args.tax_year,
            signing_password=_resolve_password(args),
            store=_store_path(args),
            message_ref_id=args.message_ref_id,
            defects=defects,
        )
    except (CertificateStoreError, PackagingError) as exc:
        return _fail(str(exc))

    # An --output ending in .zip names the file; anything else is a directory,
    # created if it does not exist yet.
    if args.output:
        destination = Path(args.output)
        if destination.suffix.lower() != ".zip":
            destination.mkdir(parents=True, exist_ok=True)
    else:
        destination = source.parent
    written = result.write(destination)

    payload = {
        "success": True,
        "filePath": str(written),
        "fileName": written.name,
        "fileSize": f"{written.stat().st_size / (1024 * 1024):.2f}",
        "entries": [
            result.entries["metadata"],
            result.entries["key"],
            result.entries["payload"],
        ],
        "senderFileId": result.sender_file_id,
        "sender": sender.upper(),
        "receiver": receiver.upper(),
        "communicationType": communication_type,
        "taxYear": args.tax_year,
        "defects": [d.value for d in result.defects],
    }
    print(json.dumps(payload, indent=2))
    return 0


# --- unpack -----------------------------------------------------------------


def cmd_unpack(args) -> int:
    package = Path(args.package)
    if not package.is_file():
        return _fail(f"Package not found: {package}")

    private_key = None
    if args.country:
        try:
            private_key, _cert = load_signing_material(
                args.country, _resolve_password(args), _store_path(args)
            )
        except CertificateStoreError as exc:
            return _fail(str(exc))

    try:
        # Inspection is deliberately non-strict: metadata should remain visible
        # when the receiver key is wrong, the payload is corrupt, or the
        # decrypted bytes are not a valid inner ZIP. The caller gets a precise
        # check failure instead of losing all diagnostic context.
        result = unpack(package, private_key, strict=False)
    except PackagingError as exc:
        return _fail(str(exc))

    written: str | None = None
    if args.extract_to and result.source_xml:
        target = Path(args.extract_to)
        if target.is_dir() or not target.suffix:
            target.mkdir(parents=True, exist_ok=True)
            target = target / f"{package.stem}.xml"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(result.source_xml)
        written = str(target)

    source_validation = None
    if result.source_xml is not None and result.identity.get("communicationType") == "CRS":
        source_validation = validate_foreign_crs_bytes(
            result.source_xml, "Decrypted source XML"
        )
        result.checks.append({
            "id": "xml-validation",
            "outcome": "pass" if source_validation.valid else "fail",
            "detail": (
                "The decrypted CRS source passes XSD and MDES foreign-delivery rules."
                if source_validation.valid else
                "The decrypted CRS source is not packageable: "
                + "; ".join(source_validation.errors)
            ),
        })
        if not source_validation.valid:
            result.errors.extend(source_validation.errors)
        result.identity["messageRefId"] = source_validation.facts.message_ref_id
        result.identity["docTypeIndics"] = source_validation.facts.doc_type_indics
    elif result.source_xml is None and private_key is not None and not any(
        check["id"] == "xml-validation" for check in result.checks
    ):
        result.checks.append({
            "id": "xml-validation",
            "outcome": "fail",
            "detail": "The source XML could not be obtained after decryption.",
        })

    has_failures = any(check["outcome"] == "fail" for check in result.checks)
    has_pending = any(check["outcome"] == "pending" for check in result.checks)
    if result.source_xml is None and not has_failures and has_pending:
        verdict = "metadata-only"
        upload_ready = None
    else:
        verdict = "upload-ready" if result.source_xml is not None and not has_failures else "not-upload-ready"
        upload_ready = verdict == "upload-ready"

    payload = {
        "success": True,
        "entries": result.entries,
        "metadata": result.metadata,
        "decrypted": result.source_xml is not None,
        "verdict": verdict,
        "uploadReady": upload_ready,
        "warnings": result.warnings,
        "errors": list(dict.fromkeys(result.errors)),
        "checks": result.checks,
        "identity": result.identity,
    }
    if source_validation is not None:
        payload["sourceValidation"] = source_validation.to_dict()
    if result.signature is not None:
        payload["signature"] = {
            "valid": result.signature.valid,
            "reason": result.signature.reason,
            "subject": result.signature.subject,
        }
    if written:
        payload["filePath"] = written
    print(json.dumps(payload, indent=2))
    return 0


def cmd_validate_source(args) -> int:
    """Validate and identify the XML before the package form accepts it."""
    source = Path(args.source)
    if not source.is_file():
        return _fail(f"Source file not found: {source}")
    result = validate_foreign_crs(source)
    print(json.dumps(result.to_dict(), indent=2))
    return 0 if result.valid else 1


# --- certificates -----------------------------------------------------------


def cmd_certificates(args) -> int:
    store = _store_path(args)
    password = _resolve_password(args)
    countries = [args.country.upper()] if args.country else cert_store.list_countries(
        store or cert_store.store_root()
    )

    # A password belongs to one country, so it is only applied when the caller
    # narrowed the listing to that country; a store-wide listing reports the
    # public certificates only.
    entries = []
    for country in countries:
        pw = password if args.country else None
        for info in cert_store.describe_country(country, pw, store):
            entries.append(info.to_dict())

    print(
        json.dumps(
            {
                "success": True,
                "store": str(store or cert_store.store_root()),
                "countries": countries,
                "certificates": entries,
                "warnings": [
                    f"{e['country']} {e['role']} certificate "
                    + ("has expired" if e["is_expired"] else
                       f"expires in {e['days_until_expiry']} days")
                    for e in entries
                    if e["is_expired"] or e["expires_soon"]
                ],
            },
            indent=2,
        )
    )
    return 0


# --- parser -----------------------------------------------------------------


def _add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--store",
        help=f"Certificate store directory (default: ${cert_store.STORE_ENV_VAR} "
             f"or the pack bundled with the app)",
    )
    parser.add_argument(
        "--signing-password",
        help="Signing certificate password. Visible in the process list — prefer "
             f"${PASSWORD_ENV_VAR} or --signing-password-stdin.",
    )
    parser.add_argument(
        "--signing-password-stdin",
        action="store_true",
        help="Read the signing password from the first line of stdin.",
    )


def cmd_passwords(args) -> int:
    """Report which countries can sign, and where each password came from.

    Answers "is this machine set up?" without printing a single password. A
    country counts as resolved only if its certificate actually opens, so a
    stale entry in the password file shows up here rather than at upload time.
    """
    store = _store_path(args)
    if getattr(args, "file", None):
        os.environ[passwords.PASSWORD_FILE_ENV] = args.file
    sources = passwords.describe_sources()
    countries = cert_store.list_countries(store or cert_store.store_root())

    # Which candidate opens each country, by position - never the value itself.
    # The desktop app uses this to import a password file into the OS credential
    # store: it re-reads the file and keeps the candidate named here, so a
    # country listed twice is stored with the entry that actually works rather
    # than whichever came first.
    resolved, unresolved, chosen = [], [], {}
    for country in countries:
        found = passwords.candidates(country)
        for index, candidate in enumerate(found):
            try:
                cert_store.load_signing_material(country, candidate, store)
            except CertificateStoreError:
                continue
            resolved.append(country)
            chosen[country] = index
            break
        else:
            unresolved.append(country)

    ok = bool(resolved) and not unresolved
    print(json.dumps({
        "success": True,
        "configured": ok,
        "store": str(store or cert_store.store_root()),
        "canSign": resolved,
        "cannotSign": unresolved,
        "workingCandidate": chosen,
        **sources,
        "warnings": [
            f"{c} is listed more than once in the password file with different "
            f"values; every one is tried, so this is survivable but worth fixing."
            for c in sources["conflictingCountries"]
        ] + ([
            f"No password source is configured. Set ${passwords.PASSWORD_FILE_ENV} "
            f"to an ART TestData/Certificates/Passwords.csv, or set "
            f"${passwords.PASSWORD_ENV_PREFIX}XX per country."
        ] if not sources["passwordFile"] and not sources["environmentCountries"] else []),
    }, indent=2))
    return 0


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build and open MDES CTS / IDES delivery packages",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Package a foreign CRS delivery for Greenland
  python -m crs_generator.cts_cli pack --source out/foreign.xml \\
      --sender NL --receiver GL --type CRS --tax-year 2024 --output out/

  # Same, but deliberately broken so MDES reports 50013
  python -m crs_generator.cts_cli pack --source out/foreign.xml \\
      --sender NL --receiver GL --type CRS --tax-year 2024 \\
      --defect ecb_mode --output out/

  # Inspect a package; add --country to decrypt it
  python -m crs_generator.cts_cli unpack --package out/NL_CRS_....zip --country NL

  # What is in the certificate store, and what is close to expiry
  python -m crs_generator.cts_cli certificates

  # Is this machine set up to sign? (no password is ever printed)
  MDES_PASSWORDS_FILE=".../TestData/Certificates/Passwords.csv" \
      python -m crs_generator.cts_cli passwords
        """,
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    pack_parser = subparsers.add_parser("pack", help="Build a delivery package")
    pack_parser.add_argument("--source", "-s", required=True, help="Source XML file")
    pack_parser.add_argument("--sender", help="Transmitting country (default: from the XML)")
    pack_parser.add_argument("--receiver", help="Receiving country (default: from the XML)")
    pack_parser.add_argument(
        "--type", "-t", default="CRS",
        help="Communication type: CRS, CRSStatus, CBC, CBCStatus, NTJ, RPT (default: CRS)",
    )
    pack_parser.add_argument("--tax-year", "-y", required=True, help="Tax year")
    pack_parser.add_argument(
        "--output", "-o",
        help="Output directory or file (default: alongside the source)",
    )
    pack_parser.add_argument(
        "--message-ref-id",
        help="Override the MessageRefId used in SenderFileId (default: from the XML)",
    )
    pack_parser.add_argument(
        "--defect", action="append", choices=[d.value for d in Defect],
        help="Deliberately break the package, to exercise an MDES error code. Repeatable.",
    )
    _add_common(pack_parser)
    pack_parser.set_defaults(func=cmd_pack)

    validate_parser = subparsers.add_parser(
        "validate-source", help="Validate and identify a foreign CRS source XML"
    )
    validate_parser.add_argument("--source", "-s", required=True, help="Source XML file")
    validate_parser.set_defaults(func=cmd_validate_source)

    unpack_parser = subparsers.add_parser(
        "unpack", help="Inspect or decrypt a delivery package"
    )
    unpack_parser.add_argument("--package", "-p", required=True, help="Package ZIP")
    unpack_parser.add_argument(
        "--country", "-c",
        help="Receiver country whose private key should open the package. Without "
             "it only the metadata is read.",
    )
    unpack_parser.add_argument(
        "--extract-to", help="Write the decrypted source XML here"
    )
    _add_common(unpack_parser)
    unpack_parser.set_defaults(func=cmd_unpack)

    cert_parser = subparsers.add_parser(
        "certificates", help="List the certificate store and flag expiries"
    )
    cert_parser.add_argument("--country", "-c", help="Limit to one country")
    _add_common(cert_parser)
    cert_parser.set_defaults(func=cmd_certificates)

    password_parser = subparsers.add_parser(
        "passwords",
        help="Which countries can sign, and where their passwords come from",
    )
    password_parser.add_argument(
        "--store", help="Certificate store directory (default: the bundled pack)"
    )
    password_parser.add_argument(
        "--file",
        help=f"Password file to use instead of ${passwords.PASSWORD_FILE_ENV}, "
             f"e.g. an ART TestData/Certificates/Passwords.csv",
    )
    password_parser.set_defaults(func=cmd_passwords)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = create_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "command", None):
        parser.print_help()
        return 1
    try:
        return args.func(args)
    except KeyboardInterrupt:  # pragma: no cover
        return _fail("Interrupted")


if __name__ == "__main__":
    raise SystemExit(main())
