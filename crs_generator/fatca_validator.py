"""
FATCA XML Validator

Validates FATCA XML files against schema rules and business logic.
"""

from pathlib import Path
from lxml import etree
from dataclasses import dataclass, field
from typing import List, Optional
import re


@dataclass
class FATCAValidationResult:
    """Result of FATCA XML validation."""
    is_valid: bool = True
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    # Extracted metadata
    xml_version: str = ""
    message_type: str = ""
    message_ref_id: str = ""
    transmitting_country: str = ""
    receiving_country: str = ""
    reporting_period: str = ""
    reporting_fi_count: int = 0
    account_count: int = 0
    individual_accounts: int = 0
    organisation_accounts: int = 0
    is_new_data: bool = False  # True if contains FATCA1/FATCA11 (new data)


class FATCAXMLValidator:
    """Validates FATCA XML files."""
    
    # FATCA namespaces
    NAMESPACES_V2 = {
        'ftc': 'urn:oecd:ties:fatca:v2',
        'sfa': 'urn:oecd:ties:stffatcatypes:v2',
        'iso': 'urn:oecd:ties:isofatcatypes:v1',
    }
    
    # Valid FATCA codes
    VALID_DOC_TYPE_INDIC = [
        'FATCA1', 'FATCA2', 'FATCA3', 'FATCA4',  # Production
        'FATCA11', 'FATCA12', 'FATCA13', 'FATCA14'  # Test
    ]
    
    VALID_FILER_CATEGORIES = [
        'FATCA601', 'FATCA602', 'FATCA603', 'FATCA604', 'FATCA605',
        'FATCA606', 'FATCA607', 'FATCA608', 'FATCA609', 'FATCA610', 'FATCA611'
    ]
    
    VALID_ACCT_HOLDER_TYPES = [
        'FATCA101', 'FATCA102', 'FATCA103', 'FATCA104', 'FATCA105', 'FATCA106'
    ]
    
    VALID_PAYMENT_TYPES = ['FATCA501', 'FATCA502', 'FATCA503', 'FATCA504']
    
    VALID_POOL_REPORT_TYPES = [
        'FATCA201', 'FATCA202', 'FATCA203', 'FATCA204', 'FATCA205', 'FATCA206'
    ]
    
    def __init__(self):
        self.ns = self.NAMESPACES_V2
    
    def validate_file(self, file_path: str) -> FATCAValidationResult:
        """Validate a FATCA XML file."""
        result = FATCAValidationResult()
        
        path = Path(file_path)
        if not path.exists():
            result.is_valid = False
            result.errors.append(f"File not found: {file_path}")
            return result
        
        try:
            parser = etree.XMLParser(remove_blank_text=True)
            tree = etree.parse(str(path), parser)
            root = tree.getroot()
            
            # Detect version and set namespaces
            self._detect_version(root, result)
            
            # Validate structure
            self._validate_message_spec(root, result)
            self._validate_fatca_body(root, result)
            
        except etree.XMLSyntaxError as e:
            result.is_valid = False
            result.errors.append(f"XML syntax error: {str(e)}")
        except Exception as e:
            result.is_valid = False
            result.errors.append(f"Validation error: {str(e)}")
        
        return result
    
    def _detect_version(self, root: etree._Element, result: FATCAValidationResult):
        """Detect FATCA XML version from root element."""
        # Check for version attribute
        version = root.get('version', '')
        if version:
            result.xml_version = version
        
        # Check namespace
        root_ns = root.tag.split('}')[0].strip('{') if '}' in root.tag else ''
        
        if 'fatca:v2' in root_ns:
            result.xml_version = result.xml_version or '2.0'
            self.ns = self.NAMESPACES_V2
        else:
            result.xml_version = result.xml_version or '1.0'
            result.warnings.append("Unknown FATCA version, assuming v2.0")
    
    def _validate_message_spec(self, root: etree._Element, result: FATCAValidationResult):
        """Validate MessageSpec element."""
        msg_spec = root.find('.//ftc:MessageSpec', namespaces=self.ns)
        if msg_spec is None:
            # Try without namespace prefix
            msg_spec = root.find('.//{urn:oecd:ties:fatca:v2}MessageSpec')
        
        if msg_spec is None:
            result.is_valid = False
            result.errors.append("Missing MessageSpec element")
            return
        
        # SendingCompanyIN
        sending_in = msg_spec.find('sfa:SendingCompanyIN', namespaces=self.ns)
        if sending_in is None or not sending_in.text:
            result.warnings.append("Missing or empty SendingCompanyIN")
        
        # TransmittingCountry
        trans_country = msg_spec.find('sfa:TransmittingCountry', namespaces=self.ns)
        if trans_country is not None and trans_country.text:
            result.transmitting_country = trans_country.text
            if len(trans_country.text) != 2:
                result.errors.append(f"TransmittingCountry must be 2-letter code: {trans_country.text}")
                result.is_valid = False
        else:
            result.errors.append("Missing TransmittingCountry")
            result.is_valid = False
        
        # ReceivingCountry
        recv_country = msg_spec.find('sfa:ReceivingCountry', namespaces=self.ns)
        if recv_country is not None and recv_country.text:
            result.receiving_country = recv_country.text
            if len(recv_country.text) != 2:
                result.errors.append(f"ReceivingCountry must be 2-letter code: {recv_country.text}")
                result.is_valid = False
        else:
            result.errors.append("Missing ReceivingCountry")
            result.is_valid = False
        
        # MessageType
        msg_type = msg_spec.find('sfa:MessageType', namespaces=self.ns)
        if msg_type is not None and msg_type.text:
            result.message_type = msg_type.text
            if msg_type.text != 'FATCA':
                result.warnings.append(f"MessageType should be 'FATCA', got: {msg_type.text}")
        
        # MessageRefId
        msg_ref = msg_spec.find('sfa:MessageRefId', namespaces=self.ns)
        if msg_ref is not None and msg_ref.text:
            result.message_ref_id = msg_ref.text
        else:
            result.errors.append("Missing MessageRefId")
            result.is_valid = False
        
        # ReportingPeriod
        reporting_period = msg_spec.find('sfa:ReportingPeriod', namespaces=self.ns)
        if reporting_period is not None and reporting_period.text:
            result.reporting_period = reporting_period.text
            # Validate date format (YYYY-MM-DD)
            if not re.match(r'^\d{4}-\d{2}-\d{2}$', reporting_period.text):
                result.warnings.append(f"ReportingPeriod should be YYYY-MM-DD format: {reporting_period.text}")
        else:
            result.errors.append("Missing ReportingPeriod")
            result.is_valid = False
    
    def _validate_fatca_body(self, root: etree._Element, result: FATCAValidationResult):
        """Validate FATCA body elements."""
        fatca_bodies = root.findall('.//ftc:FATCA', namespaces=self.ns)
        
        if not fatca_bodies:
            result.errors.append("No FATCA body elements found")
            result.is_valid = False
            return
        
        result.reporting_fi_count = len(fatca_bodies)
        
        for fatca in fatca_bodies:
            self._validate_reporting_fi(fatca, result)
            self._validate_reporting_group(fatca, result)
    
    def _validate_reporting_fi(self, fatca: etree._Element, result: FATCAValidationResult):
        """Validate ReportingFI element."""
        reporting_fi = fatca.find('ftc:ReportingFI', namespaces=self.ns)
        if reporting_fi is None:
            result.errors.append("Missing ReportingFI element")
            result.is_valid = False
            return
        
        # ResCountryCode
        res_country = reporting_fi.find('sfa:ResCountryCode', namespaces=self.ns)
        if res_country is None or not res_country.text:
            result.errors.append("ReportingFI missing ResCountryCode")
            result.is_valid = False
        
        # TIN (GIIN)
        tin = reporting_fi.find('sfa:TIN', namespaces=self.ns)
        if tin is None or not tin.text:
            result.errors.append("ReportingFI missing TIN/GIIN")
            result.is_valid = False
        
        # Name
        name = reporting_fi.find('sfa:Name', namespaces=self.ns)
        if name is None or not name.text:
            result.warnings.append("ReportingFI missing Name")
        
        # FilerCategory
        filer_cat = reporting_fi.find('ftc:FilerCategory', namespaces=self.ns)
        if filer_cat is not None and filer_cat.text:
            if filer_cat.text not in self.VALID_FILER_CATEGORIES:
                result.errors.append(f"Invalid FilerCategory: {filer_cat.text}")
                result.is_valid = False
        
        # DocSpec
        self._validate_doc_spec(reporting_fi, result, "ReportingFI")
    
    def _validate_reporting_group(self, fatca: etree._Element, result: FATCAValidationResult):
        """Validate ReportingGroup elements."""
        reporting_groups = fatca.findall('ftc:ReportingGroup', namespaces=self.ns)
        
        if not reporting_groups:
            result.warnings.append("No ReportingGroup elements found")
            return
        
        for group in reporting_groups:
            # Validate AccountReports
            account_reports = group.findall('ftc:AccountReport', namespaces=self.ns)
            
            for account in account_reports:
                self._validate_account_report(account, result)
    
    def _validate_account_report(self, account: etree._Element, result: FATCAValidationResult):
        """Validate AccountReport element."""
        result.account_count += 1
        
        # DocSpec
        self._validate_doc_spec(account, result, "AccountReport")
        
        # AccountNumber
        acc_num = account.find('ftc:AccountNumber', namespaces=self.ns)
        if acc_num is None or not acc_num.text:
            result.errors.append("AccountReport missing AccountNumber")
            result.is_valid = False
        
        # AccountHolder
        account_holder = account.find('ftc:AccountHolder', namespaces=self.ns)
        if account_holder is None:
            result.errors.append("AccountReport missing AccountHolder")
            result.is_valid = False
        else:
            self._validate_account_holder(account_holder, result)
        
        # AccountBalance
        balance = account.find('ftc:AccountBalance', namespaces=self.ns)
        if balance is not None:
            # Check currCode attribute
            curr_code = balance.get('currCode')
            if not curr_code:
                result.warnings.append("AccountBalance missing currCode attribute")
            
            # Check balance value
            if balance.text:
                try:
                    balance_val = float(balance.text)
                    if balance_val < 0:
                        result.warnings.append(f"Negative AccountBalance: {balance_val}")
                except ValueError:
                    result.errors.append(f"Invalid AccountBalance value: {balance.text}")
                    result.is_valid = False
        
        # Payments
        payments = account.findall('ftc:Payment', namespaces=self.ns)
        for payment in payments:
            self._validate_payment(payment, result)
    
    def _validate_account_holder(self, account_holder: etree._Element, result: FATCAValidationResult):
        """Validate AccountHolder element."""
        individual = account_holder.find('ftc:Individual', namespaces=self.ns)
        organisation = account_holder.find('ftc:Organisation', namespaces=self.ns)
        
        if individual is not None:
            result.individual_accounts += 1
            self._validate_individual(individual, result)
        elif organisation is not None:
            result.organisation_accounts += 1
            self._validate_organisation(organisation, result)
            
            # AcctHolderType required for organisations
            acct_holder_type = account_holder.find('ftc:AcctHolderType', namespaces=self.ns)
            if acct_holder_type is not None and acct_holder_type.text:
                if acct_holder_type.text not in self.VALID_ACCT_HOLDER_TYPES:
                    result.errors.append(f"Invalid AcctHolderType: {acct_holder_type.text}")
                    result.is_valid = False
        else:
            result.errors.append("AccountHolder must have either Individual or Organisation")
            result.is_valid = False
    
    def _validate_individual(self, individual: etree._Element, result: FATCAValidationResult):
        """Validate Individual element."""
        # ResCountryCode
        res_country = individual.find('sfa:ResCountryCode', namespaces=self.ns)
        if res_country is None or not res_country.text:
            result.errors.append("Individual missing ResCountryCode")
            result.is_valid = False
        
        # Name
        name = individual.find('sfa:Name', namespaces=self.ns)
        if name is not None:
            first_name = name.find('sfa:FirstName', namespaces=self.ns)
            last_name = name.find('sfa:LastName', namespaces=self.ns)
            
            if (first_name is None or not first_name.text) and (last_name is None or not last_name.text):
                result.warnings.append("Individual missing both FirstName and LastName")
        
        # Address
        address = individual.find('sfa:Address', namespaces=self.ns)
        if address is not None:
            self._validate_address(address, result, "Individual")
    
    def _validate_organisation(self, organisation: etree._Element, result: FATCAValidationResult):
        """Validate Organisation element."""
        # ResCountryCode
        res_country = organisation.find('sfa:ResCountryCode', namespaces=self.ns)
        if res_country is None or not res_country.text:
            result.errors.append("Organisation missing ResCountryCode")
            result.is_valid = False
        
        # Name
        name = organisation.find('sfa:Name', namespaces=self.ns)
        if name is None or not name.text:
            result.warnings.append("Organisation missing Name")
        
        # Address
        address = organisation.find('sfa:Address', namespaces=self.ns)
        if address is not None:
            self._validate_address(address, result, "Organisation")
    
    def _validate_address(self, address: etree._Element, result: FATCAValidationResult, context: str):
        """Validate Address element."""
        country_code = address.find('sfa:CountryCode', namespaces=self.ns)
        if country_code is None or not country_code.text:
            result.warnings.append(f"{context} Address missing CountryCode")
        elif len(country_code.text) != 2:
            result.errors.append(f"{context} Address CountryCode must be 2-letter code: {country_code.text}")
            result.is_valid = False
        
        # Must have either AddressFree or AddressFix
        addr_free = address.find('sfa:AddressFree', namespaces=self.ns)
        addr_fix = address.find('sfa:AddressFix', namespaces=self.ns)
        
        if addr_free is None and addr_fix is None:
            result.warnings.append(f"{context} Address missing both AddressFree and AddressFix")
    
    def _validate_payment(self, payment: etree._Element, result: FATCAValidationResult):
        """Validate Payment element."""
        # Type
        payment_type = payment.find('ftc:Type', namespaces=self.ns)
        if payment_type is not None and payment_type.text:
            if payment_type.text not in self.VALID_PAYMENT_TYPES:
                result.errors.append(f"Invalid Payment Type: {payment_type.text}")
                result.is_valid = False
        
        # PaymentAmnt
        payment_amnt = payment.find('ftc:PaymentAmnt', namespaces=self.ns)
        if payment_amnt is not None:
            curr_code = payment_amnt.get('currCode')
            if not curr_code:
                result.warnings.append("PaymentAmnt missing currCode attribute")
            
            if payment_amnt.text:
                try:
                    float(payment_amnt.text)
                except ValueError:
                    result.errors.append(f"Invalid PaymentAmnt value: {payment_amnt.text}")
                    result.is_valid = False
    
    def _validate_doc_spec(self, element: etree._Element, result: FATCAValidationResult, context: str):
        """Validate DocSpec element."""
        doc_spec = element.find('ftc:DocSpec', namespaces=self.ns)
        if doc_spec is None:
            result.errors.append(f"{context} missing DocSpec")
            result.is_valid = False
            return
        
        # DocTypeIndic
        doc_type = doc_spec.find('ftc:DocTypeIndic', namespaces=self.ns)
        if doc_type is not None and doc_type.text:
            if doc_type.text not in self.VALID_DOC_TYPE_INDIC:
                result.errors.append(f"{context} invalid DocTypeIndic: {doc_type.text}")
                result.is_valid = False
            
            # Check if this is new data
            if doc_type.text in ['FATCA1', 'FATCA11']:
                result.is_new_data = True
        else:
            result.errors.append(f"{context} DocSpec missing DocTypeIndic")
            result.is_valid = False
        
        # DocRefId
        doc_ref = doc_spec.find('ftc:DocRefId', namespaces=self.ns)
        if doc_ref is None or not doc_ref.text:
            result.errors.append(f"{context} DocSpec missing DocRefId")
            result.is_valid = False
        
        # CorrDocRefId required for corrections/voids
        if doc_type is not None and doc_type.text in ['FATCA2', 'FATCA3', 'FATCA4', 'FATCA12', 'FATCA13', 'FATCA14']:
            corr_doc_ref = doc_spec.find('ftc:CorrDocRefId', namespaces=self.ns)
            if corr_doc_ref is None or not corr_doc_ref.text:
                result.errors.append(f"{context} correction/void requires CorrDocRefId")
                result.is_valid = False
