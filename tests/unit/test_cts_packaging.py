"""The delivery-package format itself.

Two kinds of test live here.

**Format invariants** use a throwaway RSA keypair generated in-process, so they
run on any checkout and pin the things MDES actually rejects on: the 48-byte
``key || iv``, AES-256-CBC, a compressed payload, the entry names, and the
enveloping signature profile.

**The golden test** decrypts a real delivery produced by the reference .NET tool
(``tests/fixtures/cts/reference_delivery_CW_to_NL.zip``) with the NL private key
from the bundled pack. It is the only test that proves we read the format as the
reference writer wrote it rather than as we imagine it, so when it needs a
password that the repository does not carry, it skips loudly rather than being
quietly dropped.

Set ``MDES_SIGNING_PASSWORD_NL`` to enable it.
"""

from __future__ import annotations

import datetime as _dt
import hashlib
import io
import os
import zipfile

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from lxml import etree

from crs_generator.cts import certificates as store
from crs_generator.cts import naming
from crs_generator.cts.metadata import build_cts_metadata, parse_metadata
from crs_generator.cts.packager import (
    AES_IV_BYTES,
    AES_KEY_BYTES,
    Defect,
    PackagingError,
    pack,
    unpack,
)
from crs_generator.cts.signing import DS, sign_document, verify_document

FIXTURES = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fixtures", "cts")
REFERENCE_DELIVERY = os.path.join(FIXTURES, "reference_delivery_CW_to_NL.zip")

# Pinned in tests/fixtures/cts/README.md. If either changes, the format is being
# read differently than the reference tool wrote it.
REFERENCE_SOURCE_SHA256 = (
    "a1cb00fb99e96298bdf970afde7d21df49e62b8dc268eeed702ec256ad1e47c9"
)
REFERENCE_SIGNED_SHA256 = (
    "a6a2e0c0a8d7ad40037c28d40d5e964c54e0abb4a8ab9ac9880fb7f45915a80b"
)

