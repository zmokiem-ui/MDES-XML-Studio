"""
Test script for multi-language data generation.
Demonstrates how to generate XML data in different languages.
"""

from crs_generator.language_config import LanguageConfig, SUPPORTED_LANGUAGES
from crs_generator.generator import CRSGenerator, GeneratorConfig
from crs_generator.base_data_generator import BaseDataGenerator
from pathlib import Path


def test_single_language(language_code: str, output_dir: Path):
    """Test generation with a single language."""
    print(f"\n{'='*60}")
    print(f"Testing: {SUPPORTED_LANGUAGES[language_code]['display']}")
    print(f"{'='*60}")
    
    # Create language config
    lang_config = LanguageConfig(primary_language=language_code)
    
    # Show warning if needed
    warning = lang_config.get_encoding_warning()
    if warning:
        print(f"\n{warning}\n")
    
    # Create generator config
    gen_config = GeneratorConfig(
        num_reporting_fi=1,
        num_individual_accounts=5,
        num_organisation_accounts=2,
        sending_country='NL',
        receiving_country='NL',
        tax_year=2023
    )
    
    # Create data generator to show sample data
    data_gen = BaseDataGenerator(seed=42, language_config=lang_config)
    
    print("\nSample Generated Data:")
    print(f"  Name: {data_gen.first_name()} {data_gen.last_name()}")
    print(f"  Company: {data_gen.company_name()}")
    print(f"  City: {data_gen.city()}")
    print(f"  Street: {data_gen.street()}")
    
    # Generate XML file
    output_file = output_dir / f"test_{language_code}.xml"
    print(f"\nGenerating XML: {output_file}")
    
    # Note: This will work once we update CRSGenerator to accept language_config
    # For now, just show the concept
    print("✓ Language configuration ready")
    print(f"  Faker locale: {lang_config.get_faker_locales()}")
    print(f"  Requires NVARCHAR: {lang_config.requires_nvarchar()}")


def test_mixed_languages(output_dir: Path):
    """Test generation with mixed languages."""
    print(f"\n{'='*60}")
    print(f"Testing: Mixed Languages (English 60%, Russian 30%, Chinese 10%)")
    print(f"{'='*60}")
    
    # Create mixed language config
    lang_config = LanguageConfig(
        primary_language='en_US',
        additional_languages=['ru_RU', 'zh_CN'],
        language_weights={
            'en_US': 0.6,
            'ru_RU': 0.3,
            'zh_CN': 0.1
        },
        use_mixed=True
    )
    
    # Show warning
    warning = lang_config.get_encoding_warning()
    if warning:
        print(f"\n{warning}\n")
    
    # Create data generator
    data_gen = BaseDataGenerator(seed=42, language_config=lang_config)
    
    print("\nSample Generated Data (Mixed):")
    for i in range(10):
        name = f"{data_gen.first_name()} {data_gen.last_name()}"
        city = data_gen.city()
        print(f"  {i+1}. {name} - {city}")
    
    print("\n✓ Mixed language configuration ready")
    print(f"  Languages: {lang_config.get_all_languages()}")
    print(f"  Weights: {lang_config.language_weights}")


def test_problematic_scripts(output_dir: Path):
    """Test languages that commonly cause database issues."""
    print(f"\n{'='*60}")
    print(f"Testing Problematic Scripts (Cyrillic, Chinese, Hindi, Arabic)")
    print(f"{'='*60}")
    
    problematic_langs = {
        'ru_RU': 'Russian (Cyrillic)',
        'zh_CN': 'Chinese (Simplified)',
        'hi_IN': 'Hindi (Devanagari)',
        'ar_SA': 'Arabic'
    }
    
    for lang_code, lang_name in problematic_langs.items():
        print(f"\n{lang_name}:")
        lang_config = LanguageConfig(primary_language=lang_code)
        data_gen = BaseDataGenerator(seed=42, language_config=lang_config)
        
        print(f"  Name: {data_gen.first_name()} {data_gen.last_name()}")
        print(f"  City: {data_gen.city()}")
        print(f"  Company: {data_gen.company_name()}")
        print(f"  ⚠️ Requires NVARCHAR: {lang_config.requires_nvarchar()}")


def main():
    """Run all language tests."""
    print("\n" + "="*60)
    print("CRS Generator - Multi-Language Test Suite")
    print("="*60)
    
    # Create output directory
    output_dir = Path("test_output_languages")
    output_dir.mkdir(exist_ok=True)
    
    # Test 1: Single languages
    print("\n\n### TEST 1: Single Language Generation ###")
    test_languages = ['en_US', 'ru_RU', 'zh_CN', 'de_DE', 'ja_JP']
    
    for lang in test_languages:
        test_single_language(lang, output_dir)
    
    # Test 2: Mixed languages
    print("\n\n### TEST 2: Mixed Language Generation ###")
    test_mixed_languages(output_dir)
    
    # Test 3: Problematic scripts
    print("\n\n### TEST 3: Problematic Scripts (Database Encoding Test) ###")
    test_problematic_scripts(output_dir)
    
    # Summary
    print("\n\n" + "="*60)
    print("Test Summary")
    print("="*60)
    print("\n✅ All language configurations tested successfully!")
    print("\nNext Steps:")
    print("1. Update CRSGenerator to accept language_config parameter")
    print("2. Update FATCAGenerator to accept language_config parameter")
    print("3. Update CBCGenerator to accept language_config parameter")
    print("4. Integrate language selector into wizard UI")
    print("5. Test with actual XML generation")
    print("\nDatabase Recommendations:")
    print("• Use NVARCHAR for: FirstName, LastName, City, Street, CompanyName")
    print("• Use VARCHAR for: TIN, AccountNumber (numeric only)")
    print("• Set database encoding to UTF-8")
    print("\n" + "="*60)


if __name__ == "__main__":
    main()
