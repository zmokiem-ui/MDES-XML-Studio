# MDES XML Studio

A desktop application for generating valid **CRS**, **FATCA**, and **CbC** AEOI test XML
that testers upload into MDES (the Be Informed–based AEOI case-management system). It
pairs a Python generation/validation backend (`crs_generator`) with an Electron/React UI.

## Reporting standards

| Module | Schema | Notes |
| --- | --- | --- |
| CRS | `CrsXML_v2.0` | default until 2027-01-01, then the legacy choice; new + corrections/deletions |
| CRS 3.0 | `CrsXML_v3.0` | `--crs-version 3.0`; becomes the default on 2027-01-01; `urn:oecd:ties:crs:v3` |
| FATCA-CRS Combined | `FatcaCrs_v2.2` | default FATCA flow (FC upload) |
| FATCA-CRS Combined 3.0 | `FatcaCrs_v3.0` | opt-in via `--fc-version 3.0`; same namespace as 2.2, version is in `@version` |
| IRS FATCA (`FATCA_OECD`) | `FatcaXML_v2.0.1` | second FATCA flow; MDES hard-checks `@version="2.0.1"` |
| CbC | `CbcXML_v2.0` | new + corrections/deletions |

All generated output is validated against the official XSDs bundled under
`crs_generator/schemas/`, and business rules mirror the MDES validation XSLTs
(see `crs_generator/mdes_rules.py`).

### Domestic filings and foreign deliveries

CRS reaches MDES through two intakes, and the CRS form asks which one you want
before anything else.

A **domestic filing** is submitted by a local FI to its own tax authority, so
`TransmittingCountry` equals `ReceivingCountry`; the form derives the receiving
country from the transmitting one and does not ask for it.

A **foreign delivery** is a file arriving from a partner jurisdiction, uploaded
under `/crs/foreign-deliveries/crs-country-reports`. The two countries must
differ, the ReportingFI is resident in the transmitting country, and every
reported account holder is resident in the receiving one — which is what MDES
rules 60011/60012 check. Choosing Foreign defaults the account-holder country to
the receiving jurisdiction and names the file
`{TransmittingCountry}_CRS_{timestamp}Z_{random}.xml`, the convention the MDES
test tooling uses, so it lines up with the ZIP you encrypt from it.

The CLI takes the same switch:

```bash
python -m crs_generator.cli --mode random --file-type foreign \
  --sending-country IT --receiving-country CW --tax-year 2024 \
  --mytin 123456789 --num-fis 1 --individual-accounts 5 \
  --organisation-accounts 5 --output out/foreign.xml
```

