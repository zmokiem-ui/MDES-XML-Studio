"""Enveloping XML-DSig, in the exact shape MDES verifies.

The signature that MDES checks is *enveloping*, not enveloped: the root element
of the signed document is ``<Signature>``, and the entire source document sits
inside ``<Object Id="FATCA">``. The id really is the string ``FATCA`` for CRS and
CbC deliveries too — the reference tool never parameterised it, and MDES resolves
``Reference URI="#FATCA"`` literally, so changing it produces error 50004
("could not validate the digital signature").

The concrete profile, read off a captured MDES delivery::

    CanonicalizationMethod  http://www.w3.org/2001/10/xml-exc-c14n#
    SignatureMethod         http://www.w3.org/2001/04/xmldsig-more#rsa-sha256
    Reference URI           #FATCA
      Transform             http://www.w3.org/2001/10/xml-exc-c14n#
      DigestMethod          http://www.w3.org/2001/04/xmlenc#sha256
    KeyInfo/X509Data        X509SubjectName + the leaf certificate only

Note the single transform is *exclusive c14n*, not the enveloped-signature
transform — there is nothing to strip, because the signature does not live
inside what it signs.

Whitespace inside ``<Object>`` is significant: c14n does not normalise text
nodes, so the source document's CRLFs and tabs are carried through verbatim.
:func:`sign_document` parses without stripping and only drops the source's XML
declaration and the root element's trailing whitespace, which is what the
reference tool does.
"""

from __future__ import annotations

import base64
import copy
import hashlib
from dataclasses import dataclass

from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.serialization import Encoding
from lxml import etree

DSIG_NS = "http://www.w3.org/2000/09/xmldsig#"
DS = f"{{{DSIG_NS}}}"

C14N_EXCLUSIVE = "http://www.w3.org/2001/10/xml-exc-c14n#"
SIG_RSA_SHA256 = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
DIGEST_SHA256 = "http://www.w3.org/2001/04/xmlenc#sha256"

# The reference tool hardcodes this, for every module. Do not parameterise it
# without evidence that MDES accepts something else.
DEFAULT_OBJECT_ID = "FATCA"

XML_DECLARATION = b'<?xml version="1.0" encoding="UTF-8"?>'


class SigningError(RuntimeError):
    """The document could not be signed, or a signature could not be read."""


@dataclass(frozen=True)
class SignatureVerification:
    """Outcome of checking a signed payload."""

    valid: bool
    reason: str
    subject: str
    payload: bytes

    # Deliberately no __bool__: `if result.signature` must mean "a check was
    # performed", not "the check passed". Conflating the two turns a failed
    # signature into a silently skipped branch.


def _c14n(node: etree._Element) -> bytes:
    """Exclusive canonicalisation of one element subtree, comments excluded."""
    return etree.tostring(node, method="c14n", exclusive=True, with_comments=False)


def _detached_document(element: etree._Element) -> bytes:
    """Serialise an element that lives inside ``<Signature>`` as its own document.

    Serialising in place would carry the signature's default namespace onto the
    extracted root — ``<crs:CRS_OECD xmlns="…xmldsig#" …>`` — which is not what
    was signed and not what the reference tool writes. The declaration is
    inherited, not used, so it is dropped; every *prefixed* declaration is kept
    even when unused, because CRS documents routinely declare ``ftc``/``iso``
    and never reference them, and dropping those would silently rewrite the
    caller's file.
    """
    detached = copy.deepcopy(element)
    inherited_default = detached.nsmap.get(None)
    in_dsig = isinstance(detached.tag, str) and detached.tag.startswith(DS)
    if inherited_default == DSIG_NS and not in_dsig:
        etree.cleanup_namespaces(
            detached, keep_ns_prefixes=[p for p in detached.nsmap if p]
        )
    return XML_DECLARATION + etree.tostring(detached, encoding="utf-8")


def _parse_source(xml_bytes: bytes) -> etree._Element:
    """Parse a source document, preserving its whitespace exactly.

    ``resolve_entities=False`` keeps a hostile test file from pulling in
    external entities; the generators never emit any, so nothing legitimate is
    lost.
    """
    parser = etree.XMLParser(
        remove_blank_text=False,
        remove_comments=False,
        resolve_entities=False,
        huge_tree=True,
    )
    try:
        root = etree.fromstring(xml_bytes, parser)
    except etree.XMLSyntaxError as exc:
        raise SigningError(f"Source document is not well-formed XML: {exc}") from exc
    return root


