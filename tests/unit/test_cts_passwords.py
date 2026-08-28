"""Where certificate passwords come from.

The estate's own list is the only source that scales past one machine, and it is
not a clean file: a BOM, CRLF endings, and one country listed twice with two
different passwords, of which only the second opens the certificate. These tests
pin that behaviour, because a resolver that silently picks the first entry works
for whoever wrote it and fails for everybody else.
"""

from __future__ import annotations

import os

import pytest

from crs_generator.cts import passwords


@pytest.fixture
def clean_env(monkeypatch):
    for name in list(os.environ):
        if name.startswith(passwords.PASSWORD_ENV_PREFIX) or name in (
            passwords.PASSWORD_ENV_VAR, passwords.PASSWORD_FILE_ENV
        ):
            monkeypatch.delenv(name, raising=False)
    return monkeypatch


def write(tmp_path, text, name="Passwords.csv", encoding="utf-8"):
    path = tmp_path / name
    path.write_bytes(text.encode(encoding))
    return path


def test_reads_a_plain_two_column_file(tmp_path):
    path = write(tmp_path, "Country,password\nNL,netherland\nIT,italy\n")
    assert passwords.parse_password_file(path) == {
        "NL": ["netherland"], "IT": ["italy"],
    }


def test_survives_a_bom_and_crlf(tmp_path):
    path = write(tmp_path, "Country,password\r\nNL,netherland\r\n", encoding="utf-8-sig")
    assert passwords.parse_password_file(path) == {"NL": ["netherland"]}


def test_a_country_listed_twice_keeps_both_in_file_order(tmp_path):
    """The real file does this, and only the second entry opens the store."""
    path = write(tmp_path, "Country,password\nWS,stale\nWS,current\n")
    assert passwords.parse_password_file(path) == {"WS": ["stale", "current"]}


def test_the_same_password_twice_is_not_two_candidates(tmp_path):
    path = write(tmp_path, "Country,password\nWS,samoa\nWS,samoa\n")
    assert passwords.parse_password_file(path) == {"WS": ["samoa"]}


def test_the_header_is_not_a_country(tmp_path):
    path = write(tmp_path, "Country,password\nNL,netherland\n")
    assert "COUNTRY" not in passwords.parse_password_file(path)


def test_a_file_with_no_rows_is_an_error(tmp_path):
    path = write(tmp_path, "Country,password\n\n")
    with pytest.raises(passwords.PasswordFileError):
        passwords.parse_password_file(path)


def test_a_missing_file_is_an_error(tmp_path):
    with pytest.raises(passwords.PasswordFileError):
        passwords.parse_password_file(tmp_path / "nope.csv")


def test_precedence_explicit_beats_everything(tmp_path, clean_env):
    path = write(tmp_path, "Country,password\nNL,from-file\n")
    clean_env.setenv(passwords.PASSWORD_FILE_ENV, str(path))
    clean_env.setenv(f"{passwords.PASSWORD_ENV_PREFIX}NL", "from-country-env")
    clean_env.setenv(passwords.PASSWORD_ENV_VAR, "from-single-env")
    assert passwords.candidates("NL", "from-caller")[0] == "from-caller"


def test_precedence_per_country_env_beats_the_single_one(clean_env):
    clean_env.setenv(f"{passwords.PASSWORD_ENV_PREFIX}NL", "from-country-env")
    clean_env.setenv(passwords.PASSWORD_ENV_VAR, "from-single-env")
    assert passwords.candidates("NL")[0] == "from-country-env"


def test_the_app_s_single_password_beats_the_file(tmp_path, clean_env):
    """The desktop app sets one password for the country it is invoking for.

    Whatever the file says, that choice is deliberate and must win.
    """
    path = write(tmp_path, "Country,password\nNL,from-file\n")
    clean_env.setenv(passwords.PASSWORD_FILE_ENV, str(path))
    clean_env.setenv(passwords.PASSWORD_ENV_VAR, "from-app")
    assert passwords.candidates("NL")[0] == "from-app"


def test_the_file_still_contributes_as_a_fallback(tmp_path, clean_env):
    path = write(tmp_path, "Country,password\nNL,from-file\n")
    clean_env.setenv(passwords.PASSWORD_FILE_ENV, str(path))
    clean_env.setenv(passwords.PASSWORD_ENV_VAR, "from-app")
    assert passwords.candidates("NL") == ["from-app", "from-file"]


def test_no_configuration_resolves_nothing(clean_env):
    assert passwords.candidates("NL") == []
    assert passwords.resolve("NL") is None


def test_an_unreadable_file_does_not_hide_the_environment(tmp_path, clean_env):
    """A broken file must degrade to "no candidates from the file", not to none."""
    clean_env.setenv(passwords.PASSWORD_FILE_ENV, str(tmp_path / "gone.csv"))
    clean_env.setenv(f"{passwords.PASSWORD_ENV_PREFIX}NL", "from-env")
    assert passwords.candidates("NL") == ["from-env"]


def test_describe_sources_names_countries_but_never_passwords(tmp_path, clean_env):
    path = write(tmp_path, "Country,password\nNL,netherland\nWS,stale\nWS,current\n")
    clean_env.setenv(passwords.PASSWORD_FILE_ENV, str(path))
    described = passwords.describe_sources()
    assert described["passwordFileCountries"] == ["NL", "WS"]
    assert described["conflictingCountries"] == ["WS"]
    rendered = repr(described)
    for secret in ("netherland", "stale", "current"):
        assert secret not in rendered
