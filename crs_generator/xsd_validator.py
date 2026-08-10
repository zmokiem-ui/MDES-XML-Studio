"""Real XSD validation for generated CRS / FATCA / FATCA-CRS / CBC XML.

This is the *oracle* the rest of the toolchain trusts. Unlike the hand-rolled
structural checkers in ``xml_validator.py`` / ``fatca_validator.py`` (which are
element-order-blind and were the reason schema-invalid FATCA files shipped
undetected), this module validates against the complete official XSD sets that
MDES itself enforces on upload.

Schema sets live under ``crs_generator/schemas/<family>/<version>/`` — one
self-contained directory per set so lxml resolves the relative ``xs:import`` /
``xs:include`` references. ``build_python_backend.py`` already bundles
``crs_generator/schemas`` as PyInstaller data, so this works both from source
and from a frozen executable (see :func:`schemas_root`).

CLI:
    python -m crs_generator.xsd_validator <file.xml> [--type CRS] [--version 2.0]
    -> prints a JSON ValidationResult; exit code 0 if valid, 1 otherwise.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field, asdict
from functools import lru_cache
from pathlib import Path

from lxml import etree

# --- Message-type / schema registry ----------------------------------------

# (message_type, version) -> path relative to schemas_root(). Paths use the
# exact on-disk casing so resolution is correct on case-sensitive filesystems
# (Linux CI) as well as Windows.
SCHEMA_REGISTRY: dict[tuple[str, str], str] = {
    ("CRS", "2.0"): "CRS/v2.0/CrsXML_v2.0.xsd",
    ("CRS", "3.0"): "CRS/v3.0/CrsXML_v3.0.xsd",
    ("FATCA_CRS", "2.2"): "fatca_crs/v2.2/FatcaCrs_v2.2.xsd",  # NL FC combined
    ("FATCA_OECD", "2.0"): "FATCA/v2.0/FatcaXML_v2.0.xsd",
    ("FATCA_OECD", "2.0.1"): "FATCA/v2.0.1/FatcaXML_v2.0.1.xsd",  # MDES upload version
    ("CBC", "2.0"): "CBC/v2.0/CbcXML_v2.0.xsd",
}

# Default version per message type, used only when the document itself carries
# no version signal. CRS stays on 2.0: 3.0 is opt-in for generation, and a v3
# document is recognised by its own namespace/@version (see detect_version).
DEFAULT_VERSION: dict[str, str] = {
    "CRS": "2.0",
    "FATCA_CRS": "2.2",
    "FATCA_OECD": "2.0.1",
    "CBC": "2.0",
}

# Root-element namespace URI -> message_type. Mirrors MDES's own analyze-*.xsl
# detection. The legacy fatcacrs v1 namespace is mapped too so a stale-namespace
# file is reported as an *invalid* FATCA_CRS document (with schema errors)
# rather than an opaque "unknown type".
NAMESPACE_TO_TYPE: dict[str, str] = {
    "urn:oecd:ties:crs:v2": "CRS",
    "urn:oecd:ties:crs:v3": "CRS",
    "urn:fatcacrs:ties:v2": "FATCA_CRS",
    "urn:fatcacrs:ties:v1": "FATCA_CRS",
    "urn:oecd:ties:fatca:v2": "FATCA_OECD",
    "urn:oecd:ties:cbc:v2": "CBC",
}

# Root-element namespace URI -> schema version, for families where several
# versions coexist and are distinguishable by namespace. CRS 3.0 moved to a new
# namespace (crs:v3) while keeping the same supporting schemas.
NAMESPACE_TO_VERSION: dict[str, str] = {
    "urn:oecd:ties:crs:v2": "2.0",
    "urn:oecd:ties:crs:v3": "3.0",
}

# Expected root local-name per type (used as a secondary signal / sanity check).
ROOT_LOCALNAME: dict[str, str] = {
    "CRS": "CRS_OECD",
    "FATCA_CRS": "FATCA_CRS",
    "FATCA_OECD": "FATCA_OECD",
    "CBC": "CBC_OECD",
}


class UnknownMessageType(Exception):
    """Raised when a document's root element maps to no known message type."""


@dataclass
class ValidationResult:
    valid: bool
    message_type: str | None
    version: str | None
    errors: list[dict] = field(default_factory=list)  # {line, column, message}
    # Kept as a stable field so the IPC/JSON contract is identical to the old
    # hand-rolled validators that callers already parse.
    is_valid: bool = True

    def __post_init__(self):
        # `is_valid` mirrors `valid` for backwards-compatible JSON consumers.
        self.is_valid = self.valid

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self, indent: int | None = None) -> str:
        return json.dumps(self.to_dict(), indent=indent)


# --- Schema location & loading ---------------------------------------------

