"""
CBC Correction/Deletion Generator

Generates CBC correction (OECD2/OECD12) and deletion (OECD3/OECD13) files
from existing CBC XML files.
"""

from pathlib import Path
from lxml import etree
from dataclasses import dataclass
from typing import Optional, List
import random
from datetime import datetime
from faker import Faker
import csv


# CBC namespaces
CBC_NS = "urn:oecd:ties:cbc:v2"
STF_NS = "urn:oecd:ties:cbcstf:v5"
ISO_NS = "urn:oecd:ties:isocbctypes:v1"

NAMESPACES = {
    'cbc': CBC_NS,
    'stf': STF_NS,
    'iso': ISO_NS,
}


@dataclass
class CBCCorrectionResult:
    """Result of CBC correction generation."""
    success: bool = False
    output_path: str = ""
    error_message: str = ""
    corrections_made: int = 0
    deletions_made: int = 0


def load_doc_ref_ids_from_csv(csv_path: str) -> List[str]:
    """Load DocRefIds from a CSV file."""
    doc_ref_ids = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Look for DocRefId column (case-insensitive)
                for key in row:
                    if key.lower() in ['docrefid', 'doc_ref_id', 'docref']:
                        if row[key]:
                            doc_ref_ids.append(row[key].strip())
                        break
    except Exception as e:
        print(f"Warning: Could not load DocRefIds from CSV: {e}")
    return doc_ref_ids


