"""Deliberate faults, chosen by the MDES error code they should provoke.

A negative test is only worth running if the file fails for the one reason you
meant it to. So every entry here names the portal code it targets, says how it
gets there, and - for everything the rule engine can see - is *confirmed*
against :mod:`crs_generator.mdes_rules` before the package is written. A
"faulty" delivery that is not actually faulty would be accepted and prove
nothing; one that is faulty in three ways at once tells you only which check
MDES happens to run first. Both failures are silent, which is why confirmation
is part of applying a fault rather than something the caller may skip.

MDES rejects in two places, so there are two layers:

* ``Package`` - the CTS envelope. These reuse the existing
  :class:`~crs_generator.cts.packager.Defect` seam and leave the XML inside
  valid, so the upload fails before MDES ever parses the document.
* ``XML header`` / ``Business rules`` - the document. The envelope stays
  correct, so MDES decrypts and verifies it, then rejects on content. This is
  the layer that exercises the Be Informed intake rules.

Only one fault is applied at a time, on purpose: MDES reports the first check
that fails, so a package carrying two faults cannot tell you which rule caught
it.

Where these codes come from
---------------------------
Not from the CRS user guide, which numbers the codes but does not say what MDES
checks. Each one was read out of the MDES model itself:

* ``Notificaties/CRS Status message/0000 Definitie/0200 Taxonomien/
  FileErrorCode.bixml`` maps every 500xx code to the single condition that
  produces it, and carries the exact text the portal shows.
* The decryption codes (50002/50003/50004/50013) are conditions over the
  ``CTS.CLR`` return value - ``Bibliotheek PFGU/2000 Domeinkennis/2200 Normen/
  Decryptieproces resultaten`` - so they are decided before MDES has looked at
  the document at all.
* The 800xx codes are *record*-level meldingen emitted by the validation XSLTs
  in ``Bibliotheek/7000 Scripts/7600 XSLT/Validation``, not file error codes.
  They reject a document inside a delivery that was otherwise accepted, so they
  read differently in the portal than a 500xx refusal does.

Read against both ``22.2.0-TRUNK`` and ``22.2.0-Versie-3.4-branch-other``. Where
the two lines disagree, or where the model disagrees with itself, it is written
on the entry rather than left for the next reader to rediscover.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from lxml import etree

from .. import mdes_rules, xsd_validator
from ..cts.packager import Defect


class ProvocationError(RuntimeError):
    """The selected fault does not apply to this delivery.

    Raised in preference to writing a package that would fail for some other
    reason - a wrong answer is worse than a refusal here, because the upload
    result is what the tester reads as the verdict.
    """


@dataclass
class Context:
    """What a mutation needs to know about the delivery it is editing."""

    sender: str
    receiver: str
    tax_year: str
    file_type: str = "foreign"
    environment_is_test: bool = True
    # A MessageRefId this instance has already accepted, for 50009. Supplied by
    # the caller because only it can reach the database.
    used_message_ref_id: str | None = None


Mutation = Callable[[etree._Element, Context], str]


@dataclass(frozen=True)
class Provocation:
    """One fault, and the portal code it should produce."""

    code: str
    title: str
    stage: str
    method: str
    expect: str
    defects: tuple[Defect, ...] = ()
    mutation: Mutation | None = None
    # How we prove the fault landed: the business-rule engine, the schema, or
    # (for a reused MessageRefId) the database lookup that found it.
    confirm: str = "rules"
    requires_file_type: str | None = None
    requires_environment: str | None = None
    # Set when MDES cannot report this code for an uploaded package at all, no
    # matter what the delivery looks like. Kept in the catalogue rather than
    # deleted, because "you cannot test this, and here is why" is the expensive
    # half of the finding.
    blocked: str = ""

    @property
    def layer(self) -> str:
        return "package" if self.defects else "xml"

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "title": self.title,
            "stage": self.stage,
            "method": self.method,
            "expect": self.expect,
            "layer": self.layer,
            "requiresFileType": self.requires_file_type,
            "requiresEnvironment": self.requires_environment,
            "blocked": bool(self.blocked),
        }


@dataclass
class Applied:
    """What was done, and the evidence that it will be caught."""

    code: str
    title: str
    stage: str
    method: str
    expect: str
    layer: str
    change: str = ""
    confirmed_by: str = ""

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "title": self.title,
            "stage": self.stage,
            "method": self.method,
            "expect": self.expect,
            "layer": self.layer,
            "change": self.change,
            "confirmedBy": self.confirmed_by,
        }


# --- Document helpers -------------------------------------------------------
# Matched by local-name, so one implementation covers crs: and sfa_ftc:.


def _local(tag) -> str:
    return tag.rsplit("}", 1)[-1] if isinstance(tag, str) else ""


def _all(root: etree._Element, name: str) -> list[etree._Element]:
    return [el for el in root.iter() if _local(el.tag) == name]


def _one(root: etree._Element, name: str) -> etree._Element:
    found = _all(root, name)
    if not found:
        raise ProvocationError(f"This document has no {name} to change.")
    return found[0]


# --- Mutations --------------------------------------------------------------


def _swap_message_ref_countries(root: etree._Element, ctx: Context) -> str:
    """50008: break the foreign prefix without changing anything else.

    ``CRSMessageRefIdMandatoryPrefix`` is the document's TransmittingCountry, the
    tax year, and the receiving country - and on an upload that third part is the
    *instance*, not the document: the portal's encrypted-upload handler assigns
    ``ReceivingCountry := CountryCodeProvision`` before any rule reads it. For a
    correctly addressed delivery the two are the same country, so swapping the
    two countries fails the prefix either way, and it keeps the identifier the
    same shape and length so nothing else about it looks wrong.
    """
    element = _one(root, "MessageRefId")
    original = (element.text or "").strip()
    expected = f"{ctx.sender}{ctx.tax_year}{ctx.receiver}"
    tail = original[len(expected):] if original.startswith(expected) else original
    element.text = f"{ctx.receiver}{ctx.tax_year}{ctx.sender}{tail}"
    return f"MessageRefId '{original}' -> '{element.text}'"


def _reuse_message_ref(root: etree._Element, ctx: Context) -> str:
    """50009: an identifier this instance has already accepted."""
    reused = (ctx.used_message_ref_id or "").strip()
    if not reused:
        raise ProvocationError(
            "No previously used MessageRefId could be read from this instance, "
            "so there is nothing to collide with. Upload one package first, then "
            "provoke 50009."
        )
    expected = f"{ctx.sender}{ctx.tax_year}{ctx.receiver}"
    if ctx.file_type == "foreign" and not reused.startswith(expected):
        # A reused id with the wrong prefix trips 50008 first, and the upload
        # would then be evidence about the wrong rule.
        raise ProvocationError(
            f"The only used MessageRefId available ('{reused}') does not start "
            f"with '{expected}', so MDES would reject it as a bad format (50008) "
            f"before it noticed the reuse. Build a {ctx.sender}->{ctx.receiver} "
            f"package for {ctx.tax_year} first, upload it, then provoke 50009."
        )
    element = _one(root, "MessageRefId")
    original = (element.text or "").strip()
    element.text = reused
    return f"MessageRefId '{original}' -> '{reused}', already used on this instance"


def _pad_doc_ref(root: etree._Element, ctx: Context) -> str:
    """80025: whitespace in a DocRefId.

    A *DocRefId*, not the MessageRefId. 80025 is
    ``Error-DocRefIdMagGeenSpatiesBevatten`` in ``validation-templates.xsl``, and
    the only MessageRefId whitespace rule anywhere in the model sits in
    ``validate-fce-message.xsl`` - the FCE intake. A CRS delivery is validated by
    ``validate-crs-message.xsl``, which overrides that same template and drops
    the whitespace test, and the encrypted-upload melding instrument is handed
    ``AantalDocRefIdsMetSpaties`` and nothing equivalent for the MessageRefId. So
    padding the MessageRefId trips no rule at all and the delivery is accepted -
    which is why this used to be the wrong element.

    A trailing space, because it survives copy-paste and leaves the prefix rules
    satisfied - ``starts-with`` still matches - so 80025 is the only thing wrong.
    A ``CorrDocRefId`` is a different code (80024), so a plain DocRefId is padded.
    """
    refs = [el for el in _all(root, "DocRefId") if (el.text or "").strip()]
    if not refs:
        raise ProvocationError("This document has no DocRefId to change.")
    element = refs[-1]
    original = element.text or ""
    element.text = f"{original} "
    return f"DocRefId '{original}' -> '{original} ' (one trailing space)"


_TEST_TO_PROD = {"OECD10": "OECD0", "OECD11": "OECD1", "OECD12": "OECD2", "OECD13": "OECD3"}
_PROD_TO_TEST = {prod: test for test, prod in _TEST_TO_PROD.items()}


def _retarget_doctypes(mapping: dict[str, str], label: str) -> Mutation:
    def mutate(root: etree._Element, ctx: Context) -> str:
        changed: dict[str, str] = {}
        for element in _all(root, "DocTypeIndic"):
            current = (element.text or "").strip()
            if current in mapping:
                element.text = mapping[current]
                changed[current] = mapping[current]
        if not changed:
            raise ProvocationError(
                f"This document has no DocTypeIndic to move into the {label} "
                f"range; it is already there."
            )
        moved = ", ".join(f"{was} -> {now}" for was, now in sorted(changed.items()))
        return f"DocTypeIndic {moved}"

    return mutate


def _duplicate_doc_ref(root: etree._Element, ctx: Context) -> str:
    """80000: the same DocRefId twice in one file."""
    refs = [el for el in _all(root, "DocRefId") if (el.text or "").strip()]
    if len(refs) < 2:
        raise ProvocationError(
            "This document has fewer than two DocRefIds, so none can be "
            "duplicated. Generate more than one account report."
        )
    first, last = refs[0], refs[-1]
    original = (last.text or "").strip()
    last.text = (first.text or "").strip()
    return f"DocRefId '{original}' -> '{last.text}', which is already used above"


def _break_doc_ref_prefix(root: etree._Element, ctx: Context) -> str:
    """80001: a DocRefId that does not start with the delivery's own prefix."""
    refs = [el for el in _all(root, "DocRefId") if (el.text or "").strip()]
    if not refs:
        raise ProvocationError("This document has no DocRefId to change.")
    element = refs[-1]
    original = (element.text or "").strip()
    element.text = f"ZZ{original}"
    return f"DocRefId '{original}' -> '{element.text}'"


