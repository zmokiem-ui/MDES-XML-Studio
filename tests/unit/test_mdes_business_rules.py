"""MDES record-level business rules that the XSD cannot express.

These combinations are all schema-valid, so XSD validation passes and MDES
rejects the upload anyway. v2.0.0 shipped generating several of them; the rules
are catalogued in the MDES model under
``Bibliotheek PFGU/2000 Domeinkennis/2100 Kernbegrippen/Crs Recordlevel Error.bixml``
with the conditions in
``Financiele rekening informatie/.../CRS3 account report semantic rules.bixml``.

Every generator path must therefore be checked against ``check_file``, not only
against the schema.
"""

import collections

import pytest
from lxml import etree

from crs_generator import xsd_validator as xv
from crs_generator.csv_parser import CRSCSVParser, CSVValidationError, generate_csv_preview, save_csv_preview
from crs_generator.csv_generator import generate_from_csv
from crs_generator.generator import (
    CRS3_ACCOUNT_PROFILES,
    CRS_NAMESPACES,
    CRSGenerator,
    GeneratorConfig,
    SUPPORTED_CRS_VERSIONS,
)
from crs_generator.mdes_rules import check_file, check_mdes_rules

from .test_csv_path import individual_row, organisation_row, write_csv


def generate(tmp_path, version, **overrides):
    options = dict(
        crs_version=version, sending_country="NL", receiving_country="DE",
        tax_year=2024, mytin="123456789", num_reporting_fis=2,
        individual_accounts_per_fi=15, organisation_accounts_per_fi=15,
        controlling_persons_per_org=2, seed=17,
        output_path=tmp_path / f"crs_{version}.xml", show_progress=False,
    )
    options.update(overrides)
    return CRSGenerator(GeneratorConfig(**options)).generate(use_parallel=False)


def findings_by_code(path):
    return collections.Counter(f.code for f in check_file(str(path), environment_is_test=True))


# --- The headline guarantee -------------------------------------------------

@pytest.mark.parametrize("version", SUPPORTED_CRS_VERSIONS)
def test_generated_output_breaks_no_mdes_rule(tmp_path, version):
    """Schema-valid is not enough — MDES rejects on business rules too."""
    path = generate(tmp_path, version)
    assert xv.validate_file(path).valid
    assert findings_by_code(path) == collections.Counter()


@pytest.mark.parametrize("version", SUPPORTED_CRS_VERSIONS)
def test_csv_output_breaks_no_mdes_rule(tmp_path, version):
    rows = generate_csv_preview(
        sending_country="NL", receiving_country="DE", tax_year=2024,
        mytin="123456789", num_fis=2, individual_accounts=6,
        organisation_accounts=6, controlling_persons=1, crs_version=version)
    csv_path = tmp_path / f"preview_{version}.csv"
    save_csv_preview(rows, csv_path)

    xml_path = tmp_path / f"preview_{version}.xml"
    generate_from_csv(str(csv_path), str(xml_path), crs_version=version)

    assert xv.validate_file(xml_path).valid
    assert findings_by_code(xml_path) == collections.Counter()


# --- Account-type consistency (60017-60023) ---------------------------------

def test_every_account_matches_its_profile(tmp_path):
    """AccountType determines the legal account-number and payment types."""
    ns = {"crs": CRS_NAMESPACES["3.0"]}
    tree = etree.parse(str(generate(tmp_path, "3.0", individual_accounts_per_fi=40,
                                    organisation_accounts_per_fi=40)))

    seen_types = set()
    for report in tree.findall(".//crs:AccountReport", ns):
        account_type = report.findtext("crs:AccountType", namespaces=ns)
        seen_types.add(account_type)
        profile = CRS3_ACCOUNT_PROFILES[account_type]

        assert report.find("crs:AccountNumber", ns).get("AcctNumberType") in profile["number_types"]

        for payment in report.findall("crs:Payment", ns):
            assert payment.findtext("crs:Type", namespaces=ns) in profile["payment_types"]

        equity = report.find("crs:AccountHolder", ns).findall("crs:EquityInterestType", ns)
        if profile["equity_interest"]:
            assert equity, "CRS1104 accounts should carry EquityInterestType"
        else:
            assert not equity, f"{account_type} must not carry EquityInterestType (60019)"

    assert seen_types == set(CRS3_ACCOUNT_PROFILES), "sample missed an account type"


