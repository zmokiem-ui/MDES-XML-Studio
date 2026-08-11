"""CSV-driven CRS generation: schema validity, MDES rules, and CRS 3.0 support.

The CSV path had no XML-producing test coverage, which let four separate
schema-ordering and classification bugs ship. Every test here therefore ends at
real XSD validation rather than at a string assertion.
"""

import csv

import pytest
from lxml import etree

from crs_generator import xsd_validator as xv
from crs_generator.csv_generator import CRSXMLFromCSV, generate_from_csv
from crs_generator.csv_parser import (
    CRSCSVParser,
    CSVValidationError,
    generate_csv_preview,
    save_csv_preview,
)
from crs_generator.mdes_rules import check_file
from crs_generator.xml_validator import CRSXMLValidator

BASE_ROW = {
    "SendingCompanyIN": "123456789", "TransmittingCountry": "NL",
    "ReceivingCountry": "DE", "TaxYear": "2024",
    "ReportingFI_TIN": "FI001", "ReportingFI_Name": "Test Bank NV",
    "ReportingFI_Address_Street": "Herengracht", "ReportingFI_Address_BuildingNumber": "1",
    "ReportingFI_Address_City": "Amsterdam", "ReportingFI_Address_PostCode": "1000AA",
    "ReportingFI_Address_CountryCode": "NL",
    "AccountNumber": "ACC000001", "AccountBalance": "1000.00", "AccountCurrency": "EUR",
    "AccountClosed": "false", "AccountDormant": "false",
    "Individual_FirstName": "", "Individual_LastName": "", "Individual_BirthDate": "",
    "Individual_TIN": "", "Individual_TIN_CountryCode": "",
    "Individual_Address_Street": "", "Individual_Address_City": "",
    "Individual_Address_PostCode": "", "Individual_Address_CountryCode": "",
    "Individual_ResCountryCode": "",
    "Organisation_Name": "", "Organisation_TIN": "", "Organisation_TIN_CountryCode": "",
    "Organisation_Address_Street": "", "Organisation_Address_City": "",
    "Organisation_Address_PostCode": "", "Organisation_Address_CountryCode": "",
    "Organisation_ResCountryCode": "",
    "ControllingPerson_FirstName": "", "ControllingPerson_LastName": "",
    "ControllingPerson_BirthDate": "", "ControllingPerson_TIN": "",
    "ControllingPerson_TIN_CountryCode": "", "ControllingPerson_Address_Street": "",
    "ControllingPerson_Address_City": "", "ControllingPerson_Address_CountryCode": "",
    "ControllingPerson_ResCountryCode": "",
    "Payment_Type": "CRS502", "Payment_Amount": "100.00", "Payment_Currency": "EUR",
}

CRS3_ROW_DEFAULTS = {
    "AcctNumberType": "", "SelfCert": "", "DDProcedure": "", "AccountType": "",
    "EquityInterestType": "", "JointAccount_Number": "",
    "ControllingPerson_CtrlgPersonType": "", "ControllingPerson_SelfCert": "",
}


def individual_row(**overrides):
    row = dict(BASE_ROW, **CRS3_ROW_DEFAULTS)
    row.update({
        "Individual_FirstName": "Jan", "Individual_LastName": "Jansen",
        "Individual_BirthDate": "1980-01-01", "Individual_TIN": "NL123456789",
        "Individual_TIN_CountryCode": "DE", "Individual_Address_Street": "Kerkstraat 1",
        "Individual_Address_City": "Utrecht", "Individual_Address_PostCode": "3500AA",
        "Individual_Address_CountryCode": "DE", "Individual_ResCountryCode": "DE",
    })
    row.update(overrides)
    return row


def organisation_row(with_controlling_person=True, **overrides):
    row = dict(BASE_ROW, **CRS3_ROW_DEFAULTS)
    row.update({
        "AccountNumber": "ACC000002",
        "Organisation_Name": "Acme Holding BV", "Organisation_TIN": "NL987654321",
        "Organisation_TIN_CountryCode": "DE", "Organisation_Address_Street": "Dam 2",
        "Organisation_Address_City": "Rotterdam", "Organisation_Address_PostCode": "3000AA",
        "Organisation_Address_CountryCode": "DE", "Organisation_ResCountryCode": "DE",
    })
    if with_controlling_person:
        row.update({
            "ControllingPerson_FirstName": "Piet", "ControllingPerson_LastName": "de Vries",
            "ControllingPerson_BirthDate": "1975-05-05", "ControllingPerson_TIN": "NL555555555",
            "ControllingPerson_TIN_CountryCode": "DE",
            "ControllingPerson_Address_Street": "Plein 3",
            "ControllingPerson_Address_City": "Den Haag",
            "ControllingPerson_Address_CountryCode": "DE",
            "ControllingPerson_ResCountryCode": "DE",
        })
    row.update(overrides)
    return row


