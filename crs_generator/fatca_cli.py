#!/usr/bin/env python3
"""
CLI wrapper for FATCA Generator - called by Electron app
"""

import argparse
import sys
import json
from pathlib import Path

from .cli_utils import (
    output_json, error_exit, parse_comma_list,
    CorrectionConfig, format_validation_result, format_correction_result
)


def validate_fatca_xml_mode(args):
    """Validate FATCA XML file and return validation results as JSON"""
    from .fatca_validator import FATCAXMLValidator
    
    if not args.xml_input:
        return {
            'is_valid': False,
            'errors': ['No XML file specified. Use --xml-input'],
            'warnings': []
        }
    
    validator = FATCAXMLValidator()
    result = validator.validate_file(args.xml_input)
    from .cli_utils import apply_xsd_verdict
    return apply_xsd_verdict(format_validation_result(result, 'fatca'), args.xml_input)


def generate_fatca_correction_mode(args):
    """Generate FATCA correction file from source XML"""
    from .fatca_correction_generator import FATCACorrectionGenerator, FATCACorrectionOptions

    # The correction generator only understands FATCA-CRS Combined (v2.2). Refuse
    # fatca-oecd rather than silently emitting a wrong-schema (FatcaXML v2.0.1) correction.
    variant = getattr(args, 'variant', None) or 'fatca-crs'
    if variant == 'fatca-oecd':
        error_exit(
            'Corrections are not supported yet for the IRS FATCA (FATCA_OECD v2.0.1) '
            'variant. Only FATCA-CRS Combined corrections are available.'
        )

    if not args.xml_input:
        error_exit('No XML file specified. Use --xml-input')
    if not args.output:
        error_exit('No output file specified. Use --output')
    
    config = CorrectionConfig.from_args(args)
    options = FATCACorrectionOptions(
        correct_reporting_fi=config.correct_fi,
        correct_individual_accounts=config.correct_individual,
        correct_organisation_accounts=config.correct_organisation,
        delete_individual_accounts=config.delete_individual,
        delete_organisation_accounts=config.delete_organisation,
        modify_balance=config.modify_balance,
        modify_address=config.modify_address,
        modify_name=config.modify_name,
        test_mode=config.test_mode,
        output_path=config.output_path
    )
    
    generator = FATCACorrectionGenerator()
    result = generator.generate_correction(args.xml_input, options)
    output_json(format_correction_result(result))


def generate_fatca_random_mode(args):
    """Generate random FATCA XML data (FATCA-CRS combined or pure IRS FATCA_OECD)."""
    variant = getattr(args, 'variant', None) or 'fatca-crs'
    if variant == 'fatca-oecd':
        return _generate_irs_fatca_mode(args)

    from .fatca_generator import FATCAGeneratorConfig, FATCAGenerator

    reporting_fi_tins = parse_comma_list(args.reporting_fi_tins)
    account_holder_countries = parse_comma_list(args.account_holder_countries, uppercase=True)
    
    config = FATCAGeneratorConfig(
        sending_country=args.sending_country or 'CW',
        receiving_country=args.receiving_country or 'CW',
        tax_year=args.tax_year or 2024,
        sending_company_in=args.sending_company_in or '20016636',
        num_reporting_fis=args.num_fis or 1,
        reporting_fi_tins=reporting_fi_tins if reporting_fi_tins else None,
        filer_category=args.filer_category or 'FATCA601',
        individual_accounts_per_fi=args.individual_accounts or 0,
        organisation_accounts_per_fi=args.organisation_accounts or 0,
        controlling_persons_per_org=args.substantial_owners or 1,
        account_holder_country_mode=args.account_holder_mode or 'random',
        account_holder_countries=account_holder_countries if account_holder_countries else None,
        output_path=Path(args.output),
        test_mode=args.test_mode
    )
    
    generator = FATCAGenerator(config)

    try:
        output_path = generator.generate()
        print(f"Generated FATCA XML: {output_path}")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


