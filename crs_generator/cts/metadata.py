"""The metadata document that rides alongside the payload in a delivery ZIP.

Two dialects exist and they are not interchangeable:

*   **CTS** (``urn:oecd:ctssenderfilemetadata``) — CRS, CbC and NTJ. Sender and
    receiver are ISO country codes.
*   **IDES** (``urn:fatca:idessenderfilemetadata``) — FATCA. Sender and receiver
    are GIIN-shaped entity ids, the communication type is ``RPT``, and a
    ``FileRevisionInd`` element is present.

The serialisation is written by hand rather than through ``lxml`` because MDES's
reference tool emits a very specific byte stream — **UTF-8 with a BOM, CRLF line
endings, tab indentation, and no trailing newline** — and matching it exactly
removes a whole class of "why was this rejected" questions. The element order
below is the order the reference tool writes; treat it as fixed.
"""

from __future__ import annotations

import datetime as _dt
from xml.sax.saxutils import escape

CTS_NS = "urn:oecd:ctssenderfilemetadata"
IDES_NS = "urn:fatca:idessenderfilemetadata"
XSI_NS = "http://www.w3.org/2001/XMLSchema-instance"

BOM = "﻿"
NEWLINE = "\r\n"
INDENT = "\t"

DECLARATION = '<?xml version="1.0" encoding="utf-8"?>'


def format_timestamp(when: _dt.datetime) -> str:
    """``FileCreateTs`` format: UTC, second precision, trailing ``Z``."""
    if when.tzinfo is None:
        when = when.replace(tzinfo=_dt.timezone.utc)
    return when.astimezone(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _render(root_name: str, namespace: str, fields: list[tuple[str, str]]) -> bytes:
    lines = [DECLARATION]
    lines.append(
        f'<{root_name} xmlns:xsi="{XSI_NS}" xmlns="{namespace}">'
    )
    for name, value in fields:
        lines.append(f"{INDENT}<{name}>{escape(str(value))}</{name}>")
    lines.append(f"</{root_name}>")
    return (BOM + NEWLINE.join(lines)).encode("utf-8")


def build_cts_metadata(
    sender_country: str,
    receiver_country: str,
    communication_type: str,
    sender_file_id: str,
    file_create_ts: _dt.datetime,
    tax_year: int | str,
) -> bytes:
    """Metadata for a CRS / CbC / NTJ delivery.

    ``communication_type`` is the full code as it appears in the file — ``CRS``
    for a delivery, ``CRSStatus`` for a status message, likewise for ``CBC``.
    """
    return _render(
        "CTSSenderFileMetadata",
        CTS_NS,
        [
            ("CTSSenderCountryCd", sender_country.upper()),
            ("CTSReceiverCountryCd", receiver_country.upper()),
            ("CTSCommunicationTypeCd", communication_type),
            ("SenderFileId", sender_file_id),
            ("FileFormatCd", "XML"),
            ("BinaryEncodingSchemeCd", "NONE"),
            ("FileCreateTs", format_timestamp(file_create_ts)),
            ("TaxYear", tax_year),
        ],
    )


def build_ides_metadata(
    sender_id: str,
    receiver_id: str,
    sender_file_id: str,
    file_create_ts: _dt.datetime,
    tax_year: int | str,
    communication_type: str = "RPT",
    file_revision: bool = False,
) -> bytes:
    """Metadata for a FATCA (IDES) delivery."""
    return _render(
        "FATCAIDESSenderFileMetadata",
        IDES_NS,
        [
            ("FATCAEntitySenderId", sender_id),
            ("FATCAEntityReceiverId", receiver_id),
            ("FATCAEntCommunicationTypeCd", communication_type),
            ("SenderFileId", sender_file_id),
            ("FileCreateTs", format_timestamp(file_create_ts)),
            ("TaxYear", tax_year),
            ("FileRevisionInd", "true" if file_revision else "false"),
        ],
    )


def parse_metadata(data: bytes) -> dict[str, str]:
    """Read a metadata document back into a flat dict, BOM and dialect agnostic.

    Used by :func:`~crs_generator.cts.packager.unpack` and by the tests that
    compare our output against captured deliveries.
    """
    from lxml import etree

    root = etree.fromstring(data.lstrip(BOM.encode("utf-8")))
    out: dict[str, str] = {}
    for child in root:
        if isinstance(child.tag, str):
            out[etree.QName(child).localname] = (child.text or "").strip()
    return out
