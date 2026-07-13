"""End-to-end XSD-validity tests: generate via the CLIs, validate against the
official OECD/IRS schemas with :mod:`crs_generator.xsd_validator`.

These are the tests that would have caught the FATCA/CBC schema breakage — the
old suite only checked byte sizes and substrings, which the hand-rolled
validators cannot distinguish from correct element ordering.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from lxml import etree

from crs_generator import xsd_validator as xv
from crs_generator import mdes_rules as mr

REPO_ROOT = Path(__file__).resolve().parents[2]


def assert_mdes_clean(path):
    findings = mr.check_file(path)
    errors = [f for f in findings if f.severity == "error"]
    assert not errors, "MDES rule errors:\n" + "\n".join(e.as_text() for e in errors)


def run_cli(*args: str) -> subprocess.CompletedProcess:
    env = dict(os.environ, PYTHONPATH=str(REPO_ROOT))
    proc = subprocess.run(
        [sys.executable, "-m", *args],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        env=env,
    )
    assert proc.returncode == 0, f"CLI failed: {' '.join(args)}\n{proc.stderr}\n{proc.stdout}"
    return proc


def assert_valid(path: Path):
    result = xv.validate_file(path)
    assert result.valid, (
        f"{path.name} invalid against {result.message_type} {result.version}:\n"
        + "\n".join(f"  line {e['line']}: {e['message']}" for e in result.errors[:8])
    )
    return result


# --- CRS --------------------------------------------------------------------

def test_crs_new_is_xsd_valid(tmp_path):
    out = tmp_path / "crs_new.xml"
    run_cli("crs_generator.cli", "--mode", "random", "--sending-country", "NL",
            "--receiving-country", "DE", "--tax-year", "2024", "--mytin", "123456789",
            "--num-fis", "1", "--individual-accounts", "2", "--organisation-accounts", "1",
            "--controlling-persons", "1", "--output", str(out))
    r = assert_valid(out)
    assert r.message_type == "CRS"


def test_crs_correction_is_xsd_valid(tmp_path):
    src = tmp_path / "crs_new.xml"
    run_cli("crs_generator.cli", "--mode", "random", "--sending-country", "NL",
            "--receiving-country", "DE", "--tax-year", "2024", "--mytin", "123456789",
            "--num-fis", "1", "--individual-accounts", "2", "--organisation-accounts", "1",
            "--controlling-persons", "1", "--output", str(src))
    out = tmp_path / "crs_correction.xml"
    run_cli("crs_generator.cli", "--mode", "correction", "--xml-input", str(src),
            "--output", str(out), "--correct-individual", "1", "--modify-balance", "--test-mode")
    assert_valid(out)
    # A CRS702 must resend the FI as OECD10, not leave it OECD11 (MDES 80010).
    assert_mdes_clean(out)


# --- FATCA-CRS combined (the regression that started this) ------------------

@pytest.mark.parametrize("ind,org", [(2, 1), (0, 2), (3, 0)])
def test_fatca_crs_new_is_xsd_valid(tmp_path, ind, org):
    out = tmp_path / f"fatca_{ind}_{org}.xml"
    run_cli("crs_generator.fatca_cli", "--mode", "random", "--sending-country", "NL",
            "--receiving-country", "US", "--tax-year", "2024",
            "--sending-company-in", "A1B2C3.00000.SP.350", "--num-fis", "1",
            "--individual-accounts", str(ind), "--organisation-accounts", str(org),
            "--output", str(out))
    r = assert_valid(out)
    assert r.message_type == "FATCA_CRS"
    message_ref = etree.parse(str(out)).xpath(
        "string(.//*[local-name()='MessageRefId'][1])"
    )
    assert message_ref.startswith("NL2024A1B2C3.00000.SP.350")
    assert "MessageHeaderMessageRefID" not in message_ref


def test_fatca_crs_correction_is_xsd_valid(tmp_path):
    src = tmp_path / "fatca_new.xml"
    run_cli("crs_generator.fatca_cli", "--mode", "random", "--sending-country", "NL",
            "--receiving-country", "US", "--tax-year", "2024",
            "--sending-company-in", "A1B2C3.00000.SP.350", "--num-fis", "1",
            "--individual-accounts", "2", "--organisation-accounts", "1", "--output", str(src))
    out = tmp_path / "fatca_correction.xml"
    run_cli("crs_generator.fatca_cli", "--mode", "correction", "--xml-input", str(src),
            "--output", str(out), "--correct-individual", "1", "--modify-balance", "--test-mode")
    assert_valid(out)
    assert_mdes_clean(out)


# --- Pure IRS FATCA (FATCA_OECD) variant ------------------------------------

def test_fatca_oecd_variant_is_xsd_valid(tmp_path):
    out = tmp_path / "irs_fatca.xml"
    run_cli("crs_generator.fatca_cli", "--mode", "random", "--variant", "fatca-oecd",
            "--sending-country", "NL", "--receiving-country", "US", "--tax-year", "2024",
            "--sending-company-in", "S519K4.00000.LE.840", "--num-fis", "1",
            "--individual-accounts", "2", "--organisation-accounts", "1", "--output", str(out))
    r = assert_valid(out)
    assert r.message_type == "FATCA_OECD"
    assert r.version == "2.0.1"
    assert_mdes_clean(out)


# --- CBC --------------------------------------------------------------------

def test_cbc_new_is_xsd_valid(tmp_path):
    out = tmp_path / "cbc_new.xml"
    run_cli("crs_generator.cbc_cli", "generate", "--country", "NL", "--year", "2024",
            "--reports", "3", "--output", str(out))
    r = assert_valid(out)
    assert r.message_type == "CBC"


@pytest.mark.parametrize("ctype", ["correction", "deletion"])
def test_cbc_correction_is_xsd_valid(tmp_path, ctype):
    src = tmp_path / "cbc_new.xml"
    run_cli("crs_generator.cbc_cli", "generate", "--country", "NL", "--year", "2024",
            "--reports", "3", "--output", str(src))
    out = tmp_path / f"cbc_{ctype}.xml"
    run_cli("crs_generator.cbc_cli", "correct", "--source", str(src),
            "--output", str(out), "--type", ctype)
    assert_valid(out)


# --- FATCA-CRS business-rule content checks ---------------------------------

def test_fatca_no_placeholder_leakage_and_birthdate(tmp_path):
    out = tmp_path / "fatca.xml"
    run_cli("crs_generator.fatca_cli", "--mode", "random", "--sending-country", "NL",
            "--receiving-country", "US", "--tax-year", "2024",
            "--sending-company-in", "A1B2C3.00000.SP.350", "--num-fis", "1",
            "--individual-accounts", "2", "--organisation-accounts", "1", "--output", str(out))
    xml = out.read_text(encoding="utf-8")
    # Template placeholder remnants must not leak into output.
    assert "FixSuite" not in xml and ". abc" not in xml
    # MDES rejects any file containing '--' or '/*' (rule 98017).
    assert "--" not in xml and "/*" not in xml
    # BirthDate is emitted for individuals and controlling persons (rule 60014).
    assert "<sfa_ftc:BirthDate>" in xml
    # schemaLocation namespace hint matches the document namespace.
    assert "urn:fatcacrs:ties:v1" not in xml


def test_fatca_zero_accounts_is_refused(tmp_path):
    """A 'new' message with zero accounts must fail loudly, not emit invalid XML."""
    out = tmp_path / "empty.xml"
    env = dict(os.environ, PYTHONPATH=str(REPO_ROOT))
    proc = subprocess.run(
        [sys.executable, "-m", "crs_generator.fatca_cli", "--mode", "random",
         "--sending-country", "NL", "--receiving-country", "US", "--tax-year", "2024",
         "--sending-company-in", "A1B2C3.00000.SP.350", "--num-fis", "1",
         "--individual-accounts", "0", "--organisation-accounts", "0", "--output", str(out)],
        cwd=str(REPO_ROOT), capture_output=True, text=True, env=env,
    )
    assert proc.returncode != 0
    assert not out.exists()


# --- Negative control: prove the validator is NOT order-blind ---------------

def test_validator_rejects_reordered_elements(tmp_path):
    """Swap two sibling header elements in a valid file; it must become invalid.

    This is the guard against regressing to the old order-blind checkers.
    """
    src = tmp_path / "crs_new.xml"
    run_cli("crs_generator.cli", "--mode", "random", "--sending-country", "NL",
            "--receiving-country", "DE", "--tax-year", "2024", "--mytin", "123456789",
            "--num-fis", "1", "--individual-accounts", "1", "--organisation-accounts", "0",
            "--controlling-persons", "0", "--output", str(src))
    assert xv.validate_file(src).valid

    tree = etree.parse(str(src))
    ns = {"crs": "urn:oecd:ties:crs:v2"}
    spec = tree.find(".//crs:MessageSpec", ns)
    children = list(spec)
    # Move the first child to the end -> breaks the required sequence order.
    spec.remove(children[0])
    spec.append(children[0])
    broken = tmp_path / "crs_broken.xml"
    tree.write(str(broken), xml_declaration=True, encoding="UTF-8")

    assert not xv.validate_file(broken).valid
