"""RefId uniqueness across runs, and the resend rule corrections have to obey.

Two failures motivated these:

* Every generator defaulted to ``seed=42`` and nothing on the CLI or in the
  desktop app passed a different one, so consecutive files came out carrying
  the same people, the same institutions and — because the DocRefId counter
  restarted at 1 — the same RefIds. MDES stores every RefId it has accepted and
  refuses a redelivery that reuses one.
* A CRS702 resent its ReportingFI under a freshly minted DocRefId. MDES: "If
  there is Resent Data for a ReportingFI (OECD0 or OECD10), then the DocRefId
  of the ReportingFI must be identical to the DocRefId of this ReportingFI in
  the message that is corrected or supplemented." That produced one rejection
  per ReportingFI on every correction upload.
"""

import pytest
from lxml import etree

from crs_generator.correction_generator import CRSCorrectionGenerator, CorrectionOptions
from crs_generator.fatca_correction_generator import (
    FATCACorrectionGenerator,
    FATCACorrectionOptions,
)
from crs_generator.fatca_generator import FATCAGenerator, FATCAGeneratorConfig
from crs_generator.generator import CRS_NAMESPACES, CRSGenerator, GeneratorConfig
from crs_generator.mdes_rules import check_file
from crs_generator.ref_ids import RefIdFactory, derive_seed, new_run_id, resolve_seed

NS = {"crs": CRS_NAMESPACES["2.0"], "stf": "urn:oecd:ties:crsstf:v5"}
FC_NS = {"f": "urn:oecd:ties:fatcacrstypes:v2"}


def build(tmp_path, name, **overrides):
    """A small CRS file. Every call uses the identical configuration on purpose."""
    options = dict(
        crs_version="2.0", sending_country="MH", receiving_country="MH",
        tax_year=2024, mytin="20000101010", num_reporting_fis=2,
        individual_accounts_per_fi=2, organisation_accounts_per_fi=2,
        controlling_persons_per_org=1, show_progress=False,
        output_path=tmp_path / name,
    )
    options.update(overrides)
    config = GeneratorConfig(**options)
    return CRSGenerator(config).generate(use_parallel=False), config


def texts(path, xpath, ns=NS):
    return [e.text for e in etree.parse(str(path)).findall(xpath, ns)]


FI_NAMES = ".//crs:ReportingFI/crs:Name"
DOC_REFS = ".//stf:DocRefId"
FI_DOC_REFS = ".//crs:ReportingFI/crs:DocSpec/stf:DocRefId"
ACCT_DOC_REFS = ".//crs:AccountReport/crs:DocSpec/stf:DocRefId"
ACCT_CORR_REFS = ".//crs:AccountReport/crs:DocSpec/stf:CorrDocRefId"


# --- The run id -------------------------------------------------------------

def test_run_ids_differ_between_calls():
    assert len({new_run_id() for _ in range(50)}) == 50