def schemas_root() -> Path:
    """Directory containing the bundled schema sets.

    When frozen by PyInstaller the data lives under ``sys._MEIPASS`` mirroring
    the package layout; otherwise it sits next to this module.
    """
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        candidate = Path(meipass) / "crs_generator" / "schemas"
        if candidate.exists():
            return candidate
    return Path(__file__).resolve().parent / "schemas"


@lru_cache(maxsize=None)
def load_schema(message_type: str, version: str) -> etree.XMLSchema:
    """Compile and cache the XSD for a (message_type, version) pair.

    The XSD is parsed from its on-disk path (not from a string) so relative
    imports/includes resolve against the schema's own directory — exactly what
    the old flat ``schemas/`` layout could not do.
    """
    try:
        rel = SCHEMA_REGISTRY[(message_type, version)]
    except KeyError:
        raise UnknownMessageType(
            f"No schema registered for ({message_type!r}, {version!r}). "
            f"Known: {sorted(SCHEMA_REGISTRY)}"
        )
    xsd_path = schemas_root() / rel
    if not xsd_path.exists():
        raise FileNotFoundError(f"Schema file missing: {xsd_path}")
    return etree.XMLSchema(etree.parse(str(xsd_path)))


def detect_message_type(root: etree._Element) -> str:
    """Determine the message type from the root element's namespace."""
    qname = etree.QName(root.tag)
    ns = qname.namespace or ""
    if ns in NAMESPACE_TO_TYPE:
        return NAMESPACE_TO_TYPE[ns]
    # Fall back to local-name if a document uses an unexpected namespace URI.
    for mtype, local in ROOT_LOCALNAME.items():
        if qname.localname == local:
            return mtype
    raise UnknownMessageType(
        f"Unrecognised root element '{qname.localname}' in namespace '{ns}'."
    )


def detect_version(root: etree._Element, message_type: str) -> str:
    """Determine the schema version a document should be validated against.

    Mirrors how MDES itself routes CRS uploads (``camel config.xml``): a
    document is v3 if its root namespace is ``urn:oecd:ties:crs:v3`` *or* it
    carries ``@version="3.0"``. Without this, a v3 file would silently be
    checked against the v2 schema and every new CRS 3.0 element would be
    reported as unexpected.
    """
    ns = etree.QName(root.tag).namespace or ""
    by_ns = NAMESPACE_TO_VERSION.get(ns)
    if by_ns is not None:
        return by_ns

    declared = (root.get("version") or "").strip()
    if declared and (message_type, declared) in SCHEMA_REGISTRY:
        return declared

    return DEFAULT_VERSION.get(message_type)


# --- Public validation API --------------------------------------------------

def _errors_from_log(schema: etree.XMLSchema) -> list[dict]:
    return [
        {"line": e.line, "column": e.column, "message": e.message}
        for e in schema.error_log
    ]


def validate_tree(
    tree: etree._ElementTree,
    message_type: str | None = None,
    version: str | None = None,
) -> ValidationResult:
    root = tree.getroot()
    if message_type is None:
        message_type = detect_message_type(root)
    if version is None:
        version = detect_version(root, message_type)
    schema = load_schema(message_type, version)
    valid = schema.validate(tree)
    return ValidationResult(
        valid=valid,
        message_type=message_type,
        version=version,
        errors=[] if valid else _errors_from_log(schema),
    )


def validate_file(
    path: str | Path,
    message_type: str | None = None,
    version: str | None = None,
) -> ValidationResult:
    tree = etree.parse(str(path))
    return validate_tree(tree, message_type, version)


def validate_bytes(
    data: bytes,
    message_type: str | None = None,
    version: str | None = None,
) -> ValidationResult:
    tree = etree.ElementTree(etree.fromstring(data))
    return validate_tree(tree, message_type, version)


# --- CLI --------------------------------------------------------------------

def _main(argv: list[str]) -> int:
    import argparse

    parser = argparse.ArgumentParser(
        prog="python -m crs_generator.xsd_validator",
        description="Validate a CRS/FATCA/FATCA-CRS/CBC XML file against its official XSD.",
    )
    parser.add_argument("xml", help="Path to the XML file to validate.")
    parser.add_argument("--type", dest="message_type", default=None,
                        help="Force message type (CRS, FATCA_CRS, FATCA_OECD, CBC).")
    parser.add_argument("--version", dest="version", default=None,
                        help="Force schema version (e.g. 2.0, 3.0, 2.2). "
                             "Auto-detected from the document when omitted.")
    args = parser.parse_args(argv)

    try:
        result = validate_file(args.xml, args.message_type, args.version)
    except (UnknownMessageType, FileNotFoundError, etree.XMLSyntaxError) as exc:
        err = ValidationResult(
            valid=False, message_type=args.message_type, version=args.version,
            errors=[{"line": 0, "column": 0, "message": str(exc)}],
        )
        print(err.to_json(indent=2))
        return 1

    print(result.to_json(indent=2))
    return 0 if result.valid else 1


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv[1:]))
