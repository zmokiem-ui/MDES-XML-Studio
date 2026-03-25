"""Unit tests for configuration models and validation."""

import pytest
from pathlib import Path
import tempfile
import shutil

from crs_generator.config import DomesticConfig


class TestDomesticConfig:
    """Test DomesticConfig dataclass validation and normalization."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = DomesticConfig()
        
        assert config.sending_country == "NL"
        assert config.receiving_country == "NL"
        assert config.tax_year == 2021
        assert config.mytin == "MYTIN"
        assert config.num_reporting_fis == 1
        assert config.individual_accounts_per_fi == 100
        assert config.organisation_accounts_per_fi == 100
        assert config.controlling_persons_per_account == 0
        assert config.output_path is not None
        assert isinstance(config.output_path, Path)
    
    def test_output_path_normalization_from_string(self):
        """Test that string output paths are converted to Path objects."""
        config = DomesticConfig(output_path="test/output.xml")
        
        assert isinstance(config.output_path, Path)
        assert config.output_path == Path("test/output.xml")
    
    def test_output_path_normalization_from_path(self):
        """Test that Path output paths remain Path objects."""
        path = Path("test/output.xml")
        config = DomesticConfig(output_path=path)
        
        assert isinstance(config.output_path, Path)
        assert config.output_path == path
    
    def test_default_output_path_generation(self):
        """Test that default output path is generated correctly."""
        config = DomesticConfig(sending_country="US", tax_year=2023)
        
        assert config.output_path is not None
        assert "crs_domestic_US_2023.xml" in str(config.output_path)
        assert "out" in str(config.output_path)
    
    def test_output_directory_creation(self):
        """Test that output directory is created automatically."""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "nested" / "dir" / "output.xml"
            config = DomesticConfig(output_path=output_path)
            
            # Directory should be created
            assert config.output_path.parent.exists()
            assert config.output_path.parent == output_path.parent
    
    def test_custom_values(self):
        """Test configuration with custom values."""
        config = DomesticConfig(
            sending_country="GB",
            receiving_country="US",
            tax_year=2022,
            mytin="GB123456789",
            num_reporting_fis=5,
            individual_accounts_per_fi=50,
            organisation_accounts_per_fi=25,
            controlling_persons_per_account=2
        )
        
        assert config.sending_country == "GB"
        assert config.receiving_country == "US"
        assert config.tax_year == 2022
        assert config.mytin == "GB123456789"
        assert config.num_reporting_fis == 5
        assert config.individual_accounts_per_fi == 50
        assert config.organisation_accounts_per_fi == 25
        assert config.controlling_persons_per_account == 2
    
    def test_numeric_validation_positive_values(self):
        """Test that numeric fields accept positive values."""
        config = DomesticConfig(
            num_reporting_fis=10,
            individual_accounts_per_fi=1000,
            organisation_accounts_per_fi=500,
            controlling_persons_per_account=3
        )
        
        assert config.num_reporting_fis == 10
        assert config.individual_accounts_per_fi == 1000
        assert config.organisation_accounts_per_fi == 500
        assert config.controlling_persons_per_account == 3
    
    def test_zero_accounts_allowed(self):
        """Test that zero accounts are allowed (edge case)."""
        config = DomesticConfig(
            individual_accounts_per_fi=0,
            organisation_accounts_per_fi=0,
            controlling_persons_per_account=0
        )
        
        assert config.individual_accounts_per_fi == 0
        assert config.organisation_accounts_per_fi == 0
        assert config.controlling_persons_per_account == 0


class TestConfigPathHandling:
    """Test path handling and normalization in config."""
    
    def test_relative_path_handling(self):
        """Test that relative paths are handled correctly."""
        config = DomesticConfig(output_path="relative/path/file.xml")
        
        assert isinstance(config.output_path, Path)
        assert not config.output_path.is_absolute()
    
    def test_absolute_path_handling(self):
        """Test that absolute paths are preserved."""
        with tempfile.TemporaryDirectory() as tmpdir:
            abs_path = Path(tmpdir) / "output.xml"
            config = DomesticConfig(output_path=str(abs_path))
            
            assert isinstance(config.output_path, Path)
            assert config.output_path.is_absolute()
            assert config.output_path == abs_path
    
    def test_path_with_special_characters(self):
        """Test paths with special characters are handled."""
        config = DomesticConfig(output_path="test/path with spaces/file.xml")
        
        assert isinstance(config.output_path, Path)
        assert "path with spaces" in str(config.output_path)


class TestConfigEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_very_large_account_numbers(self):
        """Test configuration with very large account numbers."""
        config = DomesticConfig(
            individual_accounts_per_fi=1000000,
            organisation_accounts_per_fi=500000
        )
        
        assert config.individual_accounts_per_fi == 1000000
        assert config.organisation_accounts_per_fi == 500000
    
    def test_future_tax_year(self):
        """Test configuration with future tax year."""
        config = DomesticConfig(tax_year=2030)
        
        assert config.tax_year == 2030
    
    def test_past_tax_year(self):
        """Test configuration with past tax year."""
        config = DomesticConfig(tax_year=2010)
        
        assert config.tax_year == 2010
    
    def test_two_letter_country_codes(self):
        """Test that two-letter country codes are accepted."""
        config = DomesticConfig(
            sending_country="US",
            receiving_country="GB"
        )
        
        assert config.sending_country == "US"
        assert config.receiving_country == "GB"
        assert len(config.sending_country) == 2
        assert len(config.receiving_country) == 2
