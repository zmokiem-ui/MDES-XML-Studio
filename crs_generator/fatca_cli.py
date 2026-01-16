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
    return format_validation_result(result, 'fatca')


def generate_fatca_correction_mode(args):
    """Generate FATCA correction file from source XML"""
    from .fatca_correction_generator import FATCACorrectionGenerator, FATCACorrectionOptions
    
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
    """Generate random FATCA XML data"""
    from .fatca_generator import FATCAGeneratorConfig, FATCAGenerator
    
    reporting_fi_tins = parse_comma_list(args.reporting_fi_tins)
    account_holder_countries = parse_comma_list(args.account_holder_countries, uppercase=True)
    
    config = FATCAGeneratorConfig(
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


def main():
    parser = argparse.ArgumentParser(description='Generate FATCA XML test data')
    
    # Mode selection
    parser.add_argument('--mode', choices=['random', 'validate-xml', 'correction'], default='random',
                        help='Generation mode: random, validate-xml, or correction')
    
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
    parser.add_argument('--modify-balance', action='store_true', default=True, help='Modify account balances')
    parser.add_argument('--modify-address', action='store_true', default=True, help='Modify addresses')
    parser.add_argument('--modify-name', action='store_true', default=False, help='Modify names')
    parser.add_argument('--test-mode', action='store_true', default=True, help='Use test data indicators (FATCA11-14)')
    
    args = parser.parse_args()
    
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
