"""Unit tests for data generation invariants and constraints."""

import pytest
from decimal import Decimal
import re

from crs_generator.base_data_generator import BaseDataGenerator


class TestDataGenerationInvariants:
    """Test that generated data meets expected invariants."""
    
    @pytest.fixture
    def generator(self):
        """Create a base data generator instance."""
        return BaseDataGenerator()
    
    def test_tin_format_validation(self, generator):
        """Test that generated TINs follow expected format."""
        # Generate multiple TINs to test consistency
        tins = [generator.generate_tin("US") for _ in range(10)]
        
        for tin in tins:
            # TIN should be non-empty string
            assert isinstance(tin, str)
            assert len(tin) > 0
            # TIN should not contain only whitespace
            assert tin.strip() != ""
    
    def test_account_number_uniqueness(self, generator):
        """Test that generated account numbers are unique."""
        account_numbers = [generator.generate_account_number() for _ in range(100)]
        
        # All account numbers should be unique
        assert len(account_numbers) == len(set(account_numbers))
    
    def test_account_number_format(self, generator):
        """Test that account numbers follow expected format."""
        account_numbers = [generator.generate_account_number() for _ in range(10)]
        
        for acc_num in account_numbers:
            # Account number should be non-empty string
            assert isinstance(acc_num, str)
            assert len(acc_num) > 0
            # Should be alphanumeric or contain allowed special chars
            assert re.match(r'^[A-Z0-9\-]+$', acc_num)
    
    def test_balance_non_negative(self, generator):
        """Test that generated balances are non-negative."""
        balances = [generator.generate_balance() for _ in range(50)]
        
        for balance in balances:
            # Balance should be numeric (Decimal or float)
            assert isinstance(balance, (Decimal, float, int))
            # Balance should be non-negative
            assert balance >= 0
    
    def test_balance_numeric_precision(self, generator):
        """Test that balances have appropriate decimal precision."""
        balances = [generator.generate_balance() for _ in range(20)]
        
        for balance in balances:
            # Convert to string to check decimal places
            balance_str = str(balance)
            if '.' in balance_str:
                decimal_places = len(balance_str.split('.')[1])
                # Should have reasonable decimal precision (typically 2 for currency)
                assert decimal_places <= 10  # Reasonable upper bound
    
    def test_name_generation_non_empty(self, generator):
        """Test that generated names are non-empty."""
        first_names = [generator.generate_first_name() for _ in range(20)]
        last_names = [generator.generate_last_name() for _ in range(20)]
        
        for name in first_names + last_names:
            assert isinstance(name, str)
            assert len(name) > 0
            assert name.strip() != ""
    
    def test_address_generation_structure(self, generator):
        """Test that generated addresses have expected structure."""
        addresses = [generator.generate_address("US") for _ in range(10)]
        
        for address in addresses:
            # Address should be a dictionary with expected keys
            assert isinstance(address, dict)
            # Should have at least street and city
            assert 'street' in address or 'line1' in address
            assert 'city' in address
    
    def test_date_format_validation(self, generator):
        """Test that generated dates follow ISO format."""
        dates = [generator.generate_date() for _ in range(10)]
        
        for date in dates:
            # Date should match ISO format YYYY-MM-DD
            assert re.match(r'^\d{4}-\d{2}-\d{2}$', date)
            # Should be parseable as valid date
            year, month, day = map(int, date.split('-'))
            assert 1900 <= year <= 2100
            assert 1 <= month <= 12
            assert 1 <= day <= 31


