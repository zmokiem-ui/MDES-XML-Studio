"""MessageRefId / DocRefId minting, and the run seed that keeps data random.

Two things in a delivery have to be unique and stay unique *between* runs:

* **RefIds.** MDES stores every MessageRefId and DocRefId it has ever accepted
  and rejects a redelivery that reuses one. The old scheme built them from
  ``TransmittingCountry + TaxYear + SendingCompanyIN`` plus a counter that
  restarted at 1 on every run, so two files generated with the same country,
  year and SendingCompanyIN carried byte-identical RefIds and the second upload
  was refused. A run id — a UTC stamp plus random characters — now sits between
  the mandated prefix and the counter.
* **The sample data.** Every generator defaulted to ``seed=42`` and nothing on
  the CLI or in the desktop app ever passed a different one, so each run drew
  the same names, the same institutions and the same balances out of Faker.
  ``resolve_seed`` makes "no seed given" mean *a fresh one*, while an explicit
  seed still reproduces a run exactly.

The RefId layout follows the MDES rules the app already checks in
``mdes_rules``. Domestic deliveries use ``SendingCompanyIN`` in both prefixes.
Foreign CRS deliveries are the important exception: their MessageRefId uses
the receiving authority, while every DocRefId still uses ``SendingCompanyIN``.
Both therefore share only ``TransmittingCountry + TaxYear``.
* 80025 - no whitespace inside a RefId, and 98017 - no ``--`` or ``/*``
  anywhere in the file. Hence the uppercase-alphanumeric-only token alphabet.

Correction files reuse the same factory: a CRS702 gets a *new* MessageRefId off
the same prefix (its CorrMessageRefId points at the original), corrected and
deleted documents get new DocRefIds, and resent documents keep theirs — see
``correction_generator``.
"""

from __future__ import annotations

import random
import string
from datetime import datetime, timezone
from typing import Optional

# Uppercase letters and digits only: anything else risks the whitespace rule
# (80025) or the '--' / '/*' substring rule (98017).
_TOKEN_ALPHABET = string.ascii_uppercase + string.digits

# Random characters appended to the timestamp. Six gives 36**6 ≈ 2.2e9
# possibilities *within a single second*, which is what two runs started back to
# back have to be told apart by.
_RANDOM_LENGTH = 6

# Width of the per-document counter. Nine digits leaves room for ~99 parallel
# workers on a 10-million-wide stride each.
_DOC_SEQUENCE_WIDTH = 9

_MAX_SEED = 2 ** 31 - 1


def new_run_id(rng: Optional[random.Random] = None) -> str:
    """A token that separates one generation run from every other one.

    The leading ``yymmddHHMMSS`` stamp makes RefIds sort in the order the files
    were made and guarantees separation between runs a second or more apart;
    the random tail covers runs inside the same second.

    Drawn from the OS entropy pool by default, *not* from the data seed. Pinning
    a seed is for reproducing the sample data, and a reproduced run still has to
    be uploadable — which it would not be if it also reproduced RefIds MDES has
    already seen.
    """
    stamp = datetime.now(timezone.utc).strftime("%y%m%d%H%M%S")
    source = rng or random.SystemRandom()
    tail = "".join(source.choice(_TOKEN_ALPHABET) for _ in range(_RANDOM_LENGTH))
    return stamp + tail


def resolve_seed(seed: Optional[int] = None) -> int:
    """The seed to generate with: the one given, or a fresh random one.

    Returned rather than applied so the caller can store it on its config —
    which both makes the run reproducible (report it, pass it back in) and gets
    it pickled to parallel workers unchanged.
    """
    if seed is not None:
        return int(seed)
    return random.SystemRandom().randrange(1, _MAX_SEED)


def derive_seed(seed: int, worker_id: int) -> int:
    """A distinct seed for one parallel worker.

    Each worker builds its own data generator from the config, so they all drew
    the same names from the same seed and the merged file repeated its
    population once per worker. Offsetting by a large odd stride keeps the run
    reproducible while making the workers disagree.
    """
    return (int(seed) + worker_id * 2_654_435_761) % _MAX_SEED or 1


class RefIdFactory:
    """Mints the MessageRefId and DocRefIds of a single delivery."""

    def __init__(self, transmitting_country: str, tax_year, message_owner: str,
                 run_id: Optional[str] = None, sequence_width: int = _DOC_SEQUENCE_WIDTH,
                 doc_owner: Optional[str] = None):
        # ``message_owner`` is SendingCompanyIN for a domestic delivery and the
        # receiving authority for a foreign CRS delivery. DocRefs always use
        # SendingCompanyIN; omitting ``doc_owner`` preserves the historical
        # one-owner behaviour for domestic CRS and FATCA callers.
        base = f"{transmitting_country}{tax_year}"
        self.prefix = f"{base}{message_owner}"
        self.doc_prefix = f"{base}{doc_owner if doc_owner is not None else message_owner}"
        self.run_id = run_id or new_run_id()
        self.sequence_width = sequence_width
        self.counter = 0

    @property
    def message_ref_id(self) -> str:
        """The delivery's MessageRefId. Stable for the life of the factory."""
        return f"{self.prefix}{self.run_id}"

    def next_doc_ref_id(self) -> str:
        """The next DocRefId, unique in this file and across every other run."""
        self.counter += 1
        return f"{self.doc_prefix}{self.run_id}{self.counter:0{self.sequence_width}d}"

    def offset_for_worker(self, worker_id: int, stride: int = 10_000_000) -> None:
        """Move the counter into a worker's own range so chunks cannot collide."""
        self.counter = worker_id * stride


def correction_ref_id(original: str, marker: str, run_id: str) -> str:
    """A new RefId for a corrected or deleted document, derived from the original.

    Keeping the original as the prefix preserves the MDES 80001/80017 prefix
    rules and leaves the correction traceable by eye; the marker says what the
    new document does. ``run_id`` is one token for the whole correction run, so
    the results stay unique inside the file (the originals they are built on
    already are) and correcting the same source twice yields two distinct sets.

    Resent documents must *not* go through here — MDES requires a resend to
    carry the DocRefId it is resending, unchanged.
    """
    tail = f"{marker}_{run_id}"
    if not original:
        return tail
    # 200 is the schema cap on DocRefId (StringMin1Max200_Type). Trim the
    # original rather than the tail: the tail is what makes the result unique.
    return f"{original[:200 - len(tail) - 1]}_{tail}"
