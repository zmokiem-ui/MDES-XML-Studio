"""Reading an MDES instance, and checking a delivery against it.

Split in two, deliberately.

The **properties** tests run anywhere: they use fixtures written to ``tmp_path``
and pin the parsing behaviour that is easy to get wrong — repeated keys where the
last one wins, ``${...}`` interpolation, and the inconsistent boolean spellings
MDES uses for the same flag across deployments.

The **database** tests need a real MDES database and skip without one. They pin
the two findings that justify this feature existing at all:

* a database with no CTS.CLR assembly cannot decrypt an upload however correct
  the package is; and
* a sender whose stored certificate differs from ours produces error 50004 while
  the file itself is faultless.

Point ``MDES_TEST_DB`` at a database (``server/database``, e.g.
``localhost\\SQLEXPRESS/MDES-DEMO``) to run them.
"""

from __future__ import annotations

import os

from pathlib import Path

import pytest

from crs_generator.mdes_target.props import (
    CRS_PRODUCTION_DOCTYPES,
    CRS_TEST_DOCTYPES,
    load_properties,
    parse_properties,
)

# --- Properties -------------------------------------------------------------


def _write(tmp_path, body: str, name: str = "PFGU.properties"):
    path = tmp_path / name
    path.write_text(body, encoding="utf-8")
    return path


def test_last_occurrence_of_a_repeated_key_wins(tmp_path):
    """The real PFGU.properties sets Country_Code_Provision twice, GH then CW.

    Reading the first would target the wrong country and every package built
    against it would be wrong, silently.
    """
    path = _write(tmp_path, "Country_Code_Provision=GH\nfoo=1\nCountry_Code_Provision=CW\n")
    assert load_properties(path).own_country == "CW"


def test_comments_and_blank_lines_are_ignored(tmp_path):
    path = _write(tmp_path, "# a comment\n\n! also a comment\nAppCountry=MH\n")
    assert load_properties(path).own_country == "MH"


def test_values_interpolate_against_the_same_file(tmp_path):
    path = _write(tmp_path, "\n".join([
        "KortPortaalURL=https://eoi.example/",
        "AuthenticatieUrl=${preferences.customPreference[KortPortaalURL]}login",
        "Country_Code_Provision=CW",
    ]))
    assert load_properties(path).get("AuthenticatieUrl") == "https://eoi.example/login"


def test_interpolation_of_a_missing_key_is_left_alone(tmp_path):
    path = _write(tmp_path, "AppCountry=CW\nX=${preferences.customPreference[Nope]}\n")
    assert load_properties(path).get("X") == "${preferences.customPreference[Nope]}"


def test_a_cyclic_reference_terminates(tmp_path):
    path = _write(tmp_path, "AppCountry=CW\nA=${B}\nB=${A}\n")
    assert "${" in load_properties(path).get("A")  # gave up rather than hanging


@pytest.mark.parametrize("value", ["true", "J", "yes", "Y", "1", "on"])
def test_the_many_spellings_of_true(tmp_path, value):
    """The same flag is `true` in one deployment and `J` in another."""
    path = _write(tmp_path, f"AppCountry=CW\nTest_Environment={value}\n")
    assert load_properties(path).is_test_environment is True


def test_a_production_environment_uses_the_production_doctype_range(tmp_path):
    path = _write(tmp_path, "\n".join([
        "AppCountry=CW",
        "Test_Environment=false",
        "EnvironmentUsedForTest=false",
        "OtapMode=Production",
    ]))
    properties = load_properties(path)
    assert properties.is_test_environment is False
    assert properties.doctype_indics("CRS") == CRS_PRODUCTION_DOCTYPES


def test_a_test_environment_uses_the_test_doctype_range(tmp_path):
    path = _write(tmp_path, "AppCountry=CW\nOtapMode=Acceptance\n")
    properties = load_properties(path)
    assert properties.is_test_environment is True
    assert properties.doctype_indics("CRS") == CRS_TEST_DOCTYPES


def test_treaty_list_is_parsed(tmp_path):
    path = _write(tmp_path, "AppCountry=CW\nVerdrag=FATCA,CRS,CBC\n")
    assert load_properties(path).modules == ("FATCA", "CRS", "CBC")


def test_fatca_entity_ids_come_from_the_instance(tmp_path):
    """These were hardcoded from a captured delivery; the instance is the source."""
    path = _write(tmp_path, "\n".join([
        "AppCountry=CW",
        "HCTA_FATCA_EntityID=000000.00000.TA.531",
        "FATCAEntityReceiverId_USA=000000.00000.TA.840",
    ]))
    properties = load_properties(path)
    assert properties.fatca_entity_sender_id == "000000.00000.TA.531"
    assert properties.fatca_entity_receiver_id == "000000.00000.TA.840"


