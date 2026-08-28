"""Where certificate passwords come from, and in what order.

Every country's signing certificate is password-protected, and the passwords
belong to the tester, not to this repository - ``SECURITY.md`` is explicit that
they must never be committed alongside the certificates they open.

That leaves the question of how a fresh machine gets all eleven of them without
anybody typing eleven passwords into a settings screen. The answer is that the
estate already has a canonical list: ``TestData/Certificates/Passwords.csv`` in
an ART checkout. Point ``$MDES_PASSWORDS_FILE`` at it and the CLI and the test
suite resolve every country; the desktop app imports it once into the OS
credential store and then no longer needs the file.

There is deliberately **no default search path**. A default that pointed into
``crs_generator/certificates/`` - a directory this repository does commit - would
be an invitation to drop the password file next to the certificates and push it.

The file is not quite a clean two-column CSV. Real copies carry a BOM, CRLF
endings, and at least one country listed twice with *different* passwords, so a
country resolves to a *list* of candidates rather than a single value and the
caller tries them in order. Picking one silently would leave that country
working on the machine of whoever chose it and failing everywhere else.
"""

from __future__ import annotations

import csv
import os
from pathlib import Path

PASSWORD_FILE_ENV = "MDES_PASSWORDS_FILE"
PASSWORD_ENV_PREFIX = "MDES_SIGNING_PASSWORD_"
PASSWORD_ENV_VAR = "MDES_SIGNING_PASSWORD"


class PasswordFileError(RuntimeError):
    """The password file was named but could not be used."""


def parse_password_file(path: str | Path) -> dict[str, list[str]]:
    """Read a passwords CSV into ``{COUNTRY: [password, ...]}``.

    Order within a country is file order, and duplicates are preserved: a
    country listed twice with two different passwords has two candidates, both
    of which are worth trying before declaring the certificate unopenable.
    """
    path = Path(path)
    if not path.is_file():
        raise PasswordFileError(f"Password file not found: {path}")

    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError as exc:
        raise PasswordFileError(f"Could not read {path}: {exc}") from exc

    found: dict[str, list[str]] = {}
    for row in csv.reader(text.splitlines()):
        if len(row) < 2:
            continue
        country = row[0].strip().strip('"').upper()
        password = row[1].strip().strip('"')
        # The header row, and any stray blank line, look like this.
        if not password or not country.isalpha() or len(country) != 2:
            continue
        candidates = found.setdefault(country, [])
        if password not in candidates:
            candidates.append(password)

    if not found:
        raise PasswordFileError(
            f"{path} held no country/password rows. Expected two columns, "
            f"an ISO country code and its certificate password."
        )
    return found


def password_file_path() -> Path | None:
    """The configured password file, if there is one."""
    configured = os.environ.get(PASSWORD_FILE_ENV, "").strip()
    return Path(configured) if configured else None


def from_password_file(country: str) -> list[str]:
    """Candidates for one country, or ``[]`` when no file is configured.

    An unreadable file that was explicitly configured is an error worth
    surfacing; a file that simply does not mention this country is not.
    """
    path = password_file_path()
    if path is None:
        return []
    return parse_password_file(path).get(country.upper(), [])


def candidates(country: str, explicit: str | None = None) -> list[str]:
    """Every password worth trying for ``country``, most specific first.

    1. what the caller passed in (stdin, or the app's per-invocation value)
    2. ``$MDES_SIGNING_PASSWORD_NL`` - per country, so a shell can hold several
    3. ``$MDES_SIGNING_PASSWORD`` - one country at a time, what the app sets
    4. the password file, which is the only source that scales past one machine
    """
    code = (country or "").upper()
    out: list[str] = []

    def add(value: str | None) -> None:
        if value and value not in out:
            out.append(value)

    add(explicit)
    if code:
        add(os.environ.get(f"{PASSWORD_ENV_PREFIX}{code}"))
    add(os.environ.get(PASSWORD_ENV_VAR))
    if code:
        try:
            for value in from_password_file(code):
                add(value)
        except PasswordFileError:
            # A misconfigured file must not mask passwords that did resolve; the
            # caller reports "could not open" with the candidates it had.
            pass
    return out


def resolve(country: str, explicit: str | None = None) -> str | None:
    """The single best candidate, for callers that cannot try several."""
    found = candidates(country, explicit)
    return found[0] if found else None


def describe_sources(countries: list[str] | None = None) -> dict:
    """What is configured, without revealing any of it.

    Used by the app and the CLI to answer "am I set up?" - the counts and the
    country codes are the useful part, and the passwords never leave here.
    """
    path = password_file_path()
    file_countries: list[str] = []
    file_error: str | None = None
    conflicts: list[str] = []
    if path is not None:
        try:
            parsed = parse_password_file(path)
            file_countries = sorted(parsed)
            conflicts = sorted(c for c, v in parsed.items() if len(v) > 1)
        except PasswordFileError as exc:
            file_error = str(exc)

    env_countries = sorted(
        key[len(PASSWORD_ENV_PREFIX):].upper()
        for key, value in os.environ.items()
        if key.startswith(PASSWORD_ENV_PREFIX) and value
    )
    resolved = sorted(
        {*env_countries, *file_countries}
        if countries is None
        else {c.upper() for c in countries if candidates(c)}
    )
    return {
        "passwordFile": str(path) if path else None,
        "passwordFileError": file_error,
        "passwordFileCountries": file_countries,
        "conflictingCountries": conflicts,
        "environmentCountries": env_countries,
        "singleEnvironmentPassword": bool(os.environ.get(PASSWORD_ENV_VAR)),
        "resolvedCountries": resolved,
    }
