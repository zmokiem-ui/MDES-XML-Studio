"""
FATCA-CRS Correction/Deletion Generator

Generates FATCA-CRS correction (OECD2/OECD12) and void (OECD3/OECD13) files
from existing FATCA-CRS combined XML files.

Uses the FATCA-CRS combined format (urn:fatcacrs:ties:v2) with:
- MessageHeader (not MessageSpec)
- MessageBody (not FATCA body)
- OECD DocTypeIndic codes (not FATCA codes)
- CRS702 MessageTypeIndic for corrections
"""

from pathlib import Path
from copy import deepcopy
from lxml import etree
from dataclasses import dataclass, field
from typing import Optional, List
import random
from datetime import datetime, timezone
from faker import Faker


@dataclass
class FATCACorrectionOptions:
    """Options for FATCA-CRS correction generation."""
    correct_reporting_fi: bool = False
    correct_individual_accounts: int = 0
    correct_organisation_accounts: int = 0
    delete_individual_accounts: int = 0
    delete_organisation_accounts: int = 0
    modify_balance: bool = True
    modify_address: bool = True
    modify_name: bool = False
    test_mode: bool = True  # Use OECD11-13 vs OECD1-3
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
    """Generates FATCA-CRS correction and void files."""
    
    # FATCA-CRS combined namespaces
    NAMESPACES = {
        'oecd_ftc': 'urn:fatcacrs:ties:v2',
        'sfa_ftc': 'urn:oecd:ties:fatcacrstypes:v2',
        'sfa': 'urn:oecd:ties:stffatcatypes:v2',
    }
    
    def __init__(self, seed: int = None):
        self.seed = seed or random.randint(1, 999999)
        self.rng = random.Random(self.seed)
        Faker.seed(self.seed)
        self.faker = Faker('en_US')
        self.ns = self.NAMESPACES
        self.docref_counter = 0
    
    def generate_correction(self, source_path: str, options: FATCACorrectionOptions) -> FATCACorrectionResult:
        """Generate a correction file from source FATCA-CRS XML."""
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
            
            # Build namespace map from document
            ns = dict(root.nsmap or {})
            if None in ns:
                ns.pop(None, None)
            self.ns = {**self.NAMESPACES, **ns}
            
            # Get original MessageRefId for CorrMessageRefId
            orig_msg_ref = self._get_message_ref_id(root)
            
            # Update MessageHeader for correction
            self._update_message_header_for_correction(root, orig_msg_ref)
            
            # Process MessageBody
            result = self._process_message_body(root, options, orig_msg_ref, result)
            
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
        msg_ref = root.find('.//sfa_ftc:MessageRefId', namespaces=self.ns)
        if msg_ref is not None and msg_ref.text:
            return msg_ref.text
        return ""
    
    def _update_message_header_for_correction(self, root: etree._Element, orig_msg_ref: str):
        """Update MessageHeader for correction file."""
        msg_header = root.find('.//oecd_ftc:MessageHeader', namespaces=self.ns)
        if msg_header is None:
            return
        
        # Update MessageRefId to a new unique value. MDES rule 80017 requires it
        # to start with TransmittingCountry + TaxYear + SendingCompanyIN (not the
        # receiving country / current year, as before).
        msg_ref = msg_header.find('sfa_ftc:MessageRefId', namespaces=self.ns)
        if msg_ref is not None:
            trans_country = msg_header.find('sfa_ftc:TransmittingCountry', namespaces=self.ns)
            sending_in = msg_header.find('sfa_ftc:SendingCompanyIN', namespaces=self.ns)
            reporting_period = msg_header.find('sfa_ftc:ReportingPeriod', namespaces=self.ns)
            tc = trans_country.text if trans_country is not None else "XX"
            sin = sending_in.text if sending_in is not None else ""
            tax_year = (reporting_period.text[:4]
                        if reporting_period is not None and reporting_period.text
                        else str(datetime.now().year))
            msg_ref.text = f"{tc}{tax_year}{sin}CORR{self.rng.randint(100000, 999999)}"
        
        # Update MessageTypeIndic to CRS702 (correction)
        msg_type_indic = msg_header.find('sfa_ftc:MessageTypeIndic', namespaces=self.ns)
        if msg_type_indic is not None:
            msg_type_indic.text = 'CRS702'
        
        # Add CorrMessageRefId if not present. Per FatcaCrsTypes_v2.2 the header
        # order is MessageRefId -> MessageTypeIndic -> CorrMessageRefId, so the
        # element must be inserted directly after MessageTypeIndic; inserting it
        # after MessageRefId (as before) produced schema-invalid output.
        corr_msg_ref = msg_header.find('sfa_ftc:CorrMessageRefId', namespaces=self.ns)
        if corr_msg_ref is None and orig_msg_ref:
            anchor = msg_type_indic if msg_type_indic is not None else \
                msg_header.find('sfa_ftc:MessageRefId', namespaces=self.ns)
            if anchor is not None:
                corr_msg_ref = etree.Element(f"{{{self.ns['sfa_ftc']}}}CorrMessageRefId")
                corr_msg_ref.text = orig_msg_ref
                anchor.addnext(corr_msg_ref)
        elif corr_msg_ref is not None:
            corr_msg_ref.text = orig_msg_ref
        
        # Update Timestamp
        timestamp = msg_header.find('sfa_ftc:Timestamp', namespaces=self.ns)
        if timestamp is not None:
            timestamp.text = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    def _process_message_body(self, root: etree._Element, options: FATCACorrectionOptions, 
                              orig_msg_ref: str, result: FATCACorrectionResult) -> FATCACorrectionResult:
        """Process MessageBody for corrections/deletions."""
        msg_bodies = root.findall('.//oecd_ftc:MessageBody', namespaces=self.ns)
        
        for body in msg_bodies:
            # Handle ReportingFI correction
            if options.correct_reporting_fi:
                reporting_fi = body.find('sfa_ftc:ReportingFI', namespaces=self.ns)
                if reporting_fi is not None:
                    self._correct_reporting_fi(reporting_fi, orig_msg_ref, options)
                    result.fi_corrected = True
            
            # Process ReportingGroup
            reporting_group = body.find('sfa_ftc:ReportingGroup', namespaces=self.ns)
            if reporting_group is not None:
                result = self._process_reporting_group(
                    reporting_group, options, orig_msg_ref, result
                )
        
        return result
    
    def _correct_reporting_fi(self, reporting_fi: etree._Element, orig_msg_ref: str, 
                               options: FATCACorrectionOptions):
        """Apply corrections to ReportingFI."""
        # Update DocSpec
        doc_spec = reporting_fi.find('sfa_ftc:DocSpec', namespaces=self.ns)
        if doc_spec is not None:
            self._update_doc_spec_for_correction(doc_spec, orig_msg_ref, options)
        
        # Modify address if enabled
        if options.modify_address:
            address = reporting_fi.find('.//sfa_ftc:Address', namespaces=self.ns)
            if address is not None:
                self._modify_address(address)
    
    def _process_reporting_group(self, reporting_group: etree._Element, options: FATCACorrectionOptions,
                                  orig_msg_ref: str, result: FATCACorrectionResult) -> FATCACorrectionResult:
        """Process accounts in ReportingGroup."""
        accounts = reporting_group.findall('sfa_ftc:AccountReport', namespaces=self.ns)
        
        # Separate individual and organisation accounts
        individual_accounts = []
        organisation_accounts = []
        
        for account in accounts:
            account_holder = account.find('sfa_ftc:AccountHolder', namespaces=self.ns)
            if account_holder is not None:
                if account_holder.find('sfa_ftc:Individual', namespaces=self.ns) is not None:
                    individual_accounts.append(account)
                elif account_holder.find('sfa_ftc:Organisation', namespaces=self.ns) is not None:
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
        doc_spec = account.find('sfa_ftc:DocSpec', namespaces=self.ns)
        if doc_spec is not None:
            self._update_doc_spec_for_correction(doc_spec, orig_msg_ref, options)
        
        # Modify balance if enabled
        if options.modify_balance:
            balance = account.find('sfa_ftc:AccountBalance', namespaces=self.ns)
            if balance is not None:
                self._modify_balance(balance)
        
        # Modify account holder
        account_holder = account.find('sfa_ftc:AccountHolder', namespaces=self.ns)
        if account_holder is not None:
            individual = account_holder.find('sfa_ftc:Individual', namespaces=self.ns)
            organisation = account_holder.find('sfa_ftc:Organisation', namespaces=self.ns)
            
            if individual is not None:
                if options.modify_address:
                    address = individual.find('sfa_ftc:Address', namespaces=self.ns)
                    if address is not None:
                        self._modify_address(address)
                if options.modify_name:
                    self._modify_individual_name(individual)
            
            if organisation is not None:
                if options.modify_address:
                    address = organisation.find('sfa_ftc:Address', namespaces=self.ns)
                    if address is not None:
                        self._modify_address(address)
                if options.modify_name:
                    self._modify_organisation_name(organisation)
    
    def _void_account(self, account: etree._Element, orig_msg_ref: str,
                      options: FATCACorrectionOptions):
        """Mark account as void (deleted)."""
        doc_spec = account.find('sfa_ftc:DocSpec', namespaces=self.ns)
        if doc_spec is not None:
            self._update_doc_spec_for_void(doc_spec, orig_msg_ref, options)
    
    def _update_doc_spec_for_correction(self, doc_spec: etree._Element, orig_msg_ref: str,
                                         options: FATCACorrectionOptions):
        """Update DocSpec for correction (OECD2/OECD12)."""
        # Get original DocRefId
        doc_ref = doc_spec.find('sfa_ftc:DocRefId', namespaces=self.ns)
        orig_doc_ref = doc_ref.text if doc_ref is not None else ""
        
        # Update DocTypeIndic to correction
        doc_type = doc_spec.find('sfa_ftc:DocTypeIndic', namespaces=self.ns)
        if doc_type is not None:
            doc_type.text = 'OECD12' if options.test_mode else 'OECD2'
        
        # Generate new DocRefId
        if doc_ref is not None:
            self.docref_counter += 1
            doc_ref.text = f"{orig_doc_ref}_CORR{self.docref_counter:04d}"
        
        # Add CorrDocRefId
        corr_doc_ref = doc_spec.find('sfa_ftc:CorrDocRefId', namespaces=self.ns)
        if corr_doc_ref is None and orig_doc_ref:
            corr_doc_ref = etree.Element(f"{{{self.ns['sfa_ftc']}}}CorrDocRefId")
            corr_doc_ref.text = orig_doc_ref
            doc_ref_elem = doc_spec.find('sfa_ftc:DocRefId', namespaces=self.ns)
            if doc_ref_elem is not None:
                doc_ref_elem.addnext(corr_doc_ref)
        elif corr_doc_ref is not None:
            corr_doc_ref.text = orig_doc_ref
    
    def _update_doc_spec_for_void(self, doc_spec: etree._Element, orig_msg_ref: str,
                                   options: FATCACorrectionOptions):
        """Update DocSpec for void/deletion (OECD3/OECD13)."""
        # Get original DocRefId
        doc_ref = doc_spec.find('sfa_ftc:DocRefId', namespaces=self.ns)
        orig_doc_ref = doc_ref.text if doc_ref is not None else ""
        
        # Update DocTypeIndic to void
        doc_type = doc_spec.find('sfa_ftc:DocTypeIndic', namespaces=self.ns)
        if doc_type is not None:
            doc_type.text = 'OECD13' if options.test_mode else 'OECD3'
        
        # Generate new DocRefId
        if doc_ref is not None:
            self.docref_counter += 1
            doc_ref.text = f"{orig_doc_ref}_VOID{self.docref_counter:04d}"
        
        # Add CorrDocRefId
        corr_doc_ref = doc_spec.find('sfa_ftc:CorrDocRefId', namespaces=self.ns)
        if corr_doc_ref is None and orig_doc_ref:
            corr_doc_ref = etree.Element(f"{{{self.ns['sfa_ftc']}}}CorrDocRefId")
            corr_doc_ref.text = orig_doc_ref
            doc_ref_elem = doc_spec.find('sfa_ftc:DocRefId', namespaces=self.ns)
            if doc_ref_elem is not None:
                doc_ref_elem.addnext(corr_doc_ref)
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
        name = individual.find('sfa_ftc:Name', namespaces=self.ns)
        if name is not None:
            first_name = name.find('sfa:FirstName', namespaces=self.ns)
            if first_name is not None:
                first_name.text = self.faker.first_name()
            
            last_name = name.find('sfa:LastName', namespaces=self.ns)
            if last_name is not None:
                last_name.text = self.faker.last_name()
    
    def _modify_organisation_name(self, organisation: etree._Element):
        """Modify organisation name."""
        name = organisation.find('sfa_ftc:Name', namespaces=self.ns)
        if name is not None:
            name.text = self.faker.company()