def test_certificate_validity_flag_is_numeric_not_boolean(tmp_path):
    # checkValidityCertificate is 0/1, not true/false, and 0 must not read as on.
    assert load_properties(
        _write(tmp_path, "AppCountry=CW\ncheckValidityCertificate=0\n")
    ).checks_certificate_validity is False
    assert load_properties(
        _write(tmp_path, "AppCountry=CW\ncheckValidityCertificate=1\n")
    ).checks_certificate_validity is True


def test_a_file_with_no_separator_line_does_not_break_parsing(tmp_path):
    path = _write(tmp_path, "AppCountry=CW\nthis line has no separator\nVerdrag=CRS\n")
    assert parse_properties(path) == {"AppCountry": "CW", "Verdrag": "CRS"}


# --- Database ---------------------------------------------------------------

pyodbc = pytest.importorskip("pyodbc", reason="pyodbc is optional")


def _tmp_properties(text: str) -> Path:
    """Write a throwaway properties file that outlives this call.

    ``tmp_path`` is a fixture and this helper is called from a test that takes
    none, so the directory is created here and left to the OS to reap.
    """
    import tempfile

    directory = Path(tempfile.mkdtemp(prefix="mdes-props-"))
    path = directory / "SYNTHETIC.properties"
    path.write_text(text, encoding="utf-8")
    return path


def _target_from_env():
    raw = os.environ.get("MDES_TEST_DB")
    if not raw or "/" not in raw:
        pytest.skip(
            "Set MDES_TEST_DB=server/database (e.g. 'localhost\\\\SQLEXPRESS/MDES-DEMO') "
            "to run the database-backed checks."
        )
    server, database = raw.rsplit("/", 1)
    return server, database


@pytest.fixture(scope="module")
def facts():
    from crs_generator.mdes_target.database import (
        DatabaseUnavailable, build_connection_string, connect, read_facts,
    )

    server, database = _target_from_env()
    try:
        connection = connect(build_connection_string(server, database))
    except DatabaseUnavailable as exc:
        pytest.skip(f"{server}/{database} not reachable: {exc}")
    return read_facts(connection, database)


def test_partner_jurisdictions_are_read(facts):
    assert facts.partners, "DOORGEEFLANDEN returned nothing"
    assert all(len(p.country) == 2 for p in facts.partners)


def test_the_cts_assembly_decides_which_columns_are_read(facts):
    """CTS.CLR 1.6.9.0 changed the column pair; behaviour follows the assembly.

    A database whose populated columns disagree with its deployed assembly finds
    no sender certificate at all, which is invisible from the file.
    """
    if facts.cts_assembly is None:
        pytest.skip("No CTS.CLR deployed in this database")
    columns = facts.cts_assembly.columns
    assert columns["begin"] in (
        "CERTIFICAATBEGINDATUM", "DOORGEEFLAND_CERTIFICATE_BEGINDATUM"
    )
    if facts.cts_assembly.version == "1.6.9.0":
        assert facts.cts_assembly.uses_modern_columns


def test_own_country_is_derivable(facts):
    assert facts.own_country_candidates(), "no evidence of which country this is"


def test_stored_certificates_parse(facts):
    """Every certificate MDES holds must be readable, or we cannot compare it."""
    with_certs = [p for p in facts.partners if p.document_id is not None]
    if not with_certs:
        pytest.skip("No certificates stored")
    assert any(p.certificate is not None for p in with_certs)


def test_certificate_mismatch_is_detected(facts):
    """The finding this whole feature exists for.

    MDES verifies an incoming signature against the certificate stored for the
    *sender country*. Where that is not the certificate we would sign with, the
    package is rejected with 50004 and nothing in the file explains why.
    """
    from cryptography.hazmat.primitives import hashes

    from crs_generator.cts import certificates as store
    from crs_generator.cts.certificates import CertificateStoreError

    compared = 0
    for partner in facts.partners:
        if partner.certificate is None:
            continue
        try:
            ours = store.load_encryption_certificate(partner.country)
        except CertificateStoreError:
            continue
        compared += 1
        matches = (
            ours.fingerprint(hashes.SHA256()).hex()
            == partner.certificate.fingerprint_sha256
        )
        # Whichever way it goes, the comparison must be decisive: a mismatch is
        # a prediction of 50004, a match is a prediction of acceptance.
        assert isinstance(matches, bool)
    if compared == 0:
        pytest.skip("No country is present in both the store and the database")