def _break_domestic_message_ref(root: etree._Element, ctx: Context) -> str:
    """80017: the domestic prefix rule (TransmittingCountry + year + company)."""
    element = _one(root, "MessageRefId")
    original = (element.text or "").strip()
    element.text = f"ZZ{original}"
    return f"MessageRefId '{original}' -> '{element.text}'"


_ELSEWHERE = ("NL", "DE", "FR", "BE")

# Why 50012 is in the catalogue but cannot be selected.
#
# ``FileErrorCode_50012`` requires ``Val_IncorrectCountry``, which is
# ``CountryCodeProvision != CRS_ReceivingCountry``. On an upload those are the
# same value: ``Bepaal alle generieke meldingen encrypted upload`` sets the
# ``ReceivingCountry`` field from ``CountryCodeProvision`` - the label still says
# ``CASE.PROPS.ReceivingCountry``, the ``value-key`` does not - and feeds it to
# both ``MessageSpec#642c76f3`` (which the condition reads) and
# ``Eigenschappen MessageHeader#4c7c1989``. The melding form of the same rule,
# ``JuisteReceivingCountry``, compares that second property with
# ``LandcodeLevering``, which is fed from ``CountryCodeProvision`` as well. So
# whatever the document says, MDES compares the instance with itself.
#
# Same in 22.2.0-TRUNK and 22.2.0-Versie-3.4-branch-other (where the
# ``TypeUpload_CRSXML`` override is disabled outright), and corroborated the
# other way round: MDES-CLEAN accepted a package whose CTS metadata named
# receiver ZZ. A "misrouted" package built here would be accepted, which is the
# one outcome worse than having no negative test.
_MISROUTING_IS_NOT_PROVOCABLE = (
    "50012 cannot be provoked by uploading a package: before any rule reads it, "
    "MDES replaces the document's ReceivingCountry with its own country code, so "
    "the misrouting check compares the instance with itself and a package built "
    "this way would be accepted. It is reachable only where the receiver is read "
    "from the document, which is the automated CTS transport path, not an upload."
)