def write_csv(tmp_path, rows, name="input.csv"):
    path = tmp_path / name
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return path


def build(tmp_path, rows, version="2.0", test_mode=True, name="input.csv"):
    csv_path = write_csv(tmp_path, rows, name)
    xml_path = tmp_path / f"out_{version}_{name}.xml"
    generate_from_csv(str(csv_path), str(xml_path),
                      crs_version=version, test_mode=test_mode)
    return xml_path


def ns_for(version):
    from crs_generator.generator import CRS_NAMESPACES

    return {"crs": CRS_NAMESPACES[version]}


# --- Schema validity: the four shipped bugs --------------------------------

@pytest.mark.parametrize("version", ["2.0", "3.0"])
def test_csv_output_is_xsd_valid(tmp_path, version):
    xml_path = build(tmp_path, [individual_row(), organisation_row()], version)
    result = xv.validate_file(xml_path)
    assert result.version == version
    assert result.valid, result.errors


@pytest.mark.parametrize("version", ["2.0", "3.0"])
def test_account_reports_live_inside_reporting_group(tmp_path, version):
    """CrsBody is (ReportingFI, ReportingGroup+); reports hang off the group."""
    xml_path = build(tmp_path, [individual_row(), organisation_row()], version)
    ns = ns_for(version)
    tree = etree.parse(str(xml_path))

    for body in tree.iter(f"{{{ns['crs']}}}CrsBody"):
        assert body.find("crs:ReportingGroup", ns) is not None
        assert body.find("crs:AccountReport", ns) is None

    groups = tree.findall(".//crs:ReportingGroup", ns)
    assert groups
    assert sum(len(g.findall("crs:AccountReport", ns)) for g in groups) == 2


def test_address_fix_emits_postcode_before_city(tmp_path):
    """AddressFix_Type is a sequence ending PostCode, City, CountrySubentity."""
    xml_path = build(tmp_path, [individual_row()], "2.0")
    cfc = "urn:oecd:ties:commontypesfatcacrs:v2"
    tree = etree.parse(str(xml_path))

    fixes = list(tree.iter(f"{{{cfc}}}AddressFix"))
    assert fixes
    for fix in fixes:
        names = [etree.QName(child).localname for child in fix]
        assert names.index("PostCode") < names.index("City")


def test_organisation_without_controlling_person_is_valid_crs103(tmp_path):
    """AcctHolderType is mandatory for any Organisation, not only passive NFEs."""
    xml_path = build(tmp_path, [organisation_row(with_controlling_person=False)], "2.0")
    ns = ns_for("2.0")
    tree = etree.parse(str(xml_path))

    holders = tree.findall(".//crs:AccountHolder", ns)
    assert holders
    assert holders[0].findtext("crs:AcctHolderType", namespaces=ns) == "CRS103"
    assert not tree.findall(".//crs:ControllingPerson", ns)

    assert xv.validate_file(xml_path).valid
    # CRS103 with no controlling person satisfies MDES 60005/60006.
    business = CRSXMLValidator().validate_file(str(xml_path))
    assert business.is_valid, business.errors


def test_organisation_with_controlling_person_is_crs101(tmp_path):
    xml_path = build(tmp_path, [organisation_row()], "2.0")
    ns = ns_for("2.0")
    tree = etree.parse(str(xml_path))
    assert tree.findall(".//crs:AccountHolder", ns)[0].findtext(
        "crs:AcctHolderType", namespaces=ns) == "CRS101"
    assert tree.findall(".//crs:ControllingPerson", ns)


# --- DocTypeIndic / environment --------------------------------------------

def test_test_mode_emits_test_doc_type_indic(tmp_path):
    """The app defaults to the test environment; OECD1 there trips MDES 50010."""
    xml_path = build(tmp_path, [individual_row()], "2.0", test_mode=True)
    xml = xml_path.read_text(encoding="utf-8")
    assert "OECD11" in xml
    assert not check_file(str(xml_path), environment_is_test=True)


def test_production_mode_emits_production_doc_type_indic(tmp_path):
    xml_path = build(tmp_path, [individual_row()], "2.0", test_mode=False,
                     name="prod.csv")
    xml = xml_path.read_text(encoding="utf-8")
    assert "OECD1<" in xml or ">OECD1<" in xml
    assert "OECD11" not in xml
    assert not check_file(str(xml_path), environment_is_test=False)


# --- Parser validation -----------------------------------------------------

