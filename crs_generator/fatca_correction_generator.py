"""
FATCA Correction/Deletion Generator

Generates FATCA correction (FATCA2/FATCA12) and void (FATCA3/FATCA13) files
from existing FATCA XML files.
"""

from pathlib import Path
from copy import deepcopy
from lxml import etree
from dataclasses import dataclass, field
from typing import Optional, List
import random
from datetime import datetime
from faker import Faker


@dataclass
class FATCACorrectionOptions:
    """Options for FATCA correction generation."""
    correct_reporting_fi: bool = False
    correct_individual_accounts: int = 0
    correct_organisation_accounts: int = 0
    delete_individual_accounts: int = 0
    delete_organisation_accounts: int = 0
    modify_balance: bool = True
    modify_address: bool = True
    modify_name: bool = False
    test_mode: bool = True  # Use FATCA11-14 vs FATCA1-4
    output_path: Optional[str] = None


@dataclass
class FATCACorrectionResult:
    """Result of correction generation."""
    success: bool = False
    output_path: str = ""
    error_message: str = ""
    corrections_made: int = 0
    deletions_made: int = 0
    fi_corrected: bool = False


class FATCACorrectionGenerator:
    """Generates FATCA correction and void files."""
    
    # FATCA namespaces
    NAMESPACES = {
        'ftc': 'urn:oecd:ties:fatca:v2',
        'sfa': 'urn:oecd:ties:stffatcatypes:v2',
        'iso': 'urn:oecd:ties:isofatcatypes:v1',
    }
    
    def __init__(self, seed: int = None):
        self.seed = seed or random.randint(1, 999999)
        self.rng = random.Random(self.seed)
        Faker.seed(self.seed)
        self.faker = Faker('en_US')
        self.ns = self.NAMESPACES
        self.docref_counter = 0
    
    def generate_correction(self, source_path: str, options: FATCACorrectionOptions) -> FATCACorrectionResult:
        """Generate a correction file from source FATCA XML."""
        result = FATCACorrectionResult()
        
        try:
            # Load source file
            source = Path(source_path)
            if not source.exists():
                result.error_message = f"Source file not found: {source_path}"
                return result
            
            parser = etree.XMLParser(remove_blank_text=True)
            tree = etree.parse(str(source), parser)
            root = tree.getroot()
            
            # Build namespace map
            ns = dict(root.nsmap or {})
            if None in ns:
                ns['ftc'] = ns[None]
                ns.pop(None, None)
            self.ns = {**self.NAMESPACES, **ns}
            
            # Get original MessageRefId for CorrMessageRefId
            orig_msg_ref = self._get_message_ref_id(root)
            
            # Update MessageSpec for correction
            self._update_message_spec_for_correction(root, orig_msg_ref)
            
            # Process FATCA body
            result = self._process_fatca_body(root, options, orig_msg_ref, result)
            
            # Determine output path
            if options.output_path:
                output_path = Path(options.output_path)
            else:
                output_path = source.parent / f"{source.stem}_correction.xml"
            
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write output
            tree.write(
                str(output_path),
                pretty_print=True,
                xml_declaration=True,
                encoding='UTF-8'
            )
            
            result.success = True
            result.output_path = str(output_path)
            
        except Exception as e:
            result.error_message = str(e)
        
        return result
    
    def _get_message_ref_id(self, root: etree._Element) -> str:
        """Get MessageRefId from source file."""
        msg_ref = root.find('.//sfa:MessageRefId', namespaces=self.ns)
        if msg_ref is not None and msg_ref.text:
            return msg_ref.text
        return ""
    
    def _update_message_spec_for_correction(self, root: etree._Element, orig_msg_ref: str):
        """Update MessageSpec for correction file."""
        msg_spec = root.find('.//ftc:MessageSpec', namespaces=self.ns)
        if msg_spec is None:
            return
        
        # Update MessageRefId to new unique value
        msg_ref = msg_spec.find('sfa:MessageRefId', namespaces=self.ns)
        if msg_ref is not None:
            # Generate new MessageRefId
            trans_country = msg_spec.find('sfa:TransmittingCountry', namespaces=self.ns)
            recv_country = msg_spec.find('sfa:ReceivingCountry', namespaces=self.ns)
            tc = trans_country.text if trans_country is not None else "XX"
            rc = recv_country.text if recv_country is not None else "US"
            msg_ref.text = f"{tc}{datetime.now().year}{rc}CORR{self.rng.randint(100000, 999999)}"
        
        # Add CorrMessageRefId if not present
        corr_msg_ref = msg_spec.find('sfa:CorrMessageRefId', namespaces=self.ns)
        if corr_msg_ref is None and orig_msg_ref:
            # Find position after MessageRefId
            msg_ref_elem = msg_spec.find('sfa:MessageRefId', namespaces=self.ns)
            if msg_ref_elem is not None:
                corr_msg_ref = etree.Element(f"{{{self.ns['sfa']}}}CorrMessageRefId")
                corr_msg_ref.text = orig_msg_ref
                msg_ref_elem.addnext(corr_msg_ref)
        elif corr_msg_ref is not None:
            corr_msg_ref.text = orig_msg_ref
        
        # Update Timestamp
        timestamp = msg_spec.find('sfa:Timestamp', namespaces=self.ns)
        if timestamp is not None:
            timestamp.text = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    
    def _process_fatca_body(self, root: etree._Element, options: FATCACorrectionOptions, 
                            orig_msg_ref: str, result: FATCACorrectionResult) -> FATCACorrectionResult:
        """Process FATCA body for corrections/deletions."""
        fatca_bodies = root.findall('.//ftc:FATCA', namespaces=self.ns)
        
        for fatca in fatca_bodies:
            # Handle ReportingFI correction
            if options.correct_reporting_fi:
                reporting_fi = fatca.find('ftc:ReportingFI', namespaces=self.ns)
                if reporting_fi is not None:
                    self._correct_reporting_fi(reporting_fi, orig_msg_ref, options)
                    result.fi_corrected = True
            
            # Process ReportingGroup
            reporting_group = fatca.find('ftc:ReportingGroup', namespaces=self.ns)
            if reporting_group is not None:
                result = self._process_reporting_group(
                    reporting_group, options, orig_msg_ref, result
                )
        
        return result
    
    def _correct_reporting_fi(self, reporting_fi: etree._Element, orig_msg_ref: str, 
                               options: FATCACorrectionOptions):
        """Apply corrections to ReportingFI."""
        # Update DocSpec
        doc_spec = reporting_fi.find('ftc:DocSpec', namespaces=self.ns)
        if doc_spec is not None:
            self._update_doc_spec_for_correction(doc_spec, orig_msg_ref, options)
        
        # Modify address if enabled
        if options.modify_address:
            address = reporting_fi.find('.//sfa:Address', namespaces=self.ns)
            if address is not None:
                self._modify_address(address)
    
    def _process_reporting_group(self, reporting_group: etree._Element, options: FATCACorrectionOptions,
                                  orig_msg_ref: str, result: FATCACorrectionResult) -> FATCACorrectionResult:
        """Process accounts in ReportingGroup."""
        accounts = reporting_group.findall('ftc:AccountReport', namespaces=self.ns)
        
        # Separate individual and organisation accounts
        individual_accounts = []
        organisation_accounts = []
        
        for account in accounts:
            account_holder = account.find('ftc:AccountHolder', namespaces=self.ns)
            if account_holder is not None:
                if account_holder.find('ftc:Individual', namespaces=self.ns) is not None:
                    individual_accounts.append(account)
                elif account_holder.find('ftc:Organisation', namespaces=self.ns) is not None:
                    organisation_accounts.append(account)
        
        # Track which accounts to keep (only corrected/deleted ones for correction file)
        accounts_to_keep = []
        
        # Select accounts for correction
        num_correct_ind = min(options.correct_individual_accounts, len(individual_accounts))
        num_correct_org = min(options.correct_organisation_accounts, len(organisation_accounts))
        num_delete_ind = min(options.delete_individual_accounts, 
                            len(individual_accounts) - num_correct_ind)
        num_delete_org = min(options.delete_organisation_accounts,
                            len(organisation_accounts) - num_correct_org)
        
        # Shuffle for random selection
        self.rng.shuffle(individual_accounts)
        self.rng.shuffle(organisation_accounts)
        
        # Process individual accounts
        for i, account in enumerate(individual_accounts):
            if i < num_correct_ind:
                self._correct_account(account, orig_msg_ref, options)
                accounts_to_keep.append(account)
                result.corrections_made += 1
            elif i < num_correct_ind + num_delete_ind:
                self._void_account(account, orig_msg_ref, options)
                accounts_to_keep.append(account)
                result.deletions_made += 1
        
        # Process organisation accounts
        for i, account in enumerate(organisation_accounts):
            if i < num_correct_org:
                self._correct_account(account, orig_msg_ref, options)
                accounts_to_keep.append(account)
                result.corrections_made += 1
            elif i < num_correct_org + num_delete_org:
                self._void_account(account, orig_msg_ref, options)
                accounts_to_keep.append(account)
                result.deletions_made += 1
        
        # Remove accounts that aren't being corrected/deleted
        for account in accounts:
            if account not in accounts_to_keep:
                reporting_group.remove(account)
        
        return result
    
    def _correct_account(self, account: etree._Element, orig_msg_ref: str, 
                         options: FATCACorrectionOptions):
        """Apply corrections to an account."""
        # Update DocSpec for correction
        doc_spec = account.find('ftc:DocSpec', namespaces=self.ns)
        if doc_spec is not None:
            self._update_doc_spec_for_correction(doc_spec, orig_msg_ref, options)
        
        # Modify balance if enabled
        if options.modify_balance:
            balance = account.find('ftc:AccountBalance', namespaces=self.ns)
            if balance is not None:
                self._modify_balance(balance)
        
        # Modify account holder
        account_holder = account.find('ftc:AccountHolder', namespaces=self.ns)
        if account_holder is not None:
            individual = account_holder.find('ftc:Individual', namespaces=self.ns)
            organisation = account_holder.find('ftc:Organisation', namespaces=self.ns)
            
            if individual is not None:
                if options.modify_address:
                    address = individual.find('sfa:Address', namespaces=self.ns)
                    if address is not None:
                        self._modify_address(address)
                if options.modify_name:
                    self._modify_individual_name(individual)
            
            if organisation is not None:
                if options.modify_address:
                    address = organisation.find('sfa:Address', namespaces=self.ns)
                    if address is not None:
                        self._modify_address(address)
                if options.modify_name:
                    self._modify_organisation_name(organisation)
    
    def _void_account(self, account: etree._Element, orig_msg_ref: str,
                      options: FATCACorrectionOptions):
        """Mark account as void (deleted)."""
        doc_spec = account.find('ftc:DocSpec', namespaces=self.ns)
        if doc_spec is not None:
            self._update_doc_spec_for_void(doc_spec, orig_msg_ref, options)
    
    def _update_doc_spec_for_correction(self, doc_spec: etree._Element, orig_msg_ref: str,
                                         options: FATCACorrectionOptions):
        """Update DocSpec for correction."""
        # Get original DocRefId
        doc_ref = doc_spec.find('ftc:DocRefId', namespaces=self.ns)
        orig_doc_ref = doc_ref.text if doc_ref is not None else ""
        
        # Update DocTypeIndic
        doc_type = doc_spec.find('ftc:DocTypeIndic', namespaces=self.ns)
        if doc_type is not None:
            doc_type.text = 'FATCA12' if options.test_mode else 'FATCA2'
        
        # Generate new DocRefId
        if doc_ref is not None:
            self.docref_counter += 1
            doc_ref.text = f"{orig_doc_ref}_CORR{self.docref_counter:04d}"
        
        # Add CorrMessageRefId
        corr_msg_ref = doc_spec.find('ftc:CorrMessageRefId', namespaces=self.ns)
        if corr_msg_ref is None and orig_msg_ref:
            corr_msg_ref = etree.Element(f"{{{self.ns['ftc']}}}CorrMessageRefId")
            corr_msg_ref.text = orig_msg_ref
            doc_type_elem = doc_spec.find('ftc:DocTypeIndic', namespaces=self.ns)
            if doc_type_elem is not None:
                doc_type_elem.addnext(etree.Element(f"{{{self.ns['ftc']}}}DocRefId"))
                # Actually insert after DocRefId
                doc_ref_elem = doc_spec.find('ftc:DocRefId', namespaces=self.ns)
                if doc_ref_elem is not None:
                    doc_ref_elem.addnext(corr_msg_ref)
        elif corr_msg_ref is not None:
            corr_msg_ref.text = orig_msg_ref
        
        # Add CorrDocRefId
        corr_doc_ref = doc_spec.find('ftc:CorrDocRefId', namespaces=self.ns)
        if corr_doc_ref is None and orig_doc_ref:
            corr_doc_ref = etree.Element(f"{{{self.ns['ftc']}}}CorrDocRefId")
            corr_doc_ref.text = orig_doc_ref
            # Insert after CorrMessageRefId or DocRefId
            insert_after = doc_spec.find('ftc:CorrMessageRefId', namespaces=self.ns)
            if insert_after is None:
                insert_after = doc_spec.find('ftc:DocRefId', namespaces=self.ns)
            if insert_after is not None:
                insert_after.addnext(corr_doc_ref)
        elif corr_doc_ref is not None:
            corr_doc_ref.text = orig_doc_ref
    
    def _update_doc_spec_for_void(self, doc_spec: etree._Element, orig_msg_ref: str,
                                   options: FATCACorrectionOptions):
        """Update DocSpec for void (deletion)."""
        # Get original DocRefId
        doc_ref = doc_spec.find('ftc:DocRefId', namespaces=self.ns)
        orig_doc_ref = doc_ref.text if doc_ref is not None else ""
        
        # Update DocTypeIndic to void
        doc_type = doc_spec.find('ftc:DocTypeIndic', namespaces=self.ns)
        if doc_type is not None:
            doc_type.text = 'FATCA13' if options.test_mode else 'FATCA3'
        
        # Generate new DocRefId
        if doc_ref is not None:
            self.docref_counter += 1
            doc_ref.text = f"{orig_doc_ref}_VOID{self.docref_counter:04d}"
        
        # Add CorrMessageRefId
        corr_msg_ref = doc_spec.find('ftc:CorrMessageRefId', namespaces=self.ns)
        if corr_msg_ref is None and orig_msg_ref:
            corr_msg_ref = etree.Element(f"{{{self.ns['ftc']}}}CorrMessageRefId")
            corr_msg_ref.text = orig_msg_ref
            doc_ref_elem = doc_spec.find('ftc:DocRefId', namespaces=self.ns)
            if doc_ref_elem is not None:
                doc_ref_elem.addnext(corr_msg_ref)
        elif corr_msg_ref is not None:
            corr_msg_ref.text = orig_msg_ref
        
        # Add CorrDocRefId
        corr_doc_ref = doc_spec.find('ftc:CorrDocRefId', namespaces=self.ns)
        if corr_doc_ref is None and orig_doc_ref:
            corr_doc_ref = etree.Element(f"{{{self.ns['ftc']}}}CorrDocRefId")
            corr_doc_ref.text = orig_doc_ref
            insert_after = doc_spec.find('ftc:CorrMessageRefId', namespaces=self.ns)
            if insert_after is None:
                insert_after = doc_spec.find('ftc:DocRefId', namespaces=self.ns)
            if insert_after is not None:
                insert_after.addnext(corr_doc_ref)
        elif corr_doc_ref is not None:
            corr_doc_ref.text = orig_doc_ref
    
    def _modify_balance(self, balance: etree._Element):
        """Modify account balance."""
        if balance.text:
            try:
                current = float(balance.text)
                # Modify by +/- 10-50%
                factor = self.rng.uniform(0.5, 1.5)
                new_balance = round(current * factor, 2)
                balance.text = f"{new_balance:.2f}"
            except ValueError:
                pass
    
    def _modify_address(self, address: etree._Element):
        """Modify address."""
        addr_free = address.find('sfa:AddressFree', namespaces=self.ns)
        if addr_free is not None:
            addr_free.text = f"{self.faker.street_address()}, {self.faker.city()}"
        
        addr_fix = address.find('sfa:AddressFix', namespaces=self.ns)
        if addr_fix is not None:
            street = addr_fix.find('sfa:Street', namespaces=self.ns)
            if street is not None:
                street.text = self.faker.street_name()
            
            building = addr_fix.find('sfa:BuildingIdentifier', namespaces=self.ns)
            if building is not None:
                building.text = str(self.rng.randint(1, 999))
            
            city = addr_fix.find('sfa:City', namespaces=self.ns)
            if city is not None:
                city.text = self.faker.city()
    
    def _modify_individual_name(self, individual: etree._Element):
        """Modify individual name."""
        name = individual.find('sfa:Name', namespaces=self.ns)
        if name is not None:
            first_name = name.find('sfa:FirstName', namespaces=self.ns)
            if first_name is not None:
                first_name.text = self.faker.first_name()
            
            last_name = name.find('sfa:LastName', namespaces=self.ns)
            if last_name is not None:
                last_name.text = self.faker.last_name()
    
    def _modify_organisation_name(self, organisation: etree._Element):
        """Modify organisation name."""
        name = organisation.find('sfa:Name', namespaces=self.ns)
        if name is not None:
            name.text = self.faker.company()
