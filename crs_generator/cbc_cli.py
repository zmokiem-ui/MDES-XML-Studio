"""
CBC CLI - Command Line Interface for CBC XML Generation

This module provides command-line access to CBC generation functionality,
similar to the CRS and FATCA CLIs.
"""

import argparse
import json
import sys
from pathlib import Path

from lxml import etree

from .cbc_generator import generate_cbc_xml
from .cbc_correction_generator import generate_cbc_correction, load_doc_ref_ids_from_csv
from .cli_utils import add_seed_argument


def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser for CBC CLI."""
    parser = argparse.ArgumentParser(
        description='CBC (Country-by-Country) XML Test Data Generator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate new CBC report
  python -m crs_generator.cbc_cli generate --country NL --year 2023 --reports 5
  
  # Generate correction from existing file
  python -m crs_generator.cbc_cli correct --source cbc_output.xml --type correction
  
  # Generate deletion
  python -m crs_generator.cbc_cli correct --source cbc_output.xml --type deletion
  
  # Use CSV for selecting records
  python -m crs_generator.cbc_cli correct --source cbc_output.xml --csv records.csv

  # Validate CSV or XML
  python -m crs_generator.cbc_cli validate-csv --csv-input cbc_data.csv
  python -m crs_generator.cbc_cli validate-xml --xml-input cbc_output.xml
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Generate command
    gen_parser = subparsers.add_parser('generate', help='Generate new CBC XML')
    gen_parser.add_argument('--mode', '-m', choices=['random', 'csv'], default='random',
                           help='Generation mode: random or csv (default: random)')
    gen_parser.add_argument('--csv-input', 
                           help='Path to input CSV file (for csv mode)')
    gen_parser.add_argument('--country', '-c', default='NL',
                           help='Transmitting/Receiving country code (default: NL)')
    gen_parser.add_argument('--year', '-y', type=int, default=2023,
                           help='Tax year (default: 2023)')
    gen_parser.add_argument('--tin', '-t', default='123456789',
                           help='Sending entity TIN (default: 123456789)')
    gen_parser.add_argument('--reports', '-r', type=int, default=3,
                           help='Number of CBC reports/jurisdictions (default: 3)')
    gen_parser.add_argument('--entities', '-e', type=int, default=2,
                           help='Constituent entities per report (default: 2)')
    gen_parser.add_argument('--output', '-o', 
                           help='Output file path')
    gen_parser.add_argument('--production', action='store_true',
                           help='Use production DocTypeIndic (OECD1) instead of test (OECD11)')
    gen_parser.add_argument('--role', default='CBC701',
                           choices=['CBC701', 'CBC702', 'CBC703'],
                           help='Reporting role (default: CBC701 - Ultimate Parent)')
    gen_parser.add_argument('--mne-name',
                           help='MNE Group name')
    gen_parser.add_argument('--entity-name',
                           help='Reporting entity name')
    add_seed_argument(gen_parser)
    
    # Correction command
    corr_parser = subparsers.add_parser('correct', help='Generate CBC correction/deletion')
    corr_parser.add_argument('--source', '-s', required=True,
                            help='Source CBC XML file')
    corr_parser.add_argument('--type', '-t', default='correction',
                            choices=['correction', 'deletion'],
                            help='Type of correction (default: correction)')
    corr_parser.add_argument('--output', '-o',
                            help='Output file path')
    corr_parser.add_argument('--csv',
                            help='CSV file with DocRefIds to process')
    corr_parser.add_argument('--production', action='store_true',
                            help='Use production DocTypeIndic')
    corr_parser.add_argument('--modify-names', action='store_true',
                            help='Also modify entity names in corrections')
    corr_parser.add_argument('--change-percent', type=float, default=0.1,
                            help='Percentage change for financial values (default: 0.1)')

    # CSV validation command
    validate_csv_parser = subparsers.add_parser('validate-csv', help='Validate CBC CSV input')
    validate_csv_parser.add_argument('--csv-input', required=True,
                                    help='Path to CBC CSV file')

    # XML validation command
    validate_xml_parser = subparsers.add_parser('validate-xml', help='Validate CBC XML input')
    validate_xml_parser.add_argument('--xml-input', required=True,
                                    help='Path to CBC XML file')
    
    return parser


def cmd_generate(args) -> int:
    """Handle the generate command."""
    
    # CSV mode
    if args.mode == 'csv':
        if not args.csv_input:
            print("Error: --csv-input is required for csv mode", file=sys.stderr)
            return 1
        
        print(f"Generating CBC XML from CSV: {args.csv_input}")
        
        try:
            from .cbc_csv_generator import generate_cbc_from_csv
            output_path = generate_cbc_from_csv(
                csv_path=args.csv_input,
                output_path=args.output,
                test_mode=not args.production
            )
            print(f"\nSuccess! Generated: {output_path}")
            return 0
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            return 1
    
    # Random mode (default)
    print(f"Generating CBC XML for {args.country}, year {args.year}")
    print(f"  Reports: {args.reports}, Entities per report: {args.entities}")
    
    try:
        output_path = generate_cbc_xml(
            transmitting_country=args.country,
            receiving_country=args.country,
            tax_year=args.year,
            sending_entity_in=args.tin,
            num_cbc_reports=args.reports,
            const_entities_per_report=args.entities,
            output_path=args.output,
            test_mode=not args.production,
            reporting_role=args.role,
            mne_group_name=args.mne_name or '',
            reporting_entity_name=args.entity_name or '',
            seed=getattr(args, 'seed', None),
        )
        print(f"\nSuccess! Generated: {output_path}")
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


def cmd_correct(args) -> int:
    """Handle the correct command."""
    print(f"Generating CBC {args.type} from {args.source}")
    
    # Load DocRefIds from CSV if provided
    doc_ref_ids = None
    if args.csv:
        doc_ref_ids = load_doc_ref_ids_from_csv(args.csv)
        print(f"  Loaded {len(doc_ref_ids)} DocRefIds from CSV")
    
    try:
        output_path = generate_cbc_correction(
            source_xml_path=args.source,
            correction_type=args.type,
            output_path=args.output,
            test_mode=not args.production,
            doc_ref_ids=doc_ref_ids,
            modify_entity_names=args.modify_names,
            modification_percentage=args.change_percent
        )
        print(f"\nSuccess! Generated: {output_path}")
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


def _local_name(tag) -> str:
    if not isinstance(tag, str):
        return ""
    return tag.rsplit("}", 1)[-1]


def _first_text(root: etree._Element, local_name: str) -> str:
    for element in root.iter():
        if _local_name(element.tag) == local_name:
            return (element.text or "").strip()
    return ""


def _all_texts(root: etree._Element, local_name: str) -> list[str]:
    return [
        (element.text or "").strip()
        for element in root.iter()
        if _local_name(element.tag) == local_name
    ]


def cmd_validate_csv(args) -> int:
    """Validate CBC CSV input and print a JSON result."""
    from .cbc_csv_parser import CBCCSVParser

    result = CBCCSVParser(Path(args.csv_input)).validate()

    stats = result.get('statistics')
    if stats:
        stats['total_reports'] = stats.get('jurisdictions', 0)
        stats['total_entities'] = stats.get('entities', 0)

    print(json.dumps(result))
    return 0 if result.get('valid') else 1


def cmd_validate_xml(args) -> int:
    """Validate CBC XML input with the bundled XSD oracle and print JSON."""
    from . import mdes_rules
    from . import xsd_validator as xv

    try:
        tree = etree.parse(str(args.xml_input))
        root = tree.getroot()
        detected_type = xv.detect_message_type(root)
        if detected_type != "CBC":
            payload = {
                'is_valid': False,
                'valid': False,
                'can_generate_correction': False,
                'errors': [f"Not a valid CBC XML file. Detected {detected_type} XML."],
                'warnings': [],
                'doc_count': 0,
            }
            print(json.dumps(payload))
            return 1

        xsd_result = xv.validate_tree(tree, "CBC")
    except Exception as exc:
        payload = {
            'is_valid': False,
            'valid': False,
            'can_generate_correction': False,
            'errors': [str(exc)],
            'warnings': [],
            'doc_count': 0,
        }
        print(json.dumps(payload))
        return 1

    doc_ref_ids = [ref for ref in _all_texts(root, "DocRefId") if ref]
    doc_type_indics = set(_all_texts(root, "DocTypeIndic"))
    warnings = []

    try:
        findings = mdes_rules.check_file(args.xml_input, "CBC")
        warnings.extend(finding.as_text() for finding in findings)
        mdes_findings = [
            {'code': finding.code, 'severity': finding.severity, 'message': finding.message}
            for finding in findings
        ]
    except Exception as exc:
        mdes_findings = []
        warnings.append(f"[MDES] business-rule check skipped: {exc}")

    errors = [
        f"line {error['line']}: {error['message']}"
        for error in xsd_result.errors
    ]

    payload = {
        'is_valid': xsd_result.valid,
        'valid': xsd_result.valid,
        'xsd_valid': xsd_result.valid,
        'xsd_message_type': xsd_result.message_type,
        'schema_version': xsd_result.version,
        'version': xsd_result.version,
        'message_type': _first_text(root, "MessageTypeIndic") or "Unknown",
        'can_generate_correction': xsd_result.valid and len(doc_ref_ids) > 0,
        'has_corrections': bool(doc_type_indics & {"OECD2", "OECD3", "OECD12", "OECD13"}),
        'doc_count': len(doc_ref_ids),
        'doc_ref_ids': doc_ref_ids[:10],
        'errors': errors,
        'warnings': warnings,
        'mdes_findings': mdes_findings,
    }
    print(json.dumps(payload))
    return 0 if xsd_result.valid else 1


def main():
    """Main entry point for CBC CLI."""
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    if args.command == 'generate':
        return cmd_generate(args)
    elif args.command == 'correct':
        return cmd_correct(args)
    elif args.command == 'validate-csv':
        return cmd_validate_csv(args)
    elif args.command == 'validate-xml':
        return cmd_validate_xml(args)
    else:
        parser.print_help()
        return 1


if __name__ == '__main__':
    sys.exit(main())
