"""
CBC (Country-by-Country) XML Generator

This generator creates CBC XML test data for Country-by-Country reporting,
following the OECD CBC XML Schema v2.0.

Features:
1. Generates ReportingEntity (Ultimate Parent/Surrogate Parent)
2. Generates CbcReports per tax jurisdiction
3. Supports multiple ConstEntities per report
4. Handles corrections and deletions (OECD2/OECD3)
5. Supports varied currencies per jurisdiction
6. Generates realistic financial data
"""

from pathlib import Path
from lxml import etree
from dataclasses import dataclass, field
from typing import Optional, List, Dict
import random
from datetime import datetime, date
from faker import Faker
import logging
import uuid

from .reportable_jurisdictions import get_reportable_jurisdictions, get_all_country_codes

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


# CBC-specific constants
CBC_DOC_TYPE_INDIC = {
    'new': 'OECD1',
    'corrected': 'OECD2',
    'void': 'OECD3',
    'new_test': 'OECD11',
    'corrected_test': 'OECD12',
    'void_test': 'OECD13'
}

CBC_MESSAGE_TYPE_INDIC = {
    'new': 'CBC401',
    'corrections': 'CBC402'
}

CBC_REPORTING_ROLES = {
    'ultimate_parent': 'CBC701',
    'surrogate_parent': 'CBC702',
    'constituent_entity': 'CBC703'
}

CBC_ENTITY_ROLES = {
    'ultimate_parent': 'CBC801',
    'reporting_entity': 'CBC802',
    'both': 'CBC803'
}

CBC_BUSINESS_ACTIVITIES = [
    ('CBC501', 'Research and Development'),
    ('CBC502', 'Holding or Managing IP'),
    ('CBC503', 'Purchasing or Procurement'),
    ('CBC504', 'Manufacturing or Production'),
    ('CBC505', 'Sales, Marketing or Distribution'),
    ('CBC506', 'Administrative, Management or Support Services'),
    ('CBC507', 'Provision of Services to unrelated parties'),
    ('CBC508', 'Internal Group Finance'),
    ('CBC509', 'Regulated Financial Services'),
    ('CBC510', 'Insurance'),
    ('CBC511', 'Holding shares or other equity instruments'),
    ('CBC512', 'Dormant'),
    ('CBC513', 'Other')
]

# Currencies for variety
CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'CNY']

# Namespaces
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


@dataclass
class CBCGeneratorConfig:
    """Configuration for CBC XML generation."""
    # Basic info
    transmitting_country: str = "NL"
    receiving_country: str = "NL"  # Usually same as transmitting for CBC
    tax_year: int = 2023
    sending_entity_in: str = "123456789"  # TIN of sending entity
    language: str = "EN"
    
    # Reporting Entity info
    reporting_entity_tin: str = ""
    reporting_entity_name: str = ""
    mne_group_name: str = ""
    reporting_role: str = "CBC701"  # Ultimate Parent Entity
    
    # Scale
    num_cbc_reports: int = 3  # Number of jurisdictions/countries
    const_entities_per_report: int = 2  # Constituent entities per report
    
    # Jurisdiction selection
    jurisdiction_countries: List[str] = field(default_factory=list)  # If empty, random selection
    
    # Financial data ranges (in thousands)
    revenue_min: int = 1000
    revenue_max: int = 100000
    employee_min: int = 10
    employee_max: int = 5000
    
    # Output
    output_path: Optional[Path] = None
    
    # Test mode
    test_mode: bool = True  # Use OECD11 instead of OECD1
    
    def __post_init__(self):
        if not self.jurisdiction_countries:
            # Default to some major jurisdictions
            self.jurisdiction_countries = ['NL', 'US', 'GB', 'DE', 'FR', 'JP', 'AU', 'SG', 'CH', 'IE']


