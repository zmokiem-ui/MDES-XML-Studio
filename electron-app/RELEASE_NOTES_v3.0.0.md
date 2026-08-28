# MDES XML Studio v3.0.0

The app now builds the delivery, not just the XML. A generated file can be
signed, encrypted and packaged into something MDES accepts, checked against a
real MDES instance before it is built, and opened again afterwards to see what
was actually sent.

## Packaging moves into the app

Until now the XML was the end of the line: producing a CTS delivery meant
`Fatca.Cipher.Standalone.exe` from an ART checkout, a closed .NET tool that
could only build correct packages. Packaging is now part of the app, in Python,
on the **Package** tab.

The format was established against captured real deliveries rather than
inferred. Outer ZIP, three deflated entries in a fixed order, located by MDES
through a suffix glob - a wrong entry name is a rejection, not an error:

| Entry | Content |
| --- | --- |
| `{Sender}_{MOD}_Metadata.xml` | UTF-8 with BOM, CRLF, tab-indented |
| `{Receiver}_{MOD}_Key` | `RSA-PKCS1v1.5(aesKey ‖ iv)`, 48 plaintext bytes |
| `{Sender}_{MOD}_Payload` | AES-256-CBC over a ZIP |

The payload is an enveloping XML-DSig whose `<Object>` id is literally `FATCA`
for CRS and CbC too, zipped with one entry, then encrypted. Skipping the inner
ZIP is MDES **50003**; ECB instead of CBC is **50013**.

Our metadata is byte-identical to the reference tool's output, and running that
tool on the same input produces a structurally identical package - same entry
names and order, same inner entry, same key length, same signature profile. A
captured reference delivery decrypts end to end, with its hashes pinned in
`tests/fixtures/cts/README.md`.

Because packaging is ours, it can also produce **deliberately broken** packages,
one per MDES error code, which the old tool could not do at all.

## Inspect a package

Any package can be opened again: signature, metadata and payload, without
needing a private key for the general check. Inspection has two modes - general
validation, and comparison against a specific MDES target.

## Certificates have a screen

Settings -> Certificates lists the store per country: which certificate, key
size, expiry, and whether that country can sign at all. A country can only send
once its signing password is stored, and passwords import in one action from
ART's `Passwords.csv` rather than eleven prompts.

Passwords are never written to the repository. They live in the OS credential
store, and `python -m crs_generator.cts_cli passwords` reports what a machine
can sign without printing any of them.

Three traps in the estate are handled rather than documented: the filename
prefix is not the ISO code (`GB` ships as `uk`, `US` as `usa`), `unprotected`
files are usually PEM despite a `.p12` extension, and the leaf is not always
first in a PKCS#12 store - taking entry 0 is what makes MDES report "wrong
password" for a perfectly valid certificate.

## Developer mode: build for a specific instance

A **target** binds the app to one MDES instance - its properties file plus a
read-only database connection. Preflight then checks a delivery against that
instance's own rules before building it, and names the MDES error each failure
would produce.

This exists because of one finding. On a real instance, thirteen partner
countries had the **Netherlands** certificate registered against them. Signing
as IT with the genuine Italian certificate produces a delivery rejected with
**50004**, and nothing about the file is wrong. Only the database can reveal
that, so the app reads it - `SELECT` only, always, with connections opened
read-only.

The instance's deployed `CTS.CLR` assembly is identified from its own bytes,
because 1.6.9.0 changed which columns the partner lookup reads. The right
columns are read for whatever is actually deployed.

Developer mode is off by default. It is for people with an MDES instance in
front of them.

## Failures name the MDES error

Where the app can predict a rejection, it now says which code it predicts and
what to change, rather than reporting a generic failure after upload.

## Settings is readable again

The settings page had grown into one long scroll. It is now a set of
collapsible sections - General, CSV validation, Partner Jurisdictions,
Certificates, Developer mode, MDES target, Updates & Version - each stating
what it is and, where it helps, what it is currently set to, so the common
question is answered without opening anything. Which sections you leave open is
remembered.

## What is verified, and what is not

Verified: 342 Python unit tests, the Playwright smoke and full regression
suites, byte-identical metadata against the reference tool, and a captured
reference delivery decrypted end to end.

Not yet verified: **an upload the portal accepts end to end.** The first real
upload attempt exposed two deployment defects on the target instance before
certificate validation could be evaluated - a partially deployed CLR binding,
not a problem with the packages. Preflight now checks for exactly that class of
deployment defect. FATCA/IDES naming rests on a single captured sample, and the
caveat is written into `cts/naming.py`.

The new `cts_cli` and `mdes_target_cli` entry points are built by
`build_python_backend.py`; where a packaged build does not include them, the app
falls back to system Python for those two paths.
