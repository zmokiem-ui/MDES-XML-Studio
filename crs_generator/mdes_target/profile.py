"""Target profiles: a named binding of a properties file and a database.

A profile stores only what cannot be derived — where the properties file is and
how to reach the database. Everything else is read live on each use, because the
running MDES application rewrites its own properties file and certificates in
the database expire.

Profiles live in the user's profile directory rather than the repository:
connection strings are specific to one machine, and a stored SQL password must
never reach git.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path

from .database import (
    DatabaseFacts,
    DatabaseUnavailable,
    build_connection_string,
    connect,
    list_mdes_databases,
    read_facts,
)
from .props import MdesProperties, PropsError, discover_properties_files, load_properties

# Where the desktop app keeps its profiles. The Electron side sets this to
# `app.getPath('userData')`; the CLI falls back to the platform config dir.
STORE_ENV_VAR = "MDES_TARGET_STORE"

PROFILES_FILENAME = "mdes-targets.json"


class ProfileError(RuntimeError):
    """A profile could not be read, written, or resolved."""


def store_path() -> Path:
    override = os.environ.get(STORE_ENV_VAR)
    if override:
        return Path(override).expanduser() / PROFILES_FILENAME
    base = os.environ.get("APPDATA") or os.environ.get("XDG_CONFIG_HOME") or Path.home()
    return Path(base) / "mdes-xml-studio" / PROFILES_FILENAME


@dataclass
class TargetProfile:
    """Where to find one MDES instance."""

    name: str
    props_path: str
    server: str = ""
    database: str = ""
    driver: str | None = None
    username: str | None = None
    # Never serialised. The Electron side holds it in the OS credential store and
    # passes it in per call, exactly as it does for certificate passwords.
    password: str | None = field(default=None, repr=False)

    def connection_string(self, password: str | None = None) -> str:
        if not self.server or not self.database:
            raise ProfileError(f"Target '{self.name}' has no database configured.")
        return build_connection_string(
            self.server,
            self.database,
            driver=self.driver,
            username=self.username,
            password=password if password is not None else self.password,
        )

    def to_dict(self, include_secrets: bool = False) -> dict:
        data = asdict(self)
        if not include_secrets:
            data.pop("password", None)
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "TargetProfile":
        allowed = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in data.items() if k in allowed})


# --- Persistence ------------------------------------------------------------


def load_profiles() -> list[TargetProfile]:
    path = store_path()
    if not path.is_file():
        return []
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ProfileError(f"Could not read {path}: {exc}") from exc
    return [TargetProfile.from_dict(item) for item in raw.get("targets", [])]


def save_profile(profile: TargetProfile) -> list[TargetProfile]:
    """Add or replace a profile by name. Passwords are never written."""
    profiles = [p for p in load_profiles() if p.name != profile.name]
    profiles.append(profile)
    profiles.sort(key=lambda p: p.name.lower())
    path = store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"targets": [p.to_dict() for p in profiles]}, indent=2),
        encoding="utf-8",
    )
    return profiles


def delete_profile(name: str) -> list[TargetProfile]:
    profiles = [p for p in load_profiles() if p.name != name]
    path = store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"targets": [p.to_dict() for p in profiles]}, indent=2),
        encoding="utf-8",
    )
    return profiles


def get_profile(name: str) -> TargetProfile:
    for profile in load_profiles():
        if profile.name == name:
            return profile
    raise ProfileError(f"No target named '{name}'.")


# --- Resolution -------------------------------------------------------------


@dataclass
class TargetResolution:
    """A profile, plus everything read from it."""

    profile: TargetProfile
    properties: MdesProperties | None
    facts: DatabaseFacts | None
    errors: list[str] = field(default_factory=list)

    @property
    def own_country(self) -> str:
        """The instance's country, preferring the properties file.

        The properties file is the instance's own declaration of what it is; the
        database corroborates. History is deliberately last, because a restored
        database carries deliveries addressed to whatever country it used to
        serve - ``MDES-DEMO`` holds both ``NL->CW`` and ``NL->MH``.
        """
        if self.properties and self.properties.own_country:
            return self.properties.own_country
        if self.facts:
            candidates = self.facts.own_country_candidates()
            if candidates:
                return candidates[0][0]
        return ""

    def country_evidence(self) -> list[dict]:
        """Every signal for the country, so a disagreement is visible."""
        evidence: list[dict] = []
        if self.properties and self.properties.own_country:
            evidence.append({
                "country": self.properties.own_country,
                "source": f"Country_Code_Provision in {Path(self.properties.path).name}",
            })
        if self.facts:
            evidence.extend(
                {"country": country, "source": why}
                for country, why in self.facts.own_country_candidates()
            )
        return evidence

    def to_dict(self) -> dict:
        return {
            "profile": self.profile.to_dict(),
            "properties": self.properties.summary() if self.properties else None,
            "database": self.facts.to_dict() if self.facts else None,
            "ownCountry": self.own_country,
            "countryEvidence": self.country_evidence(),
            "errors": self.errors,
        }


def resolve_target(profile: TargetProfile, password: str | None = None) -> TargetResolution:
    """Read the properties file and the database for a profile.

    Never raises for a partially-reachable target: a props file that loads while
    the database is down still tells you the country and the treaty list, and
    preflight reports the gap rather than the whole panel failing.
    """
    errors: list[str] = []

    properties = None
    if profile.props_path:
        try:
            properties = load_properties(profile.props_path)
        except PropsError as exc:
            errors.append(str(exc))
    else:
        errors.append("No properties file configured for this target.")

    facts = None
    if profile.server and profile.database:
        try:
            connection = connect(profile.connection_string(password))
            facts = read_facts(connection, profile.database)
        except DatabaseUnavailable as exc:
            errors.append(f"Database unavailable: {exc}")
        except Exception as exc:  # a driver-level failure is still just an error
            errors.append(f"Database error: {exc}")
    else:
        errors.append("No database configured for this target.")

    return TargetResolution(profile=profile, properties=properties, facts=facts, errors=errors)


# --- Discovery --------------------------------------------------------------

# Where MDES properties files live on a normal install. Offered as a starting
# point so a new user does not need to know the convention.
DEFAULT_PROPS_ROOTS = (r"C:\MDES", r"C:\MDES\props", r"D:\MDES")


def discover_targets(
    props_roots: list[str] | None = None,
    servers: list[str] | None = None,
) -> dict:
    """Propose targets by scanning for properties files and MDES databases.

    This is the whole "setup for another user" story: point it at a folder and a
    server, and it works out the rest.
    """
    roots = props_roots or [r for r in DEFAULT_PROPS_ROOTS if Path(r).is_dir()]
    props_found: list[dict] = []
    # The default roots overlap - C:\MDES contains C:\MDES\props - so the same
    # file is reachable twice. Deduplicate on the resolved path.
    seen: set[Path] = set()
    for root in roots:
        for path in discover_properties_files(root):
            resolved = path.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            try:
                properties = load_properties(path)
            except PropsError:
                continue
            props_found.append({
                "path": str(path),
                "ownCountry": properties.own_country,
                "environmentName": properties.environment_name,
                "isTestEnvironment": properties.is_test_environment,
            })

    databases: list[dict] = []
    database_errors: list[str] = []
    for server in servers or default_servers():
        try:
            found = list_mdes_databases(build_connection_string(server, "master"))
        except DatabaseUnavailable as exc:
            database_errors.append(f"{server}: {exc}")
            continue
        databases.extend({"server": server, **entry} for entry in found)

    # Offer a database that can actually decrypt an upload first. One without
    # CTS.CLR rejects everything regardless of how correct the package is, so it
    # is the worst possible default to hand someone on their first run.
    databases.sort(key=lambda d: (not d.get("hasCtsAssembly"), d["database"]))

    return {
        "propertiesFiles": props_found,
        "databases": databases,
        "databaseErrors": database_errors,
    }


_INSTANCE_KEY = r"SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL"


def default_servers() -> list[str]:
    """Local SQL Server instances, from the registry where available."""
    servers = ["localhost"]
    try:
        import winreg  # Windows only; absent elsewhere

        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, _INSTANCE_KEY) as key:
            count = winreg.QueryInfoKey(key)[1]
            for index in range(count):
                instance = winreg.EnumValue(key, index)[0]
                servers.append(
                    "localhost" if instance == "MSSQLSERVER" else f"localhost\\{instance}"
                )
    except Exception:
        pass
    # Preserve order, drop duplicates.
    return list(dict.fromkeys(servers))


_SAFE_NAME = re.compile(r"[^A-Za-z0-9 ._-]")


def suggest_name(properties: MdesProperties | None, database: str) -> str:
    """A readable default name for a discovered target."""
    country = properties.own_country if properties else ""
    label = f"{country} {database}".strip() if country else database
    return _SAFE_NAME.sub("", label) or "MDES target"