class CBCGenerator:
    """Generator for CBC XML test data."""
    
    def __init__(self, config: CBCGeneratorConfig):
        self.config = config
        self.faker = Faker()
        self.doc_ref_counter = 0
        
    def _generate_doc_ref_id(self) -> str:
        """Generate a unique DocRefId - must match MessageRefId prefix.
        
        Format: {TransmittingCountry}{Year}{TIN}{UUID}
        All DocRefIds must use the same prefix as MessageRefId.
        """
        self.doc_ref_counter += 1
        unique_id = str(uuid.uuid4())
        # Always use transmitting country to match MessageRefId prefix
        return f"{self.config.transmitting_country}{self.config.tax_year}{self.config.sending_entity_in}{unique_id}"
    
    def _generate_message_ref_id(self) -> str:
        """Generate a unique MessageRefId."""
        unique_id = str(uuid.uuid4())[:8]
        return f"{self.config.transmitting_country}{self.config.tax_year}{self.config.sending_entity_in}{unique_id}"
    
    def _get_doc_type_indic(self, doc_type: str = 'new') -> str:
        """Get DocTypeIndic based on mode and type."""
        if self.config.test_mode:
            return CBC_DOC_TYPE_INDIC.get(f"{doc_type}_test", 'OECD11')
        return CBC_DOC_TYPE_INDIC.get(doc_type, 'OECD1')
    
    def _get_reporting_currency(self) -> str:
        """Get the reporting currency - must be consistent for entire document.
        
        CBC requires all amounts to be in the same currency (the reporting MNE's currency).
        """
        if not hasattr(self, '_reporting_currency'):
            # Set once and reuse for entire document
            self._reporting_currency = random.choice(CURRENCIES)
        return self._reporting_currency
    
    def _random_business_activity(self) -> str:
        """Get a random business activity code."""
        return random.choice(CBC_BUSINESS_ACTIVITIES)[0]
    
    def _generate_financial_data(self, currency: str) -> Dict:
        """Generate realistic financial summary data."""
        # Generate related/unrelated revenues
        unrelated = random.randint(self.config.revenue_min, self.config.revenue_max) * 1000
        related = random.randint(self.config.revenue_min // 2, self.config.revenue_max // 2) * 1000
        total = unrelated + related
        
        # Profit is typically 5-30% of total revenue
        profit_margin = random.uniform(0.05, 0.30)
        profit_or_loss = int(total * profit_margin)
        
        # Tax is typically 15-35% of profit
        tax_rate = random.uniform(0.15, 0.35)
        tax_paid = int(profit_or_loss * tax_rate * random.uniform(0.8, 1.0))
        tax_accrued = int(profit_or_loss * tax_rate)
        
        # Capital and earnings
        capital = random.randint(self.config.revenue_min * 2, self.config.revenue_max * 3) * 1000
        earnings = random.randint(profit_or_loss // 2, profit_or_loss)
        
        # Assets
        assets = random.randint(capital, capital * 3)
        
        # Employees
        nb_employees = random.randint(self.config.employee_min, self.config.employee_max)
        
        return {
            'currency': currency,
            'unrelated': unrelated,
            'related': related,
            'total': total,
            'profit_or_loss': profit_or_loss,
            'tax_paid': tax_paid,
            'tax_accrued': tax_accrued,
            'capital': capital,
            'earnings': earnings,
            'assets': assets,
            'nb_employees': nb_employees
        }
    
    def _create_element(self, parent, tag, text=None, attrib=None, ns=None):
        """Create an XML element with optional text and attributes."""
        if ns:
            elem = etree.SubElement(parent, f"{{{ns}}}{tag}", attrib or {})
        else:
            elem = etree.SubElement(parent, tag, attrib or {})
        if text is not None:
            elem.text = str(text)
        return elem
    
    def _create_address(self, parent, country_code: str, faker_locale: str = None):
        """Create an Address element with realistic data."""
        address = self._create_element(parent, "Address")
        self._create_element(address, "CountryCode", country_code)
        
        address_fix = self._create_element(address, "AddressFix")
        self._create_element(address_fix, "Street", self.faker.street_address())
        self._create_element(address_fix, "BuildingIdentifier", str(random.randint(1, 999)))
        self._create_element(address_fix, "PostCode", self.faker.postcode())
        self._create_element(address_fix, "City", self.faker.city())
        
        return address
    
    def _create_entity(self, parent, country_code: str, tin: str, name: str):
        """Create an Entity element (used for ReportingEntity and ConstEntity)."""
        self._create_element(parent, "ResCountryCode", country_code)
        tin_elem = self._create_element(parent, "TIN", tin)
        tin_elem.set("issuedBy", country_code)
        self._create_element(parent, "Name", name)
        self._create_address(parent, country_code)
    
    def _create_doc_spec(self, parent, doc_type_indic: str, doc_ref_id: str, 
                         corr_doc_ref_id: str = None):
        """Create a DocSpec element."""
        doc_spec = self._create_element(parent, "DocSpec")
        self._create_element(doc_spec, "DocTypeIndic", doc_type_indic, ns=STF_NS)
        self._create_element(doc_spec, "DocRefId", doc_ref_id, ns=STF_NS)
        if corr_doc_ref_id:
            self._create_element(doc_spec, "CorrDocRefId", corr_doc_ref_id, ns=STF_NS)
        return doc_spec
    
    def _create_summary(self, parent, financial_data: Dict):
        """Create a Summary element with financial data."""
        summary = self._create_element(parent, "Summary")
        currency = financial_data['currency']
        
        # Revenues
        revenues = self._create_element(summary, "Revenues")
        unrelated = self._create_element(revenues, "Unrelated", financial_data['unrelated'])
        unrelated.set("currCode", currency)
        related = self._create_element(revenues, "Related", financial_data['related'])
        related.set("currCode", currency)
        total = self._create_element(revenues, "Total", financial_data['total'])
        total.set("currCode", currency)
        
        # Other financial elements
        for field_name, xml_name in [
            ('profit_or_loss', 'ProfitOrLoss'),
            ('tax_paid', 'TaxPaid'),
            ('tax_accrued', 'TaxAccrued'),
            ('capital', 'Capital'),
            ('earnings', 'Earnings')
        ]:
            elem = self._create_element(summary, xml_name, financial_data[field_name])
            elem.set("currCode", currency)
        
        # Number of employees (no currency)
        self._create_element(summary, "NbEmployees", financial_data['nb_employees'])
        
        # Assets
        assets = self._create_element(summary, "Assets", financial_data['assets'])
        assets.set("currCode", currency)
        
        return summary
    
    def _create_const_entity(self, parent, country_code: str, index: int):
        """Create a ConstEntities element."""
        const_entities = self._create_element(parent, "ConstEntities")
        
        # ConstEntity (the organization info)
        const_entity = self._create_element(const_entities, "ConstEntity")
        tin = f"{country_code}{random.randint(100000000, 999999999)}"
        company_name = f"{self.faker.company()} {country_code}"
        self._create_entity(const_entity, country_code, tin, company_name)
        
        # Role - most are CBC801 (Ultimate Parent Entity) or CBC802 (Reporting Entity)
        role = random.choice(['CBC801', 'CBC802', 'CBC803'])
        self._create_element(const_entities, "Role", role)
        
        # Incorporation country (may differ from residence)
        incorp_countries = [country_code] * 3 + random.sample(self.config.jurisdiction_countries, 
                                                               min(2, len(self.config.jurisdiction_countries)))
        self._create_element(const_entities, "IncorpCountryCode", random.choice(incorp_countries))
        
        # Business activities (can have multiple, but we'll use 1-2)
        num_activities = random.randint(1, 2)
        activities = random.sample(CBC_BUSINESS_ACTIVITIES, num_activities)
        has_cbc513 = False
        for activity_code, _ in activities:
            self._create_element(const_entities, "BizActivities", activity_code)
            if activity_code == 'CBC513':
                has_cbc513 = True
        
        # OtherEntityInfo is REQUIRED when CBC513 is selected, otherwise optional
        if has_cbc513 or random.random() > 0.5:
            self._create_element(const_entities, "OtherEntityInfo", 
                               f"Additional information for entity {index + 1}")
        
        return const_entities
    
    def _create_cbc_report(self, parent, country_code: str, report_index: int):
        """Create a CbcReports element for a specific jurisdiction."""
        cbc_reports = self._create_element(parent, "CbcReports")
        
        # DocSpec - use transmitting country prefix for all DocRefIds
        doc_ref_id = self._generate_doc_ref_id()
        self._create_doc_spec(cbc_reports, self._get_doc_type_indic('new'), doc_ref_id)
        
        # Residence country for this report
        self._create_element(cbc_reports, "ResCountryCode", country_code)
        
        # Financial summary - use consistent reporting currency for entire document
        currency = self._get_reporting_currency()
        financial_data = self._generate_financial_data(currency)
        self._create_summary(cbc_reports, financial_data)
        
        # Constituent entities in this jurisdiction
        num_entities = random.randint(1, self.config.const_entities_per_report + 1)
        for i in range(num_entities):
            self._create_const_entity(cbc_reports, country_code, i)
        
        return cbc_reports
    
    def _create_reporting_entity(self, parent):
        """Create the ReportingEntity element."""
        reporting_entity = self._create_element(parent, "ReportingEntity")
        
        # Entity information
        entity = self._create_element(reporting_entity, "Entity")
        country = self.config.transmitting_country
        
        # Use config values or generate
        tin = self.config.reporting_entity_tin or self.config.sending_entity_in
        name = self.config.reporting_entity_name or f"{self.faker.company()} Holdings"
        
        self._create_entity(entity, country, tin, name)
        
        # MNE Group Name
        mne_name = self.config.mne_group_name or f"{name} Group"
        self._create_element(reporting_entity, "NameMNEGroup", mne_name)
        
        # Reporting Role
        self._create_element(reporting_entity, "ReportingRole", self.config.reporting_role)
        
        # Reporting Period
        reporting_period = self._create_element(reporting_entity, "ReportingPeriod")
        self._create_element(reporting_period, "StartDate", 
                           f"{self.config.tax_year}-01-01")
        self._create_element(reporting_period, "EndDate", 
                           f"{self.config.tax_year}-12-31")
        
        # DocSpec - use transmitting country prefix for all DocRefIds
        doc_ref_id = self._generate_doc_ref_id()
        self._create_doc_spec(reporting_entity, self._get_doc_type_indic('new'), doc_ref_id)
        
        return reporting_entity
    
    def _create_additional_info(self, parent, country_code: str):
        """Create optional AdditionalInfo element."""
        additional_info = self._create_element(parent, "AdditionalInfo")
        
        doc_ref_id = self._generate_doc_ref_id()
        self._create_doc_spec(additional_info, self._get_doc_type_indic('new'), doc_ref_id)
        
        self._create_element(additional_info, "OtherInfo", 
                           f"Additional information for {country_code} jurisdiction")
        self._create_element(additional_info, "ResCountryCode", country_code)
        
        return additional_info
    
    def generate(self) -> etree._Element:
        """Generate the complete CBC XML document."""
        logger.info("=" * 60)
        logger.info("CBC XML Generator - Starting generation")
        logger.info("=" * 60)
        
        # Create root element
        root = etree.Element(f"{{{CBC_NS}}}CBC_OECD", nsmap=NSMAP)
        root.set("version", "2.0")
        
        # MessageSpec
        message_spec = self._create_element(root, "MessageSpec")
        self._create_element(message_spec, "SendingEntityIN", self.config.sending_entity_in)
        self._create_element(message_spec, "TransmittingCountry", self.config.transmitting_country)
        self._create_element(message_spec, "ReceivingCountry", self.config.receiving_country)
        self._create_element(message_spec, "MessageType", "CBC")
        self._create_element(message_spec, "Language", self.config.language)
        self._create_element(message_spec, "Warning", "CBC Test Data - Not for production use")
        self._create_element(message_spec, "Contact", "Test Data Generator")
        self._create_element(message_spec, "MessageRefId", self._generate_message_ref_id())
        self._create_element(message_spec, "MessageTypeIndic", CBC_MESSAGE_TYPE_INDIC['new'])
        self._create_element(message_spec, "ReportingPeriod", f"{self.config.tax_year}-12-31")
        self._create_element(message_spec, "Timestamp", datetime.utcnow().isoformat() + "Z")
        
        logger.info(f"  MessageSpec created for {self.config.transmitting_country} -> {self.config.receiving_country}")
        
        # CbcBody
        cbc_body = self._create_element(root, "CbcBody")
        
        # Reporting Entity
        self._create_reporting_entity(cbc_body)
        logger.info(f"  ReportingEntity created with role {self.config.reporting_role}")
        
        # CbcReports - one per jurisdiction
        jurisdictions = random.sample(
            self.config.jurisdiction_countries, 
            min(self.config.num_cbc_reports, len(self.config.jurisdiction_countries))
        )
        
        for i, country in enumerate(jurisdictions):
            self._create_cbc_report(cbc_body, country, i)
            logger.info(f"  CbcReport {i+1}/{len(jurisdictions)} created for {country}")
        
        # Optional AdditionalInfo for first jurisdiction
        if random.random() > 0.5 and jurisdictions:
            self._create_additional_info(cbc_body, jurisdictions[0])
            logger.info(f"  AdditionalInfo created for {jurisdictions[0]}")
        
        logger.info("=" * 60)
        logger.info("CBC XML generation complete!")
        logger.info("=" * 60)
        
        return root
    
    def generate_and_save(self) -> Path:
        """Generate CBC XML and save to file."""
        root = self.generate()
        
        # Determine output path
        if self.config.output_path:
            output_path = Path(self.config.output_path)
        else:
            output_path = Path("out") / f"cbc_output_{self.config.tax_year}.xml"
        
        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write XML
        tree = etree.ElementTree(root)
        tree.write(str(output_path), pretty_print=True, xml_declaration=True, encoding='UTF-8')
        
        logger.info(f"CBC XML saved to: {output_path}")
        
        return output_path


def generate_cbc_xml(
    transmitting_country: str = "NL",
    receiving_country: str = "NL",
    tax_year: int = 2023,
    sending_entity_in: str = "123456789",
    num_cbc_reports: int = 3,
    const_entities_per_report: int = 2,
    output_path: str = None,
    test_mode: bool = True,
    **kwargs
) -> Path:
    """
    Convenience function to generate CBC XML.
    
    Args:
        transmitting_country: ISO country code of transmitting country
        receiving_country: ISO country code of receiving country
        tax_year: Reporting year
        sending_entity_in: TIN of sending entity
        num_cbc_reports: Number of jurisdiction reports to generate
        const_entities_per_report: Constituent entities per report
        output_path: Path to save the XML file
        test_mode: Use test DocTypeIndic (OECD11) vs production (OECD1)
        
    Returns:
        Path to the generated XML file
    """
    config = CBCGeneratorConfig(
        transmitting_country=transmitting_country,
        receiving_country=receiving_country,
        tax_year=tax_year,
        sending_entity_in=sending_entity_in,
        num_cbc_reports=num_cbc_reports,
        const_entities_per_report=const_entities_per_report,
        output_path=Path(output_path) if output_path else None,
        test_mode=test_mode,
        **{k: v for k, v in kwargs.items() if hasattr(CBCGeneratorConfig, k)}
    )
    
    generator = CBCGenerator(config)
    return generator.generate_and_save()


if __name__ == "__main__":
    # Example usage
    output = generate_cbc_xml(
        transmitting_country="NL",
        receiving_country="NL", 
        tax_year=2023,
        sending_entity_in="123456789",
        num_cbc_reports=5,
        const_entities_per_report=3,
        test_mode=True
    )
    print(f"Generated: {output}")
