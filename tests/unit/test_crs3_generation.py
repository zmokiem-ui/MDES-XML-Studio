"""CRS 3.0 support: version routing, generation, and the new mandatory fields.

The authoritative reference for CRS 3.0 in this repo is the bundled
``crs_generator/schemas/CRS/v3.0/`` schema set, lifted from the MDES trunk. These
tests assert against the schema and against MDES's own version-gated rule 60017
rather than against hand-written expectations.
"""

from datetime import timedelta

import pytest
from lxml import etree

from crs_generator import xsd_validator as xv
from crs_generator.correction_generator import CRSCorrectionGenerator, CorrectionOptions
from crs_generator.error_injector import ErrorInjector
from crs_generator.generator import (
    CRS3_STANDARD_FROM,
    CRS_NAMESPACES,
    CRS_TEMPLATES,
    CRSGenerator,
    GeneratorConfig,
    LEGACY_CRS_VERSION,
    STANDARD_CRS_VERSION,
    SUPPORTED_CRS_VERSIONS,
    crs3_is_standard,
    default_crs_version,
)
from crs_generator.mdes_rules import check_file
from crs_generator.xml_validator import CRSXMLValidator

V3_NS = {"crs": CRS_NAMESPACES["3.0"], "stf": "urn:oecd:ties:crsstf:v5"}


def build(tmp_path, version, **overrides):
    """Generate a small file for the given CRS version and return its path."""
    options = dict(
        crs_version=version,
        sending_country="NL",
        receiving_country="DE",
        tax_year=2024,
        mytin="123456789",
        num_reporting_fis=1,
        individual_accounts_per_fi=6,
        organisation_accounts_per_fi=6,
        controlling_persons_per_org=2,
        seed=11,
        output_path=tmp_path / f"crs_{version}.xml",
        show_progress=False,
        pretty_print=True,
    )
    options.update(overrides)
    return CRSGenerator(GeneratorConfig(**options)).generate(use_parallel=False)


# --- Configuration ----------------------------------------------------------

def test_default_version_follows_the_cutover_date():
    """2.0 until 2027-01-01, 3.0 from then on - without a release in between."""
    day_before = CRS3_STANDARD_FROM - timedelta(days=1)
    assert default_crs_version(day_before) == LEGACY_CRS_VERSION
    assert default_crs_version(CRS3_STANDARD_FROM) == STANDARD_CRS_VERSION
    assert default_crs_version(CRS3_STANDARD_FROM + timedelta(days=1)) == STANDARD_CRS_VERSION

    assert not crs3_is_standard(day_before)
    assert crs3_is_standard(CRS3_STANDARD_FROM)


def test_config_default_version_matches_the_calendar():
    """A caller that does not ask for a version gets today's standard schema."""
    assert GeneratorConfig(output_path="out/unused.xml").crs_version == default_crs_version()


def test_both_versions_stay_selectable_across_the_cutover():
    """Neither version is ever dropped; the cutover only moves the default."""
    for version in (LEGACY_CRS_VERSION, STANDARD_CRS_VERSION):
        assert version in SUPPORTED_CRS_VERSIONS
        config = GeneratorConfig(crs_version=version, output_path="out/unused.xml")
        assert config.crs_version == version


@pytest.mark.parametrize("version", SUPPORTED_CRS_VERSIONS)
def test_supported_versions_have_a_namespace_and_template(version):
    assert version in CRS_NAMESPACES
    template = CRS_TEMPLATES[version]
    from pathlib import Path

    import crs_generator

    assert (Path(crs_generator.__file__).parent / "templates" / template).exists()


def test_unsupported_version_is_rejected():
    with pytest.raises(ValueError, match="Unsupported crs_version"):
        GeneratorConfig(crs_version="2.5", output_path="out/unused.xml")


def test_default_output_path_is_version_distinct():
    """A 3.0 run must not silently overwrite the 2.0 file for the same year."""
    v2 = GeneratorConfig(sending_country="NL", tax_year=2024, crs_version="2.0").output_path
    v3 = GeneratorConfig(sending_country="NL", tax_year=2024, crs_version="3.0").output_path
    assert v2 != v3


