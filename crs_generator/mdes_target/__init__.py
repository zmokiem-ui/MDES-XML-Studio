"""Bind the app to a real MDES instance, and package for *that* instance.

:mod:`crs_generator.cts` produces a delivery that is correct as a *format*.
Whether it is correct as an *upload* depends on the MDES instance receiving it,
and those rules live outside the file: in the portal's properties file and in its
database.

A **target** is that binding — a properties file plus a read-only database
connection — from which everything else is derived:

*   which country the instance is, and therefore what ``ReceivingCountry`` and
    ``CTSReceiverCountryCd`` must be, and which certificate to encrypt to;
*   which sender countries it will accept, and **which certificate it will verify
    each one against** — the check that catches an otherwise-perfect file;
*   whether it is a test environment, which fixes the legal DocTypeIndic range;
*   which treaties, tax years and file sizes it accepts;
*   whether its CTS.CLR assembly is deployed at all, and which schema variant it
    expects.

:mod:`~crs_generator.mdes_target.preflight` turns those facts into checks that
each name the MDES error they predict, so a refusal reads as "this would come
back as 50004" rather than "invalid configuration".
"""

from __future__ import annotations

from .database import (
    ClrAssembly,
    DatabaseFacts,
    DatabaseUnavailable,
    PartnerJurisdiction,
    available_drivers,
    build_connection_string,
    connect,
    read_facts,
)
from .preflight import CheckOutcome, Preflight, PreflightResult, run_preflight
from .profile import (
    TargetProfile,
    TargetResolution,
    delete_profile,
    discover_targets,
    load_profiles,
    resolve_target,
    save_profile,
)
from .props import MdesProperties, PropsError, discover_properties_files, load_properties

__all__ = [
    "CheckOutcome",
    "ClrAssembly",
    "DatabaseFacts",
    "DatabaseUnavailable",
    "MdesProperties",
    "PartnerJurisdiction",
    "Preflight",
    "PreflightResult",
    "PropsError",
    "TargetProfile",
    "TargetResolution",
    "available_drivers",
    "build_connection_string",
    "connect",
    "delete_profile",
    "discover_properties_files",
    "discover_targets",
    "load_profiles",
    "load_properties",
    "read_facts",
    "resolve_target",
    "run_preflight",
    "save_profile",
]