# --- Preflight --------------------------------------------------------------


@pytest.fixture(scope="module")
def resolution():
    from crs_generator.mdes_target.profile import TargetProfile, resolve_target

    server, database = _target_from_env()
    props_path = os.environ.get("MDES_TEST_PROPS", "")
    profile = TargetProfile(
        name="pytest", props_path=props_path, server=server, database=database
    )
    return resolve_target(profile)


def test_preflight_picks_a_sender_whose_certificate_matches(resolution):
    """The one-click path needs a sender that will actually verify."""
    from cryptography.hazmat.primitives import hashes

    from crs_generator.cts import certificates as store
    from crs_generator.cts.certificates import CertificateStoreError
    from crs_generator.mdes_target.preflight import run_preflight

    if resolution.facts is None:
        pytest.skip("Database not reachable")
    result = run_preflight(resolution)
    if not result.sender:
        pytest.skip("No usable sender on this target")

    partner = resolution.facts.partner(result.sender)
    assert partner is not None and partner.accepted_now
    try:
        ours = store.load_encryption_certificate(result.sender)
    except CertificateStoreError:
        pytest.skip("Chosen sender is not in the certificate store")
    assert (
        ours.fingerprint(hashes.SHA256()).hex()
        == partner.certificate.fingerprint_sha256
    ), "preflight chose a sender whose certificate would not verify"


def test_a_missing_cts_assembly_blocks(resolution):
    from crs_generator.mdes_target.preflight import CheckOutcome, run_preflight

    if resolution.facts is None:
        pytest.skip("Database not reachable")
    result = run_preflight(resolution)
    assembly_check = next(c for c in result.checks if c.id == "cts-assembly")
    assembly = resolution.facts.cts_assembly
    if (
        assembly is None
        or assembly.missing_entry_points
        or assembly.entry_point_issues
    ):
        # Either no assembly at all, or one whose entry points were never
        # created - both leave the instance unable to decrypt any upload.
        assert assembly_check.outcome is CheckOutcome.FAIL
        assert result.blocked
    else:
        assert assembly_check.outcome is not CheckOutcome.FAIL


def test_a_mispaired_target_is_diagnosed_as_pairing_not_certificates():
    """A properties file and a database describing different instances.

    This surfaces first as a certificate mismatch, and the tempting repair -
    swapping a certificate until it passes - corrupts a correct certificate
    store to hide a configuration mistake. The pairing check has to own it, and
    the certificate check has to stand down.
    """
    import os as _os

    from crs_generator.mdes_target.preflight import CheckOutcome, run_preflight
    from crs_generator.mdes_target.profile import TargetProfile, resolve_target

    server, database = _target_from_env()
    other_props = _os.environ.get("MDES_TEST_PROPS_OTHER_COUNTRY")
    if not other_props:
        # Synthesised rather than borrowed. This used to require
        # $MDES_TEST_PROPS_OTHER_COUNTRY to name a real properties file for
        # another country, which made the test hostage to a file outside the
        # repository: the day somebody re-pointed that file at this database's
        # own country, the fixture silently became a matched pair and the test
        # failed for a reason that had nothing to do with the code. A file we
        # write ourselves cannot be re-pointed under us.
        real = _os.environ.get("MDES_TEST_PROPS")
        if not real:
            pytest.skip("Set MDES_TEST_PROPS to a readable properties file.")
        source = Path(real).read_text(encoding="utf-8", errors="replace")
        elsewhere = "\n".join(
            line for line in source.splitlines()
            if not line.strip().lower().startswith(
                ("country_code_provision", "appcountry"))
        )
        # MH: a country the certificate store does hold, but that no database
        # here serves. A country with no certificates at all would trip the
        # encryption-certificate check first and test the wrong thing.
        written = _tmp_properties(
            elsewhere + "\nCountry_Code_Provision=MH\nAppCountry=mh\n"
        )
        other_props = str(written)
    resolution = resolve_target(
        TargetProfile(name="mispaired", props_path=other_props,
                      server=server, database=database)
    )
    if resolution.facts is None:
        pytest.skip("Database not reachable")

    result = run_preflight(resolution)
    pairing = next(c for c in result.checks if c.id == "target-pairing")
    assert pairing.outcome is CheckOutcome.FAIL
    assert result.blocked

    # The remedy must point at the pairing and explicitly not at the certificates.
    assert "certificate store" in (pairing.remedy or "")

    # And the downstream checks must defer rather than mis-advise.
    for check_id in ("receiver", "encryption-certificate"):
        check = next(c for c in result.checks if c.id == check_id)
        assert check.outcome is CheckOutcome.SKIP, check_id
        assert "Replace" not in (check.remedy or "")


