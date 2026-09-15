"""Deliberate faults must fail for the one reason they claim.

A negative test that passes the portal proves nothing, and one that trips three
rules at once proves nothing either - MDES reports whichever check runs first.
So the contract under test is narrow: after applying a fault, the intended code
is reported and no other error is. ``provoke.apply_to_file`` enforces that
itself, which is why most of these tests assert on what it refuses as much as
on what it produces.

The document is generated rather than hand-written: 50007 is confirmed against
the real schema, and a hand-written fixture would be schema-invalid before any
fault was applied, so the check would pass for the wrong reason.
"""

import shutil

import pytest
from lxml import etree

from crs_generator import mdes_rules
from crs_generator.generator import CRSGenerator, GeneratorConfig
from crs_generator.mdes_target import provoke

SENDER = "CW"
RECEIVER = "MH"
TAX_YEAR = 2020


@pytest.fixture(scope="module")
def clean_delivery(tmp_path_factory):
    """A valid foreign CRS delivery, shaped the way the build path makes one."""
    out = tmp_path_factory.mktemp("provoke")
    config = GeneratorConfig(
        sending_country=SENDER,
        receiving_country=RECEIVER,
        file_type="foreign",
        tax_year=TAX_YEAR,
        mytin="123456789",
        num_reporting_fis=1,
        individual_accounts_per_fi=2,
        organisation_accounts_per_fi=2,
        controlling_persons_per_org=1,
        seed=11,
        output_path=out / "clean.xml",
        test_mode=True,
        show_progress=False,
        pretty_print=True,
    )
    return CRSGenerator(config).generate(use_parallel=False)


@pytest.fixture
def delivery(clean_delivery, tmp_path):
    """A private copy, because every provocation edits the file in place."""
    target = tmp_path / "delivery.xml"
    shutil.copyfile(clean_delivery, target)
    return target


def context(**overrides) -> provoke.Context:
    options = dict(sender=SENDER, receiver=RECEIVER, tax_year=str(TAX_YEAR),
                   file_type="foreign", environment_is_test=True)
    options.update(overrides)
    return provoke.Context(**options)


def parse(path):
    parser = etree.XMLParser(resolve_entities=False, no_network=True)
    return etree.parse(str(path), parser).getroot()


def findings(path, environment_is_test=True, file_type="foreign"):
    return mdes_rules.check_mdes_rules(
        parse(path), "CRS",
        environment_is_test=environment_is_test, file_type=file_type,
    )


def error_codes(path, **options):
    return sorted({f.code for f in findings(path, **options) if f.severity == "error"})


# --- The document we start from ---------------------------------------------


def test_the_generated_delivery_is_clean(delivery):
    """Otherwise every assertion below is meaningless."""
    assert error_codes(delivery) == []


# --- Every document-layer fault, proven against the rule engine -------------


DOCUMENT_FAULTS = [
    provocation for provocation in provoke.PROVOCATIONS
    if provocation.mutation is not None
    and provocation.confirm == "rules"
    and provocation.requires_file_type in (None, "foreign")
    and provocation.requires_environment in (None, "test")
]


@pytest.mark.parametrize("provocation", DOCUMENT_FAULTS, ids=lambda p: p.code)
def test_each_fault_provokes_exactly_its_own_code(delivery, provocation):
    applied = provoke.apply_to_file(delivery, provocation, context())

    assert applied.code == provocation.code
    assert applied.change, "a fault that changed nothing is not a fault"
    assert error_codes(delivery) == [provocation.code]
    # The file is still parseable and still a CRS delivery: MDES has to get far
    # enough to run the rule, or it reports something else entirely.
    assert provoke._local(parse(delivery).tag) == "CRS_OECD"


def test_all_document_faults_are_covered():
    """A new entry with a mutation must not slip past the parametrised test."""
    uncovered = {
        p.code for p in provoke.PROVOCATIONS
        if p.mutation is not None and p.confirm == "rules"
    } - {p.code for p in DOCUMENT_FAULTS}
    # Two cannot land on this delivery, and each has its own test below: 80017
    # needs a domestic intake, 50010 a production instance.
    assert uncovered == {"80017", "50010"}


# --- The individual faults, on the detail that matters ----------------------


def test_50008_keeps_the_identifier_the_same_shape(delivery):
    """Only the prefix is wrong - length and charset stay plausible."""
    before = mdes_rules._first_text(parse(delivery), "MessageRefId")
    provoke.apply_to_file(delivery, provoke.find("50008"), context())
    after = mdes_rules._first_text(parse(delivery), "MessageRefId")
    assert len(after) == len(before)
    assert after.startswith(f"{RECEIVER}{TAX_YEAR}{SENDER}")
    assert not after.startswith(f"{SENDER}{TAX_YEAR}{RECEIVER}")


