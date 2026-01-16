"""
CBC CSV Generator - Generate CBC XML from CSV data
"""

from pathlib import Path
from lxml import etree
from typing import Optional
import uuid
from datetime import datetime
import logging

from .cbc_csv_parser import CBCCSVParser, CBCDataFromCSV, CBCCSVValidationError

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# CBC Namespaces
CBC_NS = "urn:oecd:ties:cbc:v2"
STF_NS = "urn:oecd:ties:cbcstf:v5"
ISO_NS = "urn:oecd:ties:isocbctypes:v1"
XSI_NS = "http://www.w3.org/2001/XMLSchema-instance"

NSMAP = {
    None: CBC_NS,
    'stf': STF_NS,
    'iso': ISO_NS,
    'xsi': XSI_NS
}


class CBCCSVGenerator:
    """Generate CBC XML from CSV data"""
    
    def __init__(self, csv_path: Path, output_path: Optional[Path] = None, test_mode: bool = True):
        self.csv_path = Path(csv_path)
        self.output_path = output_path
        self.test_mode = test_mode
        self.doc_type_indic = 'OECD11' if test_mode else 'OECD1'
    
    def generate(self) -> str:
        """Generate CBC XML from CSV and return output path"""
        # Parse CSV
        parser = CBCCSVParser(self.csv_path)
        data = parser.parse()
        
        logger.info("=" * 60)
        logger.info("CBC CSV Generator")
        logger.info("=" * 60)
        logger.info(f"Parsed CSV: {self.csv_path}")
        logger.info(f"Jurisdictions: {len(data.cbc_reports)}")
        logger.info(f"Test mode: {self.test_mode}")
        
        # Generate XML
        root = self._create_root()
        self._add_message_spec(root, data)
        self._add_cbc_body(root, data)
        
        # Determine output path
        if not self.output_path:
            self.output_path = self.csv_path.with_suffix('.xml')
        
        # Write to file
        tree = etree.ElementTree(root)
        tree.write(
            str(self.output_path),
            pretty_print=True,
            xml_declaration=True,
            encoding='UTF-8'
        )
        
        logger.info("=" * 60)
        logger.info("CBC XML generation complete!")
        logger.info(f"Output: {self.output_path}")
        logger.info("=" * 60)
        
        return str(self.output_path)
    
    def _create_root(self) -> etree._Element:
        """Create root CBC_OECD element"""
        root = etree.Element(
            "CBC_OECD",
            nsmap=NSMAP,
            version="2.0"
        )
        root.set(f"{{{XSI_NS}}}schemaLocation", 
                 "urn:oecd:ties:cbc:v2 CbcXML_v2.0.xsd")
        return root
    
    def _create_element(self, parent: etree._Element, tag: str, text: str = None, 
                        ns: str = None) -> etree._Element:
        """Create a child element"""
        if ns:
            elem = etree.SubElement(parent, f"{{{ns}}}{tag}")
        else:
            elem = etree.SubElement(parent, tag)
        if text is not None:
            elem.text = str(text)
        return elem
    
    def _generate_message_ref_id(self, data: CBCDataFromCSV) -> str:
        """Generate a unique message reference ID"""
        country = data.message_spec.transmitting_country
        year = data.message_spec.tax_year
        tin = data.message_spec.sending_entity_in
        unique = uuid.uuid4().hex[:8]
        return f"{country}{year}{tin}{unique}"
    
    def _generate_doc_ref_id(self, data: CBCDataFromCSV, suffix: str) -> str:
        """Generate a unique document reference ID"""
        country = data.message_spec.transmitting_country
        year = data.message_spec.tax_year
        tin = data.message_spec.sending_entity_in
        unique = uuid.uuid4().hex[:8]
        return f"{country}{year}{tin}{suffix}{unique}"
    
    def _add_message_spec(self, root: etree._Element, data: CBCDataFromCSV) -> None:
        """Add MessageSpec element"""
        msg_spec = self._create_element(root, "MessageSpec")
        
        self._create_element(msg_spec, "SendingEntityIN", data.message_spec.sending_entity_in)
        self._create_element(msg_spec, "TransmittingCountry", data.message_spec.transmitting_country)
        self._create_element(msg_spec, "ReceivingCountry", data.message_spec.receiving_country)
        self._create_element(msg_spec, "MessageType", "CBC")
        self._create_element(msg_spec, "MessageRefId", self._generate_message_ref_id(data))
        self._create_element(msg_spec, "MessageTypeIndic", "CBC401")  # New data
        self._create_element(msg_spec, "ReportingPeriod", f"{data.message_spec.tax_year}-12-31")
        self._create_element(msg_spec, "Timestamp", datetime.utcnow().isoformat() + "Z")
    
    def _add_cbc_body(self, root: etree._Element, data: CBCDataFromCSV) -> None:
        """Add CbcBody element"""
        body = self._create_element(root, "CbcBody")
        
        # Add ReportingEntity
        self._add_reporting_entity(body, data)
        
        # Add CbcReports
        for report in data.cbc_reports:
            self._add_cbc_report(body, data, report)
        
        # Add AdditionalInfo (optional, empty for now)
    
    def _add_reporting_entity(self, parent: etree._Element, data: CBCDataFromCSV) -> None:
        """Add ReportingEntity element"""
        re = self._create_element(parent, "ReportingEntity")
        
        # Entity
        entity = self._create_element(re, "Entity")
        
        # ResCountryCode
        self._create_element(entity, "ResCountryCode", data.reporting_entity.country_code)
        
        # TIN
        tin_elem = self._create_element(entity, "TIN", data.reporting_entity.tin)
        tin_elem.set("issuedBy", data.reporting_entity.country_code)
        
        # IN (optional)
        self._create_element(entity, "IN", data.message_spec.sending_entity_in, ns=STF_NS)
        
        # Name
        name_elem = self._create_element(entity, "Name", data.reporting_entity.name)
        
        # Address (simple free-form)
        address = self._create_element(entity, "Address")
        self._create_element(address, "CountryCode", data.reporting_entity.country_code)
        self._create_element(address, "AddressFree", f"Address of {data.reporting_entity.name}")
        
        # NameMNEGroup
        self._create_element(re, "NameMNEGroup", data.reporting_entity.mne_group_name)
        
        # DocSpec
        doc_spec = self._create_element(re, "DocSpec", ns=STF_NS)
        self._create_element(doc_spec, "DocTypeIndic", self.doc_type_indic, ns=STF_NS)
        self._create_element(doc_spec, "DocRefId", self._generate_doc_ref_id(data, "RE"), ns=STF_NS)
        
        # ReportingRole
        self._create_element(re, "ReportingRole", data.reporting_entity.reporting_role)
    
    def _add_cbc_report(self, parent: etree._Element, data: CBCDataFromCSV, 
                        report) -> None:
        """Add CbcReport element for a jurisdiction"""
        cbc_report = self._create_element(parent, "CbcReports")
        
        # DocSpec
        doc_spec = self._create_element(cbc_report, "DocSpec", ns=STF_NS)
        self._create_element(doc_spec, "DocTypeIndic", self.doc_type_indic, ns=STF_NS)
        self._create_element(doc_spec, "DocRefId", 
                            self._generate_doc_ref_id(data, f"CR{report.jurisdiction_code}"), ns=STF_NS)
        
        # ResCountryCode
        self._create_element(cbc_report, "ResCountryCode", report.jurisdiction_code)
        
        # Summary
        summary = self._create_element(cbc_report, "Summary")
        
        # Revenues
        revenues = self._create_element(summary, "Revenues")
        unrelated = self._create_element(revenues, "Unrelated", f"{report.revenue_unrelated:.2f}")
        unrelated.set("currCode", report.currency)
        related = self._create_element(revenues, "Related", f"{report.revenue_related:.2f}")
        related.set("currCode", report.currency)
        total = self._create_element(revenues, "Total", f"{report.revenue_total:.2f}")
        total.set("currCode", report.currency)
        
        # ProfitOrLoss
        profit = self._create_element(summary, "ProfitOrLoss", f"{report.profit_loss:.2f}")
        profit.set("currCode", report.currency)
        
        # TaxPaid
        tax_paid = self._create_element(summary, "TaxPaid", f"{report.tax_paid:.2f}")
        tax_paid.set("currCode", report.currency)
        
        # TaxAccrued
        tax_accrued = self._create_element(summary, "TaxAccrued", f"{report.tax_accrued:.2f}")
        tax_accrued.set("currCode", report.currency)
        
        # Capital
        capital = self._create_element(summary, "Capital", f"{report.capital:.2f}")
        capital.set("currCode", report.currency)
        
        # Earnings
        earnings = self._create_element(summary, "Earnings", f"{report.earnings:.2f}")
        earnings.set("currCode", report.currency)
        
        # NbEmployees
        self._create_element(summary, "NbEmployees", str(report.num_employees))
        
        # Assets
        assets = self._create_element(summary, "Assets", f"{report.tangible_assets:.2f}")
        assets.set("currCode", report.currency)
        
        # ConstEntities
        for entity in report.const_entities:
            self._add_const_entity(cbc_report, data, entity, report.jurisdiction_code)
    
    def _add_const_entity(self, parent: etree._Element, data: CBCDataFromCSV,
                          entity, jurisdiction: str) -> None:
        """Add ConstEntity element"""
        const_entities = self._create_element(parent, "ConstEntities")
        
        # ConstEntity (organization info)
        const_entity = self._create_element(const_entities, "ConstEntity")
        
        # ResCountryCode
        self._create_element(const_entity, "ResCountryCode", entity.country_code)
        
        # TIN
        tin_elem = self._create_element(const_entity, "TIN", entity.tin)
        tin_elem.set("issuedBy", entity.country_code)
        
        # IN (optional)
        self._create_element(const_entity, "IN", entity.tin, ns=STF_NS)
        
        # Name
        self._create_element(const_entity, "Name", entity.name)
        
        # Address
        address = self._create_element(const_entity, "Address")
        self._create_element(address, "CountryCode", entity.country_code)
        self._create_element(address, "AddressFree", f"Address of {entity.name}")
        
        # Role
        self._create_element(const_entities, "Role", entity.role)
        
        # IncorpCountryCode
        self._create_element(const_entities, "IncorpCountryCode", entity.incorporation_country)
        
        # BizActivities
        self._create_element(const_entities, "BizActivities", entity.biz_activity1)
        if entity.biz_activity2:
            self._create_element(const_entities, "BizActivities", entity.biz_activity2)
        
        # OtherEntityInfo (required if CBC513)
        if entity.other_entity_info or entity.biz_activity1 == 'CBC513' or entity.biz_activity2 == 'CBC513':
            info = entity.other_entity_info or f"Additional information for {entity.name}"
            self._create_element(const_entities, "OtherEntityInfo", info)


def generate_cbc_from_csv(csv_path: str, output_path: str = None, 
                          test_mode: bool = True) -> str:
    """
    Generate CBC XML from CSV file.
    
    Args:
        csv_path: Path to input CSV file
        output_path: Path to output XML file (optional, defaults to csv_path with .xml)
        test_mode: Use test DocTypeIndic (OECD11) instead of production (OECD1)
    
    Returns:
        Path to generated XML file
    """
    generator = CBCCSVGenerator(
        csv_path=Path(csv_path),
        output_path=Path(output_path) if output_path else None,
        test_mode=test_mode
    )
    return generator.generate()
