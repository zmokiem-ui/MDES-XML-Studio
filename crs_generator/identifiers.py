"""Normalization for the identifiers that end up inside MDES RefIds.

MessageRefId and DocRefId are built by concatenating TransmittingCountry +
TaxYear + SendingCompanyIN, so a stray space pasted into an identifier field
lands *inside* every RefId in the file (``MH202320000100 000000001``). MDES
rejects those outright (rule 80025), and the file is only rejected after upload,
so identifiers are trimmed as they enter a generator config.
"""

from typing import List, Optional, TypeVar

T = TypeVar('T')


def normalize_identifier(value: T) -> T:
    """Strip surrounding whitespace from a single identifier.

    Non-string values (``None``, ints) pass through untouched so this is safe to
    apply blindly in a dataclass ``__post_init__``.
    """
    return value.strip() if isinstance(value, str) else value


def normalize_identifiers(values: Optional[List[str]]) -> Optional[List[str]]:
    """Strip surrounding whitespace from every identifier in a list."""
    if not values:
        return values
    return [normalize_identifier(v) for v in values]