def _generate_irs_fatca_mode(args):
    """Generate pure IRS FATCA (FATCA_OECD, FatcaXML v2.0.1) XML data."""
    from .fatca_irs_generator import (
        FATCAGeneratorConfig as IRSConfig,
        FATCAGenerator as IRSGenerator,
    )

    reporting_fi_tins = parse_comma_list(args.reporting_fi_tins)
    account_holder_countries = parse_comma_list(args.account_holder_countries, uppercase=True)

    config = IRSConfig(
        sending_country=args.sending_country or 'NL',
        receiving_country=args.receiving_country or 'US',
        tax_year=args.tax_year or 2024,
        sending_company_in=args.sending_company_in or '000000.00000.TA.531',
        num_reporting_fis=args.num_fis or 1,
        reporting_fi_tins=reporting_fi_tins if reporting_fi_tins else None,
        filer_category=args.filer_category or 'FATCA601',
        individual_accounts_per_fi=args.individual_accounts or 0,
        organisation_accounts_per_fi=args.organisation_accounts or 0,
        substantial_owners_per_org=args.substantial_owners or 1,
        account_holder_country_mode=args.account_holder_mode or 'random',
        account_holder_countries=account_holder_countries if account_holder_countries else None,
        output_path=Path(args.output),
        test_mode=args.test_mode,
    )

    try:
        output_path = IRSGenerator(config).generate()
        print(f"Generated FATCA XML: {output_path}")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Generate FATCA XML test data')
    
    # Mode selection
    parser.add_argument('--mode', choices=['random', 'validate-xml', 'correction'], default='random',
                        help='Generation mode: random, validate-xml, or correction')
    parser.add_argument('--variant', choices=['fatca-crs', 'fatca-oecd'], default='fatca-crs',
                        help='FATCA format: fatca-crs (FATCA-CRS combined, FC upload) or '
                             'fatca-oecd (pure IRS FATCA_OECD v2.0.1)')
    
    # Random mode arguments
    parser.add_argument('--sending-country', help='Transmitting country code')
    parser.add_argument('--receiving-country', default='US', help='Receiving country code (default: US)')
    parser.add_argument('--tax-year', type=int, help='Tax year')
    parser.add_argument('--sending-company-in', help='Sending company GIIN')
    parser.add_argument('--num-fis', type=int, help='Number of reporting FIs')
    parser.add_argument('--output', required=True, help='Output file path')
    
    # Optional arguments for random mode
    parser.add_argument('--reporting-fi-tins', help='Comma-separated list of FI GIINs')
    parser.add_argument('--filer-category', default='FATCA601', help='Filer category (FATCA601-611)')
    parser.add_argument('--individual-accounts', type=int, default=0, help='Individual accounts per FI')
    parser.add_argument('--organisation-accounts', type=int, default=0, help='Organisation accounts per FI')
    parser.add_argument('--substantial-owners', type=int, default=1, help='Substantial owners per org')
    parser.add_argument('--account-holder-mode', default='random', help='Account holder country mode')
    parser.add_argument('--account-holder-countries', help='Comma-separated country codes')
    
    # XML validation and correction mode arguments
    parser.add_argument('--xml-input', help='Path to input XML file (for validate-xml and correction modes)')
    parser.add_argument('--correct-fi', action='store_true', help='Correct ReportingFI data')
    parser.add_argument('--correct-individual', type=int, default=0, help='Number of individual accounts to correct')
    parser.add_argument('--correct-organisation', type=int, default=0, help='Number of organisation accounts to correct')
    parser.add_argument('--delete-individual', type=int, default=0, help='Number of individual accounts to delete')
    parser.add_argument('--delete-organisation', type=int, default=0, help='Number of organisation accounts to delete')
    parser.add_argument('--modify-balance', action=argparse.BooleanOptionalAction, default=True, help='Modify account balances (use --no-modify-balance to disable)')
    parser.add_argument('--modify-address', action=argparse.BooleanOptionalAction, default=True, help='Modify addresses (use --no-modify-address to disable)')
    parser.add_argument('--modify-name', action=argparse.BooleanOptionalAction, default=False, help='Modify names')
    # Test vs production DocTypeIndic (MDES 50010/50011). Default is test env
    # (FATCA11-14); pass --production for FATCA1-4. --test-mode is a deprecated
    # no-op alias kept for backward compatibility (test is default).
    parser.add_argument('--production', action='store_true', default=False,
                        help='Use production DocTypeIndic (FATCA1-4) instead of test (FATCA11-14)')
    parser.add_argument('--test-mode', action='store_true', default=False,
                        help='(Deprecated) Test data indicators are the default; this flag is a no-op')

    args = parser.parse_args()
    # Resolve the single source of truth used throughout the CLI.
    args.test_mode = not args.production
    
    if args.mode == 'validate-xml':
        result = validate_fatca_xml_mode(args)
        print(json.dumps(result))
        sys.exit(0 if result['is_valid'] else 1)
    elif args.mode == 'correction':
        return generate_fatca_correction_mode(args)
    else:
        return generate_fatca_random_mode(args)


if __name__ == '__main__':
    main()
