"""CTS / IDES packaging: turn generated AEOI XML into a ZIP that MDES accepts.

MDES does not take plaintext XML. A delivery arrives as a ZIP holding three
entries — metadata, an RSA-wrapped AES key, and an AES-encrypted payload — and
the payload is itself a ZIP holding one XML-signed document. Until now the only
way to produce that was ``Fatca.Cipher.Standalone.exe``, a closed .NET 4.5
WinForms tool from the ART checkouts: Windows-only, un-assertable, and unable to
produce a deliberately *wrong* package (which is what MDES file-error codes
50002-50013 need).

This package reimplements the format. The layering, outward from the source
document:

1. **Sign** — enveloping XML-DSig, exclusive c14n, RSA-SHA256. The whole source
   document goes inside ``<Object Id="FATCA">`` (literally ``FATCA``, for CRS and
   CbC too). See :mod:`~crs_generator.cts.signing`.
2. **Compress** — deflate the signed XML into a ZIP holding one entry,
   ``{Sender}_{MOD}_Payload.xml``. MDES error 50003 is what you get if you skip
   this ("Please compress the file (before encrypting)").
3. **Encrypt** — AES-256-CBC with a random key and IV.
4. **Wrap the key** — ``RSA-PKCS1v1.5(key || iv)``, 48 plaintext bytes, under the
   *receiver's* public certificate. MDES error 50013 spells out that anything
   else — ECB, a missing IV, a key that is not 48 bytes — is rejected.

The three outer entries must be named ``{Sender}_{MOD}_Metadata.xml``,
``{Receiver}_{MOD}_Key`` and ``{Sender}_{MOD}_Payload``: MDES locates them by
that glob, so a wrong name is a rejected file rather than a confusing error.

Every layer here was verified against real MDES packages rather than inferred —
see ``tests/unit/test_cts_packaging.py``, which decrypts a captured delivery with
the NL private key and asserts this code reproduces it.
"""

from __future__ import annotations

from .certificates import (
    CertificateInfo,
    CertificateStoreError,
    describe_country,
    list_countries,
    load_encryption_certificate,
    load_signing_material,
    store_root,
)
from .naming import (
    COMMUNICATION_TYPES,
    MODULES,
    entry_names,
    extract_message_ref_id,
    outer_zip_name,
    sender_file_id,
)
from .packager import (
    Defect,
    PackageResult,
    UnpackResult,
    pack,
    pack_from_store,
    unpack,
)
from .signing import SignatureVerification, sign_document, verify_document

__all__ = [
    "CertificateInfo",
    "CertificateStoreError",
    "COMMUNICATION_TYPES",
    "Defect",
    "MODULES",
    "PackageResult",
    "SignatureVerification",
    "UnpackResult",
    "describe_country",
    "entry_names",
    "extract_message_ref_id",
    "list_countries",
    "load_encryption_certificate",
    "load_signing_material",
    "outer_zip_name",
    "pack",
    "pack_from_store",
    "sender_file_id",
    "sign_document",
    "store_root",
    "unpack",
    "verify_document",
]