def test_80025_pads_a_docrefid_and_nothing_else(delivery):
    """80025 is the DocRefId rule, not the MessageRefId one.

    ``validate-crs-message.xsl`` has no MessageRefId whitespace test at all, so
    padding that element would produce a delivery MDES accepts. The stripped
    value still satisfies the prefix rules, which is what leaves 80025 alone.
    """
    provoke.apply_to_file(delivery, provoke.find("80025"), context())
    root = parse(delivery)

    assert mdes_rules._first_text(root, "MessageRefId") == (
        parse(delivery).find(".//{*}MessageRefId").text
    ), "the MessageRefId must not be touched"

    padded = [el.text for el in root.iter()
              if provoke._local(el.tag) == "DocRefId"
              and el.text and el.text != el.text.strip()]
    assert len(padded) == 1
    assert padded[0].strip().startswith(f"{SENDER}{TAX_YEAR}")


def test_80000_reuses_an_id_that_is_already_in_the_file(delivery):
    provoke.apply_to_file(delivery, provoke.find("80000"), context())
    refs = [(el.text or "").strip() for el in parse(delivery).iter()
            if provoke._local(el.tag) == "DocRefId"]
    assert len(refs) != len(set(refs))


def test_50011_moves_doctypes_into_the_production_range(delivery):
    provoke.apply_to_file(delivery, provoke.find("50011"), context())
    doctypes = {(el.text or "").strip() for el in parse(delivery).iter()
                if provoke._local(el.tag) == "DocTypeIndic"}
    assert doctypes <= {"OECD0", "OECD1", "OECD2", "OECD3"}
    # And it is only an error because the target is a test instance.
    assert error_codes(delivery, environment_is_test=True) == ["50011"]
    assert error_codes(delivery, environment_is_test=False) == []


def test_50012_cannot_be_provoked_by_an_upload(delivery):
    """MDES compares its own country with itself, so this would be accepted.

    ``Bepaal alle generieke meldingen encrypted upload`` sets ReceivingCountry
    from CountryCodeProvision before any rule reads it, in both TRUNK and the
    3.4 branch. A package re-addressed to a third country therefore passes, and
    a negative test that passes is worse than none - so the fault is refused
    rather than written, and the document is left untouched.
    """
    with pytest.raises(provoke.ProvocationError) as caught:
        provoke.apply_to_file(delivery, provoke.find("50012"), context())
    assert "replaces the document's ReceivingCountry" in str(caught.value)
    assert error_codes(delivery) == [], "the document must be left untouched"

    entry = {e["code"]: e for e in provoke.catalogue()}["50012"]
    assert entry["blocked"] is True
    assert entry["applicable"] is False


def test_the_misrouting_mutation_still_moves_the_residences(delivery):
    """The mutation is kept for the transport path, so keep it honest.

    Applied directly, without the catalogue's block: the receiver moves and
    every ResCountryCode that named the old one moves with it, because the
    residence rules read the document's own ReceivingCountry and 60011/60012
    would fire instead.
    """
    unblocked = provoke.Provocation(
        "50012", "misrouting", "XML header", "Re-addresses the document.",
        "50012 on the transport path.",
        mutation=provoke._readdress_document, confirm="routing",
    )
    applied = provoke.apply_to_file(delivery, unblocked, context())
    root = parse(delivery)

    addressed = mdes_rules._first_text(root, "ReceivingCountry")
    assert addressed != RECEIVER
    assert mdes_rules._first_text(root, "TransmittingCountry") == SENDER
    assert "no other rule finds fault" in applied.confirmed_by

    # The identifier keeps naming the instance we upload to: the mandatory
    # prefix resolves its receiving half to CountryCodeProvision.
    assert mdes_rules._first_text(root, "MessageRefId").startswith(
        f"{SENDER}{TAX_YEAR}{RECEIVER}"
    )

    residences = {(el.text or "").strip() for el in parse(delivery).iter()
                  if provoke._local(el.tag) == "ResCountryCode"}
    assert RECEIVER not in residences
    assert addressed in residences

    # The local engine's 50008 is the one false positive here, and it is
    # forgiven deliberately rather than by accident.
    assert error_codes(delivery) == ["50008"]


def test_50012_is_refused_if_the_document_still_names_the_target(delivery):
    """The confirmation is real, not decorative."""
    unchanged = provoke.Provocation(
        "50012", "unchanged", "XML header", "Changes nothing.", "50012",
        mutation=lambda root, ctx: "nothing", confirm="routing",
    )
    with pytest.raises(provoke.ProvocationError, match="not misrouted"):
        provoke.apply_to_file(delivery, unchanged, context())


def test_50012_is_refused_if_the_identifier_stops_naming_the_target(delivery):
    """The mistake that produced a 50008 rejection instead of a 50012 one.

    Re-prefixing the MessageRefId to the country the document now names looks
    more consistent, and is what MDES rejects: it checks that identifier against
    the instance receiving the file.
    """
    def readdress_and_reprefix(root, ctx):
        provoke._readdress_document(root, ctx)
        message = provoke._one(root, "MessageRefId")
        message.text = "NL" + (message.text or "")[2:]
        return "re-addressed and re-prefixed"

    overreaching = provoke.Provocation(
        "50012", "over-eager", "XML header", "Moves the prefix too.", "50012",
        mutation=readdress_and_reprefix, confirm="routing",
    )
    with pytest.raises(provoke.ProvocationError, match="50008 instead of 50012"):
        provoke.apply_to_file(delivery, overreaching, context())


