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


def _all_raw_texts(root: etree._Element, local_name: str) -> list[str]:
    """Element texts without stripping — whitespace checks need the raw value."""
    return [el.text or "" for el in root.iter() if _local(el.tag) == local_name]


def _has_whitespace(value: str) -> bool:
    return any(ch.isspace() for ch in value)


def _is_crs_v3(root: etree._Element) -> bool:
    """Whether the document is CRS 3.0.

    Matches MDES's own gating: ``validation-templates.xsl`` keys its v3-only
    rules off ``/*/@version = '3.0'``, and ``camel config.xml`` additionally
    routes on the ``urn:oecd:ties:crs:v3`` namespace. Accept either signal.
    """
    if (root.get("version") or "").strip() == "3.0":
        return True
    ns = root.tag.rsplit("}", 1)[0].lstrip("{") if "}" in str(root.tag) else ""
    return ns == "urn:oecd:ties:crs:v3"


def _child_text(parent: etree._Element, local_name: str) -> str | None:
    """Direct-child text by local-name (not descendant — avoids nested matches)."""
    for el in parent:
        if _local(el.tag) == local_name:
            return (el.text or "").strip()
    return None


def _find_all(root: etree._Element, local_name: str) -> list[etree._Element]:
    return [el for el in root.iter() if _local(el.tag) == local_name]


def _direct_texts(parent: etree._Element, local_name: str) -> list[str]:
    """Direct-child texts by local-name, for repeatable elements.

    Direct children only: a ControllingPerson nested in the same AccountReport
    must not have its ResCountryCode counted as the account holder's.
    """
    return [(el.text or "").strip() for el in parent if _local(el.tag) == local_name]