def _readdress_document(root: etree._Element, ctx: Context) -> str:
    """Address the document to a third country. This does *not* provoke 50012.

    Kept because the mutation is correct and the reasoning was expensive, but the
    catalogue entry is blocked: see :data:`_MISROUTING_IS_NOT_PROVOCABLE`. What it
    does, if a caller ever needs it for the automated transport path:

    * The envelope is left correct - right key entry, right encryption
      certificate, right CTS metadata - because a misrouting test that fails at
      50002 proves nothing about misrouting.
    * Every ``ResCountryCode`` that named the old receiver moves with it. The
      residence rules (60011 / 60012) read the document's own
      ``ReceivingCountry`` from the payload, and an account is only reportable to
      a country somebody on it lives in, so leaving them behind trips those two
      instead.
    * The MessageRefId keeps naming the instance. ``CRSMessageRefIdMandatoryPrefix``
      resolves its receiving half to ``CountryCodeProvision`` on an upload, so
      re-prefixing it to the country the document now names is what comes back as
      50008 - observed on 2026-09-09, and the reason that mistake has its own
      test.
    """
    elsewhere = next(
        (country for country in _ELSEWHERE
         if country not in (ctx.sender.upper(), ctx.receiver.upper())), None,
    )
    if elsewhere is None:  # pragma: no cover - four candidates, two exclusions
        raise ProvocationError("No third country is available to re-address to.")

    receiving = _one(root, "ReceivingCountry")
    was = (receiving.text or "").strip()
    receiving.text = elsewhere

    moved = 0
    for element in _all(root, "ResCountryCode"):
        if (element.text or "").strip() == was:
            element.text = elsewhere
            moved += 1

    return (
        f"ReceivingCountry '{was}' -> '{elsewhere}' with {moved} ResCountryCode(s) "
        f"moved to match; the MessageRefId still names {was}, which is what MDES "
        f"checks the format against"
    )


