"""Unit tests for the MDES business-rule checker."""

from __future__ import annotations

from lxml import etree

from crs_generator import mdes_rules as mr

NS = "urn:oecd:ties:crs:v2"


def _doc(message_type_indic="CRS701", doctypes=("OECD11",), message_ref=None,
         sending="SC1", country="NL", year="2024", corr_msg_ref=False,
         docrefs=None, birthdate=None, balance=None, corr_docrefs=()):
    if message_ref is None:
        message_ref = f"{country}{year}{sending}MSG1"
    if docrefs is None:
        docrefs = [f"{country}{year}{sending}D{i}" for i in range(len(doctypes))]
    root = etree.Element(f"{{{NS}}}CRS_OECD")
    spec = etree.SubElement(root, f"{{{NS}}}MessageSpec")
    etree.SubElement(spec, f"{{{NS}}}SendingCompanyIN").text = sending
    etree.SubElement(spec, f"{{{NS}}}TransmittingCountry").text = country
    etree.SubElement(spec, f"{{{NS}}}MessageRefId").text = message_ref
    etree.SubElement(spec, f"{{{NS}}}MessageTypeIndic").text = message_type_indic
    if corr_msg_ref:
        etree.SubElement(spec, f"{{{NS}}}CorrMessageRefId").text = "PREV"
    etree.SubElement(spec, f"{{{NS}}}ReportingPeriod").text = f"{year}-12-31"
    body = etree.SubElement(root, f"{{{NS}}}CrsBody")
    for i, dt in enumerate(doctypes):
        ds = etree.SubElement(body, f"{{{NS}}}DocSpec")
        etree.SubElement(ds, f"{{{NS}}}DocTypeIndic").text = dt
        etree.SubElement(ds, f"{{{NS}}}DocRefId").text = docrefs[i]
    for cdr in corr_docrefs:
        etree.SubElement(body, f"{{{NS}}}CorrDocRefId").text = cdr
    if birthdate is not None:
        etree.SubElement(body, f"{{{NS}}}BirthDate").text = birthdate
    if balance is not None:
        etree.SubElement(body, f"{{{NS}}}AccountBalance").text = balance
    return root


def _codes(findings):
    return {f.code for f in findings}


def test_clean_new_message_has_no_findings():
    findings = mr.check_mdes_rules(_doc(), "CRS", environment_is_test=True)
    assert findings == [], [f.as_text() for f in findings]


def test_whitespace_in_messageref_flagged_80025():
    # A SendingCompanyIN with a trailing space used to land a space inside every
    # RefId; both the interior and the trailing case must be flagged.
    root = _doc(sending="SC1 ", message_ref="NL2024SC1 MSG1")
    assert "80025" in _codes(mr.check_mdes_rules(root, "CRS"))


def test_whitespace_in_docref_flagged_80025():
    root = _doc(docrefs=["NL2024SC1 D0"])
    findings = mr.check_mdes_rules(root, "CRS")
    assert "80025" in _codes(findings)
    assert any("DocRefId" in f.message for f in findings if f.code == "80025")


def test_whitespace_findings_are_aggregated_per_tag():
    root = _doc(doctypes=("OECD11", "OECD11"),
                docrefs=["NL2024SC1 D0", "NL2024SC1 D1"])
    docref_findings = [f for f in mr.check_mdes_rules(root, "CRS")
                       if f.code == "80025" and "DocRefId" in f.message]
    assert len(docref_findings) == 1
    assert "and 1 more" in docref_findings[0].message


def test_messageref_format_flagged_80017():
    root = _doc(message_ref="XX9999BADREF")
    assert "80017" in _codes(mr.check_mdes_rules(root, "CRS"))


def test_production_doctype_in_test_env_flagged_50010():
    root = _doc(doctypes=("OECD1",))
    assert "50010" in _codes(mr.check_mdes_rules(root, "CRS", environment_is_test=True))


def test_crs702_with_new_doctype_flagged_80010():
    root = _doc(message_type_indic="CRS702", doctypes=("OECD11",), corr_msg_ref=True)
    assert "80010" in _codes(mr.check_mdes_rules(root, "CRS"))


def test_crs702_missing_corr_message_ref_flagged_80007():
    root = _doc(message_type_indic="CRS702", doctypes=("OECD12",), corr_msg_ref=False)
    assert "80007" in _codes(mr.check_mdes_rules(root, "CRS"))


def test_duplicate_docrefid_flagged_80000():
    root = _doc(doctypes=("OECD11", "OECD11"), docrefs=["NL2024SC1D", "NL2024SC1D"])
    assert "80000" in _codes(mr.check_mdes_rules(root, "CRS"))


def test_negative_balance_flagged_60002():
    root = _doc(balance="-5.00")
    assert "60002" in _codes(mr.check_mdes_rules(root, "CRS"))


def test_bad_birthdate_flagged_60014():
    root = _doc(birthdate="1850-01-01")
    assert "60014" in _codes(mr.check_mdes_rules(root, "CRS"))