# --- Generation -------------------------------------------------------------

@pytest.mark.parametrize("version", SUPPORTED_CRS_VERSIONS)
def test_generated_file_validates_against_its_own_schema(tmp_path, version):
    path = build(tmp_path, version)
    result = xv.validate_file(path)
    assert result.message_type == "CRS"
    assert result.version == version
    assert result.valid, result.errors


@pytest.mark.parametrize("version", SUPPORTED_CRS_VERSIONS)
def test_generated_file_passes_business_validator(tmp_path, version):
    path = build(tmp_path, version)
    result = CRSXMLValidator().validate_file(str(path))
    assert result.xml_version == version
    assert result.is_valid, result.errors


def test_v3_root_carries_v3_namespace_and_version(tmp_path):
    root = etree.parse(str(build(tmp_path, "3.0"))).getroot()
    assert etree.QName(root.tag).namespace == "urn:oecd:ties:crs:v3"
    assert root.get("version") == "3.0"


def test_v3_emits_the_newly_mandatory_fields(tmp_path):
    tree = etree.parse(str(build(tmp_path, "3.0")))
    reports = tree.findall(".//crs:AccountReport", V3_NS)
    assert reports

    for report in reports:
        holder = report.find("crs:AccountHolder", V3_NS)
        assert holder.findtext("crs:SelfCert", namespaces=V3_NS)
        assert report.findtext("crs:DDProcedure", namespaces=V3_NS)
        assert report.findtext("crs:AccountType", namespaces=V3_NS)
        for cp in report.findall("crs:ControllingPerson", V3_NS):
            assert cp.findall("crs:CtrlgPersonType", V3_NS)
            assert cp.findtext("crs:SelfCert", namespaces=V3_NS)


def test_v2_does_not_gain_v3_fields(tmp_path):
    xml = build(tmp_path, "2.0").read_text(encoding="utf-8")
    for tag in ("SelfCert", "DDProcedure", "AccountType", "EquityInterestType", "JointAccount"):
        assert f"<crs:{tag}>" not in xml


def test_v3_never_emits_transitional_not_reported_codes(tmp_path):
    """The xx00 codes exist only for correcting pre-3.0 data, not for new data."""
    xml = build(tmp_path, "3.0").read_text(encoding="utf-8")
    for code in ("CRS400", "CRS800", "CRS900", "CRS1000", "CRS1100", "CRS1200"):
        assert f">{code}<" not in xml


def test_v3_joint_account_number_is_in_range(tmp_path):
    tree = etree.parse(str(build(tmp_path, "3.0", individual_accounts_per_fi=40,
                                 organisation_accounts_per_fi=40)))
    numbers = [int(n.text) for n in tree.findall(".//crs:JointAccount/crs:Number", V3_NS)]
    assert numbers, "expected at least one joint account in a 80-account sample"
    assert all(1 <= n <= 200 for n in numbers)


def test_v3_payments_stay_before_the_classification_fields(tmp_path):
    """Regression: extra Payment clones used to be appended past DDProcedure."""
    tree = etree.parse(str(build(tmp_path, "3.0", individual_accounts_per_fi=30,
                                 organisation_accounts_per_fi=30)))
    multi_payment_seen = False
    for report in tree.findall(".//crs:AccountReport", V3_NS):
        locals_ = [etree.QName(child).localname for child in report]
        payments = [i for i, name in enumerate(locals_) if name == "Payment"]
        if len(payments) > 1:
            multi_payment_seen = True
        if payments:
            assert max(payments) < locals_.index("DDProcedure")
    assert multi_payment_seen, "sample did not exercise multi-payment accounts"


