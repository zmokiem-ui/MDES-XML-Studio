"""Unit tests for CLI argument validation and parsing."""

import pytest
from pathlib import Path
import tempfile

from crs_generator.cli_utils import (
    parse_comma_list,
    CorrectionConfig
)


class TestParseCommaList:
    """Test comma-separated list parsing utility."""
    
    def test_parse_single_item(self):
        """Test parsing a single item."""
        result = parse_comma_list("item1")
        assert result == ["item1"]
    
    def test_parse_multiple_items(self):
        """Test parsing multiple comma-separated items."""
        result = parse_comma_list("item1,item2,item3")
        assert result == ["item1", "item2", "item3"]
    
    def test_parse_with_spaces(self):
        """Test parsing with spaces around commas."""
        result = parse_comma_list("item1, item2 , item3")
        assert result == ["item1", "item2", "item3"]
    
    def test_parse_empty_string(self):
        """Test parsing empty string returns empty list."""
        result = parse_comma_list("")
        assert result == []
    
    def test_parse_none(self):
        """Test parsing None returns empty list."""
        result = parse_comma_list(None)
        assert result == []
    
    def test_parse_with_empty_items(self):
        """Test parsing with empty items between commas."""
        result = parse_comma_list("item1,,item2")
        # Should filter out empty strings
        assert "item1" in result
        assert "item2" in result
        assert "" not in result


class TestCorrectionConfig:
    """Test CorrectionConfig validation and parsing."""
    
    def test_default_correction_config(self):
        """Test default correction configuration."""
        # Create a mock args object
        class MockArgs:
            output = "output.xml"
            correct_fi = False
            correct_individual = False
            correct_organisation = False
            delete_individual = False
            delete_organisation = False
            modify_balance = False
            modify_address = False
            modify_name = False
            test_mode = True
        
        config = CorrectionConfig.from_args(MockArgs())
        
        assert config.output_path == Path("output.xml")
        assert config.correct_fi is False
        assert config.correct_individual is False
        assert config.correct_organisation is False
        assert config.delete_individual is False
        assert config.delete_organisation is False
        assert config.modify_balance is False
        assert config.modify_address is False
        assert config.modify_name is False
        assert config.test_mode is True
    
    def test_correction_config_with_corrections_enabled(self):
        """Test correction config with various corrections enabled."""
        class MockArgs:
            output = "output.xml"
            correct_fi = True
            correct_individual = True
            correct_organisation = False
            delete_individual = False
            delete_organisation = True
            modify_balance = True
            modify_address = False
            modify_name = True
            test_mode = False
        
        config = CorrectionConfig.from_args(MockArgs())
        
        assert config.correct_fi is True
        assert config.correct_individual is True
        assert config.correct_organisation is False
        assert config.delete_individual is False
        assert config.delete_organisation is True
        assert config.modify_balance is True
        assert config.modify_address is False
        assert config.modify_name is True
        assert config.test_mode is False
    
    def test_output_path_normalization(self):
        """Test that output path is normalized to Path object."""
        class MockArgs:
            output = "nested/path/output.xml"
            correct_fi = False
            correct_individual = False
            correct_organisation = False
            delete_individual = False
            delete_organisation = False
            modify_balance = False
            modify_address = False
            modify_name = False
            test_mode = True
        
        config = CorrectionConfig.from_args(MockArgs())
        
        assert isinstance(config.output_path, Path)
        assert config.output_path == Path("nested/path/output.xml")


class TestCLIValidationLogic:
    """Test CLI validation logic patterns."""
    
    def test_xml_input_required_for_validation(self):
        """Test that XML input is required for validation mode."""
        from crs_generator.cli import validate_xml_mode
        
        class MockArgs:
            xml_input = None
        
        result = validate_xml_mode(MockArgs())
        
        assert result['is_valid'] is False
        assert 'errors' in result
        assert len(result['errors']) > 0
        assert 'No XML file specified' in result['errors'][0]
    
    def test_csv_input_validation_missing_file(self):
        """Test CSV validation with missing file."""
        from crs_generator.cli import validate_csv_mode
        
        class MockArgs:
            csv_input = "nonexistent_file.csv"
        
        result = validate_csv_mode(MockArgs())
        
        assert result['valid'] is False
        assert 'errors' in result
        assert 'CSV file not found' in result['errors'][0]


class TestCLIEdgeCases:
    """Test CLI edge cases and error handling."""
    
    def test_parse_comma_list_with_unicode(self):
        """Test parsing comma list with unicode characters."""
        result = parse_comma_list("item1,日本,Россия")
        assert result == ["item1", "日本", "Россия"]
    
    def test_parse_comma_list_with_special_chars(self):
        """Test parsing comma list with special characters."""
        result = parse_comma_list("item-1,item_2,item.3")
        assert result == ["item-1", "item_2", "item.3"]
    
    def test_correction_config_all_options_enabled(self):
        """Test correction config with all options enabled."""
        class MockArgs:
            output = "output.xml"
            correct_fi = True
            correct_individual = True
            correct_organisation = True
            delete_individual = True
            delete_organisation = True
            modify_balance = True
            modify_address = True
            modify_name = True
            test_mode = True
        
        config = CorrectionConfig.from_args(MockArgs())
        
        # Verify all flags are True
        assert all([
            config.correct_fi,
            config.correct_individual,
            config.correct_organisation,
            config.delete_individual,
            config.delete_organisation,
            config.modify_balance,
            config.modify_address,
            config.modify_name,
            config.test_mode
        ])
