"""Regression tests for CRS XML generation validity."""

from crs_generator.generator import CRSGenerator, GeneratorConfig
from crs_generator.xml_validator import CRSXMLValidator
from crs_generator import xsd_validator as xv


def test_organisation_without_controlling_persons_is_valid_non_crs101(tmp_path):
    """Organisation accounts with no controlling persons must not stay CRS101."""
    output_path = tmp_path / "crs_org_no_cp.xml"
    config = GeneratorConfig(
        sending_country="NL",
        receiving_country="DE",
        tax_year=2024,
        mytin="123456789",
        num_reporting_fis=1,
        individual_accounts_per_fi=0,
        organisation_accounts_per_fi=1,
        controlling_persons_per_org=0,
        output_path=output_path,
        show_progress=False,
        pretty_print=True,
    )

    generated_path = CRSGenerator(config).generate(use_parallel=False)
    xml = generated_path.read_text(encoding="utf-8")

    assert "<crs:ControllingPerson>" not in xml
    assert "<crs:AcctHolderType>CRS101</crs:AcctHolderType>" not in xml
    assert "<crs:AcctHolderType>CRS103</crs:AcctHolderType>" in xml

    validation = CRSXMLValidator().validate_file(str(generated_path))
    assert validation.is_valid, validation.errors

    # And it must pass real XSD validation, not just the hand-rolled checker.
    xsd_result = xv.validate_file(generated_path)
    assert xsd_result.valid, xsd_result.errors


def test_multiple_controlling_persons_preserve_xsd_order(tmp_path):
    """Cloned controlling persons must stay before balance and payments."""
    output_path = tmp_path / "crs_org_two_cp.xml"
    config = GeneratorConfig(
        sending_country="NL",
        receiving_country="DE",
        tax_year=2024,
        mytin="123456789",
        num_reporting_fis=1,
        individual_accounts_per_fi=0,
        organisation_accounts_per_fi=1,
        controlling_persons_per_org=2,
        output_path=output_path,
        show_progress=False,
        pretty_print=True,
    )

    generated_path = CRSGenerator(config).generate(use_parallel=False)
    xml = generated_path.read_text(encoding="utf-8")
    assert xml.count("<crs:ControllingPerson>") == 2

    xsd_result = xv.validate_file(generated_path)
    assert xsd_result.valid, xsd_result.errors


# --- Foreign deliveries -----------------------------------------------------
# A foreign delivery is a CRS file arriving from a partner jurisdiction, uploaded
# under /crs/foreign-deliveries/crs-country-reports. The ART trunk builds these
# with SENDINGCOUNTRY != RECEIVINGCOUNTRY; MDES then requires the ReportingFI to
# be resident in the transmitting country and every reported holder in the
# receiving one (rules 60011/60012).

import pytest

from crs_generator.generator import foreign_delivery_filename
from crs_generator.mdes_rules import check_file


def _foreign_config(output_path, **overrides):
    kwargs = dict(
        file_type="foreign",
        sending_country="IT",
        receiving_country="CW",
        tax_year=2021,
        mytin="999999999",
        num_reporting_fis=1,
        individual_accounts_per_fi=3,
        organisation_accounts_per_fi=3,
        controlling_persons_per_org=1,
        output_path=output_path,
        show_progress=False,
        pretty_print=True,
    )
    kwargs.update(overrides)
    return GeneratorConfig(**kwargs)


def _local(el):
    return el.tag.rsplit("}", 1)[-1]


def test_foreign_delivery_is_schema_valid_and_crosses_a_border(tmp_path):
    path = CRSGenerator(_foreign_config(tmp_path / "foreign.xml")).generate(use_parallel=False)

    xsd_result = xv.validate_file(path)
    assert xsd_result.valid, xsd_result.errors

    from lxml import etree
    root = etree.parse(str(path)).getroot()
    spec = {_local(e): (e.text or "").strip()
            for e in next(e for e in root.iter() if _local(e) == "MessageSpec")}
    assert spec["TransmittingCountry"] == "IT"
    assert spec["ReceivingCountry"] == "CW"


def test_foreign_delivery_satisfies_the_mdes_residence_rules(tmp_path):
    """The whole point of a foreign delivery: 60011/60012 must hold for real."""
    path = CRSGenerator(_foreign_config(tmp_path / "foreign_rules.xml")).generate(use_parallel=False)
    assert check_file(str(path), "CRS", file_type="foreign") == []

    from lxml import etree
    root = etree.parse(str(path)).getroot()

    # ReportingFI is resident in the transmitting country...
    rfi = next(e for e in root.iter() if _local(e) == "ReportingFI")
    assert [(e.text or "").strip() for e in rfi if _local(e) == "ResCountryCode"] == ["IT"]

    # ...and every reported party reaches the receiving one.
    holders = [e for e in root.iter() if _local(e) == "AccountHolder"]
    assert holders
    for holder in holders:
        for party in holder:
            if _local(party) not in ("Individual", "Organisation"):
                continue
            residences = [(e.text or "").strip() for e in party
                          if _local(e) == "ResCountryCode"]
            assert "CW" in residences, residences


def test_foreign_delivery_to_its_own_country_is_rejected_before_generating():
    with pytest.raises(ValueError, match="different transmitting and receiving"):
        GeneratorConfig(file_type="foreign", sending_country="NL", receiving_country="NL")


def test_unknown_file_type_is_rejected():
    with pytest.raises(ValueError, match="Unsupported file_type"):
        GeneratorConfig(file_type="international")


def test_domestic_stays_the_default_and_allows_one_country(tmp_path):
    config = GeneratorConfig(sending_country="NL", receiving_country="NL",
                             tax_year=2021, output_path=tmp_path / "d.xml")
    assert config.file_type == "domestic"


def test_foreign_default_filename_follows_the_mdes_convention():
    """{TransmittingCountry}_CRS_{timestamp}Z_{32 chars}.xml, per the ART trunk."""
    config = GeneratorConfig(file_type="foreign", sending_country="IT",
                             receiving_country="CW")
    name = config.output_path.name
    assert name.startswith("IT_CRS_")
    assert name.endswith(".xml")
    stamp, suffix = name[len("IT_CRS_"):-len(".xml")].split("_")
    assert stamp.endswith("Z") and len(stamp) == 19  # 20260825T000300158Z
    assert len(suffix) == 32 and suffix.isalnum()

    # An explicit path still wins.
    explicit = GeneratorConfig(file_type="foreign", sending_country="IT",
                               receiving_country="CW",
                               output_path="chosen.xml")
    assert explicit.output_path.name == "chosen.xml"


def test_foreign_filename_helper_is_unique_per_call():
    a = foreign_delivery_filename("GL")
    b = foreign_delivery_filename("GL")
    assert a != b
