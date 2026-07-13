"""Unit tests for the crs_generator.xsd_validator oracle itself."""

from __future__ import annotations

import json

import pytest
from lxml import etree

from crs_generator import xsd_validator as xv


@pytest.mark.parametrize("key", list(xv.SCHEMA_REGISTRY))
def test_every_registered_schema_compiles(key):
    """Each registered (type, version) must resolve all imports and compile.

    Catches the exact defect the old crs_generator/schemas/ layout had: missing
    imported type schemas so the XSD could not be built at all.
    """
    message_type, version = key
    schema = xv.load_schema(message_type, version)
    assert isinstance(schema, etree.XMLSchema)


def test_fatca_oecd_defaults_to_mdes_accepted_schema():
    assert xv.DEFAULT_VERSION["FATCA_OECD"] == "2.0.1"
    assert ("FATCA_OECD", "2.0.1") in xv.SCHEMA_REGISTRY


@pytest.mark.parametrize("namespace,expected", [
    ("urn:oecd:ties:crs:v2", "CRS"),
    ("urn:fatcacrs:ties:v2", "FATCA_CRS"),
    ("urn:fatcacrs:ties:v1", "FATCA_CRS"),  # legacy ns still detected
    ("urn:oecd:ties:fatca:v2", "FATCA_OECD"),
    ("urn:oecd:ties:cbc:v2", "CBC"),
])
def test_detect_message_type_by_namespace(namespace, expected):
    root = etree.Element(f"{{{namespace}}}SomeRoot")
    assert xv.detect_message_type(root) == expected


def test_detect_message_type_unknown_raises():
    root = etree.Element("{urn:made:up:ns}Nope")
    with pytest.raises(xv.UnknownMessageType):
        xv.detect_message_type(root)


def test_validation_result_json_shape_and_alias():
    r = xv.ValidationResult(valid=False, message_type="CRS", version="2.0",
                            errors=[{"line": 3, "column": 0, "message": "boom"}])
    d = json.loads(r.to_json())
    assert d["valid"] is False
    assert d["is_valid"] is False  # backwards-compatible alias mirrors `valid`
    assert d["message_type"] == "CRS"
    assert d["errors"][0]["message"] == "boom"


def test_validate_bytes_detects_and_validates():
    # Minimal CRS-namespaced but structurally-incomplete doc: detection should
    # succeed (namespace known) and validation should fail (missing children).
    data = b'<crs:CRS_OECD xmlns:crs="urn:oecd:ties:crs:v2" version="2.0"/>'
    result = xv.validate_bytes(data)
    assert result.message_type == "CRS"
    assert result.valid is False
    assert result.errors
