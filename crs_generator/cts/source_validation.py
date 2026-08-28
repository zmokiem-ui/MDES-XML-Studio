"""Authoritative validation for XML selected in the foreign CRS packager."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path

from lxml import etree

from .. import mdes_rules, xsd_validator


_TEST_DOCTYPES = {"OECD10", "OECD11", "OECD12", "OECD13"}


def _local(element: etree._Element) -> str:
    return etree.QName(element).localname if isinstance(element.tag, str) else ""


def _child_text(parent: etree._Element, name: str) -> str:
    for child in parent:
        if _local(child) == name:
            return (child.text or "").strip()
    return ""


@dataclass
class ForeignCrsFacts:
    sender: str = ""
    receiver: str = ""
    communication_type: str = "CRS"
    tax_year: str = ""
    reporting_period: str = ""
    message_ref_id: str = ""
    message_type_indic: str = ""
    doc_type_indics: list[str] = field(default_factory=list)
    schema_version: str = ""

    def to_dict(self) -> dict:
        result = asdict(self)
        result["communicationType"] = result.pop("communication_type")
        result["taxYear"] = result.pop("tax_year")
        result["reportingPeriod"] = result.pop("reporting_period")
        result["messageRefId"] = result.pop("message_ref_id")
        result["messageTypeIndic"] = result.pop("message_type_indic")
        result["docTypeIndics"] = result.pop("doc_type_indics")
        result["schemaVersion"] = result.pop("schema_version")
        return result


@dataclass
class ForeignCrsValidation:
    valid: bool
    facts: ForeignCrsFacts = field(default_factory=ForeignCrsFacts)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "success": self.valid,
            "valid": self.valid,
            "facts": self.facts.to_dict(),
            "errors": self.errors,
            "warnings": self.warnings,
            "error": self.errors[0] if self.errors else "",
        }


def _validate_foreign_crs_tree(tree: etree._ElementTree) -> ForeignCrsValidation:
    """Validate a parsed foreign CRS delivery and derive locked facts."""
    facts = ForeignCrsFacts()
    errors: list[str] = []
    warnings: list[str] = []

    root = tree.getroot()
    try:
        detected_type = xsd_validator.detect_message_type(root)
    except Exception as exc:
        return ForeignCrsValidation(False, facts, [str(exc)])
    if detected_type != "CRS" or _local(root) != "CRS_OECD":
        return ForeignCrsValidation(
            False, facts,
            [f"This packager accepts a foreign CRS delivery; detected {detected_type}."],
        )

    message_spec = next((el for el in root if _local(el) == "MessageSpec"), None)
    if message_spec is None:
        return ForeignCrsValidation(False, facts, ["CRS MessageSpec is missing."])

    facts.sender = _child_text(message_spec, "TransmittingCountry").upper()
    facts.receiver = _child_text(message_spec, "ReceivingCountry").upper()
    facts.reporting_period = _child_text(message_spec, "ReportingPeriod")
    facts.tax_year = facts.reporting_period[:4]
    facts.message_ref_id = _child_text(message_spec, "MessageRefId")
    facts.message_type_indic = _child_text(message_spec, "MessageTypeIndic")

    if len(facts.sender) != 2:
        errors.append("TransmittingCountry must be a two-letter country code.")
    if len(facts.receiver) != 2:
        errors.append("ReceivingCountry must be a two-letter country code.")
    if facts.sender and facts.sender == facts.receiver:
        errors.append(
            "This is not a foreign CRS delivery: TransmittingCountry and "
            f"ReceivingCountry are both {facts.sender}."
        )
    if len(facts.tax_year) != 4 or not facts.tax_year.isdigit():
        errors.append("ReportingPeriod does not provide a four-digit reporting year.")

    try:
        xsd = xsd_validator.validate_tree(tree)
        facts.schema_version = xsd.version or ""
        if not xsd.valid:
            errors.extend(
                f"XSD line {item['line']}: {item['message']}" for item in xsd.errors
            )
    except Exception as exc:
        errors.append(f"XSD validation could not run: {exc}")

    doctypes = {
        (el.text or "").strip() for el in root.iter() if _local(el) == "DocTypeIndic"
    }
    facts.doc_type_indics = sorted(item for item in doctypes if item)
    environment_is_test = bool(doctypes & _TEST_DOCTYPES)
    try:
        findings = mdes_rules.check_mdes_rules(
            root, "CRS", environment_is_test=environment_is_test, file_type="foreign"
        )
        for finding in findings:
            rendered = finding.as_text()
            (errors if finding.severity == "error" else warnings).append(rendered)
    except Exception as exc:
        errors.append(f"MDES foreign-delivery validation could not run: {exc}")

    errors = list(dict.fromkeys(errors))
    warnings = list(dict.fromkeys(warnings))
    return ForeignCrsValidation(not errors, facts, errors, warnings)


def validate_foreign_crs_bytes(data: bytes, source_name: str = "the XML payload") -> ForeignCrsValidation:
    """Validate foreign CRS bytes without requiring a temporary file.

    Package inspection receives the decrypted XML in memory. Keeping this path
    on the same validator as the file picker prevents a package from being
    reported as healthy merely because its signature was readable.
    """
    facts = ForeignCrsFacts()
    try:
        parser = etree.XMLParser(resolve_entities=False, no_network=True, huge_tree=True)
        root = etree.fromstring(data, parser)
    except etree.XMLSyntaxError as exc:
        return ForeignCrsValidation(False, facts, [f"{source_name} could not be parsed: {exc}"])
    return _validate_foreign_crs_tree(root.getroottree())


def validate_foreign_crs(path: str | Path) -> ForeignCrsValidation:
    """Validate one schema-valid foreign CRS delivery and derive locked facts."""
    source = Path(path)
    try:
        data = source.read_bytes()
    except OSError as exc:
        return ForeignCrsValidation(
            False, ForeignCrsFacts(), [f"XML could not be read: {exc}"]
        )
    return validate_foreign_crs_bytes(data, str(source))