class CBCCorrectionGenerator:
    """Generates CBC correction and deletion files."""
    
    def __init__(self, seed: int = None):
        self.seed = seed or random.randint(1, 999999)
        self.rng = random.Random(self.seed)
        Faker.seed(self.seed)
        self.faker = Faker('en_US')
        self.ns = NAMESPACES.copy()
        self.docref_counter = 0
    
    def generate_correction(
        self,
        source_path: str,
        correction_type: str = 'correction',  # 'correction' or 'deletion'
        output_path: Optional[str] = None,
        test_mode: bool = True,
        doc_ref_ids: Optional[List[str]] = None,
        modify_entity_names: bool = False,
        modification_percentage: float = 0.1
    ) -> CBCCorrectionResult:
        """Generate a correction/deletion file from source CBC XML."""
        result = CBCCorrectionResult()
        
        try:
            # Load source file
            source = Path(source_path)
            if not source.exists():
                result.error_message = f"Source file not found: {source_path}"
                return result
            
            parser = etree.XMLParser(remove_blank_text=True)
            tree = etree.parse(str(source), parser)
            root = tree.getroot()
            
            # Build namespace map from document
            ns = dict(root.nsmap or {})
            if None in ns:
                ns['cbc'] = ns[None]
                del ns[None]
            self.ns = {**NAMESPACES, **ns}
            
            # Get original MessageRefId
            orig_msg_ref = self._get_message_ref_id(root)
            
            # Update MessageSpec for correction
            self._update_message_spec(root, orig_msg_ref, correction_type, test_mode)
            
            # Process CBC body
            result = self._process_cbc_body(
                root, correction_type, test_mode, orig_msg_ref,
                doc_ref_ids, modify_entity_names, modification_percentage, result
            )
            
            # Determine output path
            if output_path:
                out_path = Path(output_path)
            else:
                suffix = '_correction' if correction_type == 'correction' else '_deletion'
                out_path = source.parent / f"{source.stem}{suffix}.xml"
            
            out_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write output
            tree.write(
                str(out_path),
                pretty_print=True,
                xml_declaration=True,
                encoding='UTF-8'
            )
            
            result.success = True
            result.output_path = str(out_path)
            
        except Exception as e:
            result.error_message = str(e)
        
        return result
    
    def _get_message_ref_id(self, root: etree._Element) -> str:
        """Get MessageRefId from source file."""
        # Try different namespace combinations
        for prefix in ['stf', 'cbc', '']:
            if prefix:
                xpath = f'.//{prefix}:MessageRefId'
            else:
                xpath = './/MessageRefId'
            try:
                msg_ref = root.find(xpath, namespaces=self.ns)
                if msg_ref is not None and msg_ref.text:
                    return msg_ref.text
            except:
                pass
        
        # Try without namespace
        for elem in root.iter():
            if elem.tag.endswith('MessageRefId') and elem.text:
                return elem.text
        
        return f"MSGREF{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    def _update_message_spec(self, root: etree._Element, orig_msg_ref: str, 
                              correction_type: str, test_mode: bool):
        """Update MessageSpec for correction file."""
        # Find MessageSpec
        msg_spec = None
        for elem in root.iter():
            if elem.tag.endswith('MessageSpec'):
                msg_spec = elem
                break
        
        if msg_spec is None:
            return
        
        # Update MessageRefId
        for elem in msg_spec.iter():
            if elem.tag.endswith('MessageRefId'):
                # Generate new MessageRefId
                elem.text = f"{orig_msg_ref}_CORR{self.rng.randint(100000, 999999)}"
                break
        
        # Update MessageTypeIndic to CBC402 (corrections)
        for elem in msg_spec.iter():
            if elem.tag.endswith('MessageTypeIndic'):
                elem.text = 'CBC402'
                break
        
        # Update Timestamp
        for elem in msg_spec.iter():
            if elem.tag.endswith('Timestamp'):
                elem.text = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                break
        
        # Add CorrMessageRefId if not present
        corr_msg_ref_exists = False
        for elem in msg_spec.iter():
            if elem.tag.endswith('CorrMessageRefId'):
                elem.text = orig_msg_ref
                corr_msg_ref_exists = True
                break
        
        if not corr_msg_ref_exists:
            # Find MessageRefId element to insert after
            for elem in msg_spec.iter():
                if elem.tag.endswith('MessageRefId'):
                    # Create CorrMessageRefId with same namespace
                    ns = elem.tag.split('}')[0] + '}' if '}' in elem.tag else ''
                    corr_elem = etree.Element(f"{ns}CorrMessageRefId")
                    corr_elem.text = orig_msg_ref
                    elem.addnext(corr_elem)
                    break
    
    def _process_cbc_body(self, root: etree._Element, correction_type: str,
                          test_mode: bool, orig_msg_ref: str,
                          doc_ref_ids: Optional[List[str]],
                          modify_entity_names: bool,
                          modification_percentage: float,
                          result: CBCCorrectionResult) -> CBCCorrectionResult:
        """Process CBC body for corrections/deletions."""
        
        # Determine DocTypeIndic based on correction type and test mode
        if correction_type == 'deletion':
            doc_type_indic = 'OECD13' if test_mode else 'OECD3'
        else:
            doc_type_indic = 'OECD12' if test_mode else 'OECD2'
        
        # Find all DocSpec elements and update them
        doc_specs_updated = 0
        
        for elem in root.iter():
            if elem.tag.endswith('DocSpec'):
                doc_spec = elem
                
                # Get original DocRefId
                orig_doc_ref = None
                doc_ref_elem = None
                for child in doc_spec:
                    if child.tag.endswith('DocRefId'):
                        orig_doc_ref = child.text
                        doc_ref_elem = child
                        break
                
                # If we have a filter list, check if this DocRefId is in it
                if doc_ref_ids and orig_doc_ref not in doc_ref_ids:
                    continue
                
                # Update DocTypeIndic
                for child in doc_spec:
                    if child.tag.endswith('DocTypeIndic'):
                        child.text = doc_type_indic
                        break
                
                # Update DocRefId to new value
                if doc_ref_elem is not None and orig_doc_ref:
                    self.docref_counter += 1
                    suffix = 'CORR' if correction_type == 'correction' else 'VOID'
                    doc_ref_elem.text = f"{orig_doc_ref}_{suffix}{self.docref_counter:04d}"
                
                # Add CorrDocRefId if not present
                corr_doc_ref_exists = False
                for child in doc_spec:
                    if child.tag.endswith('CorrDocRefId'):
                        child.text = orig_doc_ref
                        corr_doc_ref_exists = True
                        break
                
                if not corr_doc_ref_exists and orig_doc_ref and doc_ref_elem is not None:
                    ns = doc_ref_elem.tag.split('}')[0] + '}' if '}' in doc_ref_elem.tag else ''
                    corr_doc_ref = etree.Element(f"{ns}CorrDocRefId")
                    corr_doc_ref.text = orig_doc_ref
                    doc_ref_elem.addnext(corr_doc_ref)
                
                doc_specs_updated += 1
                
                if correction_type == 'correction':
                    result.corrections_made += 1
                else:
                    result.deletions_made += 1
        
        # If correction type, also modify some financial values
        if correction_type == 'correction' and modification_percentage > 0:
            self._modify_financial_values(root, modification_percentage)
        
        return result
    
    def _modify_financial_values(self, root: etree._Element, percentage: float):
        """Modify financial values in CBC reports."""
        # Find monetary elements and modify them
        monetary_tags = ['Revenues', 'ProfitOrLoss', 'TaxPaid', 'TaxAccrued', 
                         'Capital', 'Earnings', 'NbEmployees', 'Assets']
        
        for elem in root.iter():
            tag_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            
            if tag_name in monetary_tags and elem.text:
                try:
                    # Try to parse as number
                    current = float(elem.text)
                    # Modify by percentage
                    factor = 1 + (self.rng.uniform(-percentage, percentage))
                    new_value = current * factor
                    
                    # Keep as integer if it was integer-like
                    if current == int(current):
                        elem.text = str(int(new_value))
                    else:
                        elem.text = f"{new_value:.2f}"
                except ValueError:
                    pass


def generate_cbc_correction(
    source_xml_path: str,
    correction_type: str = 'correction',
    output_path: Optional[str] = None,
    test_mode: bool = True,
    doc_ref_ids: Optional[List[str]] = None,
    modify_entity_names: bool = False,
    modification_percentage: float = 0.1
) -> str:
    """
    Generate a CBC correction or deletion file.
    
    Args:
        source_xml_path: Path to source CBC XML file
        correction_type: 'correction' or 'deletion'
        output_path: Optional output path (auto-generated if not provided)
        test_mode: Use test indicators (OECD11-13) vs production (OECD1-3)
        doc_ref_ids: Optional list of specific DocRefIds to process
        modify_entity_names: Whether to modify entity names
        modification_percentage: Percentage to modify financial values
    
    Returns:
        Path to generated correction file
    
    Raises:
        Exception if generation fails
    """
    generator = CBCCorrectionGenerator()
    result = generator.generate_correction(
        source_path=source_xml_path,
        correction_type=correction_type,
        output_path=output_path,
        test_mode=test_mode,
        doc_ref_ids=doc_ref_ids,
        modify_entity_names=modify_entity_names,
        modification_percentage=modification_percentage
    )
    
    if not result.success:
        raise Exception(result.error_message)
    
    return result.output_path
