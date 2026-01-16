#!/usr/bin/env python3
"""
CLI wrapper for CRS Generator - called by Electron app
"""

import argparse
import sys
import json
from pathlib import Path

from .cli_utils import (
    output_json, error_exit, parse_comma_list,
    add_correction_arguments, add_account_holder_arguments, add_generation_arguments,
    CorrectionConfig, format_validation_result, format_correction_result
)


def validate_xml_mode(args):
    """Validate XML file and return validation results as JSON"""
    from .xml_validator import CRSXMLValidator
    
    if not args.xml_input:
        return {
            'is_valid': False,
            'errors': ['No XML file specified. Use --xml-input'],
            'warnings': []
        }
    
    validator = CRSXMLValidator()
    result = validator.validate_file(args.xml_input)
    return format_validation_result(result, 'crs')


def generate_correction_mode(args):
    """Generate correction file from source XML"""
    from .correction_generator import CRSCorrectionGenerator, CorrectionOptions
    
    if not args.xml_input:
        error_exit('No XML file specified. Use --xml-input')
    if not args.output:
        error_exit('No output file specified. Use --output')
    
    config = CorrectionConfig.from_args(args)
    options = CorrectionOptions(
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
    
    generator = CRSCorrectionGenerator()
    result = generator.generate_correction(args.xml_input, options)
    output_json(format_correction_result(result))


def validate_csv_mode(args):
    """Validate CSV file and return validation results as JSON"""
    from pathlib import Path
    from .csv_parser import CRSCSVParser, CSVValidationError
    
    csv_path = Path(args.csv_input)
    if not csv_path.exists():
        return {
            'valid': False,
            'errors': [f'CSV file not found: {args.csv_input}']
        }
    
    parser = CRSCSVParser(csv_path)
    
    try:
        # This will populate parser.errors if there are issues
        data = parser.parse()
        
        if parser.errors:
            return {
                'valid': False,
                'errors': parser.errors
            }
        
        # Calculate statistics
        total_accounts = sum(len(fi.accounts) for fi in data.reporting_fis)
        individual_accounts = sum(
            1 for fi in data.reporting_fis 
            for acc in fi.accounts 
            if acc.individual is not None
        )
        organisation_accounts = sum(
            1 for fi in data.reporting_fis 
            for acc in fi.accounts 
            if acc.organisation is not None
        )
        
        countries = set()
        for fi in data.reporting_fis:
            for acc in fi.accounts:
                if acc.individual:
                    countries.add(acc.individual.res_country_code)
                if acc.organisation:
                    countries.add(acc.organisation.res_country_code)
        
        return {
            'valid': True,
            'statistics': {
                'total_accounts': total_accounts,
                'individual_accounts': individual_accounts,
                'organisation_accounts': organisation_accounts,
                'reporting_fis': len(data.reporting_fis),
                'countries': sorted(list(countries)),
                'transmitting_country': data.message_spec.transmitting_country,
                'receiving_country': data.message_spec.receiving_country,
                'tax_year': data.message_spec.tax_year
            }
        }
    except CSVValidationError as e:
        return {
            'valid': False,
            'errors': e.errors
        }
    except Exception as e:
        return {
            'valid': False,
            'errors': [f'Validation error: {str(e)}']
        }


def main():
    parser = argparse.ArgumentParser(description='Generate CRS XML test data')
    
    # Mode selection
    parser.add_argument('--mode', choices=['random', 'csv', 'preview', 'validate', 'validate-xml', 'correction'], default='random',
                        help='Generation mode: random, csv, preview, validate (CSV), validate-xml, or correction')
    
    # CSV mode arguments
    parser.add_argument('--csv-input', help='Path to input CSV file (for csv mode)')
    
    # Random mode arguments
    parser.add_argument('--sending-country', help='Sending country code')
    parser.add_argument('--receiving-country', help='Receiving country code')
    parser.add_argument('--tax-year', type=int, help='Tax year')
    parser.add_argument('--mytin', help='Sending company TIN')
    parser.add_argument('--num-fis', type=int, help='Number of reporting FIs')
    parser.add_argument('--output', required=True, help='Output file path')
    
    # Optional arguments for random mode
    parser.add_argument('--reporting-fi-tins', help='Comma-separated list of FI TINs')
    parser.add_argument('--individual-accounts', type=int, default=0, help='Individual accounts per FI')
    parser.add_argument('--organisation-accounts', type=int, default=0, help='Organisation accounts per FI')
    parser.add_argument('--controlling-persons', type=int, default=0, help='Controlling persons per org')
    parser.add_argument('--account-holder-mode', default='random', help='Account holder country mode')
    parser.add_argument('--account-holder-countries', help='Comma-separated country codes')
    
    # Preview mode arguments
    parser.add_argument('--preview-limit', type=int, default=20, help='Number of rows for preview')
    parser.add_argument('--preview-json', action='store_true', help='Output preview as JSON instead of CSV')
    
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
    parser.add_argument('--test-mode', action='store_true', default=True, help='Use test data indicators (OECD11/12/13) instead of production (OECD1/2/3)')
    
    args = parser.parse_args()
    
    if args.mode == 'validate':
        result = validate_csv_mode(args)
        print(json.dumps(result))
        sys.exit(0 if result['valid'] else 1)
    elif args.mode == 'validate-xml':
        result = validate_xml_mode(args)
        print(json.dumps(result))
        sys.exit(0 if result['is_valid'] else 1)
    elif args.mode == 'correction':
        return generate_correction_mode(args)
    elif args.mode == 'csv':
        return generate_from_csv_mode(args)
    elif args.mode == 'preview':
        return generate_preview_mode(args)
    else:
        return generate_random_mode(args)


def generate_from_csv_mode(args):
    """Generate CRS XML from CSV file"""
    from .csv_generator import generate_from_csv
    from .csv_parser import CSVValidationError
    
    if not args.csv_input:
        print("Error: --csv-input is required for csv mode", file=sys.stderr)
        sys.exit(1)
    
    csv_path = Path(args.csv_input)
    if not csv_path.exists():
        print(f"Error: CSV file not found: {csv_path}", file=sys.stderr)
        sys.exit(1)
    
    print(f"Generating CRS XML from CSV: {csv_path}")
    
    try:
        result_path = generate_from_csv(str(csv_path), args.output)
        file_size = result_path.stat().st_size / (1024 * 1024)
        
        print(f"\nGeneration complete!")
        print(f"File: {result_path}")
        print(f"Size: {file_size:.2f} MB")
        sys.exit(0)
        
    except CSVValidationError as e:
        print(f"\nCSV Validation Errors:", file=sys.stderr)
        for error in e.errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)
        
    except Exception as e:
        print(f"\nError: {str(e)}", file=sys.stderr)
        sys.exit(1)


