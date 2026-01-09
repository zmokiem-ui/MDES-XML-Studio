"""
CRS Correction File Generator Module
Generates CRS702 correction files from validated CRS701 new files.
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import random
import string
import uuid
import copy

from .xml_validator import CRSXMLValidator, ValidationResult


@dataclass
class CorrectionOptions:
    """Options for correction generation"""
    # Correction types
    correct_reporting_fi: bool = False
    correct_individual_accounts: int = 0  # Number of individual accounts to correct
    correct_organisation_accounts: int = 0  # Number of organisation accounts to correct
    delete_individual_accounts: int = 0  # Number of individual accounts to delete
    delete_organisation_accounts: int = 0  # Number of organisation accounts to delete
    
    # What to modify in corrections
    modify_balance: bool = True
    modify_address: bool = True
    modify_name: bool = False
    modify_tin: bool = False
    
    # Test mode - uses OECD11/12/13 instead of OECD1/2/3
    test_mode: bool = True  # Default to test mode for safety
    
    # Output options
    output_path: str = ""
    new_message_ref_id: str = ""  # If empty, will be auto-generated


@dataclass
class CorrectionResult:
    """Result of correction generation"""
    success: bool
    output_path: str = ""
    error_message: str = ""
    corrections_made: int = 0
    deletions_made: int = 0
    fi_corrected: bool = False


class CRSCorrectionGenerator:
    """Generates CRS correction files"""
    
    # Namespaces for different versions
    NAMESPACES_V1 = {
        'crs': 'urn:oecd:ties:crs:v1',
        'cfc': 'urn:oecd:ties:commontypesfatcacrs:v1',
        'stf': 'urn:oecd:ties:stf:v4',
        'iso': 'urn:oecd:ties:isocrstypes:v1',
        'xsi': 'http://www.w3.org/2001/XMLSchema-instance'
    }
    
    NAMESPACES_V2 = {
        'crs': 'urn:oecd:ties:crs:v2',
        'cfc': 'urn:oecd:ties:commontypesfatcacrs:v2',
        'stf': 'urn:oecd:ties:crsstf:v5',
        'iso': 'urn:oecd:ties:isocrstypes:v1',
        'xsi': 'http://www.w3.org/2001/XMLSchema-instance'
    }
    
    def __init__(self):
        self.validator = CRSXMLValidator()
        self.version = "2.0"
        self.namespaces = self.NAMESPACES_V2
        self.test_mode = True  # Will be set from options
    
    def _get_doc_type_indic(self, base_type: str) -> str:
        """Get DocTypeIndic value based on test mode.
        
        Args:
            base_type: 'new', 'corrected', 'deleted', or 'resend'
        
        Returns:
            OECD code: OECD1/11 (new), OECD2/12 (corrected), OECD3/13 (deleted), OECD0/10 (resend)
        """
        if self.test_mode:
            return {'new': 'OECD11', 'corrected': 'OECD12', 'deleted': 'OECD13', 'resend': 'OECD10'}[base_type]
        else:
            return {'new': 'OECD1', 'corrected': 'OECD2', 'deleted': 'OECD3', 'resend': 'OECD0'}[base_type]
    
    def _find_element(self, parent: ET.Element, local_name: str, ns_prefix: str = 'crs') -> Optional[ET.Element]:
        """Find element with or without namespace prefix"""
        ns = self.namespaces
        # Try with namespace first
        result = parent.find('{%s}%s' % (ns.get(ns_prefix, ns['crs']), local_name))
        if result is not None:
            return result
        # Try without namespace (default namespace)
        for child in parent:
            if child.tag.endswith(local_name):
                return child
        return None
    
    def _find_all_elements(self, parent: ET.Element, local_name: str, ns_prefix: str = 'crs') -> List[ET.Element]:
        """Find all elements with or without namespace prefix"""
        ns = self.namespaces
        # Try with namespace first
        results = parent.findall('{%s}%s' % (ns.get(ns_prefix, ns['crs']), local_name))
        if results:
            return results
        # Try without namespace (default namespace)
        return [child for child in parent if child.tag.endswith(local_name)]
        
    def generate_correction(self, source_xml_path: str, options: CorrectionOptions) -> CorrectionResult:
        """Generate a correction file from a source CRS XML"""
        result = CorrectionResult(success=False)
        
        # Validate source file first
        validation = self.validator.validate_file(source_xml_path)
        if not validation.is_valid:
            result.error_message = f"Source file validation failed: {'; '.join(validation.errors[:5])}"
            return result
        
        if validation.parsed_data is None:
            result.error_message = "Failed to parse source file data"
            return result
        
        # Check if source is already a correction file
        if validation.message_type_indic == 'CRS702':
            result.error_message = "Source file is already a correction file (CRS702). Please provide a new file (CRS701)."
            return result
        
        # Set version and namespaces
        self.version = validation.xml_version
        self.namespaces = self.NAMESPACES_V2 if self.version == "2.0" else self.NAMESPACES_V1
        self.test_mode = options.test_mode
        
        # Read source file
        try:
            tree = ET.parse(source_xml_path)
            root = tree.getroot()
        except Exception as e:
            result.error_message = f"Failed to parse source file: {str(e)}"
            return result
        
        # Generate correction XML
        try:
            correction_root = self._generate_correction_xml(root, validation.parsed_data, options, result)
        except Exception as e:
            result.error_message = f"Failed to generate correction: {str(e)}"
            return result
        
        # Write output file
        output_path = options.output_path
        if not output_path:
            output_path = source_xml_path.replace('.xml', '_correction.xml')
        
        try:
            self._write_xml(correction_root, output_path)
            result.output_path = output_path
            result.success = True
        except Exception as e:
            result.error_message = f"Failed to write output file: {str(e)}"
            return result
        
        return result
    
    def generate_correction_from_string(self, xml_content: str, options: CorrectionOptions) -> tuple:
        """Generate correction from XML string, returns (success, xml_string_or_error, result)"""
        result = CorrectionResult(success=False)
        
        # Validate source
        validation = self.validator.validate_string(xml_content)
        if not validation.is_valid:
            result.error_message = f"Source validation failed: {'; '.join(validation.errors[:5])}"
            return False, result.error_message, result
        
        if validation.parsed_data is None:
            result.error_message = "Failed to parse source data"
            return False, result.error_message, result
        
        if validation.message_type_indic == 'CRS702':
            result.error_message = "Source is already a correction file (CRS702)"
            return False, result.error_message, result
        
        # Set version
        self.version = validation.xml_version
        self.namespaces = self.NAMESPACES_V2 if self.version == "2.0" else self.NAMESPACES_V1
        
        # Parse and generate
        try:
            root = ET.fromstring(xml_content)
            correction_root = self._generate_correction_xml(root, validation.parsed_data, options, result)
            
            # Convert to string
            xml_string = self._to_string(correction_root)
            result.success = True
            return True, xml_string, result
        except Exception as e:
            result.error_message = str(e)
            return False, str(e), result
    
    def _generate_correction_xml(self, source_root: ET.Element, parsed_data: Dict, 
                                  options: CorrectionOptions, result: CorrectionResult) -> ET.Element:
        """Generate the correction XML structure"""
        # Register namespaces
        for prefix, uri in self.namespaces.items():
            ET.register_namespace(prefix, uri)
        
        # Create new root with same structure
        correction_root = copy.deepcopy(source_root)
        
        # Update MessageSpec
        self._update_message_spec(correction_root, parsed_data, options)
        
        # Process CrsBodies
        crs_bodies = correction_root.findall('.//{%s}CrsBody' % self.namespaces['crs'])
        if not crs_bodies:
            # Try without namespace prefix (default namespace)
            crs_bodies = [child for child in correction_root if child.tag.endswith('CrsBody')]
        
        # Collect all accounts across all CrsBody elements first
        all_individual_accounts = []  # List of (account, acct_data, parent_element, body)
        all_organisation_accounts = []
        
        for i, body in enumerate(crs_bodies):
            body_data = parsed_data['crs_bodies'][i] if i < len(parsed_data['crs_bodies']) else None
            if not body_data:
                continue
                
            # Process ReportingFI if requested
            if options.correct_reporting_fi:
                reporting_fi = self._find_element(body, 'ReportingFI')
                if reporting_fi is not None:
                    self._correct_reporting_fi(reporting_fi, body_data.get('reporting_fi', {}), options)
                    result.fi_corrected = True
            
            # Find accounts in this body
            reporting_group = self._find_element(body, 'ReportingGroup')
            if reporting_group is not None:
                accounts = self._find_all_elements(reporting_group, 'AccountReport')
                parent_element = reporting_group
            else:
                accounts = self._find_all_elements(body, 'AccountReport')
                parent_element = body
            
            account_data_list = body_data.get('accounts', [])
            
            for j, account in enumerate(accounts):
                acct_data = account_data_list[j] if j < len(account_data_list) else {}
                if acct_data.get('holder_type') == 'individual':
                    all_individual_accounts.append((account, acct_data, parent_element))
                else:
                    all_organisation_accounts.append((account, acct_data, parent_element))
        
        # Shuffle for random selection
        random.shuffle(all_individual_accounts)
        random.shuffle(all_organisation_accounts)
        
        # Process individual accounts globally
        accounts_to_remove = []
        for j, (account, acct_data, parent_element) in enumerate(all_individual_accounts):
            if j < options.delete_individual_accounts:
                self._delete_account(account, acct_data)
                result.deletions_made += 1
            elif j < options.delete_individual_accounts + options.correct_individual_accounts:
                self._correct_account(account, acct_data, options)
                result.corrections_made += 1
            else:
                accounts_to_remove.append((account, parent_element))
        
        # Process organisation accounts globally
        for j, (account, acct_data, parent_element) in enumerate(all_organisation_accounts):
            if j < options.delete_organisation_accounts:
                self._delete_account(account, acct_data)
                result.deletions_made += 1
            elif j < options.delete_organisation_accounts + options.correct_organisation_accounts:
                self._correct_account(account, acct_data, options)
                result.corrections_made += 1
            else:
                accounts_to_remove.append((account, parent_element))
        
        # Remove accounts that are not being corrected or deleted
        for account, parent_element in accounts_to_remove:
            parent_element.remove(account)
        
        return correction_root
    
    def _update_message_spec(self, root: ET.Element, parsed_data: Dict, options: CorrectionOptions):
        """Update MessageSpec for correction"""
        msg_spec = self._find_element(root, 'MessageSpec')
        
        if msg_spec is None:
            return
        
        ns = self.namespaces
        
        # Get original MessageRefId before updating
        msg_ref_id = self._find_element(msg_spec, 'MessageRefId')
        original_msg_ref = msg_ref_id.text if msg_ref_id is not None else ''
        
        # Update MessageTypeIndic to CRS702
        msg_type_indic = self._find_element(msg_spec, 'MessageTypeIndic')
        if msg_type_indic is not None:
            msg_type_indic.text = 'CRS702'
        
        # Add CorrMessageRefId (required for CRS702) - must be added after MessageTypeIndic
        # This references the original message being corrected
        corr_msg_ref = self._find_element(msg_spec, 'CorrMessageRefId')
        if corr_msg_ref is None and original_msg_ref:
            # Find MessageTypeIndic to insert after it
            if msg_type_indic is not None:
                # Create CorrMessageRefId element
                corr_msg_ref = ET.Element('{%s}CorrMessageRefId' % ns['crs'])
                corr_msg_ref.text = original_msg_ref
                # Insert after MessageTypeIndic
                parent = msg_spec
                children = list(parent)
                idx = children.index(msg_type_indic) + 1
                parent.insert(idx, corr_msg_ref)
        elif corr_msg_ref is not None:
            corr_msg_ref.text = original_msg_ref
        
        # Update MessageRefId with new value
        if msg_ref_id is not None:
            if options.new_message_ref_id:
                msg_ref_id.text = options.new_message_ref_id
            else:
                # Generate new ref ID based on original
                msg_ref_id.text = self._generate_new_ref_id(original_msg_ref, 'CORR')
        
        # Update Timestamp
        timestamp = self._find_element(msg_spec, 'Timestamp')
        if timestamp is not None:
            timestamp.text = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    
    def _process_crs_body(self, body: ET.Element, body_data: Dict, 
                          options: CorrectionOptions, result: CorrectionResult):
        """Process a CrsBody element for corrections
        
        IMPORTANT: CRS702 messages cannot mix OECD1 (new) with OECD2/OECD3 (corrections/deletions).
        Only accounts being corrected or deleted should be included in the output.
        """
        
        # Process ReportingFI if requested
        if options.correct_reporting_fi:
            reporting_fi = self._find_element(body, 'ReportingFI')
            if reporting_fi is not None:
                self._correct_reporting_fi(reporting_fi, body_data.get('reporting_fi', {}), options)
                result.fi_corrected = True
        
        # Process AccountReports
        reporting_group = self._find_element(body, 'ReportingGroup')
        
        # Handle files with and without ReportingGroup wrapper
        if reporting_group is not None:
            accounts = self._find_all_elements(reporting_group, 'AccountReport')
            parent_element = reporting_group
        else:
            # Try to find AccountReports directly under CrsBody
            accounts = self._find_all_elements(body, 'AccountReport')
            parent_element = body
        
        if not accounts:
            return
        
        account_data_list = body_data.get('accounts', [])
        
        # Separate individual and organisation accounts
        individual_accounts = []
        organisation_accounts = []
        
        for i, account in enumerate(accounts):
            acct_data = account_data_list[i] if i < len(account_data_list) else {}
            if acct_data.get('holder_type') == 'individual':
                individual_accounts.append((account, acct_data))
            else:
                organisation_accounts.append((account, acct_data))
        
        # Randomly select accounts to correct/delete
        random.shuffle(individual_accounts)
        random.shuffle(organisation_accounts)
        
        # Track accounts to remove (those not being corrected or deleted)
        accounts_to_remove = []
        
        # Process individual account corrections
        for j, (account, acct_data) in enumerate(individual_accounts):
            if j < options.delete_individual_accounts:
                self._delete_account(account, acct_data)
                result.deletions_made += 1
            elif j < options.delete_individual_accounts + options.correct_individual_accounts:
                self._correct_account(account, acct_data, options)
                result.corrections_made += 1
            else:
                # CRS702 cannot mix OECD1 with OECD2/OECD3 - remove uncorrected accounts
                accounts_to_remove.append(account)
        
        # Process organisation account corrections
        for j, (account, acct_data) in enumerate(organisation_accounts):
            if j < options.delete_organisation_accounts:
                self._delete_account(account, acct_data)
                result.deletions_made += 1
            elif j < options.delete_organisation_accounts + options.correct_organisation_accounts:
                self._correct_account(account, acct_data, options)
                result.corrections_made += 1
            else:
                # CRS702 cannot mix OECD1 with OECD2/OECD3 - remove uncorrected accounts
                accounts_to_remove.append(account)
        
        # Remove accounts that are not being corrected or deleted
        for account in accounts_to_remove:
            parent_element.remove(account)
    
    def _correct_reporting_fi(self, reporting_fi: ET.Element, fi_data: Dict, options: CorrectionOptions):
        """Apply corrections to ReportingFI"""
        ns = self.namespaces
        
        # Update DocSpec
        doc_spec = reporting_fi.find('{%s}DocSpec' % ns['crs'])
        if doc_spec is not None:
            original_doc_ref = fi_data.get('doc_ref_id', '')
            
            # Set DocTypeIndic to corrected (OECD2 or OECD12 for test)
            doc_type = doc_spec.find('{%s}DocTypeIndic' % ns['stf'])
            if doc_type is not None:
                doc_type.text = self._get_doc_type_indic('corrected')
            
            # Update DocRefId
            doc_ref = doc_spec.find('{%s}DocRefId' % ns['stf'])
            if doc_ref is not None:
                doc_ref.text = self._generate_new_ref_id(original_doc_ref, 'RFICORR')
            
            # Add CorrDocRefId
            corr_ref = doc_spec.find('{%s}CorrDocRefId' % ns['stf'])
            if corr_ref is None:
                corr_ref = ET.SubElement(doc_spec, '{%s}CorrDocRefId' % ns['stf'])
            corr_ref.text = original_doc_ref
        
        # Modify Name slightly
        if options.modify_name:
            name_el = reporting_fi.find('{%s}Name' % ns['crs'])
            if name_el is not None and name_el.text:
                name_el.text = name_el.text + ' (Corrected)'
        
        # Modify Address
        if options.modify_address:
            address = reporting_fi.find('{%s}Address' % ns['crs'])
            if address is not None:
                address_free = address.find('{%s}AddressFree' % ns['cfc'])
                if address_free is not None and address_free.text:
                    address_free.text = address_free.text + ' - Updated'
    
    def _correct_account(self, account: ET.Element, acct_data: Dict, options: CorrectionOptions):
        """Apply corrections to an AccountReport"""
        ns = self.namespaces
        
        # Update DocSpec
        doc_spec = account.find('{%s}DocSpec' % ns['crs'])
        if doc_spec is not None:
            original_doc_ref = acct_data.get('doc_ref_id', '')
            
            # Set DocTypeIndic to corrected (OECD2 or OECD12 for test)
            doc_type = doc_spec.find('{%s}DocTypeIndic' % ns['stf'])
            if doc_type is not None:
                doc_type.text = self._get_doc_type_indic('corrected')
            
            # Update DocRefId
            doc_ref = doc_spec.find('{%s}DocRefId' % ns['stf'])
            if doc_ref is not None:
                doc_ref.text = self._generate_new_ref_id(original_doc_ref, 'ARCORR')
            
            # Add CorrDocRefId
            corr_ref = doc_spec.find('{%s}CorrDocRefId' % ns['stf'])
            if corr_ref is None:
                corr_ref = ET.SubElement(doc_spec, '{%s}CorrDocRefId' % ns['stf'])
            corr_ref.text = original_doc_ref
        
        # Modify AccountBalance
        if options.modify_balance:
            balance = account.find('{%s}AccountBalance' % ns['crs'])
            if balance is not None:
                try:
                    original_balance = float(balance.text or '0')
                    # Randomly adjust balance by -20% to +30%
                    adjustment = random.uniform(-0.2, 0.3)
                    new_balance = original_balance * (1 + adjustment)
                    balance.text = f"{new_balance:.2f}"
                except ValueError:
                    pass
        
        # Modify Address
        if options.modify_address:
            acct_holder = account.find('{%s}AccountHolder' % ns['crs'])
            if acct_holder is not None:
                # Try Individual first
                individual = acct_holder.find('{%s}Individual' % ns['crs'])
                if individual is not None:
                    self._modify_person_address(individual, ns)
                else:
                    # Try Organisation
                    org = acct_holder.find('{%s}Organisation' % ns['crs'])
                    if org is not None:
                        self._modify_org_address(org, ns)
        
        # Modify Name
        if options.modify_name:
            acct_holder = account.find('{%s}AccountHolder' % ns['crs'])
            if acct_holder is not None:
                individual = acct_holder.find('{%s}Individual' % ns['crs'])
                if individual is not None:
                    name = individual.find('{%s}Name' % ns['crs'])
                    if name is not None:
                        first_name = name.find('{%s}FirstName' % ns['crs'])
                        if first_name is not None and first_name.text:
                            first_name.text = first_name.text + '-Corrected'
    
    def _delete_account(self, account: ET.Element, acct_data: Dict):
        """Mark an AccountReport for deletion"""
        ns = self.namespaces
        
        # Update DocSpec for deletion
        doc_spec = account.find('{%s}DocSpec' % ns['crs'])
        if doc_spec is not None:
            original_doc_ref = acct_data.get('doc_ref_id', '')
            
            # Set DocTypeIndic to deleted (OECD3 or OECD13 for test)
            doc_type = doc_spec.find('{%s}DocTypeIndic' % ns['stf'])
            if doc_type is not None:
                doc_type.text = self._get_doc_type_indic('deleted')
            
            # Update DocRefId
            doc_ref = doc_spec.find('{%s}DocRefId' % ns['stf'])
            if doc_ref is not None:
                doc_ref.text = self._generate_new_ref_id(original_doc_ref, 'ARDEL')
            
            # Add CorrDocRefId
            corr_ref = doc_spec.find('{%s}CorrDocRefId' % ns['stf'])
            if corr_ref is None:
                corr_ref = ET.SubElement(doc_spec, '{%s}CorrDocRefId' % ns['stf'])
            corr_ref.text = original_doc_ref
    
    def _update_doc_spec_for_resend(self, account: ET.Element, acct_data: Dict):
        """Update DocSpec for accounts that are being resent without changes"""
        ns = self.namespaces
        
        doc_spec = account.find('{%s}DocSpec' % ns['crs'])
        if doc_spec is not None:
            original_doc_ref = acct_data.get('doc_ref_id', '')
            
            # Set DocTypeIndic to new (OECD1 or OECD11 for test)
            doc_type = doc_spec.find('{%s}DocTypeIndic' % ns['stf'])
            if doc_type is not None:
                doc_type.text = self._get_doc_type_indic('new')
            
            # Update DocRefId to be unique
            doc_ref = doc_spec.find('{%s}DocRefId' % ns['stf'])
            if doc_ref is not None:
                doc_ref.text = self._generate_new_ref_id(original_doc_ref, 'ARRESEND')
    
    def _modify_person_address(self, person: ET.Element, ns: Dict):
        """Modify address for a person (Individual)"""
        address = person.find('{%s}Address' % ns['crs'])
        if address is not None:
            address_free = address.find('{%s}AddressFree' % ns['cfc'])
            if address_free is not None and address_free.text:
                # Add a correction note
                address_free.text = f"Corrected: {address_free.text}"
            else:
                # Try AddressFix
                address_fix = address.find('{%s}AddressFix' % ns['cfc'])
                if address_fix is not None:
                    street = address_fix.find('{%s}Street' % ns['cfc'])
                    if street is not None and street.text:
                        street.text = f"Corrected: {street.text}"
    
    def _modify_org_address(self, org: ET.Element, ns: Dict):
        """Modify address for an organisation"""
        address = org.find('{%s}Address' % ns['crs'])
        if address is not None:
            address_free = address.find('{%s}AddressFree' % ns['cfc'])
            if address_free is not None and address_free.text:
                address_free.text = f"Corrected: {address_free.text}"
    
    def _generate_new_ref_id(self, original: str, suffix: str) -> str:
        """Generate a new unique reference ID based on original"""
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        # Keep some of the original for traceability, but ensure uniqueness
        if original:
            # Take first 50 chars of original if longer
            base = original[:50] if len(original) > 50 else original
            return f"{base}_{suffix}_{timestamp}_{random_part}"
        else:
            return f"{suffix}_{timestamp}_{random_part}"
    
    def _write_xml(self, root: ET.Element, output_path: str):
        """Write XML to file with proper formatting"""
        # Create tree
        tree = ET.ElementTree(root)
        
        # Write with declaration
        with open(output_path, 'wb') as f:
            tree.write(f, encoding='UTF-8', xml_declaration=True)
        
        # Read back and format
        with open(output_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Add newlines for readability (basic formatting)
        content = content.replace('><', '>\n<')
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def _to_string(self, root: ET.Element) -> str:
        """Convert element to string"""
        return ET.tostring(root, encoding='unicode')


def generate_correction(source_path: str, options: CorrectionOptions) -> CorrectionResult:
    """Convenience function to generate a correction file"""
    generator = CRSCorrectionGenerator()
    return generator.generate_correction(source_path, options)


def get_source_file_info(file_path: str) -> Dict:
    """Get information about a source file for UI display"""
    validator = CRSXMLValidator()
    result = validator.validate_file(file_path)
    
    return {
        'is_valid': result.is_valid,
        'errors': result.errors,
        'warnings': result.warnings,
        'version': result.xml_version,
        'message_type_indic': result.message_type_indic,
        'message_ref_id': result.message_ref_id,
        'transmitting_country': result.transmitting_country,
        'receiving_country': result.receiving_country,
        'reporting_period': result.reporting_period,
        'reporting_fi_count': result.reporting_fi_count,
        'total_accounts': result.account_count,
        'individual_accounts': result.individual_accounts,
        'organisation_accounts': result.organisation_accounts,
        'is_correction_file': result.message_type_indic == 'CRS702',
        'can_generate_correction': result.is_valid and result.message_type_indic == 'CRS701'
    }
