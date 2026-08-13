"""FATCA-CRS combined (FC) 3.0 support.

FC 3.0 carries the CRS 3.0 classification into the combined upload. The trap
here is that the namespace does NOT change between 2.2 and 3.0 — both are
``urn:fatcacrs:ties:v2`` — so the version lives only in ``@version``, and a 3.0
file was previously validated against the 2.2 schema.

There are no FC 3.0 reference files in the MDES trunk (only CRS ones), so the
oracle is the bundled schema plus the MDES record-level rules.
"""

import collections

import pytest
from lxml import etree

from crs_generator import xsd_validator as xv
from crs_generator.fatca_generator import (
    FC3_ACCOUNT_PROFILES,
    FC_TEMPLATES,
    FATCAGenerator,
    FATCAGeneratorConfig,
    SUPPORTED_FC_VERSIONS,
)
from crs_generator.fatca_validator import FATCAXMLValidator
from crs_generator.mdes_rules import check_file

FC_NS = {"f": "urn:oecd:ties:fatcacrstypes:v2"}


def generate(tmp_path, version, **overrides):
    options = dict(
        fc_version=version, sending_country="CW", receiving_country="CW",
        tax_year=2024, sending_company_in="20016636", num_reporting_fis=2,
        individual_accounts_per_fi=10, organisation_accounts_per_fi=10,
        controlling_persons_per_org=2, seed=13,
        output_path=tmp_path / f"fc_{version}.xml",
    )
    options.update(overrides)
    return FATCAGenerator(FATCAGeneratorConfig(**options)).generate()


def reports(path):
    tree = etree.parse(str(path))
    return tree.findall(".//f:AccountReport", FC_NS)


# --- Configuration ----------------------------------------------------------

def test_default_version_is_2_2():
    assert FATCAGeneratorConfig(output_path="out/unused.xml").fc_version == "2.2"


def test_unsupported_version_is_rejected():
    with pytest.raises(ValueError, match="Unsupported fc_version"):
        FATCAGeneratorConfig(fc_version="2.5", output_path="out/unused.xml")


@pytest.mark.parametrize("version", SUPPORTED_FC_VERSIONS)
def test_each_version_has_a_template(version):
    from pathlib import Path

    import crs_generator

    template = Path(crs_generator.__file__).parent / "template FATCA" / FC_TEMPLATES[version]
    assert template.exists()


# --- Generation -------------------------------------------------------------

@pytest.mark.parametrize("version", SUPPORTED_FC_VERSIONS)
def test_generated_file_validates_against_its_own_schema(tmp_path, version):
    result = xv.validate_file(generate(tmp_path, version))
    assert result.message_type == "FATCA_CRS"
    assert result.version == version
    assert result.valid, result.errors


@pytest.mark.parametrize("version", SUPPORTED_FC_VERSIONS)
def test_generated_file_passes_the_business_validator(tmp_path, version):
    result = FATCAXMLValidator().validate_file(str(generate(tmp_path, version)))
    assert result.xml_version == version
    assert result.is_valid, result.errors


@pytest.mark.parametrize("version", SUPPORTED_FC_VERSIONS)
def test_generated_file_breaks_no_mdes_rule(tmp_path, version):
    path = generate(tmp_path, version)
    assert check_file(str(path), environment_is_test=True) == []


def test_version_lives_only_in_the_attribute(tmp_path):
    """Both versions share a namespace; @version is the only discriminator."""
    roots = {v: etree.parse(str(generate(tmp_path, v))).getroot()
             for v in SUPPORTED_FC_VERSIONS}
    namespaces = {etree.QName(r.tag).namespace for r in roots.values()}
    assert namespaces == {"urn:fatcacrs:ties:v2"}
    assert roots["2.2"].get("version") == "2.2"
    assert roots["3.0"].get("version") == "3.0"


def test_version_is_auto_detected_from_the_attribute(tmp_path):
    """Without this a 3.0 file is silently checked against the 2.2 schema."""
    for version in SUPPORTED_FC_VERSIONS:
        root = etree.parse(str(generate(tmp_path, version))).getroot()
        assert xv.detect_version(root, "FATCA_CRS") == version


def test_v3_emits_the_newly_mandatory_fields(tmp_path):
    found = reports(generate(tmp_path, "3.0"))
    assert found
    for report in found:
        holder = report.find("f:AccountHolder", FC_NS)
        assert holder.findtext("f:SelfCert", namespaces=FC_NS)
        assert report.findtext("f:DDProcedure", namespaces=FC_NS)
        assert report.findtext("f:AccountType", namespaces=FC_NS)
        for cp in report.findall("f:ControllingPerson", FC_NS):
            assert cp.findall("f:CtrlgPersonType", FC_NS)
            assert cp.findtext("f:SelfCert", namespaces=FC_NS)


def test_v2_2_does_not_gain_v3_fields(tmp_path):
    xml = generate(tmp_path, "2.2").read_text(encoding="utf-8")
    for tag in ("SelfCert", "DDProcedure", "AccountType", "JointAccount"):
        assert f":{tag}>" not in xml


