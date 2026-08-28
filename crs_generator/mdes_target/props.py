"""Read an MDES properties file and derive the rules it implies.

An MDES instance is configured by a Java properties file — typically
``C:\\MDES\\props\\PFGU*.properties``. It is the authority on things the XML
itself cannot tell you: which country the instance *is*, which treaties it
accepts, and whether it is a test environment (which decides the legal
DocTypeIndic range, and therefore whether a delivery comes back as 50010/50011).

Three properties of the format bite if you assume Java-ish behaviour:

*   **Keys repeat, and the last occurrence wins.** ``PFGU.properties`` sets
    ``Country_Code_Provision=GH`` and then ``=CW`` sixty lines later. Reading the
    first would target the wrong country and every package would be wrong.
*   **Values interpolate** ``${preferences.customPreference[SomeKey]}``, resolved
    against the same file.
*   **The running application rewrites the file.** It changed on disk mid-session
    during development. Nothing here may cache the parsed result to disk; re-read
    on every use and let the caller decide how long to hold it in memory.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

# ``${preferences.customPreference[Key]}`` and the plainer ``${Key}``.
_INTERPOLATION = re.compile(
    r"\$\{(?:preferences\.customPreference\[(?P<bracketed>[^\]]+)\]|(?P<plain>[^}]+))\}"
)

# How deep to follow a chain of interpolations before assuming a cycle.
_MAX_INTERPOLATION_DEPTH = 8

# Values MDES writes for a boolean. It is inconsistent between files: the same
# flag is ``true`` in one and ``J`` (Dutch "ja") in another, and ``Y`` elsewhere.
_TRUE_VALUES = {"true", "yes", "y", "j", "1", "on"}
_FALSE_VALUES = {"false", "no", "n", "0", "off"}

# DocTypeIndic ranges. A test environment must receive test data and a production
# environment production data; crossing them is MDES 50010 / 50011.
CRS_TEST_DOCTYPES = ("OECD10", "OECD11", "OECD12", "OECD13")
CRS_PRODUCTION_DOCTYPES = ("OECD0", "OECD1", "OECD2", "OECD3")
FATCA_TEST_DOCTYPES = ("FATCA11", "FATCA12", "FATCA13", "FATCA14")
FATCA_PRODUCTION_DOCTYPES = ("FATCA1", "FATCA2", "FATCA3", "FATCA4")


class PropsError(RuntimeError):
    """The properties file could not be read."""


def parse_properties(path: str | Path) -> dict[str, str]:
    """Parse a properties file into a flat dict, last occurrence winning.

    Comments (``#`` or ``!``), blank lines and leading whitespace are ignored.
    Both ``=`` and ``:`` separate a key from its value; the value keeps internal
    spacing but is stripped at the ends, which is what MDES itself does.
    """
    path = Path(path)
    try:
        # These files are UTF-8 in practice; latin-1 is the fallback because a
        # properties file is never allowed to fail to load over one stray byte.
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = path.read_text(encoding="latin-1")
    except OSError as exc:
        raise PropsError(f"Could not read {path}: {exc}") from exc

    values: dict[str, str] = {}
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped[0] in "#!":
            continue
        separator = min(
            (i for i in (stripped.find("="), stripped.find(":")) if i > 0),
            default=-1,
        )
        if separator < 0:
            continue
        key = stripped[:separator].strip()
        if key:
            values[key] = stripped[separator + 1:].strip()
    return values


def _interpolate(value: str, values: dict[str, str], depth: int = 0) -> str:
    if depth >= _MAX_INTERPOLATION_DEPTH or "${" not in value:
        return value

    def replace(match: re.Match) -> str:
        key = match.group("bracketed") or match.group("plain")
        return values.get(key.strip(), match.group(0))

    return _interpolate(_INTERPOLATION.sub(replace, value), values, depth + 1)


@dataclass(frozen=True)
class MdesProperties:
    """A parsed properties file, plus the rules that follow from it."""

    path: Path
    values: dict[str, str]

    # --- raw access ---------------------------------------------------------

    def get(self, key: str, default: str | None = None) -> str | None:
        """A property with any ``${...}`` references resolved."""
        if key not in self.values:
            return default
        return _interpolate(self.values[key], self.values)

    def get_bool(self, key: str, default: bool = False) -> bool:
        raw = (self.get(key) or "").strip().lower()
        if raw in _TRUE_VALUES:
            return True
        if raw in _FALSE_VALUES:
            return False
        return default

    def get_int(self, key: str, default: int | None = None) -> int | None:
        raw = (self.get(key) or "").strip()
        try:
            return int(raw)
        except (TypeError, ValueError):
            return default

    # --- derived rules ------------------------------------------------------

    @property
    def own_country(self) -> str:
        """The country this instance *is*.

        Every delivery uploaded here must name it as the receiver, and must be
        encrypted to its certificate. ``AppCountry`` is the fallback because a
        few deployments set only that.
        """
        return (self.get("Country_Code_Provision") or self.get("AppCountry") or "").upper()

    @property
    def modules(self) -> tuple[str, ...]:
        """Treaties this instance accepts, from ``Verdrag``."""
        raw = self.get("Verdrag") or ""
        return tuple(part.strip().upper() for part in raw.split(",") if part.strip())

    @property
    def is_test_environment(self) -> bool:
        """Whether test DocTypeIndic values are the ones that will be accepted.

        Three keys say the same thing and deployments do not set them
        consistently, so any of them being true is taken as true. ``OtapMode``
        is a word rather than a flag; only ``Production`` means production.
        """
        if self.get_bool("Test_Environment") or self.get_bool("EnvironmentUsedForTest"):
            return True
        otap = (self.get("OtapMode") or self.get("otap_mode") or "").strip().lower()
        return bool(otap) and otap not in ("production", "productie", "prod", "p")

    def doctype_indics(self, module: str = "CRS") -> tuple[str, ...]:
        """The DocTypeIndic values this environment will accept for a module."""
        if module.upper().startswith("FATCA"):
            return FATCA_TEST_DOCTYPES if self.is_test_environment else FATCA_PRODUCTION_DOCTYPES
        return CRS_TEST_DOCTYPES if self.is_test_environment else CRS_PRODUCTION_DOCTYPES

    @property
    def first_delivery_year(self) -> int | None:
        return self.get_int("FirstYearDelivery")

    @property
    def max_transmission_mb(self) -> int | None:
        return self.get_int("MaxFileSizeCTSTransmissionMB")

    @property
    def checks_certificate_validity(self) -> bool:
        """Whether the instance enforces certificate validity dates on upload."""
        return (self.get("checkValidityCertificate") or "0").strip() not in ("0", "", "false")

    @property
    def fatca_entity_sender_id(self) -> str | None:
        """This instance's own FATCA/IDES entity id (a GIIN-shaped string)."""
        return self.get("HCTA_FATCA_EntityID") or self.get("HCTA_FATCA_GIIN")

    @property
    def fatca_entity_receiver_id(self) -> str | None:
        """The IRS entity id FATCA reports are addressed to.

        This is where ``IDES_IRS_RECEIVER_ID`` in :mod:`crs_generator.cts.packager`
        came from — it was read off a captured delivery. Taking it from the
        instance's own configuration is the correct source.
        """
        return self.get("FATCAEntityReceiverId_USA")

    @property
    def environment_name(self) -> str:
        """A short human label, for the target list."""
        otap = self.get("OtapMode") or self.get("otap_mode") or ""
        country = self.own_country or "??"
        return f"{country} {otap}".strip() if otap else country

    def summary(self) -> dict:
        """JSON-safe view, for the CLI and the settings panel."""
        return {
            "path": str(self.path),
            "ownCountry": self.own_country,
            "environmentName": self.environment_name,
            "modules": list(self.modules),
            "isTestEnvironment": self.is_test_environment,
            "docTypeIndics": {
                "CRS": list(self.doctype_indics("CRS")),
                "FATCA": list(self.doctype_indics("FATCA")),
            },
            "firstDeliveryYear": self.first_delivery_year,
            "maxTransmissionMb": self.max_transmission_mb,
            "checksCertificateValidity": self.checks_certificate_validity,
            "fatcaEntitySenderId": self.fatca_entity_sender_id,
            "fatcaEntityReceiverId": self.fatca_entity_receiver_id,
            "applicationName": self.get("ApplicationName"),
            "countryName": self.get("CountryName"),
            "portalVersion": self.get("Portal_version"),
            "validationProcessVersion": self.get("ValidationProcessVersion"),
        }


def load_properties(path: str | Path) -> MdesProperties:
    """Read a properties file. Always re-reads; never caches to disk."""
    path = Path(path)
    return MdesProperties(path=path, values=parse_properties(path))


def discover_properties_files(root: str | Path, max_depth: int = 3) -> list[Path]:
    """Find candidate properties files under a folder.

    Used by the target-setup flow so another user does not have to know that
    ``C:\\MDES\\props`` is where these live. Only files that actually look like an
    MDES configuration are returned.
    """
    root = Path(root)
    if not root.is_dir():
        return []
    found: list[Path] = []
    for candidate in root.rglob("*.properties"):
        try:
            if len(candidate.relative_to(root).parts) > max_depth:
                continue
            values = parse_properties(candidate)
        except (PropsError, ValueError):
            continue
        # Country_Code_Provision is the one key no MDES portal configuration
        # omits, and no unrelated properties file has.
        if "Country_Code_Provision" in values or "AppCountry" in values:
            found.append(candidate)
    return sorted(found)