def test_closed_account_with_balance_is_rejected(tmp_path):
    """MDES 60003. The CSV states both values, so the contradiction is an error."""
    csv_path = write_csv(tmp_path, [individual_row(AccountClosed="true",
                                                   AccountBalance="5000.00")])
    with pytest.raises(CSVValidationError) as excinfo:
        CRSCSVParser(csv_path).parse()
    assert any("60003" in error for error in excinfo.value.errors)


def test_closed_account_with_zero_balance_is_accepted(tmp_path):
    xml_path = build(tmp_path, [individual_row(AccountClosed="true",
                                               AccountBalance="0.00",
                                               Payment_Amount="0.00")], "2.0")
    assert xv.validate_file(xml_path).valid


@pytest.mark.parametrize("column,value", [
    ("AcctNumberType", "OECD999"),
    ("SelfCert", "CRS999"),
    ("DDProcedure", "CRS9999"),
    ("AccountType", "CRS9999"),
    ("EquityInterestType", "CRS999"),
    ("ControllingPerson_CtrlgPersonType", "CRS899"),
    ("ControllingPerson_SelfCert", "CRS1099"),
])
def test_invalid_crs3_enum_values_are_rejected(tmp_path, column, value):
    csv_path = write_csv(tmp_path, [organisation_row(**{column: value})])
    with pytest.raises(CSVValidationError) as excinfo:
        CRSCSVParser(csv_path, crs_version="3.0").parse()
    assert any(column in error for error in excinfo.value.errors)


@pytest.mark.parametrize("value", ["0", "201", "abc"])
def test_invalid_joint_account_number_is_rejected(tmp_path, value):
    csv_path = write_csv(tmp_path, [individual_row(JointAccount_Number=value)])
    with pytest.raises(CSVValidationError) as excinfo:
        CRSCSVParser(csv_path, crs_version="3.0").parse()
    assert any("JointAccount_Number" in error for error in excinfo.value.errors)


def test_oecd606_with_wrong_account_type_is_rejected_at_source(tmp_path):
    """Rule 60017, caught in the CSV so the file is never generated invalid."""
    csv_path = write_csv(tmp_path, [individual_row(AcctNumberType="OECD606",
                                                   AccountType="CRS1102")])
    with pytest.raises(CSVValidationError) as excinfo:
        CRSCSVParser(csv_path, crs_version="3.0").parse()
    assert any("60017" in error for error in excinfo.value.errors)


def test_unsupported_version_is_rejected(tmp_path):
    csv_path = write_csv(tmp_path, [individual_row()])
    with pytest.raises(ValueError, match="Unsupported crs_version"):
        CRSXMLFromCSV(csv_path, tmp_path / "x.xml", crs_version="2.5")


# --- CRS 3.0 content -------------------------------------------------------

def test_v3_csv_columns_drive_the_output(tmp_path):
    # Combinations must satisfy MDES 60017-60023: EquityInterestType only on a
    # CRS1104 holding, whose payments must be CRS503/CRS504.
    rows = [
        individual_row(SelfCert="CRS902", DDProcedure="CRS1202",
                       AccountType="CRS1104", EquityInterestType="CRS401,CRS410",
                       JointAccount_Number="4", AcctNumberType="OECD605",
                       Payment_Type="CRS503"),
        organisation_row(SelfCert="CRS901", DDProcedure="CRS1201",
                         AccountType="CRS1102",
                         ControllingPerson_CtrlgPersonType="CRS807",
                         ControllingPerson_SelfCert="CRS1002"),
    ]
    xml_path = build(tmp_path, rows, "3.0")
    assert xv.validate_file(xml_path).valid

    ns = ns_for("3.0")
    tree = etree.parse(str(xml_path))
    reports = tree.findall(".//crs:AccountReport", ns)
    assert len(reports) == 2

    first, second = reports
    holder = first.find("crs:AccountHolder", ns)
    assert [e.text for e in holder.findall("crs:EquityInterestType", ns)] == ["CRS401", "CRS410"]
    assert holder.findtext("crs:SelfCert", namespaces=ns) == "CRS902"
    assert first.findtext("crs:DDProcedure", namespaces=ns) == "CRS1202"
    assert first.findtext("crs:AccountType", namespaces=ns) == "CRS1104"
    assert first.findtext("crs:JointAccount/crs:Number", namespaces=ns) == "4"
    assert first.find("crs:AccountNumber", ns).get("AcctNumberType") == "OECD605"

    cp = second.find("crs:ControllingPerson", ns)
    assert cp.findtext("crs:CtrlgPersonType", namespaces=ns) == "CRS807"
    assert cp.findtext("crs:SelfCert", namespaces=ns) == "CRS1002"