def test_generator_never_emits_iban_or_isin_account_number_types(tmp_path):
    """OECD601/OECD603 oblige real IBAN/ISIN formats (60000/60001)."""
    ns = {"crs": CRS_NAMESPACES["3.0"]}
    tree = etree.parse(str(generate(tmp_path, "3.0")))
    used = {report.find("crs:AccountNumber", ns).get("AcctNumberType")
            for report in tree.findall(".//crs:AccountReport", ns)}
    assert not used & {"OECD601", "OECD603"}


@pytest.mark.parametrize("code,mutate", [
    ("60017", lambda r, ns: r.find("crs:AccountNumber", ns).set("AcctNumberType", "OECD606")),
    ("60018", lambda r, ns: r.find("crs:AccountNumber", ns).set("AcctNumberType", "OECD601")),
])
def test_forcing_account_number_types_require_crs1101(tmp_path, code, mutate):
    ns = {"crs": CRS_NAMESPACES["3.0"]}
    tree = etree.parse(str(generate(tmp_path, "3.0")))
    changed = 0
    for report in tree.findall(".//crs:AccountReport", ns):
        if report.findtext("crs:AccountType", namespaces=ns) != "CRS1101":
            mutate(report, ns)
            changed += 1
    assert changed

    broken = tmp_path / f"broken_{code}.xml"
    tree.write(str(broken), encoding="utf-8", xml_declaration=True)
    assert findings_by_code(broken)[code] == changed


def test_equity_interest_outside_crs1104_is_reported(tmp_path):
    ns = {"crs": CRS_NAMESPACES["3.0"]}
    tree = etree.parse(str(generate(tmp_path, "3.0")))
    changed = 0
    for report in tree.findall(".//crs:AccountReport", ns):
        if report.findtext("crs:AccountType", namespaces=ns) == "CRS1104":
            continue
        holder = report.find("crs:AccountHolder", ns)
        node = etree.Element(f"{{{ns['crs']}}}EquityInterestType")
        node.text = "CRS401"
        holder.insert(0, node)
        changed += 1
    assert changed

    broken = tmp_path / "broken_60019.xml"
    tree.write(str(broken), encoding="utf-8", xml_declaration=True)
    assert findings_by_code(broken)["60019"] == changed


def test_crs1103_requires_oecd605(tmp_path):
    ns = {"crs": CRS_NAMESPACES["3.0"]}
    tree = etree.parse(str(generate(tmp_path, "3.0")))
    changed = 0
    for report in tree.findall(".//crs:AccountReport", ns):
        if report.findtext("crs:AccountType", namespaces=ns) == "CRS1103":
            report.find("crs:AccountNumber", ns).set("AcctNumberType", "OECD602")
            changed += 1
    assert changed

    broken = tmp_path / "broken_60020.xml"
    tree.write(str(broken), encoding="utf-8", xml_declaration=True)
    assert findings_by_code(broken)["60020"] == changed


@pytest.mark.parametrize("code,account_type,bad_payment", [
    ("60021", "CRS1101", "CRS503"),
    ("60022", "CRS1104", "CRS501"),
    ("60023", "CRS1103", "CRS502"),
])
def test_payment_types_are_constrained_by_account_type(tmp_path, code, account_type, bad_payment):
    ns = {"crs": CRS_NAMESPACES["3.0"]}
    tree = etree.parse(str(generate(tmp_path, "3.0")))
    changed = 0
    for report in tree.findall(".//crs:AccountReport", ns):
        if report.findtext("crs:AccountType", namespaces=ns) != account_type:
            continue
        payments = report.findall("crs:Payment", ns)
        if not payments:
            continue
        payments[0].find("crs:Type", namespaces=ns).text = bad_payment
        changed += 1
    assert changed, f"sample had no {account_type} account with a payment"

    broken = tmp_path / f"broken_{code}.xml"
    tree.write(str(broken), encoding="utf-8", xml_declaration=True)
    assert findings_by_code(broken)[code] == changed


def test_rules_do_not_apply_to_crs_2_0(tmp_path):
    """60017-60023 are gated on version 3.0 in the MDES model."""
    path = generate(tmp_path, "2.0")
    codes = set(findings_by_code(path))
    assert not codes & {"60017", "60018", "60019", "60020", "60021", "60022", "60023"}


# --- Reportable residence (60011/60012) -------------------------------------

