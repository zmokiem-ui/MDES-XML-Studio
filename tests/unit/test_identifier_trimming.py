"""Regression tests: whitespace pasted into an identifier must never reach a RefId.

A SendingCompanyIN entered as ``"20000100 "`` used to produce
``<crs:MessageRefId>MH202320000100 000000001</crs:MessageRefId>`` and every
DocRefId alongside it, which MDES rejects on upload (rule 80025).
"""

from lxml import etree

from crs_generator import mdes_rules
from crs_generator.cbc_generator import CBCGeneratorConfig
from crs_generator.config import DomesticConfig
from crs_generator.fatca_generator import FATCAGeneratorConfig
from crs_generator.fatca_irs_generator import FATCAGeneratorConfig as FATCAIRSGeneratorConfig
from crs_generator.generator import CRSGenerator, GeneratorConfig
from crs_generator.identifiers import normalize_identifier, normalize_identifiers


def test_normalize_identifier_trims_and_passes_through_non_strings():
    assert normalize_identifier(" 20000100 ") == "20000100"
    assert normalize_identifier("20000100\t") == "20000100"
    assert normalize_identifier(None) is None
    assert normalize_identifier(2024) == 2024


def test_normalize_identifiers_handles_empty_and_lists():
    assert normalize_identifiers(["FI1 ", " FI2"]) == ["FI1", "FI2"]
    assert normalize_identifiers([]) == []
    assert normalize_identifiers(None) is None


def test_crs_config_trims_identifiers(tmp_path):
    config = GeneratorConfig(
        mytin="20000100 ",
        sending_country="MH ",
        receiving_country=" MH",
        reporting_fi_tins=["20000100 "],
        num_reporting_fis=1,
        output_path=tmp_path / "out.xml",
    )

    assert config.mytin == "20000100"
    assert config.sending_country == "MH"
    assert config.receiving_country == "MH"
    assert config.reporting_fi_tins == ["20000100"]


def test_fatca_configs_trim_sending_company_in(tmp_path):
    fatca = FATCAGeneratorConfig(
        sending_company_in="20016636 ", output_path=tmp_path / "fatca.xml")
    assert fatca.sending_company_in == "20016636"

    irs = FATCAIRSGeneratorConfig(
        sending_company_in="000000.00000.TA.531 ", output_path=tmp_path / "irs.xml")
    assert irs.sending_company_in == "000000.00000.TA.531"


def test_cbc_config_trims_sending_entity_in():
    config = CBCGeneratorConfig(sending_entity_in="123456789 ",
                               transmitting_country="NL ",
                               reporting_entity_tin=" 987654321")
    assert config.sending_entity_in == "123456789"
    assert config.transmitting_country == "NL"
    assert config.reporting_entity_tin == "987654321"


def test_domestic_config_trims_mytin():
    assert DomesticConfig(mytin="MYTIN ").mytin == "MYTIN"


def test_generated_refids_contain_no_whitespace(tmp_path):
    """End-to-end: the exact input that got the user's file rejected."""
    output_path = tmp_path / "crs_trailing_space.xml"
    config = GeneratorConfig(
        sending_country="MH",
        receiving_country="MH",
        tax_year=2023,
        mytin="20000100 ",
        reporting_fi_tins=["20000100 "],
        num_reporting_fis=1,
        individual_accounts_per_fi=2,
        organisation_accounts_per_fi=1,
        controlling_persons_per_org=1,
        output_path=output_path,
        show_progress=False,
    )

    generated_path = CRSGenerator(config).generate(use_parallel=False)
    root = etree.parse(str(generated_path)).getroot()

    refids = [
        el.text or ""
        for el in root.iter()
        if etree.QName(el).localname in ("MessageRefId", "DocRefId", "CorrDocRefId")
    ]
    assert refids, "expected the generated file to contain RefIds"
    assert not any(ch.isspace() for ref in refids for ch in ref), refids

    sending_company = next(
        el for el in root.iter() if etree.QName(el).localname == "SendingCompanyIN"
    )
    assert sending_company.text == "20000100"

    # And the MDES checker agrees the file is clean.
    findings = mdes_rules.check_file(str(generated_path), "CRS")
    assert not [f for f in findings if f.code == "80025"], [f.as_text() for f in findings]
