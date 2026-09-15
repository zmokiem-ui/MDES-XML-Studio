from argparse import Namespace
from pathlib import Path

from lxml import etree

from crs_generator.cts_cli import cmd_pack
from crs_generator.cts.source_validation import validate_delivery_source
from crs_generator.mdes_target_cli import cmd_package
from crs_generator.generator import CRSGenerator, GeneratorConfig
from crs_generator.fatca_generator import FATCAGenerator as FCGenerator
from crs_generator.fatca_generator import FATCAGeneratorConfig as FCConfig
from crs_generator.fatca_irs_generator import FATCAGenerator, FATCAGeneratorConfig


def _fatca_oecd(path):
    """A pure IRS FATCA delivery, the kind the FATCA screen packages."""
    return FATCAGenerator(FATCAGeneratorConfig(
        sending_country="MH", receiving_country="US", tax_year=2024,
        sending_company_in="000000.00000.TA.531", num_reporting_fis=1,
        individual_accounts_per_fi=1, organisation_accounts_per_fi=0,
        output_path=path, show_progress=False,
    )).generate()


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
    assert "selected XML is not a packageable delivery" in output
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


# --- families other than CRS ------------------------------------------------
#
# The packager builds CTS and IDES deliveries, and every gate in front of it
# used to be written as "if the type is CRS". A FATCA source reaching the
# package screen was refused as "not a foreign CRS delivery", which is how the
# FATCA screen ended up with a Package tab it could not use.


def test_fatca_source_is_recognised_as_its_own_delivery(tmp_path):
    validation = validate_delivery_source(_fatca_oecd(tmp_path / "fatca.xml"))

    assert validation.valid, validation.errors
    assert validation.facts.message_type == "FATCA_OECD"
    assert validation.facts.communication_type == "RPT"
    assert validation.facts.sender == "MH"
    assert validation.facts.tax_year == "2024"
    # The IRS is the addressee, not the country whose key opens the package.
    assert validation.facts.receiver_locked is False


def test_domestic_fc_format_is_refused_with_its_own_reason(tmp_path):
    source = tmp_path / "fc.xml"
    FCGenerator(FCConfig(
        sending_country="CW", receiving_country="CW", tax_year=2024,
        num_reporting_fis=1, individual_accounts_per_fi=1,
        organisation_accounts_per_fi=0, output_path=source, show_progress=False,
    )).generate()

    validation = validate_delivery_source(source)
    assert not validation.valid
    assert any("domestic FC upload format" in error for error in validation.errors)


def test_packing_a_fatca_source_as_crs_names_the_type_to_use(tmp_path, capsys):
    args = Namespace(
        source=str(_fatca_oecd(tmp_path / "fatca.xml")), sender=None, receiver=None,
        type="CRS", tax_year="2024", defect=[], message_ref_id=None, output=None,
        store=None, signing_password=None, signing_password_stdin=False,
    )

    assert cmd_pack(args) == 1
    output = capsys.readouterr().out
    assert "use --type RPT" in output


def test_packing_a_crs_source_as_fatca_names_the_type_to_use(tmp_path, capsys):
    source = tmp_path / "crs.xml"
    CRSGenerator(GeneratorConfig(
        file_type="foreign", sending_country="NL", receiving_country="CW",
        tax_year=2024, mytin="999999999", num_reporting_fis=1,
        individual_accounts_per_fi=1, organisation_accounts_per_fi=0,
        output_path=source, show_progress=False,
    )).generate(use_parallel=False)
    args = Namespace(
        source=str(source), sender=None, receiver=None, type="RPT",
        tax_year="2024", defect=[], message_ref_id=None, output=None,
        store=None, signing_password=None, signing_password_stdin=False,
    )

    assert cmd_pack(args) == 1
    output = capsys.readouterr().out
    assert "use --type CRS" in output


def test_a_chosen_receiver_is_not_an_override_for_fatca(tmp_path, capsys):
    """MH is a legitimate receiver for a document addressed to the IRS.

    The package is opened by whoever holds the key the _Key member names, which
    for a test upload is the MDES instance - never the US. Rejecting that as an
    override is what forced this to the command line.
    """
    args = Namespace(
        source=str(_fatca_oecd(tmp_path / "fatca.xml")), sender="MH", receiver="MH",
        type="RPT", tax_year="2024", defect=[], message_ref_id=None, output=None,
        store=str(tmp_path / "empty-store"), signing_password=None,
        signing_password_stdin=False,
    )

    assert cmd_pack(args) == 1
    output = capsys.readouterr().out
    assert "cannot override" not in output
    # It got past validation and failed on the empty certificate store instead.
    assert "certificate" in output.lower()


def test_a_fatca_source_packages_end_to_end_from_the_package_screen(
    tmp_path, monkeypatch, capsys
):
    """The whole path the FATCA screen takes, with a synthetic credential.

    Everything downstream of the source check already handled FATCA - the entry
    names, the IDES metadata, the IRS addressee. Only the gate in front of it
    was written as "CRS or nothing", so this walks the path end to end.
    """
    from datetime import datetime, timedelta, timezone
    import json

    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    from crs_generator.cts import certificates
    from crs_generator.cts.packager import unpack

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, "MH")])
    now = datetime.now(timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
            .public_key(key.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(now - timedelta(days=1))
            .not_valid_after(now + timedelta(days=365)).sign(key, hashes.SHA256()))
    store = tmp_path / "certificates" / "MH"
    store.mkdir(parents=True)
    (store / "public.pem").write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    monkeypatch.setenv(certificates.STORE_ENV_VAR, str(tmp_path / "certificates"))
    monkeypatch.setattr(
        "crs_generator.cts.packager.load_signing_material",
        lambda country, password, root: (key, cert),
    )

    args = Namespace(
        source=str(_fatca_oecd(tmp_path / "fatca.xml")), sender="MH", receiver="MH",
        type="RPT", tax_year="2024", defect=[], message_ref_id=None,
        output=str(tmp_path / "out"), store=None, signing_password=None,
        signing_password_stdin=False,
    )

    assert cmd_pack(args) == 0
    packed = json.loads(capsys.readouterr().out)
    # FATCA carries no module infix, and the key belongs to whoever opens it.
    assert packed["entries"] == ["MH_Metadata.xml", "MH_Key", "MH_Payload"]
    assert packed["communicationType"] == "RPT"

    opened = unpack(Path(packed["filePath"]), key)
    assert opened.metadata["FATCAEntCommunicationTypeCd"] == "RPT"
    assert opened.metadata["FATCAEntityReceiverId"] == "000000.00000.TA.840"
    assert b"FATCA_OECD" in opened.source_xml