def _invalid_message_type(root: etree._Element, ctx: Context) -> str:
    """50007: a value outside the schema's enumeration.

    An enumeration violation rather than a missing element: it is unambiguously
    a schema failure, and it leaves the document otherwise intact so nothing
    else has a chance to fail first.
    """
    element = _one(root, "MessageTypeIndic")
    original = (element.text or "").strip()
    element.text = "CRS999"
    return f"MessageTypeIndic '{original}' -> 'CRS999', which the schema does not allow"


# --- The catalogue ----------------------------------------------------------


PROVOCATIONS: tuple[Provocation, ...] = (
    # Package layer: the envelope is wrong, so MDES never reads the XML.
    Provocation(
        "50002", "Decryption failed", "Package",
        "Corrupts the wrapped AES key so the receiver cannot unwrap it.",
        "MDES should reject the upload with 50002 without reading the payload.",
        defects=(Defect.CORRUPT_KEY,), confirm="package",
    ),
    Provocation(
        "50003", "Payload could not be decompressed", "Package",
        "Stores the signed XML uncompressed where MDES expects a zip.",
        "MDES should reject the upload with 50003 after decrypting it.",
        defects=(Defect.UNCOMPRESSED_PAYLOAD,), confirm="package",
    ),
    Provocation(
        "50004", "Digital signature is invalid", "Package",
        "Alters the signed document after signing, so the signature no longer verifies.",
        "MDES should decrypt the payload and reject it with 50004.",
        defects=(Defect.TAMPER_SIGNATURE,), confirm="package",
    ),
    # 50013 requires ``AESKeySizeIsIncorrect``, which is CTS.CLR returning 2019,
    # 2020, 2021, 2022, 6020 or 6021. 2019 is also in ``DecryptieIsNietMogelijk``
    # (50002), so a key file the CLR cannot unwrap at all may legitimately come
    # back as either code. This fault therefore leaves the RSA block valid and
    # only shortens what is inside it, so the CLR gets as far as measuring the
    # key and the IV; wrecking the ciphertext is CORRUPT_KEY's job.
    Provocation(
        "50013", "AES key/IV format is invalid", "Package",
        "Writes the key file without the IV appended, so it is the wrong length.",
        "MDES should reject the upload with 50013 while decrypting it.",
        defects=(Defect.SHORT_KEY,), confirm="package",
    ),

    # Document layer: the envelope is correct, so MDES rejects on content.
    Provocation(
        "50007", "CRS XML schema validation failed", "XML header",
        "Sets MessageTypeIndic to a value outside the schema's enumeration.",
        "MDES should reject the delivery with 50007 at schema validation.",
        mutation=_invalid_message_type, confirm="xsd",
    ),
    Provocation(
        "50008", "Invalid cross-border MessageRefId format", "XML header",
        "Swaps the transmitting and receiving countries in the MessageRefId prefix.",
        "MDES should reject the delivery with 50008.",
        mutation=_swap_message_ref_countries, requires_file_type="foreign",
    ),
    Provocation(
        "50012", "Payload is addressed to another jurisdiction", "XML header",
        "Re-addresses the document to a third country; the envelope stays correct.",
        "Nothing: an upload cannot produce 50012, so no package is built.",
        mutation=_readdress_document, confirm="routing",
        requires_file_type="foreign",
        blocked=_MISROUTING_IS_NOT_PROVOCABLE,
    ),
    Provocation(
        "50009", "MessageRefId was already used", "XML header",
        "Replaces the MessageRefId with one this instance has already accepted.",
        "MDES should reject the delivery with 50009 as a duplicate message.",
        mutation=_reuse_message_ref, confirm="database",
    ),
    # 50010 is test data where production data belongs, 50011 the reverse - per
    # ``FileErrorCode.bixml`` (``Val_TestDataInProductionEnvironment`` and
    # ``Val_ProductionDataInTestEnvironment``) and the portal's own
    # ``ErrorTextCRS50010``/``ErrorTextCRS50011``. ``validation-templates.xsl``
    # passes these two ErrorIds the other way round, but that number is a
    # record-level melding id and never becomes the file error code, so do not
    # "correct" this pair to agree with it.
    Provocation(
        "50010", "Test data sent to production", "Business rules",
        "Moves every DocTypeIndic into the test range (OECD10-13).",
        "A production instance should reject the delivery with 50010.",
        mutation=_retarget_doctypes(_PROD_TO_TEST, "test"),
        requires_environment="production",
    ),
    Provocation(
        "50011", "Production data sent to test", "Business rules",
        "Moves every DocTypeIndic into the production range (OECD0-3).",
        "A test instance should reject the delivery with 50011.",
        mutation=_retarget_doctypes(_TEST_TO_PROD, "production"),
        requires_environment="test",
    ),
    Provocation(
        "80000", "DocRefId is duplicated", "Business rules",
        "Reuses the first DocRefId on the last document in the same file.",
        "MDES should reject the delivery with 80000.",
        mutation=_duplicate_doc_ref,
    ),
    Provocation(
        "80001", "DocRefId has the wrong mandatory prefix", "XML header",
        "Prepends ZZ to one DocRefId so it no longer starts with the delivery prefix.",
        "MDES should reject the delivery with 80001.",
        mutation=_break_doc_ref_prefix,
    ),
    Provocation(
        "80017", "Domestic MessageRefId prefix is invalid", "XML header",
        "Prepends ZZ to the MessageRefId so the domestic prefix rule fails.",
        "A domestic intake should reject the delivery with 80017; the portal files "
        "that melding under 50008, which is the number a tester will see.",
        mutation=_break_domestic_message_ref, requires_file_type="domestic",
    ),
    Provocation(
        "80025", "DocRefId contains whitespace", "XML header",
        "Appends a trailing space to the last DocRefId.",
        "MDES should reject the delivery with 80025.",
        mutation=_pad_doc_ref,
    ),
)