def test_v3_never_emits_transitional_not_reported_codes(tmp_path):
    xml = generate(tmp_path, "3.0").read_text(encoding="utf-8")
    for code in ("CRS800", "CRS900", "CRS1000", "CRS1100", "CRS1200"):
        assert f">{code}<" not in xml


def test_every_account_matches_its_profile(tmp_path):
    """AccountType constrains the account-number and payment types (60018-60023)."""
    seen = set()
    for report in reports(generate(tmp_path, "3.0", individual_accounts_per_fi=25,
                                   organisation_accounts_per_fi=25)):
        account_type = report.findtext("f:AccountType", namespaces=FC_NS)
        seen.add(account_type)
        profile = FC3_ACCOUNT_PROFILES[account_type]
        assert report.find("f:AccountNumber", FC_NS).get("AccNumberType") in profile["number_types"]
        for payment in report.findall("f:Payment", FC_NS):
            assert payment.findtext("f:Type", namespaces=FC_NS) in profile["payment_types"]
    assert seen == set(FC3_ACCOUNT_PROFILES)


def test_account_number_types_stay_inside_the_fc_enumeration(tmp_path):
    """FC's AccountNumberType stops at OECD605 — there is no OECD606 as in CRS."""
    used = {r.find("f:AccountNumber", FC_NS).get("AccNumberType")
            for r in reports(generate(tmp_path, "3.0"))}
    assert used <= {"OECD602", "OECD604", "OECD605"}
    assert not used & {"OECD601", "OECD603", "OECD606"}


def test_payments_stay_before_the_classification_fields(tmp_path):
    """Regression: payments were appended, which in 3.0 lands them past DDProcedure."""
    multi_seen = False
    for report in reports(generate(tmp_path, "3.0", individual_accounts_per_fi=25,
                                   organisation_accounts_per_fi=25)):
        names = [etree.QName(child).localname for child in report]
        payments = [i for i, n in enumerate(names) if n == "Payment"]
        if len(payments) > 1:
            multi_seen = True
        if payments:
            assert max(payments) < names.index("DDProcedure")
    assert multi_seen, "sample did not exercise multi-payment accounts"


def test_joint_account_number_is_in_range(tmp_path):
    numbers = [int(n.text) for n in etree.parse(str(
        generate(tmp_path, "3.0", individual_accounts_per_fi=30,
                 organisation_accounts_per_fi=30))).findall(
        ".//f:JointAccount/f:Number", FC_NS)]
    assert numbers, "expected at least one joint account in a 60-account sample"
    assert all(1 <= n <= 200 for n in numbers)


# --- The business validator catches violations ------------------------------

@pytest.mark.parametrize("code,mutate", [
    ("60018", lambda r: r.find("f:AccountNumber", FC_NS).set("AccNumberType", "OECD601")),
    ("60020", lambda r: r.find("f:AccountNumber", FC_NS).set("AccNumberType", "OECD602")),
])
def test_validator_reports_account_number_type_violations(tmp_path, code, mutate):
    target = "CRS1103" if code == "60020" else None
    tree = etree.parse(str(generate(tmp_path, "3.0")))
    changed = 0
    for report in tree.findall(".//f:AccountReport", FC_NS):
        account_type = report.findtext("f:AccountType", namespaces=FC_NS)
        if code == "60018" and account_type == "CRS1101":
            continue
        if target and account_type != target:
            continue
        mutate(report)
        changed += 1
    assert changed

    broken = tmp_path / f"fc_broken_{code}.xml"
    tree.write(str(broken), encoding="utf-8", xml_declaration=True)
    result = FATCAXMLValidator().validate_file(str(broken))
    assert not result.is_valid
    assert sum(code in e for e in result.errors) == changed


def test_validator_reports_missing_mandatory_fields(tmp_path):
    tree = etree.parse(str(generate(tmp_path, "3.0")))
    removed = 0
    for report in tree.findall(".//f:AccountReport", FC_NS):
        dd = report.find("f:DDProcedure", FC_NS)
        if dd is not None:
            report.remove(dd)
            removed += 1
    assert removed

    broken = tmp_path / "fc_missing_dd.xml"
    tree.write(str(broken), encoding="utf-8", xml_declaration=True)
    result = FATCAXMLValidator().validate_file(str(broken))
    assert not result.is_valid
    assert sum("DDProcedure" in e for e in result.errors) == removed


def test_validator_accepts_fatca105(tmp_path):
    """FATCA105 is schema-valid; the validator used to reject it."""
    path = generate(tmp_path, "3.0")
    tree = etree.parse(str(path))
    changed = 0
    for holder in tree.findall(".//f:AccountHolder", FC_NS):
        node = holder.find("f:AcctHolderTypeFATCA", FC_NS)
        if node is not None:
            node.text = "FATCA105"
            changed += 1
    assert changed

    updated = tmp_path / "fc_fatca105.xml"
    tree.write(str(updated), encoding="utf-8", xml_declaration=True)
    assert xv.validate_file(updated).valid
    result = FATCAXMLValidator().validate_file(str(updated))
    assert result.is_valid, result.errors