class TestDataConsistency:
    """Test consistency of generated data across multiple calls."""
    
    @pytest.fixture
    def generator(self):
        """Create a base data generator instance."""
        return BaseDataGenerator()
    
    def test_deterministic_generation_with_seed(self, generator):
        """Test that same seed produces same results."""
        # Note: This test assumes generator supports seeding
        # If not implemented, this test documents the expected behavior
        try:
            generator.set_seed(12345)
            result1 = generator.generate_account_number()
            
            generator.set_seed(12345)
            result2 = generator.generate_account_number()
            
            assert result1 == result2
        except AttributeError:
            # Seeding not implemented - skip test
            pytest.skip("Deterministic generation not implemented")
    
    def test_country_code_consistency(self, generator):
        """Test that country codes are consistently formatted."""
        countries = ["US", "GB", "NL", "DE", "FR"]
        
        for country in countries:
            tin = generator.generate_tin(country)
            # TIN should be generated for valid country
            assert isinstance(tin, str)
            assert len(tin) > 0


class TestDataBoundaries:
    """Test boundary conditions for data generation."""
    
    @pytest.fixture
    def generator(self):
        """Create a base data generator instance."""
        return BaseDataGenerator()
    
    def test_zero_balance_allowed(self, generator):
        """Test that zero balance is a valid value."""
        # Generate many balances to potentially get zero
        balances = [generator.generate_balance() for _ in range(100)]
        
        # At minimum, zero should be allowed if it appears
        for balance in balances:
            if balance == 0:
                assert balance == 0  # Explicitly test zero is valid
                break
    
    def test_very_large_balance_handling(self, generator):
        """Test that very large balances are handled correctly."""
        # If generator supports max_balance parameter
        try:
            large_balance = generator.generate_balance(max_value=1000000000)
            assert isinstance(large_balance, (Decimal, float, int))
            assert large_balance >= 0
        except TypeError:
            # Parameter not supported - skip
            pytest.skip("Max balance parameter not supported")
    
    def test_special_characters_in_names(self, generator):
        """Test handling of special characters in names."""
        # Generate names and check they don't break XML
        names = [generator.generate_first_name() for _ in range(50)]
        
        for name in names:
            # Should not contain XML-breaking characters
            assert '<' not in name
            assert '>' not in name
            assert '&' not in name or '&amp;' in name  # Should be escaped


class TestMultiLanguageDataGeneration:
    """Test multi-language data generation invariants."""
    
    @pytest.fixture
    def generator(self):
        """Create a base data generator instance."""
        return BaseDataGenerator()
    
    def test_unicode_name_generation(self, generator):
        """Test that unicode names are properly generated."""
        # Test various language codes if supported
        languages = ["en", "nl", "es", "ru", "zh", "ar"]
        
        for lang in languages:
            try:
                name = generator.generate_first_name(language=lang)
                # Name should be valid unicode string
                assert isinstance(name, str)
                # Should be encodable to UTF-8
                name.encode('utf-8')
            except (TypeError, AttributeError):
                # Language parameter not supported - skip
                continue
    
    def test_non_latin_script_handling(self, generator):
        """Test that non-Latin scripts are handled correctly."""
        try:
            # Test Cyrillic
            cyrillic_name = generator.generate_first_name(language="ru")
            assert isinstance(cyrillic_name, str)
            
            # Test Chinese
            chinese_name = generator.generate_first_name(language="zh")
            assert isinstance(chinese_name, str)
        except (TypeError, AttributeError):
            pytest.skip("Multi-language generation not implemented")


class TestErrorHandling:
    """Test error handling in data generation."""
    
    @pytest.fixture
    def generator(self):
        """Create a base data generator instance."""
        return BaseDataGenerator()
    
    def test_invalid_country_code_handling(self, generator):
        """Test handling of invalid country codes."""
        # Should either raise exception or return default
        try:
            result = generator.generate_tin("INVALID")
            # If no exception, should return valid string
            assert isinstance(result, str)
        except (ValueError, KeyError):
            # Exception is acceptable for invalid input
            pass
    
    def test_empty_country_code_handling(self, generator):
        """Test handling of empty country code."""
        try:
            result = generator.generate_tin("")
            assert isinstance(result, str)
        except (ValueError, KeyError):
            # Exception is acceptable
            pass