def test_v3_parallel_generation_matches_serial_validity(tmp_path):
    config = GeneratorConfig(
        crs_version="3.0",
        sending_country="NL",
        tax_year=2024,
        mytin="123456789",
        num_reporting_fis=3,
        individual_accounts_per_fi=5,
        organisation_accounts_per_fi=5,
        controlling_persons_per_org=1,
        seed=5,
        output_path=tmp_path / "crs3_parallel.xml",
        show_progress=False,
    )
    path = CRSGenerator(config)._generate_parallel(num_workers=2)

    result = xv.validate_file(path)
    assert result.version == "3.0"
    assert result.valid, result.errors

    root = etree.parse(str(path)).getroot()
    assert root.get("version") == "3.0"
    doc_ref_ids = [e.text for e in root.iter("{urn:oecd:ties:crsstf:v5}DocRefId")]
    assert len(doc_ref_ids) == len(set(doc_ref_ids))


# --- Version detection ------------------------------------------------------

@pytest.mark.parametrize("version", SUPPORTED_CRS_VERSIONS)
def test_version_is_auto_detected_without_being_told(tmp_path, version):
    """A v3 file validated against the v2 schema would fail on every new field."""
    root = etree.parse(str(build(tmp_path, version))).getroot()
    assert xv.detect_version(root, "CRS") == version


def test_version_detected_from_attribute_when_namespace_is_unknown():
    root = etree.fromstring('<CRS_OECD version="3.0"/>')
    assert xv.detect_version(root, "CRS") == "3.0"


# --- MDES rule 60017 --------------------------------------------------------

def test_generated_v3_satisfies_rule_60017(tmp_path):
    path = build(tmp_path, "3.0", individual_accounts_per_fi=40,
                 organisation_accounts_per_fi=40)
    tree = etree.parse(str(path))
    emoney = [r for r in tree.findall(".//crs:AccountReport", V3_NS)
              if r.find("crs:AccountNumber", V3_NS).get("AcctNumberType") == "OECD606"]
    assert emoney, "sample did not exercise OECD606 accounts"
    assert not [f for f in check_file(str(path), environment_is_test=True) if f.code == "60017"]


def test_rule_60017_fires_when_oecd606_is_not_a_depository_account(tmp_path):
    path = build(tmp_path, "3.0", individual_accounts_per_fi=40,
                 organisation_accounts_per_fi=40)
    tree = etree.parse(str(path))

    flipped = 0
    for report in tree.findall(".//crs:AccountReport", V3_NS):
        if report.find("crs:AccountNumber", V3_NS).get("AcctNumberType") == "OECD606":
            report.find("crs:AccountType", V3_NS).text = "CRS1102"
            flipped += 1
    assert flipped

    broken = tmp_path / "crs3_bad_60017.xml"
    tree.write(str(broken), encoding="utf-8", xml_declaration=True)

    findings = [f for f in check_file(str(broken), environment_is_test=True) if f.code == "60017"]
    assert len(findings) == flipped


def test_rule_60017_does_not_apply_to_v2(tmp_path):
    """60017 is gated on version 3.0 in MDES's own validation templates."""
    path = build(tmp_path, "2.0")
    tree = etree.parse(str(path))
    for report in tree.findall(".//crs:AccountReport", {"crs": CRS_NAMESPACES["2.0"]}):
        report.find("crs:AccountNumber", {"crs": CRS_NAMESPACES["2.0"]}).set(
            "AcctNumberType", "OECD606")
    v2_with_emoney = tmp_path / "crs2_emoney.xml"
    tree.write(str(v2_with_emoney), encoding="utf-8", xml_declaration=True)

    findings = check_file(str(v2_with_emoney), environment_is_test=True)
    assert not [f for f in findings if f.code == "60017"]


# --- Downstream tools -------------------------------------------------------

@pytest.mark.parametrize("version", SUPPORTED_CRS_VERSIONS)
def test_correction_round_trip_keeps_the_source_version(tmp_path, version):
    source = build(tmp_path, version)
    output = tmp_path / f"crs_{version}_correction.xml"

    result = CRSCorrectionGenerator().generate_correction(str(source), CorrectionOptions(
        correct_reporting_fi=True,
        correct_individual_accounts=2,
        correct_organisation_accounts=2,
        test_mode=True,
        output_path=str(output),
    ))
    assert result.success, result.error_message
    # Reported back so the UI can name the version rather than leave the tester
    # guessing which schema they just produced a correction for.
    assert result.crs_version == version

    validated = xv.validate_file(output)
    assert validated.version == version
    assert validated.valid, validated.errors


