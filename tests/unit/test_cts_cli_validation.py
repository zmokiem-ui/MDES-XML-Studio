from argparse import Namespace

from lxml import etree

from crs_generator.cts_cli import cmd_pack
from crs_generator.mdes_target_cli import cmd_package
from crs_generator.generator import CRSGenerator, GeneratorConfig


def test_cross_border_crs_package_blocks_wrong_50008_prefix(tmp_path, capsys):
    source = tmp_path / "wrong-prefix.xml"
    CRSGenerator(GeneratorConfig(
        file_type="foreign", sending_country="NL", receiving_country="CW",
        tax_year=2024, mytin="999999999", num_reporting_fis=1,
        individual_accounts_per_fi=1, organisation_accounts_per_fi=0,
        output_path=source, show_progress=False,
    )).generate(use_parallel=False)
    tree = etree.parse(str(source))
    message_ref = next(
        element for element in tree.getroot().iter()
        if etree.QName(element).localname == "MessageRefId"
    )
    message_ref.text = "NL2024999999999UNIQUE"
    tree.write(str(source), encoding="UTF-8", xml_declaration=True)
    args = Namespace(
        source=str(source), sender="NL", receiver="CW", type="CRS",
        tax_year="2024", defect=[], message_ref_id=None, output=None,
        store=None, signing_password=None, signing_password_stdin=False,
    )

    assert cmd_pack(args) == 1
    output = capsys.readouterr().out
    assert "MDES 50008" in output
    assert "NL2024CW" in output


def test_cross_border_crs_package_blocks_wrong_80001_docref_prefix(tmp_path, capsys):
    source = tmp_path / "wrong-docref.xml"
    CRSGenerator(GeneratorConfig(
        file_type="foreign", sending_country="NL", receiving_country="CW",
        tax_year=2024, mytin="999999999", num_reporting_fis=1,
        individual_accounts_per_fi=1, organisation_accounts_per_fi=0,
        output_path=source, show_progress=False,
    )).generate(use_parallel=False)
    tree = etree.parse(str(source))
    docref = next(
        element for element in tree.getroot().iter()
        if etree.QName(element).localname == "DocRefId"
    )
    docref.text = docref.text.replace("NL2024999999999", "NL2024CW", 1)
    tree.write(str(source), encoding="UTF-8", xml_declaration=True)

    args = Namespace(
        source=str(source), sender="NL", receiver="CW", type="CRS",
        tax_year="2024", defect=[], message_ref_id=None, output=None,
        store=None, signing_password=None, signing_password_stdin=False,
    )

    assert cmd_pack(args) == 1
    output = capsys.readouterr().out
    assert "MDES 80001" in output
    assert "NL2024999999999" in output


def test_existing_xml_package_rejects_malformed_source_before_target_lookup(tmp_path, capsys):
    source = tmp_path / "malformed.xml"
    source.write_text("<CRS_OECD>", encoding="utf-8")
    args = Namespace(
        source=str(source), target="does-not-exist", sender=None, receiver=None,
        type="CRS", tax_year=None, output=None, force=False,
    )

    assert cmd_package(args) == 1
    output = capsys.readouterr().out
    assert "selected XML is not a packageable foreign CRS delivery" in output
    assert "target" not in output.lower()


def test_existing_xml_package_rejects_fact_overrides_before_target_lookup(tmp_path, capsys):
    source = tmp_path / "valid.xml"
    CRSGenerator(GeneratorConfig(
        file_type="foreign", sending_country="NL", receiving_country="CW",
        tax_year=2024, mytin="999999999", num_reporting_fis=1,
        individual_accounts_per_fi=1, organisation_accounts_per_fi=0,
        output_path=source, show_progress=False,
    )).generate(use_parallel=False)
    args = Namespace(
        source=str(source), target="does-not-exist", sender="IT", receiver="CW",
        type="CRS", tax_year=2024, output=None, force=False,
    )

    assert cmd_package(args) == 1
    output = capsys.readouterr().out
    assert "sender is IT, XML says NL" in output
    assert "target" not in output.lower()
