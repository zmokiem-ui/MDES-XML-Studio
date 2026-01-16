"""
Shared CLI utilities for CRS, FATCA, and CBC generators.

This module provides common functionality to reduce code duplication across CLI modules.
"""

import argparse
import sys
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass


def output_json(data: Dict[str, Any], exit_on_error: bool = True) -> None:
    """Print JSON output and optionally exit based on success/validity."""
    print(json.dumps(data))
    
    if exit_on_error:
        # Check for various success indicators
        is_success = data.get('success', data.get('valid', data.get('is_valid', True)))
        sys.exit(0 if is_success else 1)


def error_exit(message: str, as_json: bool = True) -> None:
    """Exit with an error message."""
    if as_json:
        print(json.dumps({'success': False, 'error': message}))
    else:
        print(f"Error: {message}", file=sys.stderr)
    sys.exit(1)


def parse_comma_list(value: Optional[str], uppercase: bool = False) -> List[str]:
    """Parse a comma-separated string into a list of stripped values."""
    if not value:
        return []
    items = [item.strip() for item in value.split(',')]
    return [item.upper() for item in items] if uppercase else items


def add_correction_arguments(parser: argparse.ArgumentParser) -> None:
    """Add common correction-related arguments to a parser."""
    parser.add_argument('--xml-input', 
                        help='Path to input XML file (for validate-xml and correction modes)')
    parser.add_argument('--correct-fi', action='store_true', 
                        help='Correct ReportingFI data')
    parser.add_argument('--correct-individual', type=int, default=0, 
                        help='Number of individual accounts to correct')
    parser.add_argument('--correct-organisation', type=int, default=0, 
                        help='Number of organisation accounts to correct')
    parser.add_argument('--delete-individual', type=int, default=0, 
                        help='Number of individual accounts to delete')
    parser.add_argument('--delete-organisation', type=int, default=0, 
                        help='Number of organisation accounts to delete')
    parser.add_argument('--modify-balance', action='store_true', default=True, 
                        help='Modify account balances')
    parser.add_argument('--modify-address', action='store_true', default=True, 
                        help='Modify addresses')
    parser.add_argument('--modify-name', action='store_true', default=False, 
                        help='Modify names')
    parser.add_argument('--test-mode', action='store_true', default=True, 
                        help='Use test data indicators')


def add_account_holder_arguments(parser: argparse.ArgumentParser) -> None:
    """Add common account holder-related arguments to a parser."""
    parser.add_argument('--account-holder-mode', default='random', 
                        help='Account holder country mode')
    parser.add_argument('--account-holder-countries', 
                        help='Comma-separated country codes')


def add_generation_arguments(parser: argparse.ArgumentParser, 
                             include_individual: bool = True,
                             include_organisation: bool = True) -> None:
    """Add common generation-related arguments to a parser."""
    parser.add_argument('--reporting-fi-tins', 
                        help='Comma-separated list of FI TINs/GIINs')
    
    if include_individual:
        parser.add_argument('--individual-accounts', type=int, default=0, 
                            help='Individual accounts per FI')
    if include_organisation:
        parser.add_argument('--organisation-accounts', type=int, default=0, 
                            help='Organisation accounts per FI')


@dataclass
class CorrectionConfig:
    """Common correction configuration used by CRS and FATCA."""
    correct_fi: bool
    correct_individual: int
    correct_organisation: int
    delete_individual: int
    delete_organisation: int
    modify_balance: bool
    modify_address: bool
    modify_name: bool
    test_mode: bool
    output_path: str
    
    @classmethod
    def from_args(cls, args) -> 'CorrectionConfig':
        """Create CorrectionConfig from parsed arguments."""
        return cls(
            correct_fi=args.correct_fi,
            correct_individual=args.correct_individual,
            correct_organisation=args.correct_organisation,
            delete_individual=args.delete_individual,
            delete_organisation=args.delete_organisation,
            modify_balance=args.modify_balance,
            modify_address=args.modify_address,
            modify_name=args.modify_name,
            test_mode=args.test_mode,
            output_path=args.output
        )


def format_validation_result(result, module_type: str = 'crs') -> Dict[str, Any]:
    """Format XML validation result into a standard dictionary.
    
    Args:
        result: Validation result object from validator
        module_type: 'crs' or 'fatca' to determine specific fields
    
    Returns:
        Dictionary with validation results
    """
    base_result = {
        'is_valid': result.is_valid,
        'errors': result.errors,
        'warnings': result.warnings,
        'version': result.xml_version,
        'message_ref_id': result.message_ref_id,
        'transmitting_country': result.transmitting_country,
        'receiving_country': result.receiving_country,
        'reporting_period': result.reporting_period,
        'reporting_fi_count': result.reporting_fi_count,
        'total_accounts': result.account_count,
        'individual_accounts': result.individual_accounts,
        'organisation_accounts': result.organisation_accounts,
    }
    
    if module_type == 'crs':
        base_result['message_type_indic'] = result.message_type_indic
        base_result['is_correction_file'] = result.message_type_indic == 'CRS702'
        base_result['can_generate_correction'] = result.is_valid and result.message_type_indic == 'CRS701'
    elif module_type == 'fatca':
        base_result['message_type'] = result.message_type
        base_result['can_generate_correction'] = result.is_valid and result.is_new_data
    
    return base_result


def format_correction_result(result) -> Dict[str, Any]:
    """Format correction generation result into a standard dictionary."""
    if result.success:
        return {
            'success': True,
            'output_path': result.output_path,
            'corrections_made': result.corrections_made,
            'deletions_made': result.deletions_made,
            'fi_corrected': result.fi_corrected
        }
    else:
        return {
            'success': False,
            'error': result.error_message
        }
