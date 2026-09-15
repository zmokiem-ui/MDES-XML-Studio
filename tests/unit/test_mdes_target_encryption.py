"""Routing labels and target cryptographic identity are independent."""
from dataclasses import replace
from datetime import datetime, timedelta, timezone

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from crs_generator.cts import certificates
from crs_generator.cts.packager import PackagingError, unpack
from crs_generator.mdes_target.database import CertificateRecord, DatabaseFacts
from crs_generator.mdes_target.preflight import run_preflight
from crs_generator.mdes_target.profile import TargetProfile, TargetResolution
from crs_generator.mdes_target.props import load_properties
from crs_generator.mdes_target_cli import _package


@pytest.fixture
def target(tmp_path, monkeypatch):
    materials = {}
    for country in ("MH", "CW"):
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(x509.NameOID.COMMON_NAME, country)])
        now = datetime.now(timezone.utc)
        cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
                .public_key(key.public_key()).serial_number(x509.random_serial_number())
                .not_valid_before(now - timedelta(days=1))
                .not_valid_after(now + timedelta(days=365)).sign(key, hashes.SHA256()))
        materials[country] = (key, cert)
        folder = tmp_path / "certificates" / country
        folder.mkdir(parents=True)
        (folder / "public.pem").write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    monkeypatch.setenv(certificates.STORE_ENV_VAR, str(tmp_path / "certificates"))
    # Synthetic signing key only; no real credential or private certificate is needed.
    monkeypatch.setattr("crs_generator.cts.packager.load_signing_material",
                        lambda country, password, root: materials[country])
    cert = materials["CW"][1]
    record = CertificateRecord(1, "cw12unprotected.p12", "CN=CW", "CN=CW", "CW",
                               cert.fingerprint(hashes.SHA256()).hex(), 2048,
                               cert.not_valid_before_utc, cert.not_valid_after_utc)
    props = tmp_path / "target.properties"
    props.write_text("Country_Code_Provision=MH\nVerdrag=CRS\ncheckValidityCertificate=0\n")
    resolution = TargetResolution(TargetProfile("mixed", str(props)), load_properties(props),
                                  DatabaseFacts("test", None, record, "cw12protected.p12",
                                                receiver_history={"CW": 3570}))
    return resolution, materials


def checks(result):
    return {check.id: check for check in result.checks}


def test_mh_routing_selects_cw_by_fingerprint(target, tmp_path):
    resolution, materials = target
    result = run_preflight(resolution, sender="CW", tax_year=2020)
    assert result.receiver == "MH"
    assert result.encryption_country == "CW"
    for name in ("receiver", "encryption-certificate"):
        assert checks(result)[name].outcome.value == "pass"

    # A mixed instance is buildable, but not silently: the same evidence would be
    # produced by a properties file paired with another instance's database, so
    # the pairing check says so and names both halves without blocking.
    pairing = checks(result)["target-pairing"]
    assert pairing.outcome.value == "warn"
    assert "MH" in pairing.detail and "CW" in pairing.detail
    # A warning, so a mixed instance is not blocked on account of being mixed.
    # (This synthetic database has no CTS assembly and no partners, so the
    # result as a whole is blocked for reasons of its own.)
    assert pairing not in result.failures

    source = tmp_path / "source.xml"
    source.write_text('''<CRS_OECD><MessageSpec><TransmittingCountry>CW</TransmittingCountry>
        <ReceivingCountry>MH</ReceivingCountry><MessageRefId>CW2020MHunique</MessageRefId>
        </MessageSpec></CRS_OECD>''')
    package = _package(resolution, result, source, tmp_path)
    assert "MH_CRS_Key" in package["entries"]
    opened = unpack(package["filePath"], materials["CW"][0])
    assert opened.signature.valid
    assert opened.metadata["CTSReceiverCountryCd"] == "MH"
    assert b"<ReceivingCountry>MH</ReceivingCountry>" in opened.source_xml
    with pytest.raises(PackagingError):
        unpack(package["filePath"], materials["MH"][0])


def test_certificate_filename_does_not_select_the_key(target):
    resolution, _ = target
    resolution.facts.own_certificate = replace(resolution.facts.own_certificate,
                                               filename="mh12unprotected.p12")
    assert run_preflight(resolution, sender="CW").encryption_country == "CW"


def test_unknown_target_certificate_blocks(target):
    resolution, _ = target
    resolution.facts.own_certificate = replace(resolution.facts.own_certificate,
                                               fingerprint_sha256="00" * 32)
    result = run_preflight(resolution, sender="CW")
    assert checks(result)["encryption-certificate"].outcome.value == "fail"
    assert checks(result)["encryption-certificate"].mdes_error == "50002"
    assert result.encryption_country == ""


def test_an_unreachable_database_is_not_reported_as_a_certificate_problem(target):
    """We could not look, which is the database's failure to own, not 50002.

    The encryption check has nothing to go on without the instance's own
    certificate. Predicting 50002 here would point the repair at the certificate
    store while the actual problem is the connection.
    """
    resolution, _ = target
    resolution.facts = None
    result = run_preflight(resolution, sender="CW")
    encryption = checks(result)["encryption-certificate"]
    assert encryption.outcome.value == "skip"
    assert encryption.mdes_error is None
    assert checks(result)["database"].outcome.value == "fail"
    assert checks(result)["target-pairing"].outcome.value == "pass"


def test_wrong_routing_still_blocks(target):
    resolution, _ = target
    result = run_preflight(resolution, sender="CW", receiver="CW")
    assert checks(result)["receiver"].mdes_error == "50008"
    assert checks(result)["receiver"].outcome.value == "fail"


def test_missing_properties_cannot_infer_routing_from_certificate_or_history(target):
    resolution, _ = target
    resolution.properties = None
    assert resolution.own_country == ""
    assert checks(run_preflight(resolution, sender="CW"))["target-pairing"].outcome.value == "fail"


def test_existing_zip_does_not_claim_encryption_compatibility(target):
    resolution, _ = target
    result = run_preflight(resolution, sender="CW", existing_package=True)
    assert checks(result)["encryption-certificate"].outcome.value == "skip"
    assert result.encryption_country == ""


def test_a_package_layer_fault_reaches_the_zip(target, tmp_path):
    """A provoked envelope fault has to survive the whole build path.

    The mutation tests cover the document; this covers the other half - that a
    Defect selected in the UI is still applied by the time the ZIP is written,
    and that it breaks only what it claims to. 50012 is the readable one: the
    CTS metadata names ZZ while the XML and the key entry stay correct, which
    is exactly the misrouting MDES is supposed to catch.
    """
    from crs_generator.cts.packager import Defect

    resolution, materials = target
    result = run_preflight(resolution, sender="CW", tax_year=2020)
    source = tmp_path / "source.xml"
    source.write_text('''<CRS_OECD><MessageSpec><TransmittingCountry>CW</TransmittingCountry>
        <ReceivingCountry>MH</ReceivingCountry><MessageRefId>CW2020MHmisrouted</MessageRefId>
        </MessageSpec></CRS_OECD>''')

    package = _package(resolution, result, source, tmp_path,
                       defects=(Defect.WRONG_RECEIVER,))

    assert package["defects"] == ["wrong_receiver"]
    opened = unpack(package["filePath"], materials["CW"][0])
    assert opened.metadata["CTSReceiverCountryCd"] == "ZZ"
    # Everything else stays intact, or the upload would fail for another reason.
    assert "MH_CRS_Key" in package["entries"]
    assert opened.signature.valid
    assert b"<ReceivingCountry>MH</ReceivingCountry>" in opened.source_xml
