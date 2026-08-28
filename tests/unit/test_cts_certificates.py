"""Certificate store: what it holds, and how long it stays usable.

The expiry test is the important one here. The bundled pack runs out in
February 2030, and the failure mode without a gate is a tester discovering it
through a rejected upload months after the fact. This suite turns that into a
red build with 90 days of warning.

Signing passwords are deliberately absent from this repository, so the few tests
that need private-key access read them from the environment and skip when it is
not set. Everything that can be proved with a throwaway keypair is, so a clean
checkout still exercises the format itself (see ``test_cts_packaging.py``).
"""

from __future__ import annotations

import datetime as _dt

import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import Encoding

from crs_generator.cts import certificates as store

# Countries the bundled pack is expected to carry. A country dropping out of
# this set is a packaging accident, not a design change.
EXPECTED_COUNTRIES = {
    "AW", "CW", "FR", "GB", "GL", "IT", "MH", "NL", "US", "VU", "WS",
}


@pytest.fixture(scope="module")
def bundled_root():
    return store.bundled_store_root()


def test_bundled_pack_covers_the_expected_countries(bundled_root):
    assert set(store.list_countries(bundled_root)) == EXPECTED_COUNTRIES


def test_every_country_has_a_readable_encryption_certificate(bundled_root):
    for country in store.list_countries(bundled_root):
        cert = store.load_encryption_certificate(country, bundled_root)
        assert cert.public_key().key_size >= 2048, country


def test_no_certificate_is_close_to_expiry(bundled_root):
    """Fails 90 days before the pack stops working. Renew; don't raise the bound."""
    at_risk = [
        f"{info.country} {info.role} expires {info.not_after.date()} "
        f"({info.days_until_expiry} days)"
        for info in store.describe_store(root=bundled_root)
        if info.days_until_expiry <= store.EXPIRY_WARNING_DAYS
    ]
    assert not at_risk, (
        "Bundled certificates are expiring:\n  "
        + "\n  ".join(at_risk)
        + "\nReplace them in crs_generator/certificates/ - see its README."
    )


def test_no_certificate_is_post_dated(bundled_root):
    now = _dt.datetime.now(_dt.timezone.utc)
    for info in store.describe_store(root=bundled_root):
        assert info.not_before <= now, f"{info.country} is not valid yet"


def test_file_prefix_maps_the_two_countries_that_disagree_with_iso():
    # GB/US ship under uk/usa in the ART estate; everything else is the
    # lowercased country code. Getting this wrong means "no certificates found".
    assert store.file_prefix("GB") == "uk"
    assert store.file_prefix("US") == "usa"
    assert store.file_prefix("NL") == "nl"
    assert store.file_prefix("gl") == "gl"


def test_missing_country_reports_something_actionable(bundled_root):
    with pytest.raises(store.CertificateStoreError) as excinfo:
        store.load_encryption_certificate("ZZ", bundled_root)
    assert "ZZ" in str(excinfo.value)


def test_encryption_certificate_loads_from_a_pem_file_named_p12(tmp_path, bundled_root):
    """The estate is full of PEM certificates carrying a .p12 extension.

    Sniffing content rather than trusting the extension is what makes NL and CW
    load at all, so it is pinned rather than left implicit.
    """
    real = store.load_encryption_certificate("NL", bundled_root)
    country = tmp_path / "XX"
    country.mkdir()
    (country / "xx12unprotected.p12").write_bytes(real.public_bytes(Encoding.PEM))

    loaded = store.load_encryption_certificate("XX", tmp_path)
    assert loaded.fingerprint(hashes.SHA256()) == real.fingerprint(hashes.SHA256())


def test_signing_material_rejects_a_certificate_only_export(tmp_path, bundled_root):
    """A public certificate offered as signing material must not read as
    "wrong password" - that confusion is exactly the MDES bug we work around."""
    real = store.load_encryption_certificate("NL", bundled_root)
    country = tmp_path / "XX"
    country.mkdir()
    (country / "xx12protected.p12").write_bytes(real.public_bytes(Encoding.PEM))

    with pytest.raises(store.CertificateStoreError) as excinfo:
        store.load_signing_material("XX", "whatever", tmp_path)
    assert "no signing certificate" in str(excinfo.value).lower()


def test_wrong_password_says_password(bundled_root):
    with pytest.raises(store.CertificateStoreError) as excinfo:
        store.load_signing_material("NL", "definitely-not-the-password", bundled_root)
    assert "password" in str(excinfo.value).lower()


def test_store_env_var_overrides_the_bundled_pack(tmp_path, monkeypatch):
    monkeypatch.setenv(store.STORE_ENV_VAR, str(tmp_path))
    assert store.store_root() == tmp_path
    # The bundled accessor must ignore the override - the app relies on it to
    # find the seed while working from the user-writable copy.
    assert store.bundled_store_root() != tmp_path