def test_50007_is_confirmed_against_the_schema_not_the_rules(delivery):
    """The rule engine cannot see a schema violation, so the XSD is the oracle."""
    applied = provoke.apply_to_file(delivery, provoke.find("50007"), context())
    assert "schema validator" in applied.confirmed_by
    assert error_codes(delivery) == [], "no business rule should fire as well"

    from crs_generator import xsd_validator

    parser = etree.XMLParser(resolve_entities=False, no_network=True)
    assert not xsd_validator.validate_tree(etree.parse(str(delivery), parser)).valid


# --- Refusals: a fault that cannot land must not be written -----------------


def test_a_fault_that_needs_a_domestic_delivery_is_refused(delivery):
    """80017 is the domestic prefix rule; 50008 is the foreign one.

    Applying it to a foreign delivery would produce a file rejected for 50008,
    and the tester would read the upload as evidence about 80017.
    """
    with pytest.raises(provoke.ProvocationError) as caught:
        provoke.apply_to_file(delivery, provoke.find("80017"), context())
    assert "50008" in str(caught.value)
    assert error_codes(delivery) == [], "the document must be left untouched"


def test_80017_lands_on_a_domestic_delivery(delivery):
    """Same document, read as a domestic filing: now the rule applies."""
    applied = provoke.apply_to_file(
        delivery, provoke.find("80017"), context(file_type="domestic"),
    )
    assert applied.code == "80017"
    assert error_codes(delivery, file_type="domestic") == ["80017"]


def test_the_production_fault_is_refused_on_a_test_target(delivery):
    with pytest.raises(provoke.ProvocationError) as caught:
        provoke.apply_to_file(delivery, provoke.find("50010"), context())
    assert "production" in str(caught.value)


def test_50009_needs_an_identifier_the_instance_has_actually_used(delivery):
    with pytest.raises(provoke.ProvocationError) as caught:
        provoke.apply_to_file(delivery, provoke.find("50009"), context())
    assert "nothing to collide with" in str(caught.value)


def test_50009_refuses_an_identifier_that_would_trip_the_format_rule(delivery):
    """A reused id from another country pair is rejected by format first."""
    with pytest.raises(provoke.ProvocationError) as caught:
        provoke.apply_to_file(
            delivery, provoke.find("50009"),
            context(used_message_ref_id="NL2019DE-something-else"),
        )
    assert "50008" in str(caught.value)


def test_50009_accepts_a_collision_with_a_matching_prefix(delivery):
    reused = f"{SENDER}{TAX_YEAR}{RECEIVER}already-sent-this-one"
    applied = provoke.apply_to_file(
        delivery, provoke.find("50009"), context(used_message_ref_id=reused),
    )
    assert mdes_rules._first_text(parse(delivery), "MessageRefId") == reused
    assert "no other rule finds fault" in applied.confirmed_by
    assert error_codes(delivery) == []


# --- Package-layer faults ---------------------------------------------------


@pytest.mark.parametrize(
    "code", [p.code for p in provoke.PROVOCATIONS if p.defects],
)
def test_package_faults_leave_the_document_alone(delivery, code):
    """The envelope is what breaks, so MDES must not get as far as the XML."""
    before = delivery.read_bytes()
    applied = provoke.apply_to_file(delivery, provoke.find(code), context())
    assert delivery.read_bytes() == before
    assert applied.layer == "package"
    assert provoke.find(code).defects


# --- The catalogue ----------------------------------------------------------


def test_the_catalogue_explains_what_does_not_apply():
    entries = {e["code"]: e for e in
               provoke.catalogue(file_type="foreign", environment_is_test=True)}
    assert entries["80025"]["applicable"] is True
    assert entries["80017"]["applicable"] is False
    assert "50008" in entries["80017"]["reason"]
    assert entries["50010"]["applicable"] is False
    assert entries["50011"]["applicable"] is True
    # 50012 is blocked outright, so it stays inapplicable however little we know.
    assert entries["50012"]["applicable"] is False
    # With nothing known about the delivery, only the blocked ones are ruled out.
    assert {e["code"] for e in provoke.catalogue() if not e["applicable"]} == {"50012"}


def test_an_unknown_code_lists_what_is_available():
    with pytest.raises(provoke.ProvocationError) as caught:
        provoke.find("99999")
    assert "50008" in str(caught.value)


def test_every_entry_documents_itself():
    """These strings are what the tester reads before trusting an upload."""
    for provocation in provoke.PROVOCATIONS:
        assert provocation.code.isdigit()
        assert provocation.title and provocation.stage
        assert provocation.method.endswith(".")
        assert provocation.code in provocation.expect
        assert bool(provocation.defects) != bool(provocation.mutation), (
            f"{provocation.code} must break either the envelope or the document"
        )
