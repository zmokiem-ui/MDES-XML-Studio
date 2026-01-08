"""
CRS XML Validator Module
Validates uploaded CRS XML files for structure, schema compliance, and business rules.
"""

import xml.etree.ElementTree as ET
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from pathlib import Path
import re
from datetime import datetime


@dataclass
class ValidationResult:
    """Result of XML validation"""
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    xml_version: str = "1.0"
    message_type_indic: str = ""
    message_ref_id: str = ""
    transmitting_country: str = ""
    receiving_country: str = ""
    reporting_period: str = ""
    reporting_fi_count: int = 0
    account_count: int = 0
    individual_accounts: int = 0
    organisation_accounts: int = 0
    parsed_data: Optional[Dict] = None


class CRSXMLValidator:
    """Validates CRS XML files"""
    
    # Namespaces for different versions
    NAMESPACES_V1 = {
        'crs': 'urn:oecd:ties:crs:v1',
        'cfc': 'urn:oecd:ties:commontypesfatcacrs:v1',
        'stf': 'urn:oecd:ties:stf:v4',
        'iso': 'urn:oecd:ties:isocrstypes:v1'
    }
    
    NAMESPACES_V2 = {
        'crs': 'urn:oecd:ties:crs:v2',
        'cfc': 'urn:oecd:ties:commontypesfatcacrs:v2',
        'stf': 'urn:oecd:ties:crsstf:v5',
        'iso': 'urn:oecd:ties:isocrstypes:v1'
    }
    
    # Valid codes
    VALID_MESSAGE_TYPE_INDIC = ['CRS701', 'CRS702', 'CRS703']
    VALID_DOC_TYPE_INDIC = ['OECD0', 'OECD1', 'OECD2', 'OECD3', 'OECD10', 'OECD11', 'OECD12', 'OECD13']
    VALID_ACCT_HOLDER_TYPES = ['CRS101', 'CRS102', 'CRS103']
    VALID_PAYMENT_TYPES = ['CRS501', 'CRS502', 'CRS503', 'CRS504']
    VALID_CTRL_PERSON_TYPES = [f'CRS80{i}' for i in range(1, 10)] + [f'CRS81{i}' for i in range(0, 4)]
    
    # ISO country codes (subset - common ones)
    VALID_COUNTRY_CODES = [
        'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB',
        'BY', 'BE', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 'BN', 'BG', 'BF', 'BI', 'KH', 'CM',
        'CA', 'CV', 'CF', 'TD', 'CL', 'CN', 'CO', 'KM', 'CG', 'CD', 'CR', 'CI', 'HR', 'CU', 'CW',
        'CY', 'CZ', 'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'ET', 'FJ', 'FI',
        'FR', 'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD', 'GT', 'GN', 'GW', 'GY', 'HT', 'HN', 'HK',
        'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT', 'JM', 'JP', 'JO', 'KZ', 'KE', 'KI',
        'KP', 'KR', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO', 'MK',
        'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MR', 'MU', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME',
        'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL', 'NZ', 'NI', 'NE', 'NG', 'NO', 'OM', 'PK', 'PW',
        'PA', 'PG', 'PY', 'PE', 'PH', 'PL', 'PT', 'QA', 'RO', 'RU', 'RW', 'KN', 'LC', 'VC', 'WS',
        'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SK', 'SI', 'SB', 'SO', 'ZA', 'SS', 'ES',
        'LK', 'SD', 'SR', 'SZ', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT',
        'TN', 'TR', 'TM', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VA', 'VE', 'VN',
        'YE', 'ZM', 'ZW', 'AW', 'BQ', 'SX', 'XK'
    ]
    
    # Currency codes (subset - common ones)
    VALID_CURRENCY_CODES = [
        'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY', 'HKD', 'SGD', 'SEK', 'NOK',
        'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RUB', 'TRY', 'BRL', 'MXN', 'INR', 'KRW',
        'ZAR', 'AED', 'SAR', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'ANG', 'AWG'
    ]

    def __init__(self):
        self.namespaces = {}
        self.version = "1.0"
        
    def detect_version(self, root: ET.Element) -> str:
        """Detect CRS XML version from namespaces"""
        ns_map = dict([node for _, node in ET.iterparse(root) if node])
        
        # Check root element namespace
        root_tag = root.tag
        if 'crs:v2' in root_tag or 'urn:oecd:ties:crs:v2' in str(root.attrib):
            return "2.0"
        if 'crs:v1' in root_tag or 'urn:oecd:ties:crs:v1' in str(root.attrib):
            return "1.0"
            
        # Check version attribute
        version = root.get('version', '1.0')
        return version
    
    def detect_version_from_string(self, xml_content: str) -> str:
        """Detect version from XML string"""
        if 'urn:oecd:ties:crs:v2' in xml_content:
            return "2.0"
        if 'urn:oecd:ties:crs:v1' in xml_content:
            return "1.0"
        # Check version attribute
        match = re.search(r'version="(\d+\.\d+)"', xml_content)
        if match:
            return match.group(1)
        return "1.0"
    
    def validate_file(self, file_path: str) -> ValidationResult:
        """Validate a CRS XML file"""
        result = ValidationResult(is_valid=True)
        
        try:
            # Read file
            with open(file_path, 'r', encoding='utf-8') as f:
                xml_content = f.read()
        except Exception as e:
            result.is_valid = False
            result.errors.append(f"Failed to read file: {str(e)}")
            return result
            
        return self.validate_string(xml_content)
    
    def validate_string(self, xml_content: str) -> ValidationResult:
        """Validate CRS XML from string"""
        result = ValidationResult(is_valid=True)
        
        # Detect version
        result.xml_version = self.detect_version_from_string(xml_content)
        self.version = result.xml_version
        self.namespaces = self.NAMESPACES_V2 if result.xml_version == "2.0" else self.NAMESPACES_V1
        
        # Parse XML
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            result.is_valid = False
            result.errors.append(f"XML Parse Error: {str(e)}")
            return result
        
        # Validate structure
        self._validate_structure(root, result)
        
        # Validate MessageSpec
        self._validate_message_spec(root, result)
        
        # Validate CrsBody
        self._validate_crs_body(root, result)
        
        # Extract parsed data for correction generation
        if result.is_valid or len(result.errors) == 0:
            result.parsed_data = self._extract_data(root)
        
        return result
    
    def _find(self, element: ET.Element, path: str) -> Optional[ET.Element]:
        """Find element with namespace support"""
        # Try with namespaces first
        result = element.find(path, self.namespaces)
        if result is not None:
            return result
        
        # Try searching by local name (without namespace prefix)
        local_name = path.split(':')[-1] if ':' in path else path
        for child in element:
            tag_local = child.tag.split('}')[-1] if '}' in child.tag else child.tag
            if tag_local == local_name:
                return child
        return None
    
    def _findall(self, element: ET.Element, path: str) -> List[ET.Element]:
        """Find all elements with namespace support"""
        # Try with namespaces first
        result = element.findall(path, self.namespaces)
        if result:
            return result
        
        # Try searching by local name (without namespace prefix)
        local_name = path.split(':')[-1] if ':' in path else path
        results = []
        for child in element:
            tag_local = child.tag.split('}')[-1] if '}' in child.tag else child.tag
            if tag_local == local_name:
                results.append(child)
        return results
    
    def _get_text(self, element: ET.Element, path: str, default: str = "") -> str:
        """Get text content of element"""
        el = self._find(element, path)
        return el.text if el is not None and el.text else default
    
    def _validate_structure(self, root: ET.Element, result: ValidationResult):
        """Validate basic XML structure"""
        # Check root element
        if not root.tag.endswith('CRS_OECD'):
            result.errors.append(f"Invalid root element: expected CRS_OECD, got {root.tag}")
            result.is_valid = False
            return
        
        # Check MessageSpec exists
        msg_spec = self._find(root, 'crs:MessageSpec')
        if msg_spec is None:
            result.errors.append("Missing required element: MessageSpec")
            result.is_valid = False
            return
        
        # Check CrsBody exists (optional for CRS703)
        crs_body = self._find(root, 'crs:CrsBody')
        if crs_body is None:
            result.warnings.append("No CrsBody found - this is only valid for CRS703 (nil report)")
    
    def _validate_message_spec(self, root: ET.Element, result: ValidationResult):
        """Validate MessageSpec element"""
        msg_spec = self._find(root, 'crs:MessageSpec')
        if msg_spec is None:
            return
        
        # Required fields
        required_fields = [
            ('crs:TransmittingCountry', 'TransmittingCountry'),
            ('crs:ReceivingCountry', 'ReceivingCountry'),
            ('crs:MessageType', 'MessageType'),
            ('crs:MessageRefId', 'MessageRefId'),
            ('crs:MessageTypeIndic', 'MessageTypeIndic'),
            ('crs:ReportingPeriod', 'ReportingPeriod'),
            ('crs:Timestamp', 'Timestamp')
        ]
        
        for path, name in required_fields:
            value = self._get_text(msg_spec, path)
            if not value:
                result.errors.append(f"Missing required field in MessageSpec: {name}")
                result.is_valid = False
        
        # Validate TransmittingCountry
        trans_country = self._get_text(msg_spec, 'crs:TransmittingCountry')
        if trans_country:
            result.transmitting_country = trans_country
            if len(trans_country) != 2:
                result.errors.append(f"TransmittingCountry must be 2-letter code, got: {trans_country}")
                result.is_valid = False
            elif trans_country.upper() not in self.VALID_COUNTRY_CODES:
                result.warnings.append(f"TransmittingCountry '{trans_country}' may not be a valid ISO country code")
        
        # Validate ReceivingCountry
        recv_country = self._get_text(msg_spec, 'crs:ReceivingCountry')
        if recv_country:
            result.receiving_country = recv_country
            if len(recv_country) != 2:
                result.errors.append(f"ReceivingCountry must be 2-letter code, got: {recv_country}")
                result.is_valid = False
            elif recv_country.upper() not in self.VALID_COUNTRY_CODES:
                result.warnings.append(f"ReceivingCountry '{recv_country}' may not be a valid ISO country code")
        
        # Validate MessageType
        msg_type = self._get_text(msg_spec, 'crs:MessageType')
        if msg_type and msg_type != 'CRS':
            result.errors.append(f"MessageType must be 'CRS', got: {msg_type}")
            result.is_valid = False
        
        # Validate MessageTypeIndic
        msg_type_indic = self._get_text(msg_spec, 'crs:MessageTypeIndic')
        if msg_type_indic:
            result.message_type_indic = msg_type_indic
            if msg_type_indic not in self.VALID_MESSAGE_TYPE_INDIC:
                result.errors.append(f"Invalid MessageTypeIndic: {msg_type_indic}. Must be one of: {', '.join(self.VALID_MESSAGE_TYPE_INDIC)}")
                result.is_valid = False
        
        # Validate MessageRefId
        msg_ref_id = self._get_text(msg_spec, 'crs:MessageRefId')
        if msg_ref_id:
            result.message_ref_id = msg_ref_id
            if len(msg_ref_id) > 170:
                result.errors.append(f"MessageRefId exceeds max length of 170 characters")
                result.is_valid = False
        
        # Validate CorrMessageRefId rules (Error-80007)
        corr_msg_ref_id = self._get_text(msg_spec, 'crs:CorrMessageRefId')
        if msg_type_indic == 'CRS701' and corr_msg_ref_id:
            result.errors.append(f"CorrMessageRefId forbidden for CRS701 new data (Error 80007)")
            result.is_valid = False
        elif msg_type_indic == 'CRS702' and not corr_msg_ref_id:
            result.errors.append(f"CorrMessageRefId required for CRS702 correction")
            result.is_valid = False
        
        # Validate ReportingPeriod (date format)
        reporting_period = self._get_text(msg_spec, 'crs:ReportingPeriod')
        if reporting_period:
            result.reporting_period = reporting_period
            try:
                datetime.strptime(reporting_period, '%Y-%m-%d')
            except ValueError:
                result.errors.append(f"ReportingPeriod must be in YYYY-MM-DD format, got: {reporting_period}")
                result.is_valid = False
        
        # Validate Timestamp
        timestamp = self._get_text(msg_spec, 'crs:Timestamp')
        if timestamp:
            try:
                # Try ISO format with timezone
                if 'T' in timestamp:
                    datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except ValueError:
                result.warnings.append(f"Timestamp format may be invalid: {timestamp}")
    
    def _validate_crs_body(self, root: ET.Element, result: ValidationResult):
        """Validate CrsBody elements"""
        crs_bodies = self._findall(root, 'crs:CrsBody')
        result.reporting_fi_count = len(crs_bodies)
        
        for i, body in enumerate(crs_bodies):
            self._validate_reporting_fi(body, i + 1, result)
            self._validate_reporting_group(body, i + 1, result)
    
    def _validate_reporting_fi(self, body: ET.Element, body_num: int, result: ValidationResult):
        """Validate ReportingFI element"""
        reporting_fi = self._find(body, 'crs:ReportingFI')
        if reporting_fi is None:
            result.errors.append(f"CrsBody {body_num}: Missing required element ReportingFI")
            result.is_valid = False
            return
        
        # Validate DocSpec
        self._validate_doc_spec(reporting_fi, f"CrsBody {body_num} ReportingFI", result)
        
        # Validate ResCountryCode
        res_country = self._get_text(reporting_fi, 'crs:ResCountryCode')
        if not res_country:
            result.errors.append(f"CrsBody {body_num} ReportingFI: Missing ResCountryCode")
            result.is_valid = False
        elif len(res_country) != 2:
            result.errors.append(f"CrsBody {body_num} ReportingFI: ResCountryCode must be 2-letter code")
            result.is_valid = False
        
        # Validate IN (Identification Number)
        fi_in = self._find(reporting_fi, 'crs:IN')
        if fi_in is None:
            result.warnings.append(f"CrsBody {body_num} ReportingFI: Missing IN (Identification Number)")
        
        # Validate Name
        fi_name = self._get_text(reporting_fi, 'crs:Name')
        if not fi_name:
            result.errors.append(f"CrsBody {body_num} ReportingFI: Missing Name")
            result.is_valid = False
        
        # Validate Address
        address = self._find(reporting_fi, 'crs:Address')
        if address is None:
            result.errors.append(f"CrsBody {body_num} ReportingFI: Missing Address")
            result.is_valid = False
        else:
            self._validate_address(address, f"CrsBody {body_num} ReportingFI", result)
    
    def _validate_reporting_group(self, body: ET.Element, body_num: int, result: ValidationResult):
        """Validate ReportingGroup element"""
        reporting_group = self._find(body, 'crs:ReportingGroup')
        
        # Some files have AccountReport directly under CrsBody (no ReportingGroup wrapper)
        if reporting_group is None:
            # Try to find AccountReports directly under CrsBody
            account_reports = self._findall(body, 'crs:AccountReport')
            if not account_reports:
                # Also try without namespace prefix (default namespace)
                account_reports = [child for child in body if child.tag.endswith('AccountReport')]
            
            if account_reports:
                result.account_count += len(account_reports)
                for j, account in enumerate(account_reports):
                    self._validate_account_report(account, body_num, j + 1, result)
            else:
                result.warnings.append(f"CrsBody {body_num}: No ReportingGroup or AccountReports found")
            return
        
        # Validate AccountReports within ReportingGroup
        account_reports = self._findall(reporting_group, 'crs:AccountReport')
        if not account_reports:
            # Try without namespace prefix
            account_reports = [child for child in reporting_group if child.tag.endswith('AccountReport')]
        
        result.account_count += len(account_reports)
        
        for j, account in enumerate(account_reports):
            self._validate_account_report(account, body_num, j + 1, result)
    
    def _validate_account_report(self, account: ET.Element, body_num: int, acct_num: int, result: ValidationResult):
        """Validate AccountReport element"""
        prefix = f"CrsBody {body_num} Account {acct_num}"
        
        # Validate DocSpec
        self._validate_doc_spec(account, prefix, result)
        
        # Validate AccountNumber
        acct_number = self._find(account, 'crs:AccountNumber')
        if acct_number is None:
            result.errors.append(f"{prefix}: Missing AccountNumber")
            result.is_valid = False
        
        # Validate AccountHolder
        acct_holder = self._find(account, 'crs:AccountHolder')
        if acct_holder is None:
            result.errors.append(f"{prefix}: Missing AccountHolder")
            result.is_valid = False
        else:
            self._validate_account_holder(acct_holder, prefix, result)
        
        # Validate AccountBalance
        acct_balance = self._find(account, 'crs:AccountBalance')
        if acct_balance is None:
            result.errors.append(f"{prefix}: Missing AccountBalance")
            result.is_valid = False
        else:
            # Check currency code
            curr_code = acct_balance.get('currCode')
            if curr_code and curr_code not in self.VALID_CURRENCY_CODES:
                result.warnings.append(f"{prefix}: Currency code '{curr_code}' may not be valid")
            
            # Check amount is numeric and positive (Error-60002)
            try:
                balance_value = float(acct_balance.text or '0')
                if balance_value < 0:
                    result.errors.append(f"{prefix}: AccountBalance must be positive (Error 60002)")
                    result.is_valid = False
                # Check max value (Error-98004)
                if balance_value > 10000000000000000:
                    result.errors.append(f"{prefix}: AccountBalance exceeds maximum (Error 98004)")
                    result.is_valid = False
            except ValueError:
                result.errors.append(f"{prefix}: AccountBalance must be numeric")
                result.is_valid = False
            
            # Check closed account balance must be 0 (Error-60003)
            if acct_number is not None:
                is_closed = acct_number.get('ClosedAccount', 'false').lower() == 'true'
                if is_closed:
                    try:
                        if float(acct_balance.text or '0') != 0:
                            result.errors.append(f"{prefix}: Closed account balance must be 0 (Error 60003)")
                            result.is_valid = False
                    except ValueError:
                        pass
        
        # Validate ControllingPerson rules based on AcctHolderType (Error-60005, Error-60006, Error-60016)
        if acct_holder is not None:
            individual = self._find(acct_holder, 'crs:Individual')
            organisation = self._find(acct_holder, 'crs:Organisation')
            controlling_persons = self._findall(account, 'crs:ControllingPerson')
            acct_holder_type = self._get_text(acct_holder, 'crs:AcctHolderType')
            
            # Error-60016: Individual accounts cannot have ControllingPerson
            if individual is not None and len(controlling_persons) > 0:
                result.errors.append(f"{prefix}: Individual accounts cannot have ControllingPerson (Error 60016)")
                result.is_valid = False
            
            # Organisation-specific rules
            if organisation is not None:
                # Error-60006: CRS101 must have ControllingPerson
                if acct_holder_type == 'CRS101' and len(controlling_persons) == 0:
                    result.errors.append(f"{prefix}: CRS101 Organisation must have ControllingPerson (Error 60006)")
                    result.is_valid = False
                
                # Error-60005: CRS102/CRS103 cannot have ControllingPerson
                if acct_holder_type in ['CRS102', 'CRS103'] and len(controlling_persons) > 0:
                    result.errors.append(f"{prefix}: CRS102/CRS103 Organisation cannot have ControllingPerson (Error 60005)")
                    result.is_valid = False
        
        # Validate ControllingPerson elements
        controlling_persons = self._findall(account, 'crs:ControllingPerson')
        for cp in controlling_persons:
            self._validate_controlling_person(cp, prefix, result)
        
        # Validate Payments (optional)
        payments = self._findall(account, 'crs:Payment')
        for k, payment in enumerate(payments):
            self._validate_payment(payment, f"{prefix} Payment {k+1}", result)
    
    def _validate_account_holder(self, holder: ET.Element, prefix: str, result: ValidationResult):
        """Validate AccountHolder element"""
        individual = self._find(holder, 'crs:Individual')
        organisation = self._find(holder, 'crs:Organisation')
        
        if individual is not None:
            result.individual_accounts += 1
            self._validate_individual(individual, f"{prefix} Individual", result)
        elif organisation is not None:
            result.organisation_accounts += 1
            self._validate_organisation(organisation, f"{prefix} Organisation", result)
            
            # Check AcctHolderType for organisations
            acct_holder_type = self._get_text(holder, 'crs:AcctHolderType')
            if acct_holder_type and acct_holder_type not in self.VALID_ACCT_HOLDER_TYPES:
                result.errors.append(f"{prefix}: Invalid AcctHolderType '{acct_holder_type}'")
                result.is_valid = False
        else:
            result.errors.append(f"{prefix}: Must have either Individual or Organisation")
            result.is_valid = False
    
    def _validate_individual(self, individual: ET.Element, prefix: str, result: ValidationResult):
        """Validate Individual element"""
        # ResCountryCode
        res_country = self._get_text(individual, 'crs:ResCountryCode')
        if not res_country:
            result.errors.append(f"{prefix}: Missing ResCountryCode")
            result.is_valid = False
        elif len(res_country) != 2:
            result.errors.append(f"{prefix}: ResCountryCode must be 2-letter code")
            result.is_valid = False
        
        # Name
        name = self._find(individual, 'crs:Name')
        if name is None:
            result.errors.append(f"{prefix}: Missing Name")
            result.is_valid = False
        else:
            first_name = self._get_text(name, 'crs:FirstName')
            last_name = self._get_text(name, 'crs:LastName')
            if not first_name:
                result.errors.append(f"{prefix}: Missing FirstName")
                result.is_valid = False
            if not last_name:
                result.errors.append(f"{prefix}: Missing LastName")
                result.is_valid = False
        
        # Address
        address = self._find(individual, 'crs:Address')
        if address is None:
            result.errors.append(f"{prefix}: Missing Address")
            result.is_valid = False
        else:
            self._validate_address(address, prefix, result)
        
        # BirthInfo (optional but recommended)
        birth_info = self._find(individual, 'crs:BirthInfo')
        if birth_info is not None:
            birth_date = self._get_text(birth_info, 'crs:BirthDate')
            if birth_date:
                try:
                    datetime.strptime(birth_date, '%Y-%m-%d')
                except ValueError:
                    result.errors.append(f"{prefix}: BirthDate must be YYYY-MM-DD format")
                    result.is_valid = False
    
    def _validate_organisation(self, org: ET.Element, prefix: str, result: ValidationResult):
        """Validate Organisation element"""
        # ResCountryCode (optional for org)
        res_country = self._get_text(org, 'crs:ResCountryCode')
        if res_country and len(res_country) != 2:
            result.errors.append(f"{prefix}: ResCountryCode must be 2-letter code")
            result.is_valid = False
        
        # Name
        name = self._get_text(org, 'crs:Name')
        if not name:
            result.errors.append(f"{prefix}: Missing Name")
            result.is_valid = False
        
        # Address
        address = self._find(org, 'crs:Address')
        if address is None:
            result.errors.append(f"{prefix}: Missing Address")
            result.is_valid = False
        else:
            self._validate_address(address, prefix, result)
    
    def _validate_address(self, address: ET.Element, prefix: str, result: ValidationResult):
        """Validate Address element"""
        # CountryCode
        country_code = self._get_text(address, 'cfc:CountryCode')
        if not country_code:
            result.errors.append(f"{prefix} Address: Missing CountryCode")
            result.is_valid = False
        elif len(country_code) != 2:
            result.errors.append(f"{prefix} Address: CountryCode must be 2-letter code")
            result.is_valid = False
        
        # Must have either AddressFix or AddressFree
        address_fix = self._find(address, 'cfc:AddressFix')
        address_free = self._get_text(address, 'cfc:AddressFree')
        
        if address_fix is None and not address_free:
            result.warnings.append(f"{prefix} Address: Should have AddressFix or AddressFree")
    
    def _validate_payment(self, payment: ET.Element, prefix: str, result: ValidationResult):
        """Validate Payment element"""
        # Type
        payment_type = self._get_text(payment, 'crs:Type')
        if payment_type and payment_type not in self.VALID_PAYMENT_TYPES:
            result.errors.append(f"{prefix}: Invalid payment type '{payment_type}'")
            result.is_valid = False
        
        # PaymentAmnt
        payment_amnt = self._find(payment, 'crs:PaymentAmnt')
        if payment_amnt is not None:
            curr_code = payment_amnt.get('currCode')
            if curr_code and curr_code not in self.VALID_CURRENCY_CODES:
                result.warnings.append(f"{prefix}: Currency code '{curr_code}' may not be valid")
            
            try:
                float(payment_amnt.text or '0')
            except ValueError:
                result.errors.append(f"{prefix}: PaymentAmnt must be numeric")
                result.is_valid = False
    
    def _validate_controlling_person(self, cp: ET.Element, prefix: str, result: ValidationResult):
        """Validate ControllingPerson element"""
        individual = self._find(cp, 'crs:Individual')
        if individual is None:
            result.errors.append(f"{prefix} ControllingPerson: Missing Individual")
            result.is_valid = False
        else:
            self._validate_individual(individual, f"{prefix} ControllingPerson", result)
        
        # CtrlgPersonType is required for CRS101 organisations
        ctrl_person_type = self._get_text(cp, 'crs:CtrlgPersonType')
        if ctrl_person_type and ctrl_person_type not in self.VALID_CTRL_PERSON_TYPES:
            result.errors.append(f"{prefix} ControllingPerson: Invalid CtrlgPersonType '{ctrl_person_type}'")
            result.is_valid = False
    
    def _validate_doc_spec(self, element: ET.Element, prefix: str, result: ValidationResult):
        """Validate DocSpec element"""
        doc_spec = self._find(element, 'crs:DocSpec')
        if doc_spec is None:
            result.errors.append(f"{prefix}: Missing DocSpec")
            result.is_valid = False
            return
        
        # DocTypeIndic
        doc_type_indic = self._get_text(doc_spec, 'stf:DocTypeIndic')
        if not doc_type_indic:
            result.errors.append(f"{prefix} DocSpec: Missing DocTypeIndic")
            result.is_valid = False
        elif doc_type_indic not in self.VALID_DOC_TYPE_INDIC:
            result.errors.append(f"{prefix} DocSpec: Invalid DocTypeIndic '{doc_type_indic}'")
            result.is_valid = False
        
        # DocRefId
        doc_ref_id = self._get_text(doc_spec, 'stf:DocRefId')
        if not doc_ref_id:
            result.errors.append(f"{prefix} DocSpec: Missing DocRefId")
            result.is_valid = False
        elif len(doc_ref_id) > 200:
            result.errors.append(f"{prefix} DocSpec: DocRefId exceeds max length of 200")
            result.is_valid = False
        # Error-80024/80025: DocRefId/CorrDocRefId cannot contain spaces
        elif ' ' in doc_ref_id:
            result.errors.append(f"{prefix} DocSpec: DocRefId cannot contain spaces (Error 80025)")
            result.is_valid = False
        
        # CorrDocRefId validation
        corr_doc_ref_id = self._get_text(doc_spec, 'stf:CorrDocRefId')
        
        # Error-80005: CorrDocRefId required for corrections (OECD2/OECD12)
        if doc_type_indic in ['OECD2', 'OECD12'] and not corr_doc_ref_id:
            result.errors.append(f"{prefix} DocSpec: CorrDocRefId required for correction (Error 80005)")
            result.is_valid = False
        
        # CorrDocRefId required for deletions (OECD3/OECD13)
        if doc_type_indic in ['OECD3', 'OECD13'] and not corr_doc_ref_id:
            result.errors.append(f"{prefix} DocSpec: CorrDocRefId required for deletion")
            result.is_valid = False
        
        # Error-80024: CorrDocRefId cannot contain spaces
        if corr_doc_ref_id and ' ' in corr_doc_ref_id:
            result.errors.append(f"{prefix} DocSpec: CorrDocRefId cannot contain spaces (Error 80024)")
            result.is_valid = False
        
        # Error-80026: CorrDocRefId forbidden for OECD0/OECD10 (resend)
        if doc_type_indic in ['OECD0', 'OECD10'] and corr_doc_ref_id:
            result.errors.append(f"{prefix} DocSpec: CorrDocRefId forbidden for resend (Error 80026)")
            result.is_valid = False
    
    def _extract_data(self, root: ET.Element) -> Dict:
        """Extract parsed data for correction generation"""
        data = {
            'version': self.version,
            'namespaces': self.namespaces,
            'message_spec': {},
            'crs_bodies': []
        }
        
        # Extract MessageSpec
        msg_spec = self._find(root, 'crs:MessageSpec')
        if msg_spec is not None:
            data['message_spec'] = {
                'sending_company_in': self._get_text(msg_spec, 'crs:SendingCompanyIN'),
                'transmitting_country': self._get_text(msg_spec, 'crs:TransmittingCountry'),
                'receiving_country': self._get_text(msg_spec, 'crs:ReceivingCountry'),
                'message_type': self._get_text(msg_spec, 'crs:MessageType'),
                'message_ref_id': self._get_text(msg_spec, 'crs:MessageRefId'),
                'message_type_indic': self._get_text(msg_spec, 'crs:MessageTypeIndic'),
                'reporting_period': self._get_text(msg_spec, 'crs:ReportingPeriod'),
                'timestamp': self._get_text(msg_spec, 'crs:Timestamp')
            }
        
        # Extract CrsBodies
        for body in self._findall(root, 'crs:CrsBody'):
            body_data = self._extract_crs_body(body)
            data['crs_bodies'].append(body_data)
        
        return data
    
    def _extract_crs_body(self, body: ET.Element) -> Dict:
        """Extract CrsBody data"""
        body_data = {
            'reporting_fi': None,
            'accounts': []
        }
        
        # Extract ReportingFI
        reporting_fi = self._find(body, 'crs:ReportingFI')
        if reporting_fi is not None:
            doc_spec = self._find(reporting_fi, 'crs:DocSpec')
            fi_in = self._find(reporting_fi, 'crs:IN')
            
            body_data['reporting_fi'] = {
                'res_country_code': self._get_text(reporting_fi, 'crs:ResCountryCode'),
                'in_value': fi_in.text if fi_in is not None else '',
                'in_issued_by': fi_in.get('issuedBy', '') if fi_in is not None else '',
                'name': self._get_text(reporting_fi, 'crs:Name'),
                'doc_type_indic': self._get_text(doc_spec, 'stf:DocTypeIndic') if doc_spec is not None else '',
                'doc_ref_id': self._get_text(doc_spec, 'stf:DocRefId') if doc_spec is not None else '',
                'corr_doc_ref_id': self._get_text(doc_spec, 'stf:CorrDocRefId') if doc_spec is not None else ''
            }
        
        # Extract AccountReports
        reporting_group = self._find(body, 'crs:ReportingGroup')
        if reporting_group is not None:
            for account in self._findall(reporting_group, 'crs:AccountReport'):
                acct_data = self._extract_account(account)
                body_data['accounts'].append(acct_data)
        
        return body_data
    
    def _extract_account(self, account: ET.Element) -> Dict:
        """Extract AccountReport data"""
        doc_spec = self._find(account, 'crs:DocSpec')
        acct_number = self._find(account, 'crs:AccountNumber')
        acct_balance = self._find(account, 'crs:AccountBalance')
        acct_holder = self._find(account, 'crs:AccountHolder')
        
        acct_data = {
            'doc_type_indic': self._get_text(doc_spec, 'stf:DocTypeIndic') if doc_spec is not None else '',
            'doc_ref_id': self._get_text(doc_spec, 'stf:DocRefId') if doc_spec is not None else '',
            'corr_doc_ref_id': self._get_text(doc_spec, 'stf:CorrDocRefId') if doc_spec is not None else '',
            'account_number': acct_number.text if acct_number is not None else '',
            'account_number_type': acct_number.get('AcctNumberType', '') if acct_number is not None else '',
            'closed_account': acct_number.get('ClosedAccount', 'false') if acct_number is not None else 'false',
            'dormant_account': acct_number.get('DormantAccount', 'false') if acct_number is not None else 'false',
            'balance': acct_balance.text if acct_balance is not None else '0',
            'balance_currency': acct_balance.get('currCode', 'EUR') if acct_balance is not None else 'EUR',
            'holder_type': 'individual',
            'individual': None,
            'organisation': None,
            'controlling_persons': [],
            'payments': []
        }
        
        # Extract AccountHolder
        if acct_holder is not None:
            individual = self._find(acct_holder, 'crs:Individual')
            organisation = self._find(acct_holder, 'crs:Organisation')
            
            if individual is not None:
                acct_data['holder_type'] = 'individual'
                acct_data['individual'] = self._extract_individual(individual)
            elif organisation is not None:
                acct_data['holder_type'] = 'organisation'
                acct_data['organisation'] = self._extract_organisation(organisation)
                acct_data['acct_holder_type'] = self._get_text(acct_holder, 'crs:AcctHolderType')
        
        # Extract ControllingPersons
        for cp in self._findall(account, 'crs:ControllingPerson'):
            cp_data = self._extract_controlling_person(cp)
            acct_data['controlling_persons'].append(cp_data)
        
        # Extract Payments
        for payment in self._findall(account, 'crs:Payment'):
            payment_data = {
                'type': self._get_text(payment, 'crs:Type'),
                'amount': self._get_text(payment, 'crs:PaymentAmnt'),
                'currency': self._find(payment, 'crs:PaymentAmnt').get('currCode', 'EUR') if self._find(payment, 'crs:PaymentAmnt') is not None else 'EUR'
            }
            acct_data['payments'].append(payment_data)
        
        return acct_data
    
    def _extract_individual(self, individual: ET.Element) -> Dict:
        """Extract Individual data"""
        name = self._find(individual, 'crs:Name')
        address = self._find(individual, 'crs:Address')
        birth_info = self._find(individual, 'crs:BirthInfo')
        tin = self._find(individual, 'crs:TIN')
        
        return {
            'res_country_code': self._get_text(individual, 'crs:ResCountryCode'),
            'tin': tin.text if tin is not None else '',
            'tin_issued_by': tin.get('issuedBy', '') if tin is not None else '',
            'first_name': self._get_text(name, 'crs:FirstName') if name is not None else '',
            'last_name': self._get_text(name, 'crs:LastName') if name is not None else '',
            'birth_date': self._get_text(birth_info, 'crs:BirthDate') if birth_info is not None else '',
            'address_country': self._get_text(address, 'cfc:CountryCode') if address is not None else '',
            'address_free': self._get_text(address, 'cfc:AddressFree') if address is not None else ''
        }
    
    def _extract_organisation(self, org: ET.Element) -> Dict:
        """Extract Organisation data"""
        address = self._find(org, 'crs:Address')
        org_in = self._find(org, 'crs:IN')
        
        return {
            'res_country_code': self._get_text(org, 'crs:ResCountryCode'),
            'in_value': org_in.text if org_in is not None else '',
            'in_issued_by': org_in.get('issuedBy', '') if org_in is not None else '',
            'name': self._get_text(org, 'crs:Name'),
            'address_country': self._get_text(address, 'cfc:CountryCode') if address is not None else '',
            'address_free': self._get_text(address, 'cfc:AddressFree') if address is not None else ''
        }
    
    def _extract_controlling_person(self, cp: ET.Element) -> Dict:
        """Extract ControllingPerson data"""
        individual = self._find(cp, 'crs:Individual')
        cp_type = self._get_text(cp, 'crs:CtrlgPersonType')
        
        cp_data = {
            'type': cp_type,
            'individual': None
        }
        
        if individual is not None:
            cp_data['individual'] = self._extract_individual(individual)
        
        return cp_data


def validate_crs_xml(file_path: str) -> ValidationResult:
    """Convenience function to validate a CRS XML file"""
    validator = CRSXMLValidator()
    return validator.validate_file(file_path)


def validate_crs_xml_string(xml_content: str) -> ValidationResult:
    """Convenience function to validate CRS XML from string"""
    validator = CRSXMLValidator()
    return validator.validate_string(xml_content)
