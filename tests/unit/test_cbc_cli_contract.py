"""Contract tests for the CBC CLI used by Electron IPC handlers."""

from __future__ import annotations

import csv
import json
import subprocess
import sys
from pathlib import Path


def run_cbc_cli(*args: str) -> tuple[subprocess.CompletedProcess[str], dict]:
    proc = subprocess.run(
        [sys.executable, "-m", "crs_generator.cbc_cli", *args],
        capture_output=True,
        text=True,
        check=False,
    )
    payload = json.loads(proc.stdout[proc.stdout.index("{"):])
    return proc, payload


def write_cbc_csv(path: Path) -> None:
    rows = [{
        "TransmittingCountry": "NL",
        "ReceivingCountry": "NL",
        "TaxYear": "2024",
        "SendingEntityIN": "123456789",
        "ReportingEntity_TIN": "123456789",
        "ReportingEntity_Name": "Reporting Entity BV",
        "ReportingEntity_CountryCode": "NL",
        "MNEGroup_Name": "Example MNE",
        "ReportingRole": "CBC701",
        "JurisdictionCode": "NL",
        "Entity_TIN": "987654321",
        "Entity_Name": "Constituent Entity BV",
        "Entity_CountryCode": "NL",
        "Entity_Role": "CBC801",
        "IncorporationCountry": "NL",
        "BizActivity1": "CBC501",
        "Revenue_Unrelated": "1000",
        "Revenue_Related": "200",
        "Revenue_Total": "1200",
        "ProfitLoss": "300",
        "TaxPaid": "30",
        "TaxAccrued": "35",
        "Capital": "500",
        "Earnings": "250",
        "NumEmployees": "10",
        "TangibleAssets": "800",
        "Currency": "EUR",
    }]
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def test_validate_cbc_csv_reports_invalid_input_as_json(tmp_path):
    csv_path = tmp_path / "bad_cbc.csv"
    csv_path.write_text("TransmittingCountry\nNL\n", encoding="utf-8")

    proc, payload = run_cbc_cli("validate-csv", "--csv-input", str(csv_path))

    assert proc.returncode == 1
    assert payload["valid"] is False
    assert "Missing required columns" in payload["errors"][0]


def test_validate_cbc_csv_keeps_ui_statistics_contract(tmp_path):
    csv_path = tmp_path / "cbc.csv"
    write_cbc_csv(csv_path)

    proc, payload = run_cbc_cli("validate-csv", "--csv-input", str(csv_path))

    assert proc.returncode == 0
    assert payload["valid"] is True
    assert payload["statistics"]["total_reports"] == 1
    assert payload["statistics"]["total_entities"] == 1


def test_validate_cbc_xml_rejects_non_cbc_xml_as_json(tmp_path):
    xml_path = tmp_path / "crs.xml"
    xml_path.write_text(
        '<CRS_OECD xmlns="urn:oecd:ties:crs:v2" version="2.0"/>',
        encoding="utf-8",
    )

    proc, payload = run_cbc_cli("validate-xml", "--xml-input", str(xml_path))

    assert proc.returncode == 1
    assert payload["is_valid"] is False
    assert payload["can_generate_correction"] is False
    assert "Not a valid CBC XML file" in payload["errors"][0]
