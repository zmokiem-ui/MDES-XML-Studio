"""MDES target CLI - inspect an instance, and build a package that fits it.

Same contract as the other CLIs in this package: a JSON object on stdout, exit 0
on success and 1 on failure, so the Electron bridge can treat it like any other
backend command.

    python -m crs_generator.mdes_target_cli discover
    python -m crs_generator.mdes_target_cli save --name "CW demo" \\
        --props C:/MDES/props/PFGU.properties \\
        --server "localhost\\SQLEXPRESS" --database MDES-DEMO
    python -m crs_generator.mdes_target_cli preflight --target "CW demo"
    python -m crs_generator.mdes_target_cli build --target "CW demo" --output out/

``build`` is the one-click path: it asks the target what would be accepted, then
generates and packages exactly that. Nothing has to be supplied beyond the target
itself.

Passwords never travel in ``argv`` - it is readable by every process on the
machine. The SQL password comes from ``$MDES_TARGET_PASSWORD`` and the signing
certificate password from ``$MDES_SIGNING_PASSWORD``, both set by the desktop app
from the OS credential store.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from .cts.certificates import CertificateStoreError
from .cts.packager import PackagingError, pack_from_store
from .cts.source_validation import validate_foreign_crs
from .mdes_target.database import DatabaseUnavailable, available_drivers
from .mdes_target.preflight import run_preflight
from .mdes_target.profile import (
    ProfileError,
    TargetProfile,
    delete_profile,
    discover_targets,
    get_profile,
    load_profiles,
    resolve_target,
    save_profile,
)
from .mdes_target.props import PropsError, load_properties

DB_PASSWORD_ENV = "MDES_TARGET_PASSWORD"
SIGNING_PASSWORD_ENV = "MDES_SIGNING_PASSWORD"


def _fail(message: str, **extra) -> int:
    print(json.dumps({"success": False, "error": message, **extra}, indent=2))
    return 1


def _db_password() -> str | None:
    return os.environ.get(DB_PASSWORD_ENV) or None


def _resolved(name: str):
    return resolve_target(get_profile(name), _db_password())


# --- discovery and profile management ---------------------------------------


def cmd_discover(args) -> int:
    roots = [args.props_root] if args.props_root else None
    servers = [args.server] if args.server else None
    result = discover_targets(roots, servers)
    result["success"] = True
    result["drivers"] = available_drivers()
    print(json.dumps(result, indent=2))
    return 0


def cmd_list(args) -> int:
    print(json.dumps({
        "success": True,
        "targets": [p.to_dict() for p in load_profiles()],
        "drivers": available_drivers(),
    }, indent=2))
    return 0


def cmd_save(args) -> int:
    if args.props:
        try:
            load_properties(args.props)
        except PropsError as exc:
            return _fail(str(exc))
    profile = TargetProfile(
        name=args.name,
        props_path=args.props or "",
        server=args.server or "",
        database=args.database or "",
        driver=args.driver,
        username=args.username,
    )
    profiles = save_profile(profile)
    print(json.dumps({
        "success": True,
        "saved": profile.to_dict(),
        "targets": [p.to_dict() for p in profiles],
    }, indent=2))
    return 0


def cmd_delete(args) -> int:
    profiles = delete_profile(args.name)
    print(json.dumps({
        "success": True,
        "targets": [p.to_dict() for p in profiles],
    }, indent=2))
    return 0


# --- inspection -------------------------------------------------------------


def cmd_test(args) -> int:
    """Try a connection without saving it.

    Answering "does this work?" before committing a target is the difference
    between a form that silently stores something broken and one that tells you
    what is wrong while you can still fix it.
    """
    profile = TargetProfile(
        name="(test)",
        props_path=args.props or "",
        server=args.server or "",
        database=args.database or "",
        driver=args.driver,
        username=args.username,
    )
    resolution = resolve_target(profile, _db_password())
    facts = resolution.facts
    payload = {
        # Reachable means we got the database open. Errors about the properties
        # file are reported separately so a half-configured target is legible.
        "success": facts is not None,
        "ownCountry": resolution.own_country,
        "errors": resolution.errors,
        "properties": resolution.properties.summary() if resolution.properties else None,
        "database": {
            "name": facts.database,
            "partners": len(facts.partners),
            "acceptedSenders": facts.accepted_senders,
            "ctsAssembly": facts.cts_assembly.to_dict() if facts.cts_assembly else None,
            "ownCertificate": (
                facts.own_certificate.to_dict() if facts.own_certificate else None
            ),
        } if facts else None,
    }
    if facts is None:
        payload["error"] = "; ".join(resolution.errors) or "Could not reach the database."
    print(json.dumps(payload, indent=2, default=str))
    return 0 if facts is not None else 1


def cmd_resolve(args) -> int:
    try:
        resolution = _resolved(args.target)
    except ProfileError as exc:
        return _fail(str(exc))
    payload = resolution.to_dict()
    payload["success"] = True
    print(json.dumps(payload, indent=2, default=str))
    return 0


def cmd_preflight(args) -> int:
    try:
        resolution = _resolved(args.target)
    except ProfileError as exc:
        return _fail(str(exc))
    result = run_preflight(
        resolution,
        sender=args.sender,
        receiver=args.receiver,
        communication_type=args.type,
        tax_year=args.tax_year,
        message_ref_id=args.message_ref_id,
        package_doctype_indics=args.doctype_indic,
    )
    payload = result.to_dict()
    payload["success"] = True
    payload["target"] = resolution.profile.name
    print(json.dumps(payload, indent=2, default=str))
    return 0


# --- building ---------------------------------------------------------------


def _generate_xml(resolution, result, output_dir: Path, args) -> Path:
    """Generate a document shaped for this target.

    ``test_mode`` follows the instance's own configuration, which is what keeps
    DocTypeIndic in the range it will accept (MDES 50010 / 50011). Sender and
    receiver differing makes it a foreign delivery, which is the normal shape for
    something uploaded to a partner's portal.
    """
    import contextlib

    from .generator import CRSGenerator, GeneratorConfig

    output_dir.mkdir(parents=True, exist_ok=True)
    destination = output_dir / f"{result.sender}_to_{result.receiver}_{result.tax_year}.xml"

    config = GeneratorConfig(
        sending_country=result.sender,
        receiving_country=result.receiver,
        file_type="foreign" if result.sender != result.receiver else "domestic",
        tax_year=int(result.tax_year),
        mytin=args.tin,
        num_reporting_fis=args.reporting_fis,
        individual_accounts_per_fi=args.individual_accounts,
        organisation_accounts_per_fi=args.organisation_accounts,
        controlling_persons_per_org=1,
        output_path=destination,
        test_mode=(
            resolution.properties.is_test_environment
            if resolution.properties else True
        ),
        show_progress=False,
        pretty_print=True,
    )
    # The generator writes a banner straight to stdout regardless of
    # show_progress, and stdout here is a JSON channel. Send it to stderr, where
    # it is still visible in the Electron log.
    with contextlib.redirect_stdout(sys.stderr):
        return CRSGenerator(config).generate(use_parallel=False)


def _package(resolution, result, source: Path, output_dir: Path) -> dict:
    # FATCA/IDES metadata carries entity ids rather than country codes. They were
    # previously hardcoded from a captured delivery; the instance's own
    # properties file is the correct source, so use it when we have one.
    ides: dict[str, str] = {}
    properties = resolution.properties
    if properties is not None:
        if properties.fatca_entity_sender_id:
            ides["ides_sender_id"] = properties.fatca_entity_sender_id
        if properties.fatca_entity_receiver_id:
            ides["ides_receiver_id"] = properties.fatca_entity_receiver_id

    package = pack_from_store(
        source,
        sender=result.sender,
        receiver=result.receiver,
        communication_type=result.communication_type,
        tax_year=result.tax_year,
        signing_password=os.environ.get(SIGNING_PASSWORD_ENV),
        **ides,
    )
    written = package.write(output_dir)
    return {
        "filePath": str(written),
        "fileName": written.name,
        "fileSize": f"{written.stat().st_size / (1024 * 1024):.2f}",
        "entries": [
            package.entries["metadata"],
            package.entries["key"],
            package.entries["payload"],
        ],
        "senderFileId": package.sender_file_id,
    }


def _blocked_response(result, target: str) -> int:
    payload = result.to_dict()
    payload["success"] = False
    payload["target"] = target
    payload["error"] = (
        "Preflight blocked this package: "
        + "; ".join(f"{c.title} - {c.detail}" for c in result.failures)
    )
    print(json.dumps(payload, indent=2, default=str))
    return 1


def cmd_build(args) -> int:
    """One click: ask the target what it accepts, then generate and package it."""
    try:
        resolution = _resolved(args.target)
    except ProfileError as exc:
        return _fail(str(exc))

    result = run_preflight(
        resolution,
        sender=args.sender,
        receiver=args.receiver,
        communication_type=args.type,
        tax_year=args.tax_year,
    )
    if result.blocked and not args.force:
        return _blocked_response(result, resolution.profile.name)
    if not result.sender or not result.receiver:
        return _fail(
            "Could not work out who to send as. No partner jurisdiction on this "
            "target has a certificate matching ours.",
            **result.to_dict(),
        )
    if result.tax_year is None:
        result.tax_year = (
            resolution.properties.first_delivery_year if resolution.properties else None
        ) or 2024

    output_dir = Path(args.output) if args.output else Path.cwd()
    source_validation = None
    try:
        source = _generate_xml(resolution, result, output_dir, args)
        if args.type.upper() == "CRS":
            source_validation = validate_foreign_crs(source)
            if not source_validation.valid:
                return _fail(
                    "The generated XML failed the packageability checks: "
                    + "; ".join(source_validation.errors),
                    **result.to_dict(),
                    sourceValidation=source_validation.to_dict(),
                )
        package = _package(resolution, result, source, output_dir)
    except (CertificateStoreError, PackagingError) as exc:
        return _fail(str(exc), **result.to_dict())
    except Exception as exc:
        return _fail(f"Build failed: {exc}", **result.to_dict())

    payload = result.to_dict()
    payload.update(package)
    payload["success"] = True
    payload["target"] = resolution.profile.name
    payload["sourceFile"] = str(source)
    if source_validation is not None:
        payload["sourceValidation"] = source_validation.to_dict()
    payload["forced"] = bool(args.force and result.blocked)
    print(json.dumps(payload, indent=2, default=str))
    return 0


def cmd_package(args) -> int:
    """Package an XML you already have, applying the same preflight."""
    source = Path(args.source)
    if not source.is_file():
        return _fail(f"Source file not found: {source}")
    from .cts.naming import extract_countries, extract_message_ref_id

    source_xml = source.read_bytes()
    source_validation = None
    detected_sender, detected_receiver = extract_countries(source_xml)
    sender = args.sender or detected_sender
    receiver = args.receiver or detected_receiver
    tax_year = args.tax_year

    # Validate the file before opening the target database. A malformed or
    # non-packageable source is a local file error, not a target-connectivity
    # error, and the user should get that answer even when the target is absent.
    if args.type.upper() == "CRS":
        source_validation = validate_foreign_crs(source)
        if not source_validation.valid:
            return _fail(
                "The selected XML is not a packageable foreign CRS delivery: "
                + "; ".join(source_validation.errors),
                sourceValidation=source_validation.to_dict(),
            )
        facts = source_validation.facts
        mismatches = []
        if args.sender and args.sender.upper() != facts.sender:
            mismatches.append(f"sender is {args.sender.upper()}, XML says {facts.sender}")
        if args.receiver and args.receiver.upper() != facts.receiver:
            mismatches.append(
                f"receiver is {args.receiver.upper()}, XML says {facts.receiver}"
            )
        if tax_year is not None and str(tax_year) != facts.tax_year:
            mismatches.append(f"tax year is {tax_year}, XML says {facts.tax_year}")
        if mismatches:
            return _fail(
                "Package facts cannot override the selected XML: "
                + "; ".join(mismatches),
                sourceValidation=source_validation.to_dict(),
            )
        sender, receiver, tax_year = facts.sender, facts.receiver, int(facts.tax_year)

    try:
        resolution = _resolved(args.target)
    except ProfileError as exc:
        return _fail(str(exc))

    result = run_preflight(
        resolution,
        sender=sender,
        receiver=receiver,
        communication_type=args.type,
        tax_year=tax_year,
        message_ref_id=extract_message_ref_id(source_xml),
        package_doctype_indics=(
            source_validation.facts.doc_type_indics if source_validation else None
        ),
    )
    if result.blocked and not args.force:
        return _blocked_response(result, resolution.profile.name)

    output_dir = Path(args.output) if args.output else source.parent
    try:
        package = _package(resolution, result, source, output_dir)
    except (CertificateStoreError, PackagingError) as exc:
        return _fail(str(exc), **result.to_dict())

    payload = result.to_dict()
    payload.update(package)
    payload["success"] = True
    payload["target"] = resolution.profile.name
    payload["sourceFile"] = str(source)
    if source_validation is not None:
        payload["sourceValidation"] = source_validation.to_dict()
    payload["forced"] = bool(args.force and result.blocked)
    print(json.dumps(payload, indent=2, default=str))
    return 0


# --- parser -----------------------------------------------------------------


def _add_delivery_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--target", "-t", required=True, help="Saved target name")
    parser.add_argument("--sender", help="Transmitting country (default: chosen by preflight)")
    parser.add_argument("--receiver", help="Receiving country (default: the instance's own)")
    parser.add_argument("--type", default="CRS", help="Communication type (default: CRS)")
    parser.add_argument("--tax-year", type=int, help="Tax year (default: from the target)")
    parser.add_argument(
        "--doctype-indic", action="append", default=[],
        help="DocTypeIndic value from an existing package (repeat as needed)",
    )


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Inspect an MDES instance and build packages it will accept",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m crs_generator.mdes_target_cli discover
  python -m crs_generator.mdes_target_cli preflight --target "CW demo"
  python -m crs_generator.mdes_target_cli build --target "CW demo" --output out/
        """,
    )
    subparsers = parser.add_subparsers(dest="command")

    discover = subparsers.add_parser("discover", help="Find properties files and MDES databases")
    discover.add_argument("--props-root", help="Folder to scan for properties files")
    discover.add_argument("--server", help="SQL Server instance to scan")
    discover.set_defaults(func=cmd_discover)

    listing = subparsers.add_parser("list", help="List saved targets")
    listing.set_defaults(func=cmd_list)

    save = subparsers.add_parser("save", help="Add or update a target")
    save.add_argument("--name", required=True)
    save.add_argument("--props", help="Path to the MDES properties file")
    save.add_argument("--server", help="SQL Server instance")
    save.add_argument("--database", help="MDES database name")
    save.add_argument("--driver", help="ODBC driver name")
    save.add_argument("--username", help="SQL login (omit for Windows authentication)")
    save.set_defaults(func=cmd_save)

    test = subparsers.add_parser("test", help="Try a connection without saving it")
    test.add_argument("--props", help="Path to the MDES properties file")
    test.add_argument("--server", help="SQL Server instance")
    test.add_argument("--database", help="MDES database name")
    test.add_argument("--driver", help="ODBC driver name")
    test.add_argument("--username", help="SQL login (omit for Windows authentication)")
    test.set_defaults(func=cmd_test)

    remove = subparsers.add_parser("delete", help="Remove a target")
    remove.add_argument("--name", required=True)
    remove.set_defaults(func=cmd_delete)

    resolve = subparsers.add_parser("resolve", help="Read everything about a target")
    resolve.add_argument("--target", "-t", required=True)
    resolve.set_defaults(func=cmd_resolve)

    preflight = subparsers.add_parser("preflight", help="Check a delivery against a target")
    _add_delivery_args(preflight)
    preflight.add_argument("--message-ref-id", help="Check this MessageRefId for reuse")
    preflight.set_defaults(func=cmd_preflight)

    build = subparsers.add_parser("build", help="Generate and package in one step")
    _add_delivery_args(build)
    build.add_argument("--output", "-o", help="Output directory")
    build.add_argument("--tin", default="123456789", help="SendingCompanyIN")
    build.add_argument("--reporting-fis", type=int, default=1)
    build.add_argument("--individual-accounts", type=int, default=5)
    build.add_argument("--organisation-accounts", type=int, default=5)
    build.add_argument("--force", action="store_true",
                       help="Build even when preflight fails")
    build.set_defaults(func=cmd_build)

    package = subparsers.add_parser("package", help="Package an existing XML for a target")
    _add_delivery_args(package)
    package.add_argument("--source", "-s", required=True, help="Source XML file")
    package.add_argument("--output", "-o", help="Output directory")
    package.add_argument("--force", action="store_true",
                         help="Package even when preflight fails")
    package.set_defaults(func=cmd_package)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = create_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "command", None):
        parser.print_help()
        return 1
    try:
        return args.func(args)
    except DatabaseUnavailable as exc:
        return _fail(str(exc))
    except KeyboardInterrupt:  # pragma: no cover
        return _fail("Interrupted")


if __name__ == "__main__":
    raise SystemExit(main())