_BY_CODE = {provocation.code: provocation for provocation in PROVOCATIONS}


def find(code: str) -> Provocation:
    """The provocation for an MDES code, or a listing of what is available."""
    key = (code or "").strip().upper()
    if key not in _BY_CODE:
        raise ProvocationError(
            f"No deliberate fault is defined for '{code}'. Available: "
            + ", ".join(sorted(_BY_CODE))
        )
    return _BY_CODE[key]


def catalogue(
    file_type: str | None = None, environment_is_test: bool | None = None
) -> list[dict]:
    """The catalogue, marked up for a specific delivery when one is known.

    ``applicable`` is answered here rather than in the UI so the reason a fault
    cannot be provoked is written once, next to the rule it comes from.
    """
    entries = []
    for provocation in PROVOCATIONS:
        entry = provocation.to_dict()
        reason = _inapplicable(provocation, file_type, environment_is_test)
        entry["applicable"] = reason is None
        entry["reason"] = reason or ""
        entries.append(entry)
    return entries


def _inapplicable(
    provocation: Provocation, file_type: str | None, environment_is_test: bool | None
) -> str | None:
    if provocation.blocked:
        return provocation.blocked
    if (
        provocation.requires_file_type
        and file_type
        and provocation.requires_file_type != file_type
    ):
        other = "50008" if provocation.requires_file_type == "domestic" else "80017"
        return (
            f"{provocation.code} is the {provocation.requires_file_type}-intake rule, "
            f"and this is a {file_type} delivery. The equivalent here is {other}."
        )
    if provocation.requires_environment and environment_is_test is not None:
        wanted_test = provocation.requires_environment == "test"
        if wanted_test != environment_is_test:
            have = "a test" if environment_is_test else "a production"
            return (
                f"{provocation.code} only fires on {provocation.requires_environment} "
                f"instances, and this target is {have} environment."
            )
    return None