def sign_document(
    xml_bytes: bytes,
    private_key: rsa.RSAPrivateKey,
    certificate: x509.Certificate,
    object_id: str = DEFAULT_OBJECT_ID,
) -> bytes:
    """Wrap ``xml_bytes`` in an enveloping signature and return the result.

    The output is a complete document: an XML declaration followed by
    ``<Signature>``. It is the byte stream that goes into the payload ZIP.
    """
    source_root = _parse_source(xml_bytes)
    # Trailing whitespace after the root element is not part of the document and
    # would otherwise land inside <Object>, where c14n would preserve it.
    source_root.tail = None

    signature = etree.Element(DS + "Signature", nsmap={None: DSIG_NS})

    # <Object> is built first so its digest can be computed in final position;
    # SignedInfo, SignatureValue and KeyInfo are inserted in front of it
    # afterwards, giving the element order MDES expects.
    obj = etree.SubElement(signature, DS + "Object")
    obj.set("Id", object_id)
    obj.append(source_root)

    digest = base64.b64encode(hashlib.sha256(_c14n(obj)).digest()).decode("ascii")

    signed_info = etree.Element(DS + "SignedInfo")
    etree.SubElement(signed_info, DS + "CanonicalizationMethod").set(
        "Algorithm", C14N_EXCLUSIVE
    )
    etree.SubElement(signed_info, DS + "SignatureMethod").set(
        "Algorithm", SIG_RSA_SHA256
    )
    reference = etree.SubElement(signed_info, DS + "Reference")
    reference.set("URI", f"#{object_id}")
    transforms = etree.SubElement(reference, DS + "Transforms")
    etree.SubElement(transforms, DS + "Transform").set("Algorithm", C14N_EXCLUSIVE)
    etree.SubElement(reference, DS + "DigestMethod").set("Algorithm", DIGEST_SHA256)
    etree.SubElement(reference, DS + "DigestValue").text = digest

    signature.insert(0, signed_info)

    # SignedInfo must be canonicalised in its final context: exclusive c14n only
    # emits namespaces that are visibly used, and SignedInfo inherits the default
    # dsig namespace from <Signature>.
    raw_signature = private_key.sign(
        _c14n(signed_info), padding.PKCS1v15(), hashes.SHA256()
    )

    signature_value = etree.Element(DS + "SignatureValue")
    signature_value.text = base64.b64encode(raw_signature).decode("ascii")
    signature.insert(1, signature_value)

    key_info = etree.Element(DS + "KeyInfo")
    x509_data = etree.SubElement(key_info, DS + "X509Data")
    etree.SubElement(x509_data, DS + "X509SubjectName").text = (
        certificate.subject.rfc4514_string()
    )
    etree.SubElement(x509_data, DS + "X509Certificate").text = base64.b64encode(
        certificate.public_bytes(encoding=Encoding.DER)
    ).decode("ascii")
    signature.insert(2, key_info)

    return XML_DECLARATION + etree.tostring(signature, encoding="utf-8")


def _signature_root(signed_xml: bytes) -> etree._Element:
    root = _parse_source(signed_xml)
    if root.tag != DS + "Signature":
        raise SigningError(
            f"Expected a <Signature> root element, found {etree.QName(root).localname!r}."
        )
    return root


def extract_payload(signed_xml: bytes, object_id: str = DEFAULT_OBJECT_ID) -> bytes:
    """Return the original document from inside ``<Object>``, without verifying.

    Used when reading a delivery whose signing certificate we do not hold — the
    content is still recoverable, it just cannot be trusted.
    """
    root = _signature_root(signed_xml)
    for obj in root.findall(DS + "Object"):
        if obj.get("Id") in (object_id, None) or len(root.findall(DS + "Object")) == 1:
            children = [c for c in obj if isinstance(c.tag, str)]
            if not children:
                raise SigningError("<Object> holds no element to extract.")
            return _detached_document(children[0])
    raise SigningError(f"No <Object Id={object_id!r}> in the signed document.")


def verify_document(signed_xml: bytes) -> SignatureVerification:
    """Check digest and signature, and return the enclosed document.

    Mirrors what MDES does before reporting error 50004, so a failure here is a
    failure there.
    """
    try:
        root = _signature_root(signed_xml)
    except SigningError as exc:
        return SignatureVerification(False, str(exc), "", b"")

    signed_info = root.find(DS + "SignedInfo")
    reference = root.find(f"{DS}SignedInfo/{DS}Reference")
    digest_node = root.find(f"{DS}SignedInfo/{DS}Reference/{DS}DigestValue")
    value_node = root.find(DS + "SignatureValue")
    cert_node = root.find(f"{DS}KeyInfo/{DS}X509Data/{DS}X509Certificate")
    if any(n is None for n in (signed_info, reference, digest_node, value_node, cert_node)):
        return SignatureVerification(
            False, "Signature is missing SignedInfo, SignatureValue or KeyInfo.", "", b""
        )

    uri = (reference.get("URI") or "").lstrip("#")
    obj = next(
        (o for o in root.findall(DS + "Object") if o.get("Id") == uri),
        None,
    )
    if obj is None:
        return SignatureVerification(
            False, f"Reference URI '#{uri}' does not resolve to an <Object>.", "", b""
        )

    payload = b""
    children = [c for c in obj if isinstance(c.tag, str)]
    if children:
        payload = _detached_document(children[0])

    try:
        certificate = x509.load_der_x509_certificate(
            base64.b64decode(cert_node.text or "")
        )
    except Exception as exc:
        return SignatureVerification(
            False, f"KeyInfo certificate could not be parsed: {exc}", "", payload
        )
    subject = certificate.subject.rfc4514_string()

    actual = base64.b64encode(hashlib.sha256(_c14n(obj)).digest()).decode("ascii")
    if actual != (digest_node.text or "").strip():
        return SignatureVerification(
            False, "Digest mismatch: the signed content has been modified.",
            subject, payload,
        )

    try:
        certificate.public_key().verify(
            base64.b64decode(value_node.text or ""),
            _c14n(signed_info),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
    except InvalidSignature:
        return SignatureVerification(
            False, "SignatureValue does not verify against the KeyInfo certificate.",
            subject, payload,
        )
    except Exception as exc:
        return SignatureVerification(
            False, f"Signature check failed: {exc}", subject, payload
        )

    return SignatureVerification(True, "Signature is valid.", subject, payload)