def _attr_by_local(el: etree._Element, local_name: str) -> str | None:
    for key, value in el.attrib.items():
        if _local(key) == local_name:
            return value
    return None


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
    receiving = _first_text(root, "ReceivingCountry") or ""
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
        # Whitespace anywhere in a RefId is fatal, and a SendingCompanyIN with a
        # stray space puts one in *every* RefId at once — so these are reported
        # per tag with a count instead of thousands of near-identical findings.
        # Checked against the raw text because _first_text/_all_texts have
        # already stripped a trailing space away.
        for tag in ("MessageRefId", "CorrMessageRefId", "DocRefId", "CorrDocRefId"):
            bad = [raw for raw in _all_raw_texts(root, tag) if _has_whitespace(raw)]
            if bad:
                extra = f" (and {len(bad) - 1} more)" if len(bad) > 1 else ""
                findings.append(Finding("80025", "error",
                    f"{tag} '{bad[0]}' contains whitespace{extra}."))
        if message_ref:
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

    # --- CRS 3.0 only rules -------------------------------------------------
    if message_type == "CRS" and _is_crs_v3(root):
        for report in _find_all(root, "AccountReport"):
            acct_number = None
            for el in report:
                if _local(el.tag) == "AccountNumber":
                    acct_number = el
                    break
            if acct_number is None:
                continue

            number_type = _attr_by_local(acct_number, "AcctNumberType")
            account_type = _child_text(report, "AccountType")
            shown = (acct_number.text or "").strip()

            payment_types = [
                _child_text(payment, "Type") or ""
                for payment in report
                if _local(payment.tag) == "Payment"
            ]

            holder = next((el for el in report
                           if _local(el.tag) == "AccountHolder"), None)
            has_equity_interest = bool(
                holder is not None
                and [el for el in holder if _local(el.tag) == "EquityInterestType"])

            # --- 60017 / 60018: an OECD606 (specified electronic money product)
            # or OECD601 (IBAN) account number must be a Depository Account.
            for code, forcing_type in (("60017", "OECD606"), ("60018", "OECD601")):
                if number_type == forcing_type and account_type != "CRS1101":
                    findings.append(Finding(code, "error",
                        f"AccountNumber '{shown}' is AcctNumberType {forcing_type}, "
                        f"so AccountType must be CRS1101 (got "
                        f"{account_type or 'nothing'})."))

            # --- 60019: EquityInterestType only belongs on a debt/equity
            # interest in an investment entity.
            if has_equity_interest and account_type != "CRS1104":
                findings.append(Finding("60019", "error",
                    f"AccountNumber '{shown}' provides EquityInterestType, so "
                    f"AccountType must be CRS1104 (got {account_type or 'nothing'})."))

            # --- 60020: a cash value insurance/annuity contract is identified
            # by an unspecified account number.
            if account_type == "CRS1103" and number_type != "OECD605":
                findings.append(Finding("60020", "error",
                    f"AccountNumber '{shown}' is AccountType CRS1103, so "
                    f"AcctNumberType must be OECD605 (got {number_type or 'nothing'})."))

            # --- 60021 / 60022 / 60023: the payment types an account type
            # admits. Each rule fires when *any* payment falls outside the set.
            payment_constraints = (
                ("60021", "CRS1101", {"CRS502"}),
                ("60022", "CRS1104", {"CRS503", "CRS504"}),
                ("60023", "CRS1103", {"CRS503", "CRS504"}),
            )
            for code, constrained_type, allowed in payment_constraints:
                if account_type != constrained_type:
                    continue
                offenders = sorted({p for p in payment_types if p and p not in allowed})
                if offenders:
                    findings.append(Finding(code, "error",
                        f"AccountNumber '{shown}' is AccountType {constrained_type}, "
                        f"so every Payment/Type must be one of "
                        f"{', '.join(sorted(allowed))} (found {', '.join(offenders)})."))

    # --- 60011 / 60012: residence must reach the receiving jurisdiction -----
    # Applies to every CRS version. An account is only reportable to the
    # receiving country if someone on it is resident there: the individual
    # holder (or a controlling person) for 60011, and the entity holder or a
    # controlling person for 60012.
    if message_type == "CRS" and receiving:
        for report in _find_all(root, "AccountReport"):
            holder = next((el for el in report
                           if _local(el.tag) == "AccountHolder"), None)
            if holder is None:
                continue

            controlling_persons = [el for el in report
                                   if _local(el.tag) == "ControllingPerson"]
            cp_countries = {
                text
                for cp in controlling_persons
                for individual in cp
                if _local(individual.tag) == "Individual"
                for text in _direct_texts(individual, "ResCountryCode")
            }

            individual = next((el for el in holder
                               if _local(el.tag) == "Individual"), None)
            organisation = next((el for el in holder
                                 if _local(el.tag) == "Organisation"), None)

            # 60011 is worded per person ("when the Person is a Controlling
            # Person or an Individual Account Holder"), so each such person is
            # checked on its own residences rather than the account's combined
            # set. 60012 below is the one worded as an either/or.
            if individual is not None:
                holder_countries = set(_direct_texts(individual, "ResCountryCode"))
                if receiving not in holder_countries:
                    findings.append(Finding("60011", "error",
                        "An individual account holder must have a ResCountryCode "
                        f"matching the receiving country {receiving}; found "
                        f"{', '.join(sorted(holder_countries)) or 'none'}."))

            for cp in controlling_persons:
                for person in cp:
                    if _local(person.tag) != "Individual":
                        continue
                    own = set(_direct_texts(person, "ResCountryCode"))
                    if receiving not in own:
                        findings.append(Finding("60011", "error",
                            "A controlling person must have a ResCountryCode "
                            f"matching the receiving country {receiving}; found "
                            f"{', '.join(sorted(own)) or 'none'}."))

            if organisation is not None:
                holder_countries = set(_direct_texts(organisation, "ResCountryCode"))
                if receiving not in holder_countries | cp_countries:
                    findings.append(Finding("60012", "error",
                        "An entity account holder or one of its controlling persons "
                        f"must have a ResCountryCode matching the receiving country "
                        f"{receiving}; found "
                        f"{', '.join(sorted(holder_countries | cp_countries)) or 'none'}."))

    return findings


def check_file(path, message_type=None, environment_is_test=True) -> list[Finding]:
    from . import xsd_validator as xv
    tree = etree.parse(str(path))
    root = tree.getroot()
    if message_type is None:
        message_type = xv.detect_message_type(root)
    return check_mdes_rules(root, message_type, environment_is_test)
