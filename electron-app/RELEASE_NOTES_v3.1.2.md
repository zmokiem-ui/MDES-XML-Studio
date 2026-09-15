# MDES XML Studio v3.1.2

This update makes the identifiers required for FATCA uploads explicit.

- FATCA-CRS asks for the supplying reporting entity TIN (`SendingCompanyIN`).
- Every Reporting FI has a separate required GIIN field.
- The generator no longer silently substitutes generated Reporting FI GIINs in the desktop form.
- TIN and GIIN guidance is available in English, Dutch, and Spanish.
- Identifier values are trimmed before XML generation.

Existing installations receive this release through the in-app updater. The release includes the installer, `latest.yml`, and blockmap metadata required by electron-updater.