SAMPLE_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<crs:CRS_OECD xmlns:crs="urn:oecd:ties:crs:v2" version="2.0">
\t<crs:MessageSpec>
\t\t<crs:TransmittingCountry>NL</crs:TransmittingCountry>
\t\t<crs:ReceivingCountry>GL</crs:ReceivingCountry>
\t\t<crs:MessageRefId>NL2024123456789000000001</crs:MessageRefId>
\t</crs:MessageSpec>
</crs:CRS_OECD>"""


# --- Throwaway credentials --------------------------------------------------


def _self_signed(common_name: str, key_size: int = 2048):
    """An RSA keypair plus a matching self-signed certificate.

    2048 bits keeps the suite fast; the RSA-4096 case is covered by the golden
    fixture, whose key file is 512 bytes.
    """
    key = rsa.generate_private_key(public_exponent=65537, key_size=key_size)
    name = x509.Name([x509.NameAttribute(x509.oid.NameOID.COMMON_NAME, common_name)])
    now = _dt.datetime.now(_dt.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - _dt.timedelta(days=1))
        .not_valid_after(now + _dt.timedelta(days=365))
        .sign(key, hashes.SHA256())
    )
    return key, cert


@pytest.fixture(scope="module")
def sender_credentials():
    return _self_signed("Test Sender NL")


@pytest.fixture(scope="module")
def receiver_credentials():
    return _self_signed("Test Receiver GL")


def _pack(sender_credentials, receiver_credentials, **overrides):
    signing_key, signing_cert = sender_credentials
    _receiver_key, receiver_cert = receiver_credentials
    kwargs = dict(
        sender="NL",
        receiver="GL",
        communication_type="CRS",
        tax_year=2024,
        signing_key=signing_key,
        signing_certificate=signing_cert,
        encryption_certificate=receiver_cert,
    )
    kwargs.update(overrides)
    return pack(SAMPLE_XML, **kwargs)


# --- Entry names ------------------------------------------------------------


def test_entry_names_follow_the_glob_mdes_searches_for(
    sender_credentials, receiver_credentials
):
    result = _pack(sender_credentials, receiver_credentials)
    archive = zipfile.ZipFile(io.BytesIO(result.data))
    # Order matters as much as the names: this is how every captured delivery
    # and the reference tool write it.
    assert archive.namelist() == [
        "NL_CRS_Metadata.xml",
        "GL_CRS_Key",
        "NL_CRS_Payload",
    ]


def test_key_file_belongs_to_the_receiver_not_the_sender():
    # The receiver is the only party who can open it, so its name carries their
    # country code - the one asymmetry in the naming scheme.
    names = naming.entry_names("NL", "GL", "CRS")
    assert names["key"].startswith("GL")
    assert names["metadata"].startswith("NL")
    assert names["payload"].startswith("NL")


def test_package_identity_uses_key_entry_as_the_decryption_receiver():
    identity = naming.infer_package_identity(
        ["NL_CRS_Metadata.xml", "CW_CRS_Key", "NL_CRS_Payload"],
        {
            "CTSSenderCountryCd": "NL",
            "CTSReceiverCountryCd": "ZZ",  # deliberate 50012 metadata defect
            "CTSCommunicationTypeCd": "CRS",
            "TaxYear": "2024",
        },
    )
    assert identity == {
        "sender": "NL",
        "receiver": "CW",
        "metadataReceiver": "ZZ",
        "keyReceiver": "CW",
        "communicationType": "CRS",
        "module": "CRS",
        "taxYear": "2024",
    }


def test_inspection_reports_a_metadata_and_key_receiver_mismatch(
    sender_credentials, receiver_credentials
):
    receiver_key, _cert = receiver_credentials
    result = _pack(
        sender_credentials, receiver_credentials, defects=[Defect.WRONG_RECEIVER]
    )
    opened = unpack(result.data, receiver_key)
    check = next(c for c in opened.checks if c["id"] == "receiver-consistency")
    assert check["outcome"] == "fail"
    assert "50012" in check["detail"]


def test_non_strict_inspection_keeps_metadata_when_decryption_fails(
    sender_credentials, receiver_credentials
):
    receiver_key, _cert = receiver_credentials
    result = _pack(
        sender_credentials, receiver_credentials, defects=[Defect.CORRUPT_KEY]
    )
    opened = unpack(result.data, receiver_key, strict=False)
    assert opened.metadata["CTSSenderCountryCd"] == "NL"
    assert any(c["id"] == "decryption" and c["outcome"] == "fail" for c in opened.checks)
    assert opened.errors


def test_status_messages_keep_the_base_module_inside_the_zip():
    # Outer filename says CRSStatus; the entries still say _CRS_.
    names = naming.entry_names("NL", "GL", "CRSStatus")
    assert names["metadata"] == "NL_CRS_Metadata.xml"
    assert names["payload"] == "NL_CRS_Payload"


def test_fatca_packages_carry_no_module_infix():
    names = naming.entry_names("US", "CW", "RPT")
    assert names["metadata"] == "US_Metadata.xml"
    assert names["key"] == "CW_Key"
    assert names["payload"] == "US_Payload"


def test_outer_filename_shape():
    when = _dt.datetime(2026, 8, 26, 18, 17, 15, 868000, tzinfo=_dt.timezone.utc)
    name = naming.outer_zip_name("NL", "CRSStatus", when, suffix="A" * 32)
    assert name == "NL_CRSStatus_20260826T181715868Z_" + "A" * 32 + ".zip"


# --- Crypto invariants ------------------------------------------------------


def test_wrapped_key_is_the_aes_key_followed_by_its_iv(
    sender_credentials, receiver_credentials
):
    """MDES 50013 rejects anything that is not 48 concatenated bytes."""
    receiver_key, _cert = receiver_credentials
    result = _pack(sender_credentials, receiver_credentials)
    archive = zipfile.ZipFile(io.BytesIO(result.data))

    material = receiver_key.decrypt(archive.read("GL_CRS_Key"), padding.PKCS1v15())
    assert len(material) == AES_KEY_BYTES + AES_IV_BYTES == 48
    assert material[:AES_KEY_BYTES] == result.aes_key
    assert material[AES_KEY_BYTES:] == result.aes_iv


def test_wrapped_key_length_follows_the_receiver_key_size(sender_credentials):
    """RSA-2048 gives a 256-byte key file, RSA-4096 gives 512. Neither is fixed."""
    for key_size, expected in ((2048, 256), (4096, 512)):
        credentials = _self_signed(f"R{key_size}", key_size=key_size)
        result = _pack(sender_credentials, credentials)
        archive = zipfile.ZipFile(io.BytesIO(result.data))
        assert len(archive.read("GL_CRS_Key")) == expected


def test_payload_is_a_zip_before_it_is_encrypted(
    sender_credentials, receiver_credentials
):
    """A bare XML payload earns MDES 50003."""
    receiver_key, _cert = receiver_credentials
    result = unpack(
        _pack(sender_credentials, receiver_credentials).data, receiver_key
    )
    assert result.warnings == []
    assert result.signed_xml is not None


def test_inner_zip_holds_one_entry_named_for_the_sender(
    sender_credentials, receiver_credentials
):
    from crs_generator.cts.packager import _decrypt

    receiver_key, _cert = receiver_credentials
    result = _pack(sender_credentials, receiver_credentials)
    archive = zipfile.ZipFile(io.BytesIO(result.data))
    material = receiver_key.decrypt(archive.read("GL_CRS_Key"), padding.PKCS1v15())
    plaintext = _decrypt(
        archive.read("NL_CRS_Payload"),
        material[:AES_KEY_BYTES],
        material[AES_KEY_BYTES:],
    )
    inner = zipfile.ZipFile(io.BytesIO(plaintext))
    assert inner.namelist() == ["NL_CRS_Payload.xml"]


# --- Signature --------------------------------------------------------------


def test_signature_is_enveloping_with_the_object_id_mdes_resolves(
    sender_credentials, receiver_credentials
):
    receiver_key, _cert = receiver_credentials
    result = unpack(
        _pack(sender_credentials, receiver_credentials).data, receiver_key
    )
    root = etree.fromstring(result.signed_xml)

    assert etree.QName(root).localname == "Signature"
    assert [etree.QName(c).localname for c in root] == [
        "SignedInfo", "SignatureValue", "KeyInfo", "Object",
    ]
    assert root.find(DS + "Object").get("Id") == "FATCA"
    assert root.find(f"{DS}SignedInfo/{DS}Reference").get("URI") == "#FATCA"
    assert (
        root.find(f"{DS}SignedInfo/{DS}CanonicalizationMethod").get("Algorithm")
        == "http://www.w3.org/2001/10/xml-exc-c14n#"
    )
    assert (
        root.find(f"{DS}SignedInfo/{DS}SignatureMethod").get("Algorithm")
        == "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
    )
    # The single transform is exclusive c14n, not the enveloped-signature
    # transform: there is no signature inside what is being signed.
    transforms = root.findall(f"{DS}SignedInfo/{DS}Reference/{DS}Transforms/{DS}Transform")
    assert [t.get("Algorithm") for t in transforms] == [
        "http://www.w3.org/2001/10/xml-exc-c14n#"
    ]
    # KeyInfo carries the leaf only - not the CA chain.
    assert len(root.findall(f"{DS}KeyInfo/{DS}X509Data/{DS}X509Certificate")) == 1


def test_signature_verifies_and_survives_a_round_trip(sender_credentials):
    signing_key, signing_cert = sender_credentials
    signed = sign_document(SAMPLE_XML, signing_key, signing_cert)
    verification = verify_document(signed)
    assert verification.valid, verification.reason
    # The enclosed document comes back byte-identical from the root element
    # onwards. Only the prologue differs: the source's XML declaration is
    # re-emitted in lxml's style and the newline that followed it is dropped,
    # because neither is part of the element that was signed.
    assert etree.tostring(etree.fromstring(verification.payload), method="c14n") == \
        etree.tostring(etree.fromstring(SAMPLE_XML), method="c14n")
    assert verification.payload.split(b"?>", 1)[1] == SAMPLE_XML.split(b"?>", 1)[1].lstrip(b"\n")


def test_extracted_document_does_not_inherit_the_signature_namespace(
    sender_credentials,
):
    """The extracted document must be what was signed, not what it sat inside.

    Serialising the element in place carries ``xmlns="…xmldsig#"`` from
    ``<Signature>`` onto the extracted root, which neither the reference tool
    nor the original document has.
    """
    signing_key, signing_cert = sender_credentials
    verification = verify_document(sign_document(SAMPLE_XML, signing_key, signing_cert))
    prologue = verification.payload[: verification.payload.index(b">")]
    assert b'xmlns="' not in prologue


def test_extraction_keeps_declared_but_unused_namespace_prefixes(sender_credentials):
    """CRS documents routinely declare ftc/iso and never use them.

    Stripping those would rewrite the tester's file behind their back, so the
    namespace cleanup is narrow: it removes the inherited default declaration
    and nothing else.
    """
    source = SAMPLE_XML.replace(
        b'xmlns:crs="urn:oecd:ties:crs:v2"',
        b'xmlns:crs="urn:oecd:ties:crs:v2" xmlns:ftc="urn:oecd:ties:fatca:v1"',
    )
    signing_key, signing_cert = sender_credentials
    verification = verify_document(sign_document(source, signing_key, signing_cert))
    assert b'xmlns:ftc="urn:oecd:ties:fatca:v1"' in verification.payload


def test_modified_content_fails_verification(sender_credentials):
    signing_key, signing_cert = sender_credentials
    signed = sign_document(SAMPLE_XML, signing_key, signing_cert)
    tampered = signed.replace(b"<crs:ReceivingCountry>GL<", b"<crs:ReceivingCountry>IT<")
    verification = verify_document(tampered)
    assert not verification.valid
    assert "digest" in verification.reason.lower()


# --- Metadata ---------------------------------------------------------------


def test_metadata_is_utf8_with_bom_crlf_and_tabs():
    when = _dt.datetime(2026, 4, 30, 2, 49, 50, tzinfo=_dt.timezone.utc)
    blob = build_cts_metadata("CW", "NL", "CRS", "CW_NL_CRS_X", when, 2020)
    assert blob.startswith(b"\xef\xbb\xbf")
    assert blob.count(b"\r\n") == 10
    assert blob.count(b"\t") == 8
    assert not blob.endswith(b"\r\n")
    assert b"<FileCreateTs>2026-04-30T02:49:50Z</FileCreateTs>" in blob


def test_sender_file_id_embeds_the_documents_message_ref_id(
    sender_credentials, receiver_credentials
):
    result = _pack(sender_credentials, receiver_credentials)
    assert result.sender_file_id == "NL_GL_CRS_NL2024123456789000000001"
    assert parse_metadata(result.metadata)["SenderFileId"] == result.sender_file_id


def test_a_document_without_a_message_ref_id_is_refused(
    sender_credentials, receiver_credentials
):
    signing_key, signing_cert = sender_credentials
    _key, receiver_cert = receiver_credentials
    with pytest.raises(PackagingError, match="MessageRefId"):
        pack(
            b"<crs:CRS_OECD xmlns:crs='urn:oecd:ties:crs:v2'/>",
            sender="NL",
            receiver="GL",
            communication_type="CRS",
            tax_year=2024,
            signing_key=signing_key,
            signing_certificate=signing_cert,
            encryption_certificate=receiver_cert,
        )


# --- Deliberate defects -----------------------------------------------------


def test_ecb_payload_cannot_be_read_as_cbc(sender_credentials, receiver_credentials):
    receiver_key, _cert = receiver_credentials
    result = _pack(sender_credentials, receiver_credentials, defects=[Defect.ECB_MODE])
    with pytest.raises(PackagingError):
        unpack(result.data, receiver_key)


def test_short_key_is_reported_as_the_50013_shape(
    sender_credentials, receiver_credentials
):
    receiver_key, _cert = receiver_credentials
    result = _pack(sender_credentials, receiver_credentials, defects=[Defect.SHORT_KEY])
    opened = unpack(result.data, receiver_key)
    assert any("50013" in w for w in opened.warnings)


def test_uncompressed_payload_is_reported_as_the_50003_shape(
    sender_credentials, receiver_credentials
):
    receiver_key, _cert = receiver_credentials
    result = _pack(
        sender_credentials, receiver_credentials, defects=[Defect.UNCOMPRESSED_PAYLOAD]
    )
    opened = unpack(result.data, receiver_key)
    assert any("50003" in w for w in opened.warnings)
    # Still signed and still readable - only the compression layer is missing.
    assert opened.signature.valid


def test_tampered_signature_still_parses_but_does_not_verify(
    sender_credentials, receiver_credentials
):
    receiver_key, _cert = receiver_credentials
    result = _pack(
        sender_credentials, receiver_credentials, defects=[Defect.TAMPER_SIGNATURE]
    )
    opened = unpack(result.data, receiver_key)
    assert opened.signature is not None
    assert not opened.signature.valid


def test_wrong_receiver_only_changes_the_metadata(
    sender_credentials, receiver_credentials
):
    receiver_key, _cert = receiver_credentials
    result = _pack(
        sender_credentials, receiver_credentials, defects=[Defect.WRONG_RECEIVER]
    )
    opened = unpack(result.data, receiver_key)
    assert opened.metadata["CTSReceiverCountryCd"] == "ZZ"
    # The package is otherwise intact, which is what makes it a 50012 probe
    # rather than a decryption failure.
    assert opened.signature.valid


def test_clean_package_declares_no_defects(sender_credentials, receiver_credentials):
    assert _pack(sender_credentials, receiver_credentials).defects == ()


# --- The golden fixture -----------------------------------------------------


def _nl_password() -> str:
    password = os.environ.get("MDES_SIGNING_PASSWORD_NL")
    if not password:
        pytest.skip(
            "Set MDES_SIGNING_PASSWORD_NL to run the reference-delivery test. It "
            "is the only check that we read the format as the reference tool "
            "wrote it; the password is in ART's TestData/Certificates/Passwords.csv."
        )
    return password


def test_reference_delivery_from_the_dotnet_tool_is_read_exactly():
    """Decrypt a real MDES delivery and assert every layer came back intact."""
    key, _cert = store.load_signing_material("NL", _nl_password())
    result = unpack(REFERENCE_DELIVERY, key)

    assert result.entries == [
        "CW_CRS_Metadata.xml", "NL_CRS_Key", "CW_CRS_Payload",
    ]
    assert result.metadata["CTSSenderCountryCd"] == "CW"
    assert result.metadata["CTSReceiverCountryCd"] == "NL"
    assert result.metadata["CTSCommunicationTypeCd"] == "CRS"
    assert result.warnings == []

    assert len(result.aes_key) == AES_KEY_BYTES
    assert len(result.aes_iv) == AES_IV_BYTES

    assert result.signature.valid, result.signature.reason
    assert hashlib.sha256(result.signed_xml).hexdigest() == REFERENCE_SIGNED_SHA256
    assert hashlib.sha256(result.source_xml).hexdigest() == REFERENCE_SOURCE_SHA256


def test_our_metadata_is_byte_identical_to_the_reference_tools():
    """The strongest statement we can make about the metadata writer."""
    key, _cert = store.load_signing_material("NL", _nl_password())
    reference = unpack(REFERENCE_DELIVERY, key).raw_metadata
    fields = parse_metadata(reference)

    ours = build_cts_metadata(
        sender_country=fields["CTSSenderCountryCd"],
        receiver_country=fields["CTSReceiverCountryCd"],
        communication_type=fields["CTSCommunicationTypeCd"],
        sender_file_id=fields["SenderFileId"],
        file_create_ts=_dt.datetime.strptime(
            fields["FileCreateTs"], "%Y-%m-%dT%H:%M:%SZ"
        ).replace(tzinfo=_dt.timezone.utc),
        tax_year=fields["TaxYear"],
    )
    assert ours == reference


def test_metadata_only_read_needs_no_private_key():
    """Identifying a package must not require being its receiver."""
    result = unpack(REFERENCE_DELIVERY)
    assert result.metadata["SenderFileId"].startswith("CW_NL_CRS_")
    assert result.source_xml is None
    assert result.signature is None
