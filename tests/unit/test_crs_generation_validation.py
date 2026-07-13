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