def test_run_id_survives_the_refid_content_rules():
    """80025 forbids whitespace in a RefId; 98017 forbids '--' and '/*' anywhere."""
    run_id = new_run_id()
    assert not any(ch.isspace() for ch in run_id)
    assert "--" not in run_id and "/*" not in run_id
    assert all(ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" for ch in run_id)


def test_resolve_seed_draws_one_when_none_is_given():
    assert resolve_seed(7) == 7
    assert len({resolve_seed() for _ in range(20)}) > 1


def test_derive_seed_separates_workers():
    seeds = {derive_seed(42, worker) for worker in range(8)}
    assert len(seeds) == 8


def test_domestic_docrefids_are_built_on_the_messagerefid_prefix():
    """Domestic MessageRefId and DocRefId prefixes use the same company IN."""
    factory = RefIdFactory("MH", 2024, "20000101010", run_id="250101000000ABCDEF")
    assert factory.message_ref_id.startswith("MH202420000101010")
    first, second = factory.next_doc_ref_id(), factory.next_doc_ref_id()
    assert first.startswith(factory.message_ref_id)
    assert first != second


def test_foreign_message_and_docrefids_use_different_owners():
    """Foreign MessageRefId uses receiver; 80001 DocRefId uses SendingCompanyIN."""
    factory = RefIdFactory(
        "NL", 2024, "CW", doc_owner="999999999",
        run_id="250101000000ABCDEF",
    )
    assert factory.message_ref_id == "NL2024CW250101000000ABCDEF"
    assert factory.next_doc_ref_id() == (
        "NL2024999999999250101000000ABCDEF000000001"
    )


# --- New files --------------------------------------------------------------

def test_two_runs_of_the_same_config_share_no_refids(tmp_path):
    first, _ = build(tmp_path, "first.xml")
    second, _ = build(tmp_path, "second.xml")

    assert not set(texts(first, DOC_REFS)) & set(texts(second, DOC_REFS))
    assert texts(first, ".//crs:MessageRefId") != texts(second, ".//crs:MessageRefId")


def test_two_runs_of_the_same_config_produce_different_people(tmp_path):
    first, _ = build(tmp_path, "first.xml")
    second, _ = build(tmp_path, "second.xml")

    assert texts(first, FI_NAMES) != texts(second, FI_NAMES)
    holders = ".//crs:AccountHolder/crs:Individual/crs:Name/crs:FirstName"
    assert texts(first, holders) != texts(second, holders)
    orgs = ".//crs:AccountHolder/crs:Organisation/crs:Name"
    assert texts(first, orgs) != texts(second, orgs)


def test_an_explicit_seed_reproduces_the_data_but_not_the_refids(tmp_path):
    """Pinning a seed is for reproducing sample data; a rerun still has to upload."""
    first, config = build(tmp_path, "first.xml")
    again, _ = build(tmp_path, "again.xml", seed=config.seed)

    assert texts(again, FI_NAMES) == texts(first, FI_NAMES)
    assert not set(texts(again, DOC_REFS)) & set(texts(first, DOC_REFS))


def test_config_reports_the_seed_it_actually_used(tmp_path):
    """Printed by the CLI, so an interesting run can be reproduced with --seed."""
    _, config = build(tmp_path, "seeded.xml")
    assert isinstance(config.seed, int) and config.seed > 0


def test_docrefids_are_unique_within_a_file(tmp_path):
    path, _ = build(tmp_path, "unique.xml", individual_accounts_per_fi=5,
                    organisation_accounts_per_fi=5)
    refs = texts(path, DOC_REFS)
    assert refs and len(refs) == len(set(refs))
    assert not [f for f in check_file(str(path), "CRS") if f.code == "80000"]


def test_parallel_workers_do_not_repeat_each_others_data(tmp_path):
    """Each worker rebuilds the generator from the same config; only the worker
    id keeps them from drawing the same names and minting the same DocRefIds."""
    config = GeneratorConfig(
        crs_version="2.0", sending_country="MH", receiving_country="MH",
        tax_year=2024, mytin="20000101010", num_reporting_fis=4,
        individual_accounts_per_fi=3, organisation_accounts_per_fi=3,
        controlling_persons_per_org=1, show_progress=False,
        output_path=tmp_path / "parallel.xml")
    path = CRSGenerator(config)._generate_parallel(num_workers=2)

    fi_names = texts(path, FI_NAMES)
    assert len(fi_names) == 4 and len(set(fi_names)) == 4

    refs = texts(path, DOC_REFS)
    assert len(refs) == len(set(refs))
    # The MessageRefId is minted by the parent and must not double as a DocRefId.
    assert texts(path, ".//crs:MessageRefId")[0] not in refs


# --- Corrections ------------------------------------------------------------

@pytest.fixture
def source(tmp_path):
    path, _ = build(tmp_path, "source.xml")
    return path


def correct(source_path, output_path, **overrides):
    options = dict(correct_individual_accounts=2, delete_organisation_accounts=1,
                   test_mode=True, output_path=str(output_path))
    options.update(overrides)
    result = CRSCorrectionGenerator().generate_correction(str(source_path),
                                                          CorrectionOptions(**options))
    assert result.success, result.error_message
    return output_path


def test_resent_reporting_fi_keeps_its_docrefid(tmp_path, source):
    """The rule in the module docstring: a resend carries the DocRefId it resends."""
    correction = correct(source, tmp_path / "correction.xml")

    assert texts(correction, FI_DOC_REFS) == texts(source, FI_DOC_REFS)
    indics = texts(correction, ".//crs:ReportingFI/crs:DocSpec/stf:DocTypeIndic")
    assert indics and set(indics) == {"OECD10"}


def test_resent_reporting_fi_carries_no_corrdocrefid(tmp_path, source):
    """MDES 80026: resent data points at nothing, it *is* the thing."""
    correction = correct(source, tmp_path / "correction.xml")
    assert not texts(correction, ".//crs:ReportingFI/crs:DocSpec/stf:CorrDocRefId")
    assert not [f for f in check_file(str(correction), "CRS") if f.code == "80026"]


def test_a_corrdocrefid_on_a_resend_is_flagged_80026():
    """The rule checker has to catch it, not only the generator avoid it."""
    stf = "urn:oecd:ties:crsstf:v5"
    doc_spec = etree.fromstring(
        f'<DocSpec xmlns="{stf}">'
        '<DocTypeIndic>OECD10</DocTypeIndic>'
        '<DocRefId>MH2024SC1D0</DocRefId>'
        '<CorrDocRefId>MH2024SC1D0</CorrDocRefId>'
        '</DocSpec>')
    from crs_generator import mdes_rules

    findings = mdes_rules.check_mdes_rules(doc_spec, "CRS")
    assert [f for f in findings if f.code == "80026"]


def test_corrected_reporting_fi_does_get_a_new_docrefid(tmp_path, source):
    """Correcting the FI is the other branch: new document, pointing at the old."""
    correction = correct(source, tmp_path / "correction.xml", correct_reporting_fi=True)

    originals = texts(source, FI_DOC_REFS)
    assert not set(texts(correction, FI_DOC_REFS)) & set(originals)
    corr_refs = texts(correction, ".//crs:ReportingFI/crs:DocSpec/stf:CorrDocRefId")
    assert sorted(corr_refs) == sorted(originals)


def test_corrected_accounts_get_new_docrefids_pointing_at_the_originals(tmp_path, source):
    correction = correct(source, tmp_path / "correction.xml")

    originals = texts(source, ACCT_DOC_REFS)
    new_refs = texts(correction, ACCT_DOC_REFS)
    corr_refs = texts(correction, ACCT_CORR_REFS)

    assert new_refs and not set(new_refs) & set(originals)
    assert len(corr_refs) == len(new_refs)
    assert all(ref in originals for ref in corr_refs)


def test_correcting_the_same_source_twice_yields_distinct_refids(tmp_path, source):
    first = correct(source, tmp_path / "first.xml")
    second = correct(source, tmp_path / "second.xml")

    assert not set(texts(first, ACCT_DOC_REFS)) & set(texts(second, ACCT_DOC_REFS))
    assert texts(first, ".//crs:MessageRefId") != texts(second, ".//crs:MessageRefId")


def test_correction_keeps_the_source_messagerefid_as_corrmessagerefid(tmp_path, source):
    correction = correct(source, tmp_path / "correction.xml")

    assert texts(correction, ".//crs:CorrMessageRefId") == \
        texts(source, ".//crs:MessageRefId")
    assert texts(correction, ".//crs:MessageRefId") != \
        texts(source, ".//crs:MessageRefId")


def test_correction_passes_the_mdes_checks(tmp_path, source):
    correction = correct(source, tmp_path / "correction.xml")
    findings = [f.as_text() for f in check_file(str(correction), "CRS",
                                                environment_is_test=True)]
    assert not findings, findings


# --- The same rules on the FATCA-CRS combined path --------------------------

def build_fc(tmp_path, name, **overrides):
    options = dict(
        fc_version="2.2", sending_country="CW", receiving_country="CW",
        tax_year=2024, sending_company_in="20016636", num_reporting_fis=2,
        individual_accounts_per_fi=2, organisation_accounts_per_fi=2,
        controlling_persons_per_org=1, output_path=tmp_path / name)
    options.update(overrides)
    config = FATCAGeneratorConfig(**options)
    return FATCAGenerator(config).generate(), config


def test_fc_runs_share_no_refids_and_no_people(tmp_path):
    first, _ = build_fc(tmp_path, "fc_first.xml")
    second, _ = build_fc(tmp_path, "fc_second.xml")

    refs = ".//f:DocRefId"
    assert not set(texts(first, refs, FC_NS)) & set(texts(second, refs, FC_NS))
    names = ".//f:ReportingFI/f:Name"
    assert texts(first, names, FC_NS) != texts(second, names, FC_NS)


def test_fc_resent_reporting_fi_keeps_its_docrefid(tmp_path):
    source, _ = build_fc(tmp_path, "fc_source.xml")
    output = tmp_path / "fc_correction.xml"

    result = FATCACorrectionGenerator().generate_correction(
        str(source), FATCACorrectionOptions(correct_individual_accounts=2,
                                            test_mode=True,
                                            output_path=str(output)))
    assert result.success, result.error_message

    fi_refs = ".//f:ReportingFI/f:DocSpec/f:DocRefId"
    assert texts(output, fi_refs, FC_NS) == texts(source, fi_refs, FC_NS)
    indics = texts(output, ".//f:ReportingFI/f:DocSpec/f:DocTypeIndic", FC_NS)
    assert indics and set(indics) == {"OECD10"}
