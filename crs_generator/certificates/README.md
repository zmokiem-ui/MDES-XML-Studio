# Certificate pack

Seed certificates for CTS / IDES packaging. One directory per ISO 3166 alpha-2
country code, each holding up to two files:

| File | Role |
| --- | --- |
| `{prefix}12protected.p12` | signing — leaf + CA chain + private key, password-protected |
| `{prefix}12unprotected.crt` | encryption — the leaf on its own, public half only |

Both files are the **same keypair**. A country without a `protected.p12` can be
sent *to* but cannot send.

The filename prefix is not always the country code — `GB` ships as `uk` and `US`
as `usa`, matching the ART test estate. `crs_generator/cts/certificates.py` holds
the mapping, and it sniffs file contents rather than trusting extensions, so a
PEM certificate that kept a `.p12` name still loads.

## Where these came from

Current generation, issued 18–19 June 2025 by `CN=ca.internal.blyce.local`,
RSA-4096 except CW which is self-signed RSA-2048:

| Country | Subject CN | Expires |
| --- | --- | --- |
| AW | Departamentu di Impuesto Aruba (CRS) | 2030-02-12 |
| CW | CW | 2033-03-27 |
| FR | Tax liasson France | 2030-02-12 |
| GB | United Kingdom | 2030-02-13 |
| GL | Greenlandic Tax Agency | 2030-02-12 |
| IT | Agenzia delle Entrate | 2030-02-12 |
| MH | RMI MoF | 2030-02-13 |
| NL | Netherlands | 2030-02-26 |
| US | United States | 2030-02-13 |
| VU | Vanuatu DOF | 2030-02-13 |
| WS | Western Samoa | 2030-02-13 |

ART's `TestData/Certificates` also carries `as`, `at`, `be`, `dk`, `es` and `kn`
files. They are **not** shipped here: each is a copy of the Aruba or Netherlands
certificate under another country's name, and all of them expired on 2025-08-07.
Import them by hand if a test genuinely needs an expired or mislabelled
certificate.

## Passwords

Not stored in this repository. The values are the ones in ART's
`TestData/Certificates/Passwords.csv`, and that file is the source everything
reads - nobody should be typing eleven passwords by hand:

- **App**: *Settings → Certificates → Import passwords*, once. Each country goes
  into the OS credential store.
- **CLI and tests**: `export MDES_PASSWORDS_FILE=.../Passwords.csv`.
- **One country**: `--signing-password`, `--signing-password-stdin`, or
  `$MDES_SIGNING_PASSWORD` / `$MDES_SIGNING_PASSWORD_NL`.

To check a machine without revealing anything:

```bash
python -m crs_generator.cts_cli passwords
```

Two details that file will hand you. **`WS` is listed twice with different
passwords and only the second one opens the certificate**, so every candidate is
tried rather than the first being assumed; and a password passed in explicitly is
treated as an assertion - it fails loudly rather than quietly falling back, so a
stale stored password gets fixed instead of masked.

## Replacing a certificate

The app copies this pack into `app.getPath('userData')/certificates` on first run
and works from there, so **Settings → Certificates → Replace** is enough; no
release is needed. To update the seed for everyone, drop the new files in here
under the same names and re-run `tests/unit/test_cts_certificates.py`, which
fails once any certificate is within 90 days of expiry.
