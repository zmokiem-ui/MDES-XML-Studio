"""Configuration models for CRS test data generation."""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class DomesticConfig:
    """Configuration for generating a CRS domestic XML file."""
    sending_country: str = "NL"
    receiving_country: str = "NL"
    tax_year: int = 2021
    mytin: str = "MYTIN"
    num_reporting_fis: int = 1
    individual_accounts_per_fi: int = 100
    organisation_accounts_per_fi: int = 100
    controlling_persons_per_account: int = 0
    output_path: Optional[Path] = None

    def __post_init__(self):
        """Normalize paths after initialization."""
        if isinstance(self.output_path, str):
            self.output_path = Path(self.output_path)
        if self.output_path is None:
            self.output_path = (
                Path.cwd()
                / "out"
                / f"crs_domestic_{self.sending_country}_{self.tax_year}.xml"
            )
        # Ensure output directory exists
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
