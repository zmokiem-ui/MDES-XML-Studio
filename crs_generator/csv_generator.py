"""
CRS XML Generator from CSV Data
Generates CRS XML files from parsed CSV data
"""

from pathlib import Path
from lxml import etree
from datetime import datetime
from typing import Optional
import uuid

from .csv_parser import CRSDataFromCSV, CRSCSVParser, ReportingFIData, AccountData


class CRSXMLFromCSV:
    """Generate CRS XML from CSV data"""
    
    NAMESPACES = {
        'crs': 'urn:oecd:ties:crs:v2',
        'stf': 'urn:oecd:ties:crsstf:v5',
        'cfc': 'urn:oecd:ties:commontypesfatcacrs:v2',
        'iso': 'urn:oecd:ties:isocrstypes:v1',
        'xsi': 'http://www.w3.org/2001/XMLSchema-instance'
    }
    
    def __init__(self, csv_path: Path, output_path: Path):
        self.csv_path = Path(csv_path)
        self.output_path = Path(output_path)
        self.doc_ref_counter = 0
        self.random_id = str(uuid.uuid4().int)[:9].zfill(9)
    
    def generate(self) -> Path:
        """Parse CSV and generate XML file"""
        # Parse CSV
        parser = CRSCSVParser(self.csv_path)
        data = parser.parse()
        
        # Build XML
        root = self._build_root()
        self._add_message_spec(root, data)
        self._add_crs_body(root, data)
        
        # Write to file
        tree = etree.ElementTree(root)
        tree.write(
            str(self.output_path),
            encoding='UTF-8',
            xml_declaration=True,
            pretty_print=True
        )
        
        return self.output_path
    
    def _build_root(self) -> etree._Element:
        """Build root CRS_OECD element with namespaces"""
        nsmap = {
            None: self.NAMESPACES['crs'],  # Default namespace
            'crs': self.NAMESPACES['crs'],
            'stf': self.NAMESPACES['stf'],
            'cfc': self.NAMESPACES['cfc'],
            'iso': self.NAMESPACES['iso'],
            'xsi': self.NAMESPACES['xsi']
        }
        
        root = etree.Element(
            '{%s}CRS_OECD' % self.NAMESPACES['crs'],
            nsmap=nsmap
        )
        
        root.set('{%s}schemaLocation' % self.NAMESPACES['xsi'], 
                 'urn:oecd:ties:crs:v1 CrsXML_v2.0.xsd')
        root.set('version', '2.0')
        
        return root
    
    def _get_next_doc_ref_id(self, data: CRSDataFromCSV) -> str:
        """Generate next DocRefId"""
        self.doc_ref_counter += 1
        return (
            f"{data.message_spec.transmitting_country}"
            f"{data.message_spec.tax_year}"
            f"{data.message_spec.sending_company_in}"
            f"{str(self.doc_ref_counter).zfill(9)}"
        )
    
    def _add_message_spec(self, root: etree._Element, data: CRSDataFromCSV) -> None:
        """Add MessageSpec element"""
        crs = self.NAMESPACES['crs']
        
        msg_spec = etree.SubElement(root, '{%s}MessageSpec' % crs)
        
        etree.SubElement(msg_spec, '{%s}SendingCompanyIN' % crs).text = data.message_spec.sending_company_in
        etree.SubElement(msg_spec, '{%s}TransmittingCountry' % crs).text = data.message_spec.transmitting_country
        etree.SubElement(msg_spec, '{%s}ReceivingCountry' % crs).text = data.message_spec.receiving_country
        etree.SubElement(msg_spec, '{%s}MessageType' % crs).text = 'CRS'
        
        # MessageRefId
        msg_ref_id = (
            f"{data.message_spec.transmitting_country}"
            f"{data.message_spec.tax_year}"
            f"{data.message_spec.sending_company_in}"
            f"{self.random_id}000000001"
        )
        etree.SubElement(msg_spec, '{%s}MessageRefId' % crs).text = msg_ref_id
        
        etree.SubElement(msg_spec, '{%s}MessageTypeIndic' % crs).text = 'CRS701'
        etree.SubElement(msg_spec, '{%s}ReportingPeriod' % crs).text = f"{data.message_spec.tax_year}-12-31"
        etree.SubElement(msg_spec, '{%s}Timestamp' % crs).text = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    
    def _add_crs_body(self, root: etree._Element, data: CRSDataFromCSV) -> None:
        """Add CrsBody element with all ReportingFIs and accounts"""
        crs = self.NAMESPACES['crs']
        
        for fi in data.reporting_fis:
            crs_body = etree.SubElement(root, '{%s}CrsBody' % crs)
            self._add_reporting_fi(crs_body, fi, data)
            
            for account in fi.accounts:
                self._add_account_report(crs_body, account, data)
    
    def _add_reporting_fi(self, parent: etree._Element, fi: ReportingFIData, data: CRSDataFromCSV) -> None:
        """Add ReportingFI element"""
        crs = self.NAMESPACES['crs']
        cfc = self.NAMESPACES['cfc']
        stf = self.NAMESPACES['stf']
        
        reporting_fi = etree.SubElement(parent, '{%s}ReportingFI' % crs)
        
        etree.SubElement(reporting_fi, '{%s}ResCountryCode' % crs).text = data.message_spec.transmitting_country
        
        tin = etree.SubElement(reporting_fi, '{%s}IN' % crs)
        tin.text = fi.tin
        tin.set('issuedBy', data.message_spec.transmitting_country)
        
        etree.SubElement(reporting_fi, '{%s}Name' % crs).text = fi.name
        
        # Address
        address = etree.SubElement(reporting_fi, '{%s}Address' % crs)
        address.set('legalAddressType', 'OECD301')
        
        etree.SubElement(address, '{%s}CountryCode' % cfc).text = fi.address_country_code
        
        address_fix = etree.SubElement(address, '{%s}AddressFix' % cfc)
        etree.SubElement(address_fix, '{%s}Street' % cfc).text = fi.address_street
        etree.SubElement(address_fix, '{%s}BuildingIdentifier' % cfc).text = fi.address_building_number
        etree.SubElement(address_fix, '{%s}City' % cfc).text = fi.address_city
        etree.SubElement(address_fix, '{%s}PostCode' % cfc).text = fi.address_post_code
        
        # DocSpec
        doc_spec = etree.SubElement(reporting_fi, '{%s}DocSpec' % crs)
        etree.SubElement(doc_spec, '{%s}DocTypeIndic' % stf).text = 'OECD1'
        etree.SubElement(doc_spec, '{%s}DocRefId' % stf).text = self._get_next_doc_ref_id(data)
    
    def _add_account_report(self, parent: etree._Element, account: AccountData, data: CRSDataFromCSV) -> None:
        """Add AccountReport element"""
        crs = self.NAMESPACES['crs']
        cfc = self.NAMESPACES['cfc']
        stf = self.NAMESPACES['stf']
        
        account_report = etree.SubElement(parent, '{%s}AccountReport' % crs)
        
        # DocSpec
        doc_spec = etree.SubElement(account_report, '{%s}DocSpec' % crs)
        etree.SubElement(doc_spec, '{%s}DocTypeIndic' % stf).text = 'OECD1'
        etree.SubElement(doc_spec, '{%s}DocRefId' % stf).text = self._get_next_doc_ref_id(data)
        
        # AccountNumber
        acc_num = etree.SubElement(account_report, '{%s}AccountNumber' % crs)
        acc_num.text = account.account_number
        acc_num.set('AcctNumberType', 'OECD601')
        acc_num.set('ClosedAccount', str(account.is_closed).lower())
        acc_num.set('DormantAccount', str(account.is_dormant).lower())
        
        # AccountHolder
        account_holder = etree.SubElement(account_report, '{%s}AccountHolder' % crs)
        
        if account.individual:
            self._add_individual(account_holder, account, data)
        else:
            self._add_organisation(account_holder, account, data)
            # Add ControllingPerson as sibling of AccountHolder (not inside it)
            if account.organisation and account.organisation.controlling_person:
                self._add_controlling_person(account_report, account.organisation.controlling_person)
        
        # AccountBalance
        balance = etree.SubElement(account_report, '{%s}AccountBalance' % crs)
        balance.text = f"{account.balance:.2f}"
        balance.set('currCode', account.currency)
        
        # Payment
        if account.payment:
            payment = etree.SubElement(account_report, '{%s}Payment' % crs)
            etree.SubElement(payment, '{%s}Type' % crs).text = account.payment.payment_type
            payment_amt = etree.SubElement(payment, '{%s}PaymentAmnt' % crs)
            payment_amt.text = f"{account.payment.amount:.2f}"
            payment_amt.set('currCode', account.payment.currency)
    
    def _add_individual(self, parent: etree._Element, account: AccountData, data: CRSDataFromCSV) -> None:
        """Add Individual account holder"""
        crs = self.NAMESPACES['crs']
        cfc = self.NAMESPACES['cfc']
        
        ind = account.individual
        individual = etree.SubElement(parent, '{%s}Individual' % crs)
        
        etree.SubElement(individual, '{%s}ResCountryCode' % crs).text = ind.res_country_code
        
        tin = etree.SubElement(individual, '{%s}TIN' % crs)
        tin.text = ind.tin
        tin.set('issuedBy', ind.tin_country_code)
        
        name = etree.SubElement(individual, '{%s}Name' % crs)
        etree.SubElement(name, '{%s}FirstName' % crs).text = ind.first_name
        etree.SubElement(name, '{%s}LastName' % crs).text = ind.last_name
        
        address = etree.SubElement(individual, '{%s}Address' % crs)
        etree.SubElement(address, '{%s}CountryCode' % cfc).text = ind.address_country_code
        etree.SubElement(address, '{%s}AddressFree' % cfc).text = f"{ind.address_street}, {ind.address_city} {ind.address_post_code}"
        
        birth_info = etree.SubElement(individual, '{%s}BirthInfo' % crs)
        etree.SubElement(birth_info, '{%s}BirthDate' % crs).text = ind.birth_date
    
    def _add_organisation(self, parent: etree._Element, account: AccountData, data: CRSDataFromCSV) -> None:
        """Add Organisation account holder (ControllingPerson added separately at AccountReport level)"""
        crs = self.NAMESPACES['crs']
        cfc = self.NAMESPACES['cfc']
        
        org = account.organisation
        organisation = etree.SubElement(parent, '{%s}Organisation' % crs)
        
        etree.SubElement(organisation, '{%s}ResCountryCode' % crs).text = org.res_country_code
        
        tin = etree.SubElement(organisation, '{%s}IN' % crs)
        tin.text = org.tin
        tin.set('issuedBy', org.tin_country_code)
        tin.set('INType', 'TIN')
        
        etree.SubElement(organisation, '{%s}Name' % crs).text = org.name
        
        address = etree.SubElement(organisation, '{%s}Address' % crs)
        etree.SubElement(address, '{%s}CountryCode' % cfc).text = org.address_country_code
        etree.SubElement(address, '{%s}AddressFree' % cfc).text = f"{org.address_street}, {org.address_city} {org.address_post_code}"
        
        # Add AcctHolderType for CRS101 (required when there's a controlling person)
        if org.controlling_person:
            etree.SubElement(parent, '{%s}AcctHolderType' % crs).text = 'CRS101'
    
    def _add_controlling_person(self, account_report: etree._Element, cp) -> None:
        """Add ControllingPerson as sibling of AccountHolder within AccountReport"""
        crs = self.NAMESPACES['crs']
        cfc = self.NAMESPACES['cfc']
        
        ctrl_person = etree.SubElement(account_report, '{%s}ControllingPerson' % crs)
        
        individual = etree.SubElement(ctrl_person, '{%s}Individual' % crs)
        
        etree.SubElement(individual, '{%s}ResCountryCode' % crs).text = cp.res_country_code
        
        tin = etree.SubElement(individual, '{%s}TIN' % crs)
        tin.text = cp.tin
        tin.set('issuedBy', cp.tin_country_code)
        
        name = etree.SubElement(individual, '{%s}Name' % crs)
        etree.SubElement(name, '{%s}FirstName' % crs).text = cp.first_name
        etree.SubElement(name, '{%s}LastName' % crs).text = cp.last_name
        
        address = etree.SubElement(individual, '{%s}Address' % crs)
        etree.SubElement(address, '{%s}CountryCode' % cfc).text = cp.address_country_code
        etree.SubElement(address, '{%s}AddressFree' % cfc).text = f"{cp.address_street}, {cp.address_city}"
        
        birth_info = etree.SubElement(individual, '{%s}BirthInfo' % crs)
        etree.SubElement(birth_info, '{%s}BirthDate' % crs).text = cp.birth_date
        
        # CtrlgPersonType is REQUIRED when AcctHolderType is CRS101
        etree.SubElement(ctrl_person, '{%s}CtrlgPersonType' % crs).text = 'CRS801'


def generate_from_csv(csv_path: str, output_path: str) -> Path:
    """
    Main function to generate CRS XML from CSV file.
    
    Args:
        csv_path: Path to input CSV file
        output_path: Path for output XML file
        
    Returns:
        Path to generated XML file
    """
    generator = CRSXMLFromCSV(Path(csv_path), Path(output_path))
    return generator.generate()