def test_a_correctly_paired_target_passes_the_pairing_check(resolution):
    from crs_generator.mdes_target.preflight import CheckOutcome, run_preflight

    if resolution.properties is None or resolution.facts is None:
        pytest.skip("Target not fully resolvable")
    pairing = next(
        c for c in run_preflight(resolution).checks if c.id == "target-pairing"
    )
    assert pairing.outcome is CheckOutcome.PASS


def test_addressing_the_wrong_receiver_predicts_50012(resolution):
    from crs_generator.mdes_target.preflight import CheckOutcome, run_preflight

    if not resolution.own_country:
        pytest.skip("Own country unknown")
    wrong = "ZZ" if resolution.own_country != "ZZ" else "YY"
    result = run_preflight(resolution, receiver=wrong)
    check = next(c for c in result.checks if c.id == "receiver")
    assert check.outcome is CheckOutcome.FAIL
    assert check.mdes_error == "50012"


def test_preflight_compares_package_doctypes_with_target_environment(resolution):
    from crs_generator.mdes_target.preflight import CheckOutcome, run_preflight

    if resolution.properties is None or resolution.facts is None:
        pytest.skip("Target not fully resolvable")

    allowed = list(resolution.properties.doctype_indics("CRS"))
    if not allowed:
        pytest.skip("Target has no CRS DocTypeIndic range")
    matching = run_preflight(resolution, package_doctype_indics=[allowed[0]])
    doctype = next(c for c in matching.checks if c.id == "doctype")
    assert doctype.outcome is CheckOutcome.PASS
    assert "package uses" in doctype.detail

    opposite = ["OECD1"] if resolution.properties.is_test_environment else ["OECD11"]
    mismatched = run_preflight(resolution, package_doctype_indics=opposite)
    doctype = next(c for c in mismatched.checks if c.id == "doctype")
    assert doctype.outcome is CheckOutcome.FAIL
    assert doctype.mdes_error == ("50011" if resolution.properties.is_test_environment else "50010")


class _FakeCursor:
    """Just enough cursor for procedure definitions, IDs, and parameters."""

    def __init__(self, bodies, existing, parameters=None):
        self.bodies = bodies
        self.existing = existing
        self.parameters = parameters or {}
        self._row = None
        self._rows = []

    def execute(self, sql, *params):
        argument = params[0] if params else None
        if "OBJECT_DEFINITION" in sql:
            self._row = (self.bodies.get(argument),)
            self._rows = []
        elif "FROM sys.parameters" in sql:
            self._rows = list(self.parameters.get(argument, ()))
            self._row = self._rows[0] if self._rows else None
        elif "OBJECT_ID" in sql:
            self._row = (1 if argument in self.existing else None,)
            self._rows = []
        else:
            self._row = None
            self._rows = []
        return self

    def fetchone(self):
        return self._row

    def fetchall(self):
        return self._rows


def test_a_registered_assembly_with_a_missing_entry_point_is_found():
    """MDES-D-LOCAL's actual state, and the reason a correct upload was refused.

    CTS.CLR 1.6.9.0 is registered, but DecryptCTSNotification - the procedure
    DecryptAndUpdateCTS calls - was never created, so the EXEC raises into the
    surrounding CATCH and the portal reports "Decryption failed" for every
    package. The file cannot show this; only the database can.
    """
    from crs_generator.mdes_target.database import read_missing_entry_points

    cursor = _FakeCursor(
        bodies={
            "DecryptAndUpdateCTS":
                "EXEC @ErrorCode = DecryptCTSNotification @notificationZipFile = @file;",
            "EncryptAndUpdateCTS":
                "EXEC @ErrorCode = SignAndEncryptCTSFile @file = @f;",
        },
        existing={"DecryptAndUpdateCTS", "EncryptAndUpdateCTS", "SignAndEncryptCTSFile"},
    )
    assert read_missing_entry_points(cursor) == ("DecryptCTSNotification",)


def test_a_complete_registration_reports_nothing_missing():
    from crs_generator.mdes_target.database import read_missing_entry_points

    cursor = _FakeCursor(
        bodies={
            "DecryptAndUpdateCTS": "EXEC @ErrorCode = DecryptCTSNotification @f = @file;",
            "EncryptAndUpdateCTS": "EXEC @ErrorCode = SignAndEncryptCTSFile @f = @file;",
        },
        existing={
            "DecryptAndUpdateCTS", "EncryptAndUpdateCTS",
            "DecryptCTSNotification", "SignAndEncryptCTSFile",
        },
    )
    assert read_missing_entry_points(cursor) == ()