Signing, encryption and ZIP packaging happen in the app too — see
[Encrypt and package](#encrypt-and-package) below.

CRS 3.0 keeps the v2 supporting schemas but moves to its own root namespace and
makes account classification mandatory: `SelfCert` on every account holder and
controlling person, `DDProcedure` and `AccountType` on every account report, and
`CtrlgPersonType` repeatable and required. `EquityInterestType` and
`JointAccount/Number` are new and optional. Version is auto-detected on
validation (by namespace, falling back to `@version`), so 2.0 and 3.0 files can
be mixed freely; only generation needs the explicit switch. Rule **60017** —
an `OECD606` (specified electronic money product) account number requires
`AccountType` `CRS1101` — applies to 3.0 only, matching MDES's own gating.

### Which version is the default

CRS 3.0 applies to reporting periods from 2026 and is first exchanged in 2027,
so MDES production still runs on 2.0 for the rest of this year. The switchover is
on the calendar rather than in a release: `CRS3_STANDARD_FROM` in
`crs_generator/generator.py` holds the date (2027-01-01), and everything that
needs a default reads it from `default_crs_version()`.

| | Default | The other choice |
| --- | --- | --- |
| before 2027-01-01 | 2.0 | 3.0, offered as *upcoming* |
| from 2027-01-01 | 3.0 | 2.0, offered as *legacy* |

Neither version is ever removed, and nothing is pinned to the default: passing
`--crs-version` (or picking the version in the UI) always wins. The Electron side
mirrors the same three constants in `electron-app/src/utils/crsVersion.js` so the
dropdown labels each version correctly on both sides of the cutover; keep the two
files in step.

### Corrections and deletions

A CRS702 has to stay in the schema version of the CRS701 it corrects, so the
corrections page does not offer a version picker: `--mode correction` reads the
version off the source file and generates a matching correction or deletion. Feed
it a 3.0 file and you get a 3.0 CRS702. The generated version is reported back as
`crs_version` in the CLI's JSON result and named in the app's success dialog, so
there is no guessing which schema a correction came out as.

### CRS 3.0 from CSV

Both CRS generation paths support 3.0: random data and CSV input. A CSV may add
these optional columns; each one left out falls back to the default shown, so a
2.0-era CSV regenerates as a valid 3.0 file unchanged.

| Column | Default | Values |
| --- | --- | --- |
| `AcctNumberType` | `OECD605` | `OECD601`–`OECD606` |
| `SelfCert` | `CRS901` | `CRS901`, `CRS902`, `CRS900` |
| `DDProcedure` | `CRS1201` | `CRS1201`, `CRS1202`, `CRS1200` |
| `AccountType` | `CRS1101` | `CRS1101`–`CRS1104`, `CRS1100` |
| `EquityInterestType` | none | comma-separated `CRS401`–`CRS410` |
| `JointAccount_Number` | none | 1–200 |
| `ControllingPerson_CtrlgPersonType` | `CRS801` | `CRS801`–`CRS813`, `CRS800` |
| `ControllingPerson_SelfCert` | `CRS1001` | `CRS1001`, `CRS1002`, `CRS1000` |

The `xx00` members are the transitional "not reported" codes, valid on input for
correcting pre-3.0 data but never generated for new data.

`AccountType` is not free-standing: MDES rules 60017-60023 tie it to the
account-number type, the payment types and `EquityInterestType`. A row whose
combination breaks one of them is rejected with its MDES error code rather than
written into the output.

| AccountType | AcctNumberType | Payment_Type | EquityInterestType |
| --- | --- | --- | --- |
| `CRS1101` Depository | `OECD605`, `OECD606` | `CRS502` only | not allowed |
| `CRS1102` Custodial | `OECD602`, `OECD604`, `OECD605` | any | not allowed |
| `CRS1103` Insurance/Annuity | `OECD605` only | `CRS503`, `CRS504` | not allowed |
| `CRS1104` Debt/Equity Interest | `OECD602`, `OECD604`, `OECD605` | `CRS503`, `CRS504` | allowed |

`OECD601` and `OECD603` are absent by design: rules 60000/60001 require the
account number to follow the IBAN and ISIN formats, which generated numbers do
not. Rules 60011/60012 additionally require the account holder - or, for an
entity holder, one of its controlling persons - to be resident in the receiving
country; that applies to CRS 2.0 as well. `--mode preview` with
`--crs-version 3.0` emits a CSV template that already includes and populates
these columns. Invalid values, an out-of-range `JointAccount_Number`, an
`OECD606` row whose `AccountType` is not `CRS1101` (rule 60017), and a closed
account with a non-zero balance (rule 60003) are all reported as row-level CSV
errors rather than written into the output.

### FATCA-CRS combined 3.0

The FC upload has its own 3.0, carrying the same classification into the combined
format: `SelfCert` on the account holder and on each controlling person,
`DDProcedure` and `AccountType` on the account report, `CtrlgPersonType`
repeatable, and an optional `JointAccount/Number`. FC 3.0 has **no**
`EquityInterestType`, and its `AccNumberType` stops at `OECD605` (there is no
`OECD606`), so rules 60017 and 60019 cannot arise on an FC upload.

The catch: **FC 3.0 keeps the 2.2 namespace** (`urn:fatcacrs:ties:v2`) and is
distinguished only by `@version` (`fixed="2.2"` vs `fixed="3.0"`). Validation
detects it from that attribute; without it a 3.0 file would be checked against
the 2.2 schema and every new element reported as unexpected.

Generate with `--fc-version 3.0`, or pick the version in the FATCA form. The
same AccountType/account-number/payment constraints as CRS apply.

## Encrypt and package

MDES does not accept plaintext XML. A delivery arrives as a ZIP holding three
entries, and the payload inside it is itself a signed, compressed, encrypted
document. The **Package** tab does the whole thing, so there is no longer a step
outside the app between generating a file and uploading it.

```bash
python -m crs_generator.cts_cli pack --source out/foreign.xml   --sender NL --receiver GL --type CRS --tax-year 2024 --output out/
```

The result is `NL_CRS_{timestamp}_{random}.zip` containing, in this order:

| Entry | What it is |
| --- | --- |
| `NL_CRS_Metadata.xml` | CTS metadata; `SenderFileId` embeds the document's own `MessageRefId` |
| `GL_CRS_Key` | `RSA-PKCS1v1.5(aesKey ‖ iv)` under the **receiver's** certificate — 48 plaintext bytes |
| `NL_CRS_Payload` | `AES-256-CBC` over a ZIP holding the XML-DSig-signed document |

Those names are how MDES finds the parts, so they are derived rather than typed.
CbC swaps the `_CRS_` infix for `_CBC_`; FATCA drops it entirely and the sender
becomes `US`. A status message keeps the base module inside the ZIP even though
the outer filename says `CRSStatus`.

Two invariants are worth knowing, because MDES only reports them after upload:
the payload must be **compressed before it is encrypted** (error 50003), and the
key file must be **CBC with a 48-byte concatenated key and IV** (error 50013).

`unpack` reads a package back — metadata needs nothing, the payload needs the
receiver's private key. It is how you read the status messages and NTJ
notifications MDES sends you:

```bash
python -m crs_generator.cts_cli unpack --package NL_CRS_....zip --country GL
```

### Certificates

Signing uses the sender's private key; encryption uses the receiver's public
certificate. Both ship with the app, one directory per country under
`crs_generator/certificates/`, and are copied into your user profile on first
run so **Settings → Certificates** can replace one without waiting for a
release. That screen also shows each certificate's key size and expiry, and
warns at 90 days; `tests/unit/test_cts_certificates.py` fails at the same point
so a renewal cannot be forgotten. The current pack runs to February 2030.

Passwords are not in this repository. Enter one per country in that screen — it
is kept in the OS credential store — or pass `$MDES_SIGNING_PASSWORD` to the
CLI.

### Deliberately broken packages

`--defect` produces a package that is wrong in one specific way, to exercise
MDES's file-level error handling: `ecb_mode` and `short_key` (50013),
`uncompressed_payload` (50003), `tamper_signature` (50004), `wrong_receiver`
(50012), `corrupt_key` (50002). This is the part the standalone cipher tool
could not do.

## Developer mode: build for a specific MDES instance

A package can be perfectly formed and still be rejected, because the rules that
decide acceptance are not in the file. They are in the MDES instance you are
uploading to.

The concrete case, on a real local database: thirteen partner countries have the
**Netherlands** certificate registered against them. Signing as IT with the
genuine Italian certificate produces a delivery MDES rejects with error 50004,
and nothing about the file is wrong. Only the instance's database knows that.

**Settings → Developer mode** turns this on. A **target** binds the app to one
instance — its properties file plus a read-only database connection — and
everything else is derived from it:

| Read from | What it decides |
| --- | --- |
| `Country_Code_Provision` | the receiver, and which certificate to encrypt to |
| `Verdrag` | which treaties the instance accepts |
| `Test_Environment` / `OtapMode` | the legal DocTypeIndic range (50010 / 50011) |
| `FirstYearDelivery`, `MaxFileSizeCTSTransmissionMB` | tax-year and size limits |
| `HCTA_FATCA_EntityID`, `FATCAEntityReceiverId_USA` | the IDES entity ids |
| `DOORGEEFLANDEN` | which senders are accepted, and **which certificate each is verified against** |
| `DS_CA_CERTIFICATE` | the instance's own certificate |
| `sys.assemblies` | whether CTS.CLR is deployed, and which schema it expects |

Those database queries are the ones `CTS.CLR.dll` issues itself, read out of the
assembly rather than guessed. **The column pair changed in CTS.CLR 1.6.9.0**, so
the deployed assembly is identified by its own bytes and the right columns are
read for it — pairing a 1.6.9.0 database with an older assembly finds no sender
certificate at all, and nothing in the file explains why.

A database with **no** CTS.CLR assembly cannot decrypt an upload however correct
the package is, so preflight blocks on it and target detection lists databases
that have one first.

Preflight then reports each rule with the error it predicts, and blocks the
build when one fails. There is a separate override, because deliberately-broken
packages remain a feature.

```bash
python -m crs_generator.mdes_target_cli discover
python -m crs_generator.mdes_target_cli save --name "CW demo"     --props C:/MDES/props/PFGU.properties     --server "localhost\SQLEXPRESS" --database MDES-DEMO
python -m crs_generator.mdes_target_cli preflight --target "CW demo"
python -m crs_generator.mdes_target_cli build --target "CW demo" --output out/
```

`build` is the one-click path and takes no other input: it asks the target what
would be accepted — including which sender's certificate actually matches — then
generates and packages exactly that. `package` does the same for an XML you
already have.

Reading the database needs `pyodbc` and a SQL Server ODBC driver. Both are
optional: without them everything else still works and only this panel reports
itself unavailable. The connection is opened read-only, and the code contains no
statement other than `SELECT` — **this app never writes to an MDES database.**

### Setting it up on another machine

**Detect** scans for properties files and for local SQL Server databases that
have the MDES tables, and proposes targets from what it finds. Targets are saved
in your user profile, never in the repository, and a SQL password is kept in the
OS credential store alongside the certificate passwords.

## Download (end users)

Grab the latest installer from [GitHub Releases](https://github.com/zmokiem-ui/MDES-XML-Studio/releases).

The app then updates itself. From **2.3.0** it checks the company GitLab package
registry first and falls back to GitHub when GitLab does not answer — which is
what happens off the VPN, since `gitlab.dcsc.com` is only reachable inside the
network. There is nothing to configure and no GitLab account is needed: the
installer carries a read-only token and authenticates as that token, not as you.

Settings → Updates shows which feed is actually in use.

## Quick start (developers)

Prerequisites: **Python 3.11+** and **Node.js 22+**.

```bash
# Python backend (editable install + test deps)
pip install -e .[test]
pytest tests/unit

# Electron app
cd electron-app
npm install
npm run electron:dev
```

The four CLIs the UI drives are also runnable directly, e.g.:

```bash
python -m crs_generator.cli   --mode random --sending-country NL --receiving-country DE \
                              --tax-year 2024 --mytin 12345678 --num-fis 1 \
                              --individual-accounts 5 --organisation-accounts 2 \
                              --controlling-persons 1 --output out/crs.xml
python -m crs_generator.cli   --mode random --crs-version 3.0 --sending-country NL \
                              --receiving-country DE --tax-year 2024 --mytin 12345678 \
                              --num-fis 1 --individual-accounts 5 --organisation-accounts 2 \
                              --controlling-persons 1 --output out/crs3.xml
python -m crs_generator.fatca_cli --mode random --variant fatca-oecd ... --output out/fatca.xml
python -m crs_generator.cbc_cli   generate --country NL --year 2024 --tin 999888777 ...
```

Add `--production` (CRS/FATCA) or `--production` (CbC) to emit production DocTypeIndic
(OECD1/FATCA1) instead of the test-env default (OECD11/FATCA11).

## Documentation

- **[docs/DEVELOPING.md](docs/DEVELOPING.md)** — project layout, running, tests, building the backend, both CI pipelines.
- **[docs/RELEASING.md](docs/RELEASING.md)** — **read this before releasing.** Versioning, the tag-driven pipelines, where every credential lives, how the two update feeds work, the ordering rule that stops clients being stranded, and a symptom-first table of every way this pipeline has broken.
- **[docs/gitlab-jenkins-bridge.md](docs/gitlab-jenkins-bridge.md)** — how the GitLab pipeline drives the Jenkins Windows agent, and why publishing lives on the GitLab side rather than in Jenkins.
- **[AGENTS.md](AGENTS.md)** — working conventions for AI/dev agents.
- **[SECURITY.md](SECURITY.md)** — security policy and ignored-file patterns.
