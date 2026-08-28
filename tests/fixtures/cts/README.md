# CTS test fixtures

## `reference_delivery_CW_to_NL.zip`

A real CRS delivery produced by `Fatca.Cipher.Standalone 1.5.7` — the closed
.NET tool whose format `crs_generator/cts` reimplements — captured from an ART
run on 2026-04-30 and addressed from CW to NL.

It is the fixture that keeps this package honest. Because it is addressed to NL
and the certificate pack ships NL's private key, the test suite can decrypt it
end to end and assert that our reader reproduces exactly what the reference
writer produced: a 48-byte `key || iv`, an AES-256-CBC payload, a one-entry ZIP
inside that, and a valid enveloping XML-DSig signature. If any layer of the
format is ever misread, this test fails rather than an upload does.

Two properties are pinned in `tests/unit/test_cts_packaging.py`:

| | |
| --- | --- |
| SHA-256 of the decrypted source XML | `a1cb00fb99e96298bdf970afde7d21df49e62b8dc268eeed702ec256ad1e47c9` |
| SHA-256 of the signed payload document | `a6a2e0c0a8d7ad40037c28d40d5e964c54e0abb4a8ab9ac9880fb7f45915a80b` |

The contents are synthetic test data (placeholder names and addresses), and the
metadata deliberately disagrees with the document's own
`TransmittingCountry`/`ReceivingCountry` — that ART run was probing MDES error
50012. Do not treat the country codes in it as an example of a correct delivery.
