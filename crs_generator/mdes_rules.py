"""MDES business-rule checks (beyond XSD).

MDES rejects files that are schema-valid but violate business rules encoded in
the Be Informed intake XSLTs (``validation-templates.xsl`` /
``validate-fce-message.xsl``). This module reproduces the highest-value of
those rules so the app can predict portal acceptance, keyed by the same MDES
error codes (e.g. 80017) for traceability.

The checks are namespace-agnostic (matched by element local-name) so a single
implementation covers CRS (crs:), FATCA-CRS combined (sfa_ftc:) and CBC (cbc:).
Findings are advisory: they are surfaced as warnings, never as the schema
verdict.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from lxml import etree


@dataclass
class Finding:
    code: str
    severity: str  # "error" | "warning"
    message: str

    def as_text(self) -> str:
        return f"[MDES {self.code}] {self.message}"


def _local(tag) -> str:
    if not isinstance(tag, str):
        return ""
    return tag.rsplit("}", 1)[-1]


def _first_text(root: etree._Element, local_name: str) -> str | None:
    for el in root.iter():
        if _local(el.tag) == local_name:
            return (el.text or "").strip()
    return None


def _all_texts(root: etree._Element, local_name: str) -> list[str]:
    out = []
    for el in root.iter():
        if _local(el.tag) == local_name:
            out.append((el.text or "").strip())
    return out


# Which DocTypeIndic codes are production vs test.
_PROD_DOCTYPES = {"OECD0", "OECD1", "OECD2", "OECD3"}
_TEST_DOCTYPES = {"OECD10", "OECD11", "OECD12", "OECD13"}
_NEW_DOCTYPES = {"OECD1", "OECD11"}
_CORR_DOCTYPES = {"OECD2", "OECD3", "OECD12", "OECD13"}


def check_mdes_rules(
    root: etree._Element,
    message_type: str,
    environment_is_test: bool = True,
) -> list[Finding]:
    """Run the MDES business-rule checks applicable to a parsed document."""
    findings: list[Finding] = []

    transmitting = _first_text(root, "TransmittingCountry") or ""
    message_ref = _first_text(root, "MessageRefId") or ""
    sending_company = _first_text(root, "SendingCompanyIN")
    reporting_period = _first_text(root, "ReportingPeriod") or ""
    tax_year = reporting_period[:4] if len(reporting_period) >= 4 else ""
    msg_type_indic = _first_text(root, "MessageTypeIndic") or ""
    doctypes = [d for d in _all_texts(root, "DocTypeIndic")]

    # The MessageRefId/DocRefId format and MessageTypeIndic<->DocTypeIndic rules
    # are Dutch CRS/FC conventions; the IRS FATCA_OECD format has its own
    # identifier conventions, so those checks only apply to the CRS family.
    is_crs_family = message_type in ("CRS", "FATCA_CRS")

    # --- 98017: no SQL-comment substrings anywhere in the file (universal) ---
    xml_text = etree.tostring(root, encoding="unicode")
    if "--" in xml_text or "/*" in xml_text:
        findings.append(Finding("98017", "error",
            "File contains '--' or '/*', which MDES rejects outright."))

    # --- 80026 / 80017 / 80025: SendingCompanyIN + MessageRefId format ---
    if is_crs_family:
        if sending_company is not None and not sending_company:
            findings.append(Finding("80026", "error", "SendingCompanyIN is empty."))
        if message_ref:
            if " " in message_ref:
                findings.append(Finding("80025", "error",
                    "MessageRefId contains a space."))
            if sending_company and tax_year:
                valid_prefixes = {
                    f"{transmitting}{tax_year}{sending_company}",
                    f"{transmitting}{int(tax_year) - 1 if tax_year.isdigit() else tax_year}{sending_company}",
                }
                if not any(message_ref.startswith(p) for p in valid_prefixes):
                    findings.append(Finding("80017", "error",
                        "MessageRefId must start with TransmittingCountry + TaxYear "
                        "+ SendingCompanyIN."))

    # --- 80001: DocRefId prefix rules ---
    if is_crs_family:
        for tag in ("DocRefId", "CorrDocRefId"):
            for ref in _all_texts(root, tag):
                if not ref:
                    continue
                if message_ref and ref[:6] != message_ref[:6]:
                    findings.append(Finding("80001", "warning",
                        f"{tag} '{ref}' first 6 chars differ from MessageRefId."))
                if transmitting and not ref.startswith(transmitting):
                    findings.append(Finding("80001", "warning",
                        f"{tag} '{ref}' does not start with TransmittingCountry "
                        f"'{transmitting}'."))

    # --- 80000: duplicate DocRefId in the same file ---
    docrefs = [r for r in _all_texts(root, "DocRefId") if r]
    dupes = {r for r in docrefs if docrefs.count(r) > 1}
    for r in sorted(dupes):
        findings.append(Finding("80000", "error", f"DocRefId '{r}' used more than once."))

    # --- 50010 / 50011: test vs production DocTypeIndic must match environment ---
    has_prod = any(d in _PROD_DOCTYPES for d in doctypes)
    has_test = any(d in _TEST_DOCTYPES for d in doctypes)
    if environment_is_test and has_prod:
        findings.append(Finding("50010", "error",
            "Production DocTypeIndic (OECD0-3) in a test environment; use OECD10-13."))
    if not environment_is_test and has_test:
        findings.append(Finding("50011", "error",
            "Test DocTypeIndic (OECD10-13) in a production environment; use OECD0-3."))

    # --- 80010: MessageTypeIndic <-> DocTypeIndic compatibility (CRS/FC) ---
    if is_crs_family:
        account_doctypes = [d for d in doctypes]
        if msg_type_indic == "CRS701" and any(d in _CORR_DOCTYPES for d in account_doctypes):
            findings.append(Finding("80010", "error",
                "CRS701 (new) message contains a correction/deletion DocTypeIndic."))
        if msg_type_indic == "CRS702" and any(d in _NEW_DOCTYPES for d in account_doctypes):
            findings.append(Finding("80010", "error",
                "CRS702 (correction) message contains a 'new' DocTypeIndic."))

        # --- 80007: CorrMessageRefId presence for CRS701/702 ---
        has_corr_msg_ref = _first_text(root, "CorrMessageRefId") is not None
        if msg_type_indic == "CRS701" and has_corr_msg_ref:
            findings.append(Finding("80007", "error",
                "CorrMessageRefId present on a CRS701 (new) message."))
        if msg_type_indic == "CRS702" and not has_corr_msg_ref:
            findings.append(Finding("80007", "error",
                "CRS702 (correction) message is missing CorrMessageRefId."))

    # --- 60014: BirthDate must be a real date, year >= 1900, before today ---
    today = date.today()
    for bd in _all_texts(root, "BirthDate"):
        if not bd:
            continue
        try:
            parsed = datetime.strptime(bd[:10], "%Y-%m-%d").date()
        except ValueError:
            findings.append(Finding("60014", "warning", f"BirthDate '{bd}' is not a valid date."))
            continue
        if parsed.year < 1900 or parsed >= today:
            findings.append(Finding("60014", "warning",
                f"BirthDate '{bd}' must have year >= 1900 and be before today."))

    # --- 60002: AccountBalance must be non-negative ---
    for bal in _all_texts(root, "AccountBalance"):
        try:
            if bal and float(bal) < 0:
                findings.append(Finding("60002", "error", f"AccountBalance '{bal}' is negative."))
        except ValueError:
            pass

    return findings


def check_file(path, message_type=None, environment_is_test=True) -> list[Finding]:
    from . import xsd_validator as xv
    tree = etree.parse(str(path))
    root = tree.getroot()
    if message_type is None:
        message_type = xv.detect_message_type(root)
    return check_mdes_rules(root, message_type, environment_is_test)