# --- Applying one ----------------------------------------------------------


def apply_to_file(source: Path, provocation: Provocation, ctx: Context) -> Applied:
    """Apply a document-layer fault in place, and prove it will be caught.

    Package-layer faults have nothing to do here: they are applied while the
    package is assembled, and :func:`crs_generator.cts.packager.pack` already
    owns them.
    """
    record = Applied(
        code=provocation.code, title=provocation.title, stage=provocation.stage,
        method=provocation.method, expect=provocation.expect, layer=provocation.layer,
    )
    reason = _inapplicable(provocation, ctx.file_type, ctx.environment_is_test)
    if reason:
        raise ProvocationError(reason)
    if provocation.mutation is None:
        record.confirmed_by = (
            "Applied while the package is assembled; the XML inside stays valid."
        )
        return record

    parser = etree.XMLParser(resolve_entities=False, no_network=True, huge_tree=True)
    tree = etree.parse(str(source), parser)
    root = tree.getroot()
    record.change = provocation.mutation(root, ctx)
    record.confirmed_by = _confirm(tree, provocation, ctx)
    # No pretty_print: the document is already formatted, and reflowing it would
    # add whitespace of our own to a file whose whitespace is under test (80025).
    tree.write(str(source), xml_declaration=True, encoding="UTF-8")
    return record


