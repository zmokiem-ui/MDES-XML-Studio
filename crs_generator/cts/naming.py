"""Names. All of them are load-bearing.

MDES does not read a manifest to find the parts of a delivery — it globs for
``*_Metadata.xml``, ``*_Key`` and ``*_Payload`` inside the ZIP. Get a name wrong
and the file is rejected rather than diagnosed, which is why every name in a
package is derived here rather than assembled at each call site.

The rules, read off captured deliveries:

*   Entries are ``{Sender}_{MOD}_Metadata.xml``, ``{Receiver}_{MOD}_Key`` and
    ``{Sender}_{MOD}_Payload`` — note the *receiver* owns the key file, because
    it is the party who can open it.
*   ``{MOD}`` is the base module (``CRS``, ``CBC``, ``NTJ``), never the
    communication type: a CRS *status* message still uses ``_CRS_`` internally
    even though the outer filename says ``CRSStatus``.
*   FATCA drops the infix entirely: ``US_Metadata.xml``, ``CW_Key``,
    ``US_Payload``.

    **The FATCA conventions are the least-corroborated part of this module.**
    They come from a single captured delivery, in which ART passed the literal
    string ``US`` as the sender id and the tool addressed the metadata to the
    IRS (``000000.00000.TA.840``) regardless of the receiving country on the
    command line. ART also named the outer file
    ``FATCA.{epoch}.{sender}.{receiver}.{year}.Nieuw.zip`` rather than using the
    tool's own scheme, which suggests the filename is the caller's business
    rather than something MDES parses. We use the country codes we were given
    and the standard outer filename; confirm against a real IDES upload before
    relying on it.
*   The entry inside the payload ZIP is ``{Sender}_{MOD}_Payload.xml``.
*   The outer filename is
    ``{Sender}_{CommType}_{yyyyMMddTHHmmssfffZ}_{32 random alphanumerics}.zip``.
*   ``SenderFileId`` in the metadata is
    ``{Sender}_{Receiver}_{MOD}_{MessageRefId taken from the source XML}``.
"""

from __future__ import annotations

import datetime as _dt
import re
import secrets
import string

from lxml import etree

# Base modules and the communication types each one can carry. The status
# variants are what MDES sends back, and what the app produces when a tester
# needs to feed a status message into a partner jurisdiction's intake.
MODULES = ("CRS", "CBC", "NTJ", "FATCA")

COMMUNICATION_TYPES: dict[str, tuple[str, ...]] = {
    "CRS": ("CRS", "CRSStatus"),
    "CBC": ("CBC", "CBCStatus"),
    "NTJ": ("NTJ", "NTJStatus"),
    "FATCA": ("RPT",),
}

# Length of the random suffix in the outer filename. The reference tool uses 32
# mixed-case alphanumerics; MDES does not parse it, but the test tooling and the
# CD folders are full of files in this shape and matching it keeps them sortable
# alongside each other.
RANDOM_SUFFIX_LENGTH = 32

_ALPHABET = string.ascii_letters + string.digits


def base_module(communication_type: str) -> str:
    """``CRSStatus`` -> ``CRS``. Used for every in-ZIP name."""
    ct = communication_type.strip()
    for module, types in COMMUNICATION_TYPES.items():
        if ct in types:
            return module
    if ct.endswith("Status"):
        return ct[: -len("Status")]
    return ct


def entry_names(sender: str, receiver: str, communication_type: str) -> dict[str, str]:
    """The three outer ZIP entry names, plus the name inside the payload ZIP."""
    module = base_module(communication_type)
    sender = sender.upper()
    receiver = receiver.upper()
    # FATCA/IDES packages carry no module infix at all.
    infix = "" if module == "FATCA" else f"_{module}"
    return {
        "metadata": f"{sender}{infix}_Metadata.xml",
        "key": f"{receiver}{infix}_Key",
        "payload": f"{sender}{infix}_Payload",
        "inner_payload": f"{sender}{infix}_Payload.xml",
    }


def timestamp_token(when: _dt.datetime) -> str:
    """``yyyyMMddTHHmmssfffZ`` — the token used in the outer filename."""
    if when.tzinfo is None:
        when = when.replace(tzinfo=_dt.timezone.utc)
    when = when.astimezone(_dt.timezone.utc)
    return when.strftime("%Y%m%dT%H%M%S") + f"{when.microsecond // 1000:03d}Z"


def random_suffix(length: int = RANDOM_SUFFIX_LENGTH) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


def outer_zip_name(
    sender: str,
    communication_type: str,
    when: _dt.datetime,
    suffix: str | None = None,
) -> str:
    """Filename for the delivery ZIP itself."""
    return (
        f"{sender.upper()}_{communication_type}_{timestamp_token(when)}_"
        f"{suffix or random_suffix()}.zip"
    )