def generate_preview_mode(args):
    """Generate CSV preview data"""
    from .csv_parser import generate_csv_preview, save_csv_preview
    
    # Validate required args for preview
    if not all([args.sending_country, args.receiving_country, args.tax_year, args.mytin, args.num_fis]):
        print("Error: --sending-country, --receiving-country, --tax-year, --mytin, and --num-fis are required for preview mode", file=sys.stderr)
        sys.exit(1)
    
    print(f"Generating CSV preview data...")
    
    try:
        rows = generate_csv_preview(
            sending_country=args.sending_country.upper(),
            receiving_country=args.receiving_country.upper(),
            tax_year=args.tax_year,
            mytin=args.mytin,
            num_fis=args.num_fis,
            individual_accounts=args.individual_accounts or 0,
            organisation_accounts=args.organisation_accounts or 0,
            controlling_persons=args.controlling_persons or 1
        )
        
        # Limit rows for preview
        preview_rows = rows[:args.preview_limit]
        
        if args.preview_json:
            # Output as JSON for frontend
            print(json.dumps({
                'total_rows': len(rows),
                'preview_rows': preview_rows,
                'columns': list(preview_rows[0].keys()) if preview_rows else []
            }))
        else:
            # Save full CSV to output path
            save_csv_preview(rows, Path(args.output))
            print(f"\nCSV preview saved!")
            print(f"File: {args.output}")
            print(f"Total rows: {len(rows)}")
        
        sys.exit(0)
        
    except Exception as e:
        print(f"\nError: {str(e)}", file=sys.stderr)
        sys.exit(1)


def generate_random_mode(args):
    """Generate CRS XML with random data (original mode)"""
    from .generator import GeneratorConfig, CRSGenerator
    
    # Validate required args
    if not all([args.sending_country, args.receiving_country, args.tax_year, args.mytin, args.num_fis]):
        print("Error: --sending-country, --receiving-country, --tax-year, --mytin, and --num-fis are required for random mode", file=sys.stderr)
        sys.exit(1)
    
    # Parse optional lists
    reporting_fi_tins = parse_comma_list(args.reporting_fi_tins) or None
    account_holder_countries = parse_comma_list(args.account_holder_countries)
    
    # Determine parallel processing
    total_accounts = args.num_fis * (args.individual_accounts + args.organisation_accounts)
    
    if total_accounts < 1000:
        use_parallel = False
        num_workers = 1
    elif total_accounts < 10000:
        use_parallel = True
        from multiprocessing import cpu_count
        num_workers = min(4, cpu_count())
    else:
        use_parallel = True
        from multiprocessing import cpu_count
        num_workers = min(8, cpu_count())
    
    print(f"Generating CRS file with {total_accounts:,} total accounts...")
    print(f"Parallel processing: {'Yes' if use_parallel else 'No'} ({num_workers} workers)")
    
    try:
        config = GeneratorConfig(
            sending_country=args.sending_country,
            receiving_country=args.receiving_country,
            tax_year=args.tax_year,
            mytin=args.mytin,
            reporting_fi_tins=reporting_fi_tins,
            num_reporting_fis=args.num_fis,
            individual_accounts_per_fi=args.individual_accounts,
            organisation_accounts_per_fi=args.organisation_accounts,
            controlling_persons_per_org=args.controlling_persons,
            account_holder_country_mode=args.account_holder_mode,
            account_holder_countries=account_holder_countries,
            output_path=Path(args.output),
            show_progress=True,
            progress_every=500,
            pretty_print=True
        )
        
        generator = CRSGenerator(config)
        result_path = generator.generate(use_parallel=use_parallel, num_workers=num_workers)
        
        file_size = result_path.stat().st_size / (1024 * 1024)
        
        print(f"\nGeneration complete!")
        print(f"File: {result_path}")
        print(f"Size: {file_size:.2f} MB")
        print(f"Total accounts: {total_accounts:,}")
        
        sys.exit(0)
        
    except Exception as e:
        print(f"\nError: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
