"""FATCA_OECD (pure IRS FatcaXML) version selection: 2.0.1 and legacy 2.0.

Both releases share the ``urn:oecd:ties:fatca:v2`` namespace and are
structurally identical — 2.0.1 only re-points its imports at isofatcatypes
v1.2, which refreshes the country and currency code lists. That makes
``@version`` the *only* thing distinguishing the two on the wire, so these
tests pin it down at three levels: what the generator stamps, what
``xsi:schemaLocation`` advertises, and which schema the validator then routes
the file to.

MDES itself validates every FATCA_OECD upload against 2.0.1 unconditionally
(``camel config.xml`` sends the FATCA_OECD branch straight at
FatcaXML_v2.0.1.xsd with no 2.0 fallback), so 2.0 exists here for reproducing
older deliveries, not for a green upload.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from lxml import etree

from crs_generator import xsd_validator as xv
from crs_generator.fatca_irs_generator import (
    FATCA_OECD_SCHEMA_FILES,
    SUPPORTED_FATCA_OECD_VERSIONS,
    FATCAGenerator,
    FATCAGeneratorConfig,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
XSI = "http://www.w3.org/2001/XMLSchema-instance"


def build(tmp_path: Path, **kwargs) -> Path:
    out = tmp_path / "irs_fatca.xml"
    config = FATCAGeneratorConfig(
        sending_country="NL",
        receiving_country="US",
        tax_year=2024,
        sending_company_in="S519K4.00000.LE.840",
        num_reporting_fis=1,
        individual_accounts_per_fi=2,
        organisation_accounts_per_fi=1,
        output_path=out,
        show_progress=False,
        **kwargs,
    )
    return FATCAGenerator(config).generate()


def test_default_is_the_version_mdes_accepts():
    assert FATCAGeneratorConfig().oecd_version == "2.0.1"


def test_unsupported_version_is_refused():
    # 2.1 does not exist as a FatcaXML release; better a ValueError up front
    # than a file that advertises a schema nothing can resolve.
    with pytest.raises(ValueError, match="Unsupported oecd_version"):
        FATCAGeneratorConfig(oecd_version="2.1")


@pytest.mark.parametrize("version", SUPPORTED_FATCA_OECD_VERSIONS)
def test_version_is_stamped_on_the_root(tmp_path, version):
    root = etree.parse(str(build(tmp_path, oecd_version=version))).getroot()
    assert root.get("version") == version


@pytest.mark.parametrize("version", SUPPORTED_FATCA_OECD_VERSIONS)
def test_schema_location_matches_the_declared_version(tmp_path, version):
    """The template ships as a 2.0 document, so schemaLocation has to be
    rewritten too — otherwise a 2.0.1 file points readers at the 2.0 schema."""
    root = etree.parse(str(build(tmp_path, oecd_version=version))).getroot()
    location = root.get(f"{{{XSI}}}schemaLocation")
    assert location == f"urn:oecd:ties:fatca:v2 {FATCA_OECD_SCHEMA_FILES[version]}"
    assert location.split()[1] == f"FatcaXML_v{version}.xsd"


@pytest.mark.parametrize("version", SUPPORTED_FATCA_OECD_VERSIONS)
def test_each_version_validates_against_its_own_schema(tmp_path, version):
    """Namespace is identical across releases, so detect_version has only
    @version to go on. If that routing breaks, a file silently gets checked
    against the wrong schema."""
    result = xv.validate_file(build(tmp_path, oecd_version=version))
    assert result.message_type == "FATCA_OECD"
    assert result.version == version
    assert result.valid, result.errors


@pytest.mark.parametrize("version", SUPPORTED_FATCA_OECD_VERSIONS)
def test_cli_exposes_the_version_switch(tmp_path, version):
    out = tmp_path / f"cli_{version}.xml"
    env = dict(os.environ, PYTHONPATH=str(REPO_ROOT))
    proc = subprocess.run(
        [
            sys.executable, "-m", "crs_generator.fatca_cli",
            "--mode", "random", "--variant", "fatca-oecd",
            "--oecd-version", version,
            "--sending-country", "NL", "--receiving-country", "US",
            "--tax-year", "2024", "--sending-company-in", "S519K4.00000.LE.840",
            "--individual-accounts", "2", "--organisation-accounts", "1",
            "--output", str(out),
        ],
        cwd=str(REPO_ROOT), capture_output=True, text=True, env=env,
    )
    assert proc.returncode == 0, proc.stderr
    result = xv.validate_file(out)
    assert result.version == version
    assert result.valid, result.errors


def test_fc_variant_ignores_the_oecd_version_flag(tmp_path):
    """--oecd-version is always passed by the Electron layer; it must be inert
    for the fatca-crs variant rather than leaking 2.0 into an FC file."""
    out = tmp_path / "fc.xml"
    env = dict(os.environ, PYTHONPATH=str(REPO_ROOT))
    proc = subprocess.run(
        [
            sys.executable, "-m", "crs_generator.fatca_cli",
            "--mode", "random", "--variant", "fatca-crs",
            "--oecd-version", "2.0",
            "--sending-country", "CW", "--receiving-country", "CW",
            "--tax-year", "2024", "--sending-company-in", "20016636",
            "--individual-accounts", "2", "--organisation-accounts", "1",
            "--output", str(out),
        ],
        cwd=str(REPO_ROOT), capture_output=True, text=True, env=env,
    )
    assert proc.returncode == 0, proc.stderr
    result = xv.validate_file(out)
    assert result.message_type == "FATCA_CRS"
    assert result.version == "2.2"