def sender_file_id(
    sender: str, receiver: str, communication_type: str, message_ref_id: str
) -> str:
    """``SenderFileId`` for a CTS metadata document."""
    module = base_module(communication_type)
    return f"{sender.upper()}_{receiver.upper()}_{module}_{message_ref_id}"


def ides_sender_file_id(sender: str, when: _dt.datetime) -> str:
    """``SenderFileId`` for an IDES metadata document: timestamp then sender."""
    return f"{timestamp_token(when)}_{sender.upper()}"


# --- Reading identifiers out of the source document -------------------------

_MESSAGE_REF_LOCALNAMES = ("MessageRefId", "MessageRefID")


def extract_message_ref_id(xml_bytes: bytes) -> str:
    """Pull ``MessageRefId`` out of a source document, namespace-agnostic.

    Every family spells it slightly differently and puts it under a different
    namespace, so matching on local name is the only thing that works across
    CRS, CbC and FATCA. Returns ``""`` when absent, which the caller turns into
    an explicit error rather than a silently malformed ``SenderFileId``.
    """
    parser = etree.XMLParser(resolve_entities=False, huge_tree=True)
    try:
        root = etree.fromstring(xml_bytes, parser)
    except etree.XMLSyntaxError:
        return ""
    for element in root.iter():
        if not isinstance(element.tag, str):
            continue
        if etree.QName(element).localname in _MESSAGE_REF_LOCALNAMES:
            return (element.text or "").strip()
    return ""


_COUNTRY_ELEMENTS = {
    "transmitting": ("TransmittingCountry", "SendingCompanyIN"),
    "receiving": ("ReceivingCountry",),
}


def extract_countries(xml_bytes: bytes) -> tuple[str, str]:
    """``(TransmittingCountry, ReceivingCountry)`` from the source document.

    Used to pre-fill the packaging form, and by the CLI when the caller does not
    pass ``--sender`` / ``--receiver`` explicitly. Missing values come back as
    empty strings.
    """
    parser = etree.XMLParser(resolve_entities=False, huge_tree=True)
    try:
        root = etree.fromstring(xml_bytes, parser)
    except etree.XMLSyntaxError:
        return "", ""
    transmitting = receiving = ""
    for element in root.iter():
        if not isinstance(element.tag, str):
            continue
        local = etree.QName(element).localname
        if local == "TransmittingCountry" and not transmitting:
            transmitting = (element.text or "").strip()
        elif local == "ReceivingCountry" and not receiving:
            receiving = (element.text or "").strip()
        if transmitting and receiving:
            break
    return transmitting, receiving


_KEY_ENTRY = re.compile(r"^(?P<receiver>[A-Z]{2})(?:_(?P<module>[A-Z]+))?_Key$")
_METADATA_ENTRY = re.compile(
    r"^(?P<sender>[A-Z]{2})(?:_(?P<module>[A-Z]+))?_Metadata\.xml$"
)


def infer_package_identity(entries: list[str], metadata: dict[str, str]) -> dict[str, str]:
    """Recognise package facts before decrypting it.

    The key-entry country chooses the private key.  It remains authoritative
    when deliberately incorrect metadata is present for a 50012 test.
    """
    key_receiver = ""
    entry_sender = ""
    entry_module = ""
    for raw_name in entries:
        name = raw_name.rsplit("/", 1)[-1]
        key_match = _KEY_ENTRY.fullmatch(name)
        if key_match:
            key_receiver = key_match.group("receiver")
            entry_module = key_match.group("module") or "FATCA"
        metadata_match = _METADATA_ENTRY.fullmatch(name)
        if metadata_match:
            entry_sender = metadata_match.group("sender")
            entry_module = entry_module or metadata_match.group("module") or "FATCA"

    metadata_sender = (
        metadata.get("CTSSenderCountryCd")
        or metadata.get("FATCAEntitySenderId")
        or ""
    ).upper()
    metadata_receiver = (
        metadata.get("CTSReceiverCountryCd")
        or metadata.get("FATCAEntityReceiverId")
        or ""
    ).upper()
    communication_type = (
        metadata.get("CTSCommunicationTypeCd")
        or metadata.get("FATCAEntCommunicationTypeCd")
        or entry_module
        or ""
    )
    return {
        "sender": metadata_sender or entry_sender,
        "receiver": key_receiver or metadata_receiver,
        "metadataReceiver": metadata_receiver,
        "keyReceiver": key_receiver,
        "communicationType": communication_type,
        "module": entry_module,
        "taxYear": metadata.get("TaxYear", ""),
    }


_SAFE_FILENAME = re.compile(r"[^A-Za-z0-9._-]")


def safe_filename(name: str) -> str:
    """Defensive scrub for names that reach the filesystem."""
    return _SAFE_FILENAME.sub("_", name)