@pytest.mark.parametrize("version", SUPPORTED_CRS_VERSIONS)
def test_every_party_is_resident_in_the_receiving_country(tmp_path, version):
    ns = {"crs": CRS_NAMESPACES[version]}
    tree = etree.parse(str(generate(tmp_path, version, receiving_country="DE")))

    reports = tree.findall(".//crs:AccountReport", ns)
    assert reports
    for report in reports:
        holder = report.find("crs:AccountHolder", ns)
        party = (holder.find("crs:Individual", ns)
                 if holder.find("crs:Individual", ns) is not None
                 else holder.find("crs:Organisation", ns))
        assert "DE" in [e.text for e in party.findall("crs:ResCountryCode", ns)]

        for cp in report.findall("crs:ControllingPerson", ns):
            individual = cp.find("crs:Individual", ns)
            assert "DE" in [e.text for e in individual.findall("crs:ResCountryCode", ns)]


def test_residence_variety_is_preserved(tmp_path):
    """The receiving country is added alongside the drawn residence, not instead."""
    ns = {"crs": CRS_NAMESPACES["2.0"]}
    tree = etree.parse(str(generate(tmp_path, "2.0", individual_accounts_per_fi=40,
                                    organisation_accounts_per_fi=0)))
    others = set()
    for holder in tree.findall(".//crs:AccountHolder", ns):
        individual = holder.find("crs:Individual", ns)
        others.update(e.text for e in individual.findall("crs:ResCountryCode", ns))
    assert others - {"DE"}, "expected residences beyond the receiving country"


def test_missing_receiving_residence_is_reported(tmp_path):
    ns = {"crs": CRS_NAMESPACES["2.0"]}
    tree = etree.parse(str(generate(tmp_path, "2.0")))
    removed = 0
    for holder in tree.findall(".//crs:AccountHolder", ns):
        individual = holder.find("crs:Individual", ns)
        if individual is None:
            continue
        for el in individual.findall("crs:ResCountryCode", ns):
            if el.text == "DE":
                individual.remove(el)
                removed += 1
    assert removed

    broken = tmp_path / "broken_60011.xml"
    tree.write(str(broken), encoding="utf-8", xml_declaration=True)
    assert findings_by_code(broken)["60011"] == removed


# --- CSV input is rejected at source ----------------------------------------

@pytest.mark.parametrize("code,overrides", [
    ("60017", {"AcctNumberType": "OECD606", "AccountType": "CRS1102"}),
    ("60018", {"AcctNumberType": "OECD601", "AccountType": "CRS1102"}),
    ("60019", {"EquityInterestType": "CRS401", "AccountType": "CRS1101"}),
    ("60020", {"AccountType": "CRS1103", "AcctNumberType": "OECD602"}),
    ("60021", {"AccountType": "CRS1101", "Payment_Type": "CRS503"}),
    ("60022", {"AccountType": "CRS1104", "Payment_Type": "CRS501"}),
    ("60023", {"AccountType": "CRS1103", "Payment_Type": "CRS502"}),
])
def test_csv_rejects_rule_violating_combinations(tmp_path, code, overrides):
    csv_path = write_csv(tmp_path, [individual_row(**overrides)], f"bad_{code}.csv")
    with pytest.raises(CSVValidationError) as excinfo:
        CRSCSVParser(csv_path, crs_version="3.0").parse()
    assert any(code in error for error in excinfo.value.errors), excinfo.value.errors


def test_csv_rejects_holder_not_resident_in_receiving_country(tmp_path):
    csv_path = write_csv(tmp_path, [individual_row(Individual_ResCountryCode="FR")],
                         "bad_60011.csv")
    with pytest.raises(CSVValidationError) as excinfo:
        CRSCSVParser(csv_path).parse()
    assert any("60011" in error for error in excinfo.value.errors)


def test_csv_rejects_entity_not_reaching_receiving_country(tmp_path):
    csv_path = write_csv(tmp_path, [organisation_row(
        Organisation_ResCountryCode="FR", ControllingPerson_ResCountryCode="FR")],
        "bad_60012.csv")
    with pytest.raises(CSVValidationError) as excinfo:
        CRSCSVParser(csv_path).parse()
    assert any("60012" in error for error in excinfo.value.errors)


def test_csv_v2_run_ignores_v3_only_combination_rules(tmp_path):
    """These columns are never emitted for 2.0, so they must not block it."""
    csv_path = write_csv(tmp_path, [individual_row(
        AccountType="CRS1103", EquityInterestType="CRS401", Payment_Type="CRS502")],
        "v2_ok.csv")
    data = CRSCSVParser(csv_path, crs_version="2.0").parse()
    assert data.reporting_fis
