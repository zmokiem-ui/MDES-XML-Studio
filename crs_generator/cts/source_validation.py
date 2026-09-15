"""Authoritative validation for XML selected in the delivery packager.

The packager builds CTS and IDES deliveries, so this module identifies which
family a selected document belongs to before it derives any package facts. The
families are the ones ``naming.MODULES`` can name; anything else is refused
here rather than producing a package MDES will reject without diagnosing.

A family decides more than a label. CRS and CbC address a named receiving
authority, and the country pair is the routing, so both countries are locked to
the document. FATCA does not work that way: an IDES delivery is always
addressed to the IRS entity id, and the ``_Key`` member names whichever country
holds the private key that opens the package -- the MDES instance, not the
``ReceivingCountry`` in the XML. For FATCA the receiver is therefore a default
taken from the document, not a fact derived from it.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path

from lxml import etree

from .. import mdes_rules, xsd_validator


_TEST_DOCTYPES = {"OECD10", "OECD11", "OECD12", "OECD13"}


@dataclass(frozen=True)
class _Family:
    """One deliverable document family, keyed by detected message type."""
    root: str                 # expected root local name
    communication_type: str   # the CTS/IDES communication type it packages as
    label: str                # how the app names this delivery to the user
    locks_receiver: bool      # whether the XML's ReceivingCountry is binding
    foreign: bool             # whether the cross-border rule checks apply


# Only these reach the packager. FATCA_CRS is deliberately absent: it is the
# domestic FC intake format, uploaded to MDES as it is, and has no CTS delivery.
_FAMILIES: dict[str, _Family] = {
    "CRS": _Family("CRS_OECD", "CRS", "foreign CRS delivery", True, True),
    "FATCA_OECD": _Family("FATCA_OECD", "RPT", "FATCA (IDES) delivery", False, False),
    "CBC": _Family("CBC_OECD", "CBC", "foreign CbC delivery", True, True),
}

_NOT_DELIVERABLE = {
    "FATCA_CRS": (
        "FATCA_CRS is the domestic FC upload format; MDES takes it as it is, "
        "so there is no delivery to package."
    ),
}


def _local(element: etree._Element) -> str:
    return etree.QName(element).localname if isinstance(element.tag, str) else ""


def _child_text(parent: etree._Element, name: str) -> str:
    for child in parent:
        if _local(child) == name:
            return (child.text or "").strip()
    return ""


def communication_type_for(message_type: str) -> str:
    """The communication type a detected message type packages as, else empty."""
    family = _FAMILIES.get(message_type)
    return family.communication_type if family else ""


def message_type_for(communication_type: str) -> str:
    """The message type a communication type expects, else empty.

    Only the report types map. A status message is a different document
    altogether -- MDES writes it, we merely feed it back in -- so ``CRSStatus``
    deliberately resolves to nothing and skips these checks.
    """
    wanted = (communication_type or "").strip().upper()
    for message_type, family in _FAMILIES.items():
        if family.communication_type.upper() == wanted:
            return message_type
    return ""


@dataclass
class DeliveryFacts:
    sender: str = ""
    receiver: str = ""
    communication_type: str = ""
    message_type: str = ""
    delivery_label: str = ""
    receiver_locked: bool = True
    tax_year: str = ""
    reporting_period: str = ""
    message_ref_id: str = ""
    message_type_indic: str = ""
    doc_type_indics: list[str] = field(default_factory=list)
    schema_version: str = ""

    def to_dict(self) -> dict:
        result = asdict(self)
        result["communicationType"] = result.pop("communication_type")
        result["messageType"] = result.pop("message_type")
        result["deliveryLabel"] = result.pop("delivery_label")
        result["receiverLocked"] = result.pop("receiver_locked")
        result["taxYear"] = result.pop("tax_year")
        result["reportingPeriod"] = result.pop("reporting_period")
        result["messageRefId"] = result.pop("message_ref_id")
        result["messageTypeIndic"] = result.pop("message_type_indic")
        result["docTypeIndics"] = result.pop("doc_type_indics")
        result["schemaVersion"] = result.pop("schema_version")
        return result


@dataclass
class DeliveryValidation:
    valid: bool
    facts: DeliveryFacts = field(default_factory=DeliveryFacts)
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


def _unsupported(detected: str) -> str:
    explained = _NOT_DELIVERABLE.get(detected)
    if explained:
        return explained
    accepted = ", ".join(family.label for family in _FAMILIES.values())
    return f"This packager accepts a {accepted}; detected {detected}."


def _validate_delivery_tree(tree: etree._ElementTree) -> DeliveryValidation:
    """Validate a parsed delivery document and derive its locked facts."""
    facts = DeliveryFacts()
    errors: list[str] = []
    warnings: list[str] = []

    root = tree.getroot()
    try:
        detected_type = xsd_validator.detect_message_type(root)
    except Exception as exc:
        return DeliveryValidation(False, facts, [str(exc)])

    family = _FAMILIES.get(detected_type)
    if family is None or _local(root) != family.root:
        return DeliveryValidation(False, facts, [_unsupported(detected_type)])

    facts.message_type = detected_type
    facts.communication_type = family.communication_type
    facts.delivery_label = family.label
    facts.receiver_locked = family.locks_receiver

    message_spec = next((el for el in root if _local(el) == "MessageSpec"), None)
    if message_spec is None:
        return DeliveryValidation(
            False, facts, [f"{detected_type} MessageSpec is missing."]
        )

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
    if family.foreign and facts.sender and facts.sender == facts.receiver:
        errors.append(
            f"This is not a {family.label}: TransmittingCountry and "
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
            root,
            detected_type,
            environment_is_test=environment_is_test,
            # The cross-border check reads the country pair as the routing, which
            # is only what it means for a CTS delivery. An IDES package is routed
            # by its metadata, so the pair in a FATCA document says nothing here.
            file_type="foreign" if family.foreign else None,
        )
        for finding in findings:
            rendered = finding.as_text()
            (errors if finding.severity == "error" else warnings).append(rendered)
    except Exception as exc:
        errors.append(f"MDES delivery validation could not run: {exc}")

    errors = list(dict.fromkeys(errors))
    warnings = list(dict.fromkeys(warnings))
    return DeliveryValidation(not errors, facts, errors, warnings)


def validate_delivery_bytes(
    data: bytes, source_name: str = "the XML payload"
) -> DeliveryValidation:
    """Validate delivery bytes without requiring a temporary file.

    Package inspection receives the decrypted XML in memory. Keeping this path
    on the same validator as the file picker prevents a package from being
    reported as healthy merely because its signature was readable.
    """
    facts = DeliveryFacts()
    try:
        parser = etree.XMLParser(resolve_entities=False, no_network=True, huge_tree=True)
        root = etree.fromstring(data, parser)
    except etree.XMLSyntaxError as exc:
        return DeliveryValidation(
            False, facts, [f"{source_name} could not be parsed: {exc}"]
        )
    return _validate_delivery_tree(root.getroottree())


def validate_delivery_source(path: str | Path) -> DeliveryValidation:
    """Validate one schema-valid delivery document and derive its locked facts."""
    source = Path(path)
    try:
        data = source.read_bytes()
    except OSError as exc:
        return DeliveryValidation(
            False, DeliveryFacts(), [f"XML could not be read: {exc}"]
        )
    return validate_delivery_bytes(data, str(source))