def test_v3_defaults_apply_when_columns_are_absent(tmp_path):
    """A 2.0-era CSV with no v3 columns still generates a valid 3.0 file."""
    rows = [dict(BASE_ROW), dict(BASE_ROW)]
    rows[0].update({k: v for k, v in individual_row().items() if k in BASE_ROW})
    rows[1].update({k: v for k, v in organisation_row().items() if k in BASE_ROW})
    for row in rows:
        for column in CRS3_ROW_DEFAULTS:
            row.pop(column, None)

    xml_path = build(tmp_path, rows, "3.0", name="legacy.csv")
    assert "AcctNumberType" not in ",".join(rows[0].keys())
    result = xv.validate_file(xml_path)
    assert result.version == "3.0"
    assert result.valid, result.errors

    ns = ns_for("3.0")
    tree = etree.parse(str(xml_path))
    report = tree.findall(".//crs:AccountReport", ns)[0]
    assert report.find("crs:AccountHolder", ns).findtext("crs:SelfCert", namespaces=ns) == "CRS901"
    assert report.findtext("crs:DDProcedure", namespaces=ns) == "CRS1201"
    assert report.findtext("crs:AccountType", namespaces=ns) == "CRS1101"


def test_v2_output_has_no_v3_elements_even_if_columns_present(tmp_path):
    # Deliberately a combination MDES would reject under 3.0 (EquityInterestType
    # on a CRS1103 account): for 2.0 these columns are never emitted, so the
    # 3.0-only cross-field rules must not block the run.
    rows = [individual_row(SelfCert="CRS902", DDProcedure="CRS1202",
                           AccountType="CRS1103", JointAccount_Number="3",
                           EquityInterestType="CRS401")]
    xml = build(tmp_path, rows, "2.0").read_text(encoding="utf-8")
    for tag in ("SelfCert", "DDProcedure", "AccountType", "EquityInterestType", "JointAccount"):
        assert f"<{tag}>" not in xml and f":{tag}>" not in xml


def test_v3_oecd606_output_satisfies_rule_60017(tmp_path):
    xml_path = build(tmp_path, [individual_row(AcctNumberType="OECD606")], "3.0")
    assert xv.validate_file(xml_path).valid
    assert not [f for f in check_file(str(xml_path), environment_is_test=True)
                if f.code == "60017"]

    ns = ns_for("3.0")
    tree = etree.parse(str(xml_path))
    report = tree.findall(".//crs:AccountReport", ns)[0]
    assert report.find("crs:AccountNumber", ns).get("AcctNumberType") == "OECD606"
    assert report.findtext("crs:AccountType", namespaces=ns) == "CRS1101"


# --- Preview round trip ----------------------------------------------------

@pytest.mark.parametrize("version", ["2.0", "3.0"])
def test_preview_csv_round_trips_into_valid_xml(tmp_path, version):
    """The preview CSV is what users save, edit and re-import."""
    rows = generate_csv_preview(
        sending_country="NL", receiving_country="DE", tax_year=2024,
        mytin="123456789", num_fis=2, individual_accounts=3,
        organisation_accounts=3, controlling_persons=1, crs_version=version)
    csv_path = tmp_path / f"preview_{version}.csv"
    save_csv_preview(rows, csv_path)

    xml_path = tmp_path / f"preview_{version}.xml"
    generate_from_csv(str(csv_path), str(xml_path), crs_version=version)

    result = xv.validate_file(xml_path)
    assert result.version == version
    assert result.valid, result.errors

    business = CRSXMLValidator().validate_file(str(xml_path))
    assert business.is_valid, business.errors
    assert not check_file(str(xml_path), environment_is_test=True)


def test_preview_includes_v3_columns_only_for_v3():
    common = dict(sending_country="NL", receiving_country="DE", tax_year=2024,
                  mytin="123456789", num_fis=1, individual_accounts=1,
                  organisation_accounts=1, controlling_persons=1)
    v2_columns = set(generate_csv_preview(**common, crs_version="2.0")[0])
    v3_columns = set(generate_csv_preview(**common, crs_version="3.0")[0])

    assert not (set(CRS3_ROW_DEFAULTS) & v2_columns)
    assert set(CRS3_ROW_DEFAULTS) <= v3_columns


def test_preview_honours_zero_controlling_persons():
    rows = generate_csv_preview(
        sending_country="NL", receiving_country="DE", tax_year=2024,
        mytin="123456789", num_fis=1, individual_accounts=0,
        organisation_accounts=2, controlling_persons=0)
    assert rows
    assert all(not row["ControllingPerson_FirstName"] for row in rows)
