"""
CBC Correction File Generator Module
Generates CBC correction/deletion files from validated CBC XML files.
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Any
from pathlib import Path
from datetime import datetime
import random
import csv


def load_doc_ref_ids_from_csv(csv_path: str) -> List[str]:
    """Load DocRefIds from a CSV file.
    
    Args:
        csv_path: Path to CSV file containing DocRefIds
        
    Returns:
        List of DocRefId strings
    """
    doc_ref_ids = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if 'DocRefId' in row:
                doc_ref_ids.append(row['DocRefId'])
    return doc_ref_ids


def generate_cbc_correction(
    source_xml_path: str,
    correction_type: str = 'correction',
    output_path: Optional[str] = None,
    test_mode: bool = True,
    doc_ref_ids: Optional[List[str]] = None,
    modify_entity_names: bool = False,
    modification_percentage: float = 0.1
) -> str:
    """Generate CBC correction or deletion file from source XML.
    
    Args:
        source_xml_path: Path to source CBC XML file
        correction_type: 'correction' or 'deletion'
        output_path: Output file path (optional)
        test_mode: Use test indicators (OECD12/13) instead of production (OECD2/3)
        doc_ref_ids: Specific DocRefIds to process (if None, processes all)
        modify_entity_names: Whether to modify entity names in corrections
        modification_percentage: Percentage to modify financial values
        
    Returns:
        Path to generated correction file
    """
    # Parse source XML
    tree = ET.parse(source_xml_path)
    root = tree.getroot()
    
    # Determine namespace
    ns = {}
    if root.tag.startswith('{'):
        ns_uri = root.tag.split('}')[0][1:]
        ns['cbc'] = ns_uri
    
    # Determine DocTypeIndic based on type and mode
    if correction_type == 'deletion':
        doc_type = 'OECD13' if test_mode else 'OECD3'
    else:  # correction
        doc_type = 'OECD12' if test_mode else 'OECD2'
    
    # Update MessageTypeIndic to CBC402 (corrections)
    msg_type_elem = root.find('.//{*}MessageTypeIndic')
    if msg_type_elem is not None:
        msg_type_elem.text = 'CBC402'
    
    # Update MessageRefId to make it unique
    msg_ref_elem = root.find('.//{*}MessageRefId')
    if msg_ref_elem is not None:
        original_ref = msg_ref_elem.text
        msg_ref_elem.text = f"{original_ref}_CORR_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Update Timestamp
    timestamp_elem = root.find('.//{*}Timestamp')
    if timestamp_elem is not None:
        timestamp_elem.text = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    
    # Process CbcBody elements
    corrections_made = 0
    deletions_made = 0
    
    for cbc_body in root.findall('.//{*}CbcBody'):
        # Find all CbcReports
        for cbc_report in cbc_body.findall('.//{*}CbcReports'):
            doc_spec = cbc_report.find('.//{*}DocSpec')
            if doc_spec is not None:
                # Update DocTypeIndic
                doc_type_elem = doc_spec.find('.//{*}DocTypeIndic')
                if doc_type_elem is not None:
                    doc_type_elem.text = doc_type
                
                # Check if this DocRefId should be processed
                doc_ref_elem = doc_spec.find('.//{*}DocRefId')
                if doc_ref_elem is not None:
                    doc_ref_id = doc_ref_elem.text
                    
                    # If specific IDs provided, only process those
                    if doc_ref_ids and doc_ref_id not in doc_ref_ids:
                        continue
                    
                    if correction_type == 'correction':
                        corrections_made += 1
                        # Modify financial data slightly
                        _modify_financial_data(cbc_report, modification_percentage)
                        
                        # Optionally modify entity names
                        if modify_entity_names:
                            _modify_entity_names(cbc_report)
                    else:  # deletion
                        deletions_made += 1
                        # For deletions, we keep DocSpec but can remove other data
                        # (In practice, the full structure is often kept with OECD3 indicator)
    
    # Generate output path if not provided
    if not output_path:
        source_path = Path(source_xml_path)
        suffix = 'correction' if correction_type == 'correction' else 'deletion'
        output_path = str(source_path.parent / f"{source_path.stem}_{suffix}.xml")
    
    # Write output file
    tree.write(output_path, encoding='utf-8', xml_declaration=True)
    
    print(f"Generated CBC {correction_type}: {output_path}")
    print(f"  Corrections: {corrections_made}, Deletions: {deletions_made}")
    
    return output_path


def _modify_financial_data(cbc_report: ET.Element, percentage: float):
    """Modify financial data in a CBC report by a percentage."""
    # Find all Summary elements with financial data
    for summary in cbc_report.findall('.//{*}Summary'):
        # Modify revenue values
        for revenue in summary.findall('.//{*}Revenues'):
            if revenue.text:
                try:
                    value = float(revenue.text)
                    # Apply random modification within percentage range
                    change = value * percentage * random.uniform(-1, 1)
                    revenue.text = str(int(value + change))
                except ValueError:
                    pass
        
        # Modify profit/loss values
        for profit in summary.findall('.//{*}ProfitOrLoss'):
            if profit.text:
                try:
                    value = float(profit.text)
                    change = value * percentage * random.uniform(-1, 1)
                    profit.text = str(int(value + change))
                except ValueError:
                    pass
        
        # Modify tax paid values
        for tax in summary.findall('.//{*}TaxPaid'):
            if tax.text:
                try:
                    value = float(tax.text)
                    change = value * percentage * random.uniform(-1, 1)
                    tax.text = str(int(value + change))
                except ValueError:
                    pass


def _modify_entity_names(cbc_report: ET.Element):
    """Modify entity names slightly to indicate correction."""
    for name_elem in cbc_report.findall('.//{*}Name'):
        if name_elem.text:
            # Append " (Corrected)" to entity names
            if "(Corrected)" not in name_elem.text:
                name_elem.text = f"{name_elem.text} (Corrected)"