@pytest.mark.parametrize("version", SUPPORTED_CRS_VERSIONS)
def test_deletion_round_trip_keeps_the_source_version(tmp_path, version):
    """Deletions are the other half of a CRS702 and must hold for 3.0 too."""
    source = build(tmp_path, version)
    output = tmp_path / f"crs_{version}_deletion.xml"

    result = CRSCorrectionGenerator().generate_correction(str(source), CorrectionOptions(
        delete_individual_accounts=2,
        delete_organisation_accounts=2,
        test_mode=True,
        output_path=str(output),
    ))
    assert result.success, result.error_message
    assert result.deletions_made == 4
    assert result.crs_version == version

    validated = xv.validate_file(output)
    assert validated.version == version
    assert validated.valid, validated.errors

    # Every deleted AccountReport carries the test-environment delete code and
    # points back at what it replaces (MDES 80010 rejects a mixed CRS702).
    tree = etree.parse(str(output))
    ns = {"crs": CRS_NAMESPACES[version], "stf": "urn:oecd:ties:crsstf:v5"}
    indics = [e.text for e in tree.findall(".//crs:AccountReport/crs:DocSpec/stf:DocTypeIndic", ns)]
    assert indics and set(indics) == {"OECD13"}
    corr_refs = [e.text for e in tree.findall(".//crs:AccountReport/crs:DocSpec/stf:CorrDocRefId", ns)]
    assert len(corr_refs) == len(indics)
    assert all(corr_refs)


def test_error_injector_can_strip_v3_mandatory_fields(tmp_path):
    source = build(tmp_path, "3.0")
    corrupted = tmp_path / "crs3_broken.xml"

    report = ErrorInjector("crs", "xml", corruption_level=5).corrupt_file(
        str(source), str(corrupted), "missing_required", {})
    assert report["success"]

    applied = " ".join(report["corruptionsApplied"])
    assert "SelfCert" in applied
    assert "DDProcedure" in applied
    assert "AccountType" in applied

    assert not xv.validate_file(corrupted).valid


# --- Trunk reference files --------------------------------------------------

TRUNK_V3_DIR = (
    "C:/Be Informed/Be Informed AMS 22.2.0-TRUNK/workspace/Bibliotheek/"
    "7500 Data/7550 Testdata/Testfiles v3/CRS/Domestic/304203821"
)


def trunk_file(name):
    from pathlib import Path

    path = Path(TRUNK_V3_DIR) / name
    if not path.exists():
        pytest.skip(f"MDES trunk workspace not available at {TRUNK_V3_DIR}")
    return path


@pytest.mark.parametrize("name", [
    "CRS3_304203821_01_Minimal_Individual.xml",
    "CRS3_304203821_02_Full_Organisation_ControllingPerson_JointAccount.xml",
    "CRS3_304203821_03_Multi_Report_Coverage.xml",
    "CRS3_304203821_04_Correction.xml",
])
def test_trunk_reference_files_are_accepted(name):
    path = trunk_file(name)
    result = xv.validate_file(path)
    assert result.version == "3.0"
    assert result.valid, result.errors

    business = CRSXMLValidator().validate_file(str(path))
    assert business.is_valid, business.errors


@pytest.mark.parametrize("name,expected", [
    ("CRS3_304203821_05_Invalid_Missing_CRS3_Fields.xml", "SelfCert"),
    ("CRS3_304203821_06_Error_Missing_AccountReport_Classification.xml", "DDProcedure"),
    ("CRS3_304203821_07_Error_Missing_SelfCert.xml", "SelfCert"),
    ("CRS3_304203821_08_Error_Invalid_Equity_JointAccount.xml", "EquityInterestType"),
])
def test_trunk_error_files_are_rejected_for_the_right_reason(name, expected):
    path = trunk_file(name)
    assert not xv.validate_file(path).valid

    business = CRSXMLValidator().validate_file(str(path))
    assert not business.is_valid
    assert any(expected in error for error in business.errors), business.errors