def _confirm(tree: etree._ElementTree, provocation: Provocation, ctx: Context) -> str:
    """Evidence that the mutated document fails for the intended reason only."""
    root = tree.getroot()
    if provocation.confirm == "xsd":
        result = xsd_validator.validate_tree(tree)
        if result.valid:
            raise ProvocationError(
                f"The document is still schema-valid, so it would not raise "
                f"{provocation.code}."
            )
        first = result.errors[0]["message"] if result.errors else "schema invalid"
        return f"The schema validator rejects it: {first}"

    findings = mdes_rules.check_mdes_rules(
        root, "CRS",
        environment_is_test=ctx.environment_is_test,
        file_type=ctx.file_type,
    )
    errors = [f for f in findings if f.severity == "error"]
    intended = [f for f in errors if f.code == provocation.code]
    others = sorted({f.code for f in errors if f.code != provocation.code})

    if provocation.confirm == "routing":
        # Misrouting is a fact about the document versus the instance, so the
        # rule engine cannot see it - it has no 50012 rule. What it can do is
        # confirm the document is otherwise clean, which is what stops MDES
        # rejecting it for something else first.
        addressed = mdes_rules._first_text(root, "ReceivingCountry") or ""
        if addressed.upper() == ctx.receiver.upper():
            raise ProvocationError(
                f"The document is still addressed to {ctx.receiver}, so it is "
                f"not misrouted."
            )
        # 50008 is expected from the local engine and is a false positive here:
        # it compares the MessageRefId prefix with the document's
        # ReceivingCountry, while MDES compares it with the receiving instance
        # (proved by an upload on 2026-09-09). So assert MDES's version of the
        # rule directly, and forgive the local one.
        message_ref = mdes_rules._first_text(root, "MessageRefId") or ""
        expected = f"{ctx.sender}{ctx.tax_year}{ctx.receiver}"
        if not message_ref.startswith(expected):
            raise ProvocationError(
                f"MessageRefId '{message_ref}' must still start with '{expected}' - "
                f"MDES checks that against the instance receiving the file, so any "
                f"other prefix comes back as 50008 instead of 50012."
            )
        unexpected = [code for code in others if code != "50008"]
        if unexpected:
            raise ProvocationError(
                "Re-addressing the document also broke " + ", ".join(unexpected)
                + ", which MDES would report instead of 50012."
            )
        return (
            f"The document is addressed to {addressed} while this target is "
            f"{ctx.receiver}, its MessageRefId still names {ctx.receiver} so the "
            f"format rule passes, and no other rule finds fault with it. The "
            f"envelope stays correct, so MDES has to decrypt it before it can object."
        )

    if provocation.confirm == "database":
        # Reuse is a fact about the instance, not about the document, so the
        # rule engine cannot see it. What it *can* do is confirm the document is
        # otherwise clean, which is what makes the upload result unambiguous.
        if others:
            raise ProvocationError(
                "The reused MessageRefId also breaks " + ", ".join(others)
                + ", so the upload would not be evidence about 50009."
            )
        return (
            "The MessageRefId was read from this instance's own message tables, "
            "and no other rule finds fault with the document."
        )

    if not intended:
        raise ProvocationError(
            f"The change did not produce {provocation.code}"
            + (f"; the rules report {', '.join(others)} instead." if others
               else ", so this delivery would be accepted.")
        )
    if others:
        raise ProvocationError(
            f"The change produced {provocation.code} but also "
            + ", ".join(others)
            + ". MDES reports whichever it checks first, so the upload would not "
              "be evidence about any of them."
        )
    return f"The rule engine reports exactly one problem: {intended[0].as_text()}"
