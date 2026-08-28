"""
CRS XML Generator from CSV Data
Generates CRS XML files from parsed CSV data
"""

from pathlib import Path
from lxml import etree
from datetime import datetime, timezone
from typing import Optional

from .csv_parser import CRSDataFromCSV, CRSCSVParser, ReportingFIData, AccountData
from .generator import CRS_NAMESPACES, SUPPORTED_CRS_VERSIONS, default_crs_version
from .ref_ids import new_run_id


class CRSXMLFromCSV:
    """Generate CRS XML from CSV data"""

    NAMESPACES = {
        'crs': 'urn:oecd:ties:crs:v2',
        'stf': 'urn:oecd:ties:crsstf:v5',
        'cfc': 'urn:oecd:ties:commontypesfatcacrs:v2',
        'iso': 'urn:oecd:ties:isocrstypes:v1',
        'xsi': 'http://www.w3.org/2001/XMLSchema-instance'
    }

    def __init__(self, csv_path: Path, output_path: Path,
                 crs_version: Optional[str] = None, test_mode: bool = True):
        # None means "whatever the standard schema is today" - see
        # default_crs_version() in generator.py for the cutover.
        crs_version = str(crs_version or default_crs_version()).strip()
        if crs_version not in SUPPORTED_CRS_VERSIONS:
            raise ValueError(
                f"Unsupported crs_version {crs_version!r}; "
                f"expected one of {', '.join(SUPPORTED_CRS_VERSIONS)}"
            )

        self.csv_path = Path(csv_path)
        self.output_path = Path(output_path)
        self.crs_version = crs_version
        self.test_mode = test_mode
        self.doc_ref_counter = 0
        # Unique to this run. It goes into the MessageRefId *and* every
        # DocRefId built on it: the DocRefIds used to be prefix + counter only,
        # so regenerating from the same CSV produced identifiers MDES had
        # already accepted and refused to take again.
        self.run_id = new_run_id()

        # Only the crs namespace moves between versions; the supporting schemas
        # are shared by 2.0 and 3.0.
        self.NAMESPACES = dict(self.NAMESPACES)
        self.NAMESPACES['crs'] = CRS_NAMESPACES[crs_version]

    @property
    def is_v3(self) -> bool:
        return self.crs_version == '3.0'

    def _doc_type_indic(self) -> str:
        """New-data DocTypeIndic: OECD11 in test env, OECD1 in production.

        MDES rules 50010/50011 reject the wrong family for the environment, and
        the app defaults to the test environment — the CSV path used to hardcode
        OECD1 and so always tripped 50010 on a test upload.
        """
        return 'OECD11' if self.test_mode else 'OECD1'

    def generate(self) -> Path:
        """Parse CSV and generate XML file"""
        # Parse CSV
        parser = CRSCSVParser(self.csv_path, crs_version=self.crs_version)
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
                 '%s CrsXML_v%s.xsd' % (self.NAMESPACES['crs'], self.crs_version))
        root.set('version', self.crs_version)

        return root
    
    def _get_next_doc_ref_id(self, data: CRSDataFromCSV) -> str:
        """Generate next DocRefId.

        Built on the same prefix + run id as the MessageRefId, which satisfies
        the MDES shared-prefix rule (80001) by construction and keeps the
        identifier unique across runs, not just within this file.
        """
        self.doc_ref_counter += 1
        return f"{self._message_ref_id(data)}{self.doc_ref_counter:09d}"

    def _message_ref_id(self, data: CRSDataFromCSV) -> str:
        """The delivery's MessageRefId: the MDES 80017 prefix plus the run id."""
        return (
            f"{data.message_spec.transmitting_country}"
            f"{data.message_spec.tax_year}"
            f"{data.message_spec.sending_company_in}"
            f"{self.run_id}"
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
        etree.SubElement(msg_spec, '{%s}MessageRefId' % crs).text = self._message_ref_id(data)
        
        etree.SubElement(msg_spec, '{%s}MessageTypeIndic' % crs).text = 'CRS701'
        etree.SubElement(msg_spec, '{%s}ReportingPeriod' % crs).text = f"{data.message_spec.tax_year}-12-31"
        etree.SubElement(msg_spec, '{%s}Timestamp' % crs).text = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    
    def _add_crs_body(self, root: etree._Element, data: CRSDataFromCSV) -> None:
        """Add CrsBody element with all ReportingFIs and accounts"""
        crs = self.NAMESPACES['crs']

        for fi in data.reporting_fis:
            crs_body = etree.SubElement(root, '{%s}CrsBody' % crs)
            self._add_reporting_fi(crs_body, fi, data)

            # CrsBody is (ReportingFI, ReportingGroup+) and AccountReport lives
            # inside ReportingGroup — attaching reports straight to CrsBody made
            # every CSV-generated file XSD-invalid.
            reporting_group = etree.SubElement(crs_body, '{%s}ReportingGroup' % crs)
            for account in fi.accounts:
                self._add_account_report(reporting_group, account, data)
    
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
        
        # AddressFix_Type is a strict sequence: Street, BuildingIdentifier,
        # SuiteIdentifier, FloorIdentifier, DistrictName, POB, PostCode, City,
        # CountrySubentity. PostCode therefore precedes City.
        address_fix = etree.SubElement(address, '{%s}AddressFix' % cfc)
        etree.SubElement(address_fix, '{%s}Street' % cfc).text = fi.address_street
        etree.SubElement(address_fix, '{%s}BuildingIdentifier' % cfc).text = fi.address_building_number
        etree.SubElement(address_fix, '{%s}PostCode' % cfc).text = fi.address_post_code
        etree.SubElement(address_fix, '{%s}City' % cfc).text = fi.address_city

        # DocSpec
        doc_spec = etree.SubElement(reporting_fi, '{%s}DocSpec' % crs)
        etree.SubElement(doc_spec, '{%s}DocTypeIndic' % stf).text = self._doc_type_indic()
        etree.SubElement(doc_spec, '{%s}DocRefId' % stf).text = self._get_next_doc_ref_id(data)
    
    def _add_account_report(self, parent: etree._Element, account: AccountData, data: CRSDataFromCSV) -> None:
        """Add AccountReport element"""
        crs = self.NAMESPACES['crs']
        cfc = self.NAMESPACES['cfc']
        stf = self.NAMESPACES['stf']
        
        account_report = etree.SubElement(parent, '{%s}AccountReport' % crs)

        # DocSpec
        doc_spec = etree.SubElement(account_report, '{%s}DocSpec' % crs)
        etree.SubElement(doc_spec, '{%s}DocTypeIndic' % stf).text = self._doc_type_indic()
        etree.SubElement(doc_spec, '{%s}DocRefId' % stf).text = self._get_next_doc_ref_id(data)

        # AccountNumber
        acc_num = etree.SubElement(account_report, '{%s}AccountNumber' % crs)
        acc_num.text = account.account_number
        acc_num.set('AcctNumberType', account.acct_number_type)
        acc_num.set('ClosedAccount', str(account.is_closed).lower())
        acc_num.set('DormantAccount', str(account.is_dormant).lower())

        # AccountHolder
        account_holder = etree.SubElement(account_report, '{%s}AccountHolder' % crs)

        # AccountHolder_Type in CRS 3.0 is (EquityInterestType*, SelfCert,
        # (Individual | Organisation, AcctHolderType)) — both new elements lead
        # the sequence, so they are written before the party.
        if self.is_v3:
            for equity_interest_type in account.equity_interest_types:
                etree.SubElement(
                    account_holder, '{%s}EquityInterestType' % crs).text = equity_interest_type
            etree.SubElement(account_holder, '{%s}SelfCert' % crs).text = account.self_cert

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

        # CRS 3.0 closes the AccountReport sequence with DDProcedure,
        # AccountType and an optional JointAccount, so these come last.
        if self.is_v3:
            etree.SubElement(account_report, '{%s}DDProcedure' % crs).text = account.dd_procedure
            etree.SubElement(account_report, '{%s}AccountType' % crs).text = account.account_type
            if account.joint_account_number is not None:
                joint = etree.SubElement(account_report, '{%s}JointAccount' % crs)
                etree.SubElement(joint, '{%s}Number' % crs).text = str(account.joint_account_number)
    
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
        
        # AcctHolderType is mandatory whenever Organisation is present, not only
        # when a controlling person exists. CRS101 is the passive NFE type and
        # requires a controlling person (MDES 60006); without one the holder is
        # reported as CRS103, which must not have a controlling person (60005).
        etree.SubElement(parent, '{%s}AcctHolderType' % crs).text = (
            'CRS101' if org.controlling_person else 'CRS103')
    
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

        # CtrlgPersonType is REQUIRED when AcctHolderType is CRS101, and CRS 3.0
        # promotes it to mandatory for every controlling person.
        etree.SubElement(ctrl_person, '{%s}CtrlgPersonType' % crs).text = cp.ctrlg_person_type

        # SelfCert closes ControllingPerson_Type in CRS 3.0.
        if self.is_v3:
            etree.SubElement(ctrl_person, '{%s}SelfCert' % crs).text = cp.self_cert


def generate_from_csv(csv_path: str, output_path: str,
                      crs_version: Optional[str] = None,
                      test_mode: bool = True) -> Path:
    """
    Main function to generate CRS XML from CSV file.

    Args:
        csv_path: Path to input CSV file
        output_path: Path for output XML file
        crs_version: CRS schema version to emit ('2.0' or '3.0'); None picks
            the standard version for today (see default_crs_version)
        test_mode: Emit test-environment DocTypeIndic (OECD11) rather than
            production (OECD1)

    Returns:
        Path to generated XML file
    """
    generator = CRSXMLFromCSV(Path(csv_path), Path(output_path),
                              crs_version=crs_version, test_mode=test_mode)
    return generator.generate()