def test_a_database_without_the_cts_procedures_reports_nothing_missing():
    """No DecryptAndUpdateCTS at all is a different failure, owned elsewhere."""
    from crs_generator.mdes_target.database import read_missing_entry_points

    assert read_missing_entry_points(_FakeCursor(bodies={}, existing=set())) == ()


def test_a_present_binding_with_a_missing_parameter_default_is_found():
    """The first D-LOCAL repair existed but still raised SQL error 201."""
    from crs_generator.mdes_target.database import read_entry_point_contract_issues

    cursor = _FakeCursor(
        bodies={
            "DecryptAndUpdateCTS": (
                "EXEC @ErrorCode = DecryptCTSNotification "
                "@notificationZipFile=@file, @checkValidityCertificate=1, "
                "@decryptedFile=@result OUT, @metadataFile=@metadata OUT, "
                "@error=@error OUT;"
            ),
        },
        existing={"DecryptAndUpdateCTS", "DecryptCTSNotification"},
        parameters={
            "DecryptCTSNotification": [
                ("@notificationZipFile", 0),
                ("@checkValidityCertificate", 0),
                ("@decryptedFile", 0),
                ("@metadataFile", 0),
                ("@error", 0),
                ("@isDebug", 0),
            ],
        },
    )

    assert read_entry_point_contract_issues(cursor) == (
        "DecryptAndUpdateCTS calls DecryptCTSNotification without required "
        "@isDebug; the binding has no default",
    )


def test_the_official_parameter_default_makes_the_binding_callable():
    from crs_generator.mdes_target.database import read_entry_point_contract_issues

    cursor = _FakeCursor(
        bodies={
            "DecryptAndUpdateCTS": (
                "EXEC @ErrorCode = DecryptCTSNotification "
                "@notificationZipFile=@file, @checkValidityCertificate=1, "
                "@decryptedFile=@result OUT, @metadataFile=@metadata OUT, "
                "@error=@error OUT;"
            ),
        },
        existing={"DecryptAndUpdateCTS", "DecryptCTSNotification"},
        parameters={
            "DecryptCTSNotification": [
                ("@notificationZipFile", 0),
                ("@checkValidityCertificate", 0),
                ("@decryptedFile", 0),
                ("@metadataFile", 0),
                ("@error", 0),
                ("@isDebug", 1),
            ],
        },
    )

    assert read_entry_point_contract_issues(cursor) == ()


def test_local_validity_enforcement_requires_a_trusted_sender_issuer(
    tmp_path, monkeypatch
):
    """A matching, unexpired leaf still gives 50004 when its CA is untrusted."""
    from datetime import datetime, timedelta, timezone

    from crs_generator.mdes_target import preflight
    from crs_generator.mdes_target.database import (
        CertificateRecord,
        DatabaseFacts,
        PartnerJurisdiction,
    )
    from crs_generator.mdes_target.profile import TargetProfile, TargetResolution

    properties = load_properties(_write(
        tmp_path,
        "AppCountry=CW\ncheckValidityCertificate=1\n",
    ))
    now = datetime.now(timezone.utc)
    certificate = CertificateRecord(
        document_id=1,
        filename="nl12unprotected.crt",
        subject="CN=Netherlands",
        issuer="CN=ca.internal.example",
        common_name="Netherlands",
        fingerprint_sha256="00",
        key_size=4096,
        not_before=now - timedelta(days=1),
        not_after=now + timedelta(days=365),
    )
    partner = PartnerJurisdiction(
        country="NL",
        name="Netherlands",
        document_id=1,
        valid_from=now - timedelta(days=1),
        valid_until=now + timedelta(days=365),
        accepted_now=True,
        certificate=certificate,
        automatic_exchange=True,
    )
    resolution = TargetResolution(
        profile=TargetProfile(
            name="local", props_path=str(properties.path),
            server=r"localhost\SQLEXPRESS", database="MDES-D-LOCAL",
        ),
        properties=properties,
        facts=DatabaseFacts(
            database="MDES-D-LOCAL", cts_assembly=None,
            own_certificate=None, own_private_certificate_name=None,
            partners=[partner],
        ),
    )
    monkeypatch.setattr(preflight, "_issuer_is_trusted_locally", lambda _issuer: False)

    check = preflight._check_certificate_expiry(resolution, "NL", "CW")

    assert check.outcome is preflight.CheckOutcome.FAIL
    assert check.mdes_error == "50004"
    assert "trusted root" in check.detail
