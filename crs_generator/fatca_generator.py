"""
FATCA-CRS Combined XML Generator for FC Upload.

This generator produces XML in the FATCA-CRS combined format (FatcaCrs_v2.2)
used by the FC upload system. This is NOT the FATCA_OECD format.

Key differences from FATCA_OECD:
- Root element: FATCA_CRS (not FATCA_OECD)
- Namespace: urn:fatcacrs:ties:v2
- Uses MessageHeader (not MessageSpec)
- MessageType: FATCA-CRS
- MessageTypeIndic: CRS701 (new) / CRS702 (correction)
- DocTypeIndic: OECD1/OECD11 (not FATCA1/FATCA11)
- AccountHolder uses AcctHolderTypeCRS + AcctHolderTypeFATCA
- Uses ControllingPerson (not SubstantialOwner)
- Payment types: CRS501-504
- FilerCategory on ReportingFI
"""

from pathlib import Path
from copy import deepcopy
from lxml import etree
from dataclasses import dataclass, field
from typing import Optional, List, Dict
import random
from datetime import datetime, timedelta, timezone
from faker import Faker
import logging
from .identifiers import normalize_identifier, normalize_identifiers
from .reportable_jurisdictions import get_reportable_jurisdictions, get_all_country_codes

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


# FATCA-CRS combined format constants
# DocTypeIndic uses OECD codes (same as CRS), NOT FATCA codes
DOC_TYPE_INDIC = {
    'new': 'OECD1',
    'corrected': 'OECD2',
    'void': 'OECD3',
    'new_test': 'OECD11',
    'corrected_test': 'OECD12',
    'void_test': 'OECD13',
}

# MessageTypeIndic
MESSAGE_TYPE_INDIC = {
    'new': 'CRS701',
    'correction': 'CRS702',
}

FATCA_FILER_CATEGORIES = [
    'FATCA601',  # PFFI
    'FATCA602',  # RDC FFI
    'FATCA603',  # Limited Branch or Limited FFI
    'FATCA604',  # Reporting Model 2 FFI
    'FATCA605',  # QI, WP, or WT
    'FATCA606',  # Direct Reporting NFFE
    'FATCA607',  # Sponsoring Entity of a Sponsored FFI
    'FATCA608',  # Sponsoring Entity of a Sponsored Direct Reporting NFFE
    'FATCA609',  # Trustee of a Trustee-Documented Trust
    'FATCA610',  # Withholding Agent
    'FATCA611',  # Territory Financial Institution
]

# CRS AcctHolderType for organisations
CRS_ACCT_HOLDER_TYPES = [
    'CRS101',  # Passive NFE that is a CRS Reportable Person
    'CRS102',  # CRS Reportable Person that is a legal person
    'CRS103',  # Passive NFE that is a CRS Reportable Person – managed by another FI
]

# FATCA AcctHolderType for organisations
FATCA_ACCT_HOLDER_TYPES = [
    'FATCA101',  # Owner-Documented FFI with specified U.S. owner(s)
    'FATCA102',  # Passive NFFE with substantial U.S. owner(s)
    'FATCA103',  # Non-Participating FFI
    'FATCA104',  # Specified U.S. Person
    'FATCA105',  # Direct Reporting NFFE
]

# CRS Payment types (used in FATCA-CRS combined format)
CRS_PAYMENT_TYPES = [
    'CRS501',  # Dividends
    'CRS502',  # Interest
    'CRS503',  # Gross Proceeds/Redemptions
    'CRS504',  # Other - describe in PaymentAmnt
]

def _default_giin(seed: int) -> str:
    """A format-valid default GIIN: XXXXXX.XXXXX.XX.XXX (first block is 6 chars)."""
    r = random.Random(seed)
    first = ''.join(r.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=6))
    return f"{first}.{r.randint(10000, 99999):05d}.SL.{r.randint(100, 999):03d}"


def _sanitize_text_nodes(root: etree._Element) -> None:
    """Strip substrings MDES rejects outright (rule 98017: no '--' or '/*')."""
    def clean(value):
        if value and ('--' in value or '/*' in value):
            return value.replace('--', '-').replace('/*', '/ *')
        return value
    for el in root.iter():
        el.text = clean(el.text)
        el.tail = clean(el.tail)


# ControllingPerson types
CONTROLLING_PERSON_TYPES = [
    'CRS801',  # CP of legal person – ownership
    'CRS802',  # CP of legal person – other means
    'CRS803',  # CP of legal person – senior managing official
    'CRS804',  # CP of legal arrangement – trust – settlor
    'CRS805',  # CP of legal arrangement – trust – trustee
    'CRS806',  # CP of legal arrangement – trust – protector
    'CRS807',  # CP of legal arrangement – trust – beneficiary
    'CRS808',  # CP of legal arrangement – trust – other
    'CRS809',  # CP of legal arrangement – other – settlor-equivalent
    'CRS810',  # CP of legal arrangement – other – trustee-equivalent
    'CRS811',  # CP of legal arrangement – other – protector-equivalent
    'CRS812',  # CP of legal arrangement – other – beneficiary-equivalent
    'CRS813',  # CP of legal arrangement – other – other-equivalent
]


@dataclass
class FATCAGeneratorConfig:
    """Configuration for FATCA-CRS combined XML generation."""
    # Basic info
    sending_country: str = "CW"  # Transmitting country
    receiving_country: str = "CW"  # Receiving country
    tax_year: int = 2024
    sending_company_in: str = "20016636"  # SendingCompanyIN
    
    # ReportingFI GIINs (one per ReportingFI)
    reporting_fi_tins: List[str] = field(default_factory=list)
    filer_category: str = "FATCA601"  # Default filer category
    
    # Scale
    num_reporting_fis: int = 1
    individual_accounts_per_fi: int = 100
    organisation_accounts_per_fi: int = 100
    controlling_persons_per_org: int = 1
    
    # AccountHolder Country Selection
    account_holder_country_mode: str = "random"
    account_holder_countries: List[str] = field(default_factory=list)
    account_holder_country_weights: Dict[str, float] = field(default_factory=dict)
    
    # Realism
    closed_account_ratio: float = 0.1
    dormant_account_ratio: float = 0.05
    currencies: List[str] = field(default_factory=lambda: ["USD", "EUR", "GBP"])
    
    # Output
    output_path: Optional[Path] = None
    
    # Performance
    show_progress: bool = True
    progress_every: int = 500
    seed: int = 42
    pretty_print: bool = True
    
    # Test mode (OECD11-13 vs OECD1-3)
    test_mode: bool = True
    
    def __post_init__(self):
        # Trim identifiers before they are concatenated into MessageRefId /
        # DocRefId — see crs_generator.identifiers.
        self.sending_company_in = normalize_identifier(self.sending_company_in)
        self.sending_country = normalize_identifier(self.sending_country)
        self.receiving_country = normalize_identifier(self.receiving_country)
        self.reporting_fi_tins = normalize_identifiers(self.reporting_fi_tins)

        # Handle output path
        if isinstance(self.output_path, str):
            self.output_path = Path(self.output_path)

        if self.output_path is None:
            self.output_path = Path.cwd() / "out" / f"fatca_{self.sending_country}_{self.tax_year}.xml"
        else:
            if not self.output_path.parent or str(self.output_path.parent) == '.':
                self.output_path = Path.cwd() / "out" / self.output_path.name
        
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Generate default GIINs if not provided
        if not self.reporting_fi_tins:
            self.reporting_fi_tins = [
                _default_giin(42 + i) for i in range(self.num_reporting_fis)
            ]
        
        if len(self.reporting_fi_tins) != self.num_reporting_fis:
            raise ValueError(
                f"Number of ReportingFI GIINs ({len(self.reporting_fi_tins)}) "
                f"must match num_reporting_fis ({self.num_reporting_fis})"
            )
        
        # Validate filer category
        if self.filer_category not in FATCA_FILER_CATEGORIES:
            raise ValueError(f"Invalid filer_category: {self.filer_category}")
        
        # Setup account holder countries
        if self.account_holder_country_mode == "random":
            if not self.account_holder_countries:
                self.account_holder_countries = get_reportable_jurisdictions()
        elif self.account_holder_country_mode == "single":
            if not self.account_holder_countries:
                self.account_holder_countries = [self.sending_country]
            elif len(self.account_holder_countries) != 1:
                raise ValueError("Single mode requires exactly one country")
        elif self.account_holder_country_mode == "multiple":
            if not self.account_holder_countries:
                raise ValueError("Multiple mode requires at least one country")
        else:
            raise ValueError(f"Invalid account_holder_country_mode: {self.account_holder_country_mode}")


class FATCADataGenerator:
    """Generates realistic random data for FATCA-CRS fields."""
    
    def __init__(self, seed: int = 42, config: Optional[FATCAGeneratorConfig] = None):
        self.rng = random.Random(seed)
        Faker.seed(seed)
        self.faker = Faker('en_US')
        self.config = config
        
        self._cache = {}
        self._precompute_caches()
        self._all_countries = get_all_country_codes()
        
    def _precompute_caches(self):
        """Pre-generate pools of data."""
        pool_size = 1000
        self._cache['first_names'] = [self.faker.first_name() for _ in range(pool_size)]
        self._cache['last_names'] = [self.faker.last_name() for _ in range(pool_size)]
        self._cache['cities'] = [self.faker.city() for _ in range(pool_size)]
        self._cache['streets'] = [self.faker.street_name() for _ in range(pool_size)]
        self._cache['postcodes'] = [self.faker.postcode() for _ in range(pool_size)]
        self._cache['companies'] = [self.faker.company() for _ in range(pool_size)]
        
    def tin(self) -> str:
        """Generate a TIN."""
        return f"{self.rng.randint(100000000, 999999999)}"
    
    def giin(self) -> str:
        """Generate a GIIN (Global Intermediary Identification Number)."""
        letters = ''.join(self.rng.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=6))
        return f"{letters}.{self.rng.randint(10000, 99999)}.SL.{self.rng.randint(100, 999)}"
    
    def account_number(self) -> str:
        return f"{self.rng.randint(1000000000, 9999999999)}"
    
    def birth_date(self) -> str:
        days_back = self.rng.randint(18*365, 80*365)
        birth_date = datetime.now() - timedelta(days=days_back)
        return birth_date.strftime("%Y-%m-%d")
    
    def balance(self) -> float:
        mean = 11
        sigma = 2.5
        balance = self.rng.lognormvariate(mean, sigma)
        return round(balance, 2)
    
    def payment_amount(self, balance: float) -> float:
        return round(balance * self.rng.uniform(0.01, 0.20), 2)
    
    def first_name(self) -> str: return self.rng.choice(self._cache['first_names'])
    def last_name(self) -> str: return self.rng.choice(self._cache['last_names'])
    def city(self) -> str: return self.rng.choice(self._cache['cities'])
    def street(self) -> str: return self.rng.choice(self._cache['streets'])
    def postcode(self) -> str: return self.rng.choice(self._cache['postcodes'])
    def company(self) -> str: return self.rng.choice(self._cache['companies'])
    
    def company_name(self) -> str:
        patterns = [
            lambda: f"{self.city()} Capital Bank",
            lambda: f"{self.last_name()} Financial Services",
            lambda: f"Bank of {self.city()}",
            lambda: f"{self.last_name()} & {self.last_name()} Investment Bank",
            lambda: f"First {self.city()} Bank",
            lambda: f"{self.last_name()} Trust Company",
        ]
        return self.rng.choice(patterns)()

    def warning_text(self) -> str:
        return "Test data generated by MDES XML Studio. Not for production filing."

    def contact_text(self) -> str:
        return f"Contactgegevens voor {self.company_name()}"
    
    def account_holder_res_country(self) -> str:
        if not self.config:
            return "US"
        
        countries = self.config.account_holder_countries
        weights = self.config.account_holder_country_weights
        
        if weights and len(weights) > 0:
            country_list = list(weights.keys())
            weight_list = list(weights.values())
            return self.rng.choices(country_list, weights=weight_list, k=1)[0]
        else:
            return self.rng.choice(countries)
    
    def address_country(self) -> str:
        return self.rng.choice(self._all_countries)
    
    def crs_acct_holder_type(self) -> str:
        """Random CRS account holder type for organisations."""
        return self.rng.choice(CRS_ACCT_HOLDER_TYPES)

    def fatca_acct_holder_type(self) -> str:
        """Random FATCA account holder type for organisations."""
        return self.rng.choice(FATCA_ACCT_HOLDER_TYPES)
    
    def payment_type(self) -> str:
        return self.rng.choice(CRS_PAYMENT_TYPES)

    def controlling_person_type(self) -> str:
        return self.rng.choice(CONTROLLING_PERSON_TYPES)


class FATCAGenerator:
    """FATCA-CRS combined format XML generator."""
    
    def __init__(self, config: FATCAGeneratorConfig):
        self.config = config
        self.data_gen = FATCADataGenerator(config.seed, config)
        
        # FATCA-CRS combined namespace map
        self.ns = {
            'oecd_ftc': 'urn:fatcacrs:ties:v2',
            'sfa_ftc': 'urn:oecd:ties:fatcacrstypes:v2',
            'sfa': 'urn:oecd:ties:stffatcatypes:v2',
            'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        }
        
        self.docref_counter = 0
        
    def _load_base_template(self) -> tuple[etree._ElementTree, dict]:
        """Load the base FATCA-CRS combined template."""
        template_path = Path(__file__).parent / "template FATCA" / "FATCA-CRS.Template.Nieuw.xml"
        if not template_path.exists():
            raise FileNotFoundError(f"Base template not found: {template_path}")
        
        parser = etree.XMLParser(remove_blank_text=True)
        tree = etree.parse(str(template_path), parser)
        
        root = tree.getroot()
        ns = dict(root.nsmap or {})
        if None in ns:
            ns.pop(None, None)
        
        return tree, ns
    
    def _next_docref_id(self) -> str:
        """Generate next unique DocRefId."""
        self.docref_counter += 1
        return (
            f"{self.config.sending_country}"
            f"{self.config.tax_year}"
            f"{self.config.sending_company_in}"
            f"{self.docref_counter:016d}"
        )
    
    def _get_doc_type_indic(self, doc_type: str = 'new') -> str:
        """Get appropriate DocTypeIndic based on test mode."""
        if self.config.test_mode:
            return DOC_TYPE_INDIC.get(f'{doc_type}_test', 'OECD11')
        return DOC_TYPE_INDIC.get(doc_type, 'OECD1')

    def _make_birth_info(self) -> etree._Element:
        """Build a <BirthInfo><BirthDate> element (sfa_ftc namespace).

        BirthDate is schema-optional but expected by MDES business rules
        (rule 60014: year >= 1900 and before today).
        """
        birth_info = etree.Element(f"{{{self.ns['sfa_ftc']}}}BirthInfo")
        birth_date = etree.SubElement(birth_info, f"{{{self.ns['sfa_ftc']}}}BirthDate")
        birth_date.text = self.data_gen.birth_date()
        return birth_info
    
    def _create_individual_account(self, template: etree._Element, ns: dict) -> etree._Element:
        """Create an individual account report."""
        account = deepcopy(template)
        
        # Update DocSpec
        doc_spec = account.find('.//sfa_ftc:DocSpec', namespaces=ns)
        if doc_spec is not None:
            doc_type = doc_spec.find('sfa_ftc:DocTypeIndic', namespaces=ns)
            if doc_type is not None:
                doc_type.text = self._get_doc_type_indic('new')
            
            doc_ref = doc_spec.find('sfa_ftc:DocRefId', namespaces=ns)
            if doc_ref is not None:
                doc_ref.text = self._next_docref_id()
        
        # Update account number with attributes
        acc_num = account.find('.//sfa_ftc:AccountNumber', namespaces=ns)
        if acc_num is not None:
            acc_num.text = self.data_gen.account_number()
            is_closed = self.data_gen.rng.random() < self.config.closed_account_ratio
            is_dormant = self.data_gen.rng.random() < self.config.dormant_account_ratio
            acc_num.set('ClosedAccount', 'true' if is_closed else 'false')
            acc_num.set('DormantAccount', 'true' if is_dormant else 'false')
            acc_num.set('UndocumentedAccount', 'false')
        
        # Get country codes
        res_country = self.data_gen.account_holder_res_country()
        address_country = self.data_gen.address_country()
        
        # Update Individual
        individual = account.find('.//sfa_ftc:Individual', namespaces=ns)
        if individual is not None:
            # ResCountryCode
            res_elem = individual.find('sfa_ftc:ResCountryCode', namespaces=ns)
            if res_elem is not None:
                res_elem.text = res_country
            
            # TIN
            tin_elem = individual.find('sfa_ftc:TIN', namespaces=ns)
            if tin_elem is not None:
                tin_elem.text = self.data_gen.tin()
                tin_elem.set('issuedBy', res_country)
            
            # Name
            name_elem = individual.find('sfa_ftc:Name', namespaces=ns)
            if name_elem is not None:
                first_name = name_elem.find('sfa:FirstName', namespaces=ns)
                last_name = name_elem.find('sfa:LastName', namespaces=ns)
                if first_name is not None:
                    first_name.text = self.data_gen.first_name()
                if last_name is not None:
                    last_name.text = self.data_gen.last_name()
            
            # Address
            address = individual.find('sfa_ftc:Address', namespaces=ns)
            if address is not None:
                country_code = address.find('sfa:CountryCode', namespaces=ns)
                if country_code is not None:
                    country_code.text = address_country

                addr_free = address.find('sfa:AddressFree', namespaces=ns)
                if addr_free is not None:
                    addr_free.text = f"{self.data_gen.street()} {self.data_gen.rng.randint(1, 999)}, {self.data_gen.city()}"

                # BirthInfo follows Address per AccountPersonParty_Type
                if individual.find('sfa_ftc:BirthInfo', namespaces=ns) is None:
                    address.addnext(self._make_birth_info())

        # Update balance and payments
        self._randomize_balance_and_payment(account, ns)
        
        return account
    
    def _create_organisation_account(self, template: etree._Element, ns: dict) -> etree._Element:
        """Create an organisation account with controlling persons."""
        account = deepcopy(template)
        
        # Update DocSpec
        doc_spec = account.find('.//sfa_ftc:DocSpec', namespaces=ns)
        if doc_spec is not None:
            doc_type = doc_spec.find('sfa_ftc:DocTypeIndic', namespaces=ns)
            if doc_type is not None:
                doc_type.text = self._get_doc_type_indic('new')
            
            doc_ref = doc_spec.find('sfa_ftc:DocRefId', namespaces=ns)
            if doc_ref is not None:
                doc_ref.text = self._next_docref_id()
        
        # Update account number with attributes
        acc_num = account.find('.//sfa_ftc:AccountNumber', namespaces=ns)
        if acc_num is not None:
            acc_num.text = self.data_gen.account_number()
            is_closed = self.data_gen.rng.random() < self.config.closed_account_ratio
            is_dormant = self.data_gen.rng.random() < self.config.dormant_account_ratio
            acc_num.set('ClosedAccount', 'true' if is_closed else 'false')
            acc_num.set('DormantAccount', 'true' if is_dormant else 'false')
            acc_num.set('UndocumentedAccount', 'false')
        
        res_country = self.data_gen.account_holder_res_country()
        address_country = self.data_gen.address_country()
        
        # Find AccountHolder and update Organisation
        account_holder = account.find('.//sfa_ftc:AccountHolder', namespaces=ns)
        if account_holder is not None:
            # Remove Individual if exists (we're creating org account)
            individual = account_holder.find('sfa_ftc:Individual', namespaces=ns)
            if individual is not None:
                account_holder.remove(individual)
            
            # Create or update Organisation
            org = account_holder.find('sfa_ftc:Organisation', namespaces=ns)
            if org is None:
                org = etree.SubElement(account_holder, f"{{{self.ns['sfa_ftc']}}}Organisation")
            
            # ResCountryCode (can have multiple)
            res_elem = org.find('sfa_ftc:ResCountryCode', namespaces=ns)
            if res_elem is None:
                res_elem = etree.SubElement(org, f"{{{self.ns['sfa_ftc']}}}ResCountryCode")
            res_elem.text = res_country
            
            # Add second ResCountryCode (US) for FATCA reporting. It must sit
            # directly after the first ResCountryCode: the schema sequence
            # requires every ResCountryCode before TIN/Name/Address, so append
            # via addnext() rather than SubElement (which lands after Address).
            res_elem2 = etree.Element(f"{{{self.ns['sfa_ftc']}}}ResCountryCode")
            res_elem2.text = "US"
            res_elem.addnext(res_elem2)
            
            # TIN
            tin_elem = org.find('sfa_ftc:TIN', namespaces=ns)
            if tin_elem is None:
                tin_elem = etree.SubElement(org, f"{{{self.ns['sfa_ftc']}}}TIN")
            tin_elem.text = self.data_gen.tin()
            tin_elem.set('issuedBy', 'US')
            
            # Name
            name_elem = org.find('sfa_ftc:Name', namespaces=ns)
            if name_elem is None:
                name_elem = etree.SubElement(org, f"{{{self.ns['sfa_ftc']}}}Name")
            name_elem.text = self.data_gen.company_name()
            name_elem.set('nameType', 'OECD207')
            
            # Address
            address = org.find('sfa_ftc:Address', namespaces=ns)
            if address is None:
                address = etree.SubElement(org, f"{{{self.ns['sfa_ftc']}}}Address")
            
            country_code = address.find('sfa:CountryCode', namespaces=ns)
            if country_code is None:
                country_code = etree.SubElement(address, f"{{{self.ns['sfa']}}}CountryCode")
            country_code.text = address_country
            
            addr_free = address.find('sfa:AddressFree', namespaces=ns)
            if addr_free is None:
                addr_free = etree.SubElement(address, f"{{{self.ns['sfa']}}}AddressFree")
            addr_free.text = f"{self.data_gen.street()} {self.data_gen.rng.randint(1, 999)}, {self.data_gen.city()}"
            
            # AcctHolderTypeCRS (required for org accounts in FATCA-CRS)
            acct_type_crs = account_holder.find('sfa_ftc:AcctHolderTypeCRS', namespaces=ns)
            if acct_type_crs is None:
                acct_type_crs = etree.SubElement(account_holder, f"{{{self.ns['sfa_ftc']}}}AcctHolderTypeCRS")
            acct_type_crs.text = self.data_gen.crs_acct_holder_type()

            # AcctHolderTypeFATCA (required for org accounts in FATCA-CRS)
            acct_type_fatca = account_holder.find('sfa_ftc:AcctHolderTypeFATCA', namespaces=ns)
            if acct_type_fatca is None:
                acct_type_fatca = etree.SubElement(account_holder, f"{{{self.ns['sfa_ftc']}}}AcctHolderTypeFATCA")
            acct_type_fatca.text = self.data_gen.fatca_acct_holder_type()
        
        # Remove existing ControllingPersons and add new ones
        existing_cps = account.findall('.//sfa_ftc:ControllingPerson', namespaces=ns)
        for cp in existing_cps:
            cp.getparent().remove(cp)
        
        # Add ControllingPersons
        self._add_controlling_persons(account, ns)
        
        # Update balance and payments
        self._randomize_balance_and_payment(account, ns)
        
        return account
    
    def _add_controlling_persons(self, account: etree._Element, ns: dict):
        """Add controlling persons to an organisation account."""
        # Find AccountBalance to insert ControllingPerson before it
        balance_elem = account.find('.//sfa_ftc:AccountBalance', namespaces=ns)
        parent = balance_elem.getparent() if balance_elem is not None else account
        balance_index = list(parent).index(balance_elem) if balance_elem is not None else len(list(parent))
        
        for i in range(self.config.controlling_persons_per_org):
            cp = etree.Element(f"{{{self.ns['sfa_ftc']}}}ControllingPerson")
            
            individual = etree.SubElement(cp, f"{{{self.ns['sfa_ftc']}}}Individual")
            
            res_country = self.data_gen.account_holder_res_country()
            
            # ResCountryCode
            res_elem = etree.SubElement(individual, f"{{{self.ns['sfa_ftc']}}}ResCountryCode")
            res_elem.text = res_country
            
            # TIN
            tin_elem = etree.SubElement(individual, f"{{{self.ns['sfa_ftc']}}}TIN")
            tin_elem.text = self.data_gen.tin()
            tin_elem.set('issuedBy', res_country)
            
            # Name
            name = etree.SubElement(individual, f"{{{self.ns['sfa_ftc']}}}Name")
            name.set('nameType', 'OECD202')
            first_name = etree.SubElement(name, f"{{{self.ns['sfa']}}}FirstName")
            first_name.text = self.data_gen.first_name()
            last_name = etree.SubElement(name, f"{{{self.ns['sfa']}}}LastName")
            last_name.text = self.data_gen.last_name()
            
            # Address
            address = etree.SubElement(individual, f"{{{self.ns['sfa_ftc']}}}Address")
            country_code = etree.SubElement(address, f"{{{self.ns['sfa']}}}CountryCode")
            country_code.text = self.data_gen.address_country()
            addr_free = etree.SubElement(address, f"{{{self.ns['sfa']}}}AddressFree")
            addr_free.text = f"{self.data_gen.street()} {self.data_gen.rng.randint(1, 999)}, {self.data_gen.city()}"

            # BirthInfo follows Address per PersonParty_Type
            individual.append(self._make_birth_info())

            # CtrlgPersonType
            ctrl_type = etree.SubElement(cp, f"{{{self.ns['sfa_ftc']}}}CtrlgPersonType")
            ctrl_type.text = self.data_gen.controlling_person_type()
            
            # Insert before AccountBalance
            parent.insert(balance_index + i, cp)
    
    def _randomize_balance_and_payment(self, account: etree._Element, ns: dict):
        """Randomize account balance and payments."""
        currency = self.data_gen.rng.choice(self.config.currencies)
        balance = self.data_gen.balance()
        
        # Update balance
        balance_elem = account.find('.//sfa_ftc:AccountBalance', namespaces=ns)
        if balance_elem is not None:
            balance_elem.set('currCode', currency)
            balance_elem.text = f"{balance:.2f}"
        
        # Handle payments
        payment_nodes = account.findall('.//sfa_ftc:Payment', namespaces=ns)
        
        # Remove existing payments
        for payment in payment_nodes:
            payment.getparent().remove(payment)
        
        # Add 1-3 random payments
        num_payments = self.data_gen.rng.randint(1, 3)
        
        # Find parent to insert payments (after AccountBalance)
        parent = balance_elem.getparent() if balance_elem is not None else account
        
        for _ in range(num_payments):
            payment = etree.SubElement(parent, f"{{{self.ns['sfa_ftc']}}}Payment")
            
            type_elem = etree.SubElement(payment, f"{{{self.ns['sfa_ftc']}}}Type")
            type_elem.text = self.data_gen.payment_type()
            
            amnt_elem = etree.SubElement(payment, f"{{{self.ns['sfa_ftc']}}}PaymentAmnt")
            amnt_elem.set('currCode', currency)
            amnt_elem.text = f"{self.data_gen.payment_amount(balance):.2f}"
    
    def generate(self) -> Path:
        """Generate the FATCA-CRS combined XML file."""
        logger.info(f"Starting FATCA-CRS generation for {self.config.tax_year}")
        logger.info(f"  ReportingFIs: {self.config.num_reporting_fis}")
        logger.info(f"  Individual accounts/FI: {self.config.individual_accounts_per_fi}")
        logger.info(f"  Organisation accounts/FI: {self.config.organisation_accounts_per_fi}")

        if self.config.individual_accounts_per_fi + self.config.organisation_accounts_per_fi == 0:
            raise ValueError(
                "Cannot generate a FATCA-CRS 'new' message with zero accounts: the "
                "schema requires at least one AccountReport. Set --individual-accounts "
                "and/or --organisation-accounts to a positive number."
            )
        
        tree, ns = self._load_base_template()
        root = tree.getroot()
        
        # Update MessageHeader
        self._update_message_header(root, ns)
        
        # Find MessageBody
        msg_body = root.find('.//oecd_ftc:MessageBody', namespaces=ns)
        if msg_body is None:
            raise ValueError("No MessageBody found in template")
        
        # Update ReportingFI
        reporting_fi = msg_body.find('.//sfa_ftc:ReportingFI', namespaces=ns)
        if reporting_fi is not None:
            self._update_reporting_fi(reporting_fi, ns, 0)
        
        # Find ReportingGroup
        reporting_group = msg_body.find('.//sfa_ftc:ReportingGroup', namespaces=ns)
        if reporting_group is None:
            raise ValueError("No ReportingGroup found in template")
        
        # Get both template accounts (individual and organisation)
        template_accounts = reporting_group.findall('sfa_ftc:AccountReport', namespaces=ns)
        
        # Use first as individual template, second as org template
        individual_template = template_accounts[0] if len(template_accounts) > 0 else None
        org_template = template_accounts[1] if len(template_accounts) > 1 else individual_template
        
        if individual_template is None:
            raise ValueError("No AccountReport template found")
        
        # Remove all template accounts
        for tmpl in template_accounts:
            reporting_group.remove(tmpl)
        
        total_accounts = self.config.individual_accounts_per_fi + self.config.organisation_accounts_per_fi
        account_count = 0
        
        # Generate individual accounts
        for i in range(self.config.individual_accounts_per_fi):
            account = self._create_individual_account(individual_template, ns)
            reporting_group.append(account)
            account_count += 1
            
            if self.config.show_progress and account_count % self.config.progress_every == 0:
                logger.info(f"  Generated {account_count}/{total_accounts} accounts...")
        
        # Generate organisation accounts
        for i in range(self.config.organisation_accounts_per_fi):
            account = self._create_organisation_account(org_template, ns)
            reporting_group.append(account)
            account_count += 1
            
            if self.config.show_progress and account_count % self.config.progress_every == 0:
                logger.info(f"  Generated {account_count}/{total_accounts} accounts...")
        
        # Strip MDES-forbidden substrings from any generated free text
        _sanitize_text_nodes(root)

        # Write output
        tree.write(
            str(self.config.output_path),
            pretty_print=self.config.pretty_print,
            xml_declaration=True,
            encoding='UTF-8'
        )
        
        logger.info(f"Generated FATCA-CRS XML: {self.config.output_path}")
        logger.info(f"  Total accounts: {account_count}")
        
        return self.config.output_path
    
    def _update_message_header(self, root: etree._Element, ns: dict):
        """Update MessageHeader with config values."""
        msg_header = root.find('.//oecd_ftc:MessageHeader', namespaces=ns)
        if msg_header is None:
            return
        
        # SendingCompanyIN
        sending_in = msg_header.find('sfa_ftc:SendingCompanyIN', namespaces=ns)
        if sending_in is not None:
            sending_in.text = self.config.sending_company_in
        
        # TransmittingCountry
        trans_country = msg_header.find('sfa_ftc:TransmittingCountry', namespaces=ns)
        if trans_country is not None:
            trans_country.text = self.config.sending_country
        
        # ReceivingCountry
        recv_country = msg_header.find('sfa_ftc:ReceivingCountry', namespaces=ns)
        if recv_country is not None:
            recv_country.text = self.config.receiving_country
        
        # Warning
        warning = msg_header.find('sfa_ftc:Warning', namespaces=ns)
        if warning is not None:
            warning.text = self.data_gen.warning_text()
        
        # Contact
        contact = msg_header.find('sfa_ftc:Contact', namespaces=ns)
        if contact is not None:
            contact.text = self.data_gen.contact_text()
        
        # MessageRefId
        msg_ref = msg_header.find('sfa_ftc:MessageRefId', namespaces=ns)
        if msg_ref is not None:
            msg_ref.text = (
                f"{self.config.sending_country}"
                f"{self.config.tax_year}"
                f"{self.config.sending_company_in}"
                f"{self.data_gen.rng.randint(1, 9999999999):010d}"
            )
        
        # MessageTypeIndic (CRS701 for new, CRS702 for correction)
        msg_type_indic = msg_header.find('sfa_ftc:MessageTypeIndic', namespaces=ns)
        if msg_type_indic is not None:
            msg_type_indic.text = MESSAGE_TYPE_INDIC['new']
        
        # ReportingPeriod
        reporting_period = msg_header.find('sfa_ftc:ReportingPeriod', namespaces=ns)
        if reporting_period is not None:
            reporting_period.text = f"{self.config.tax_year}-12-31"
        
        # Timestamp
        timestamp = msg_header.find('sfa_ftc:Timestamp', namespaces=ns)
        if timestamp is not None:
            timestamp.text = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    def _update_reporting_fi(self, reporting_fi: etree._Element, ns: dict, fi_index: int):
        """Update ReportingFI with config values."""
        # ResCountryCode
        res_country = reporting_fi.find('sfa_ftc:ResCountryCode', namespaces=ns)
        if res_country is not None:
            res_country.text = self.config.sending_country
        
        # TIN (GIIN) - issuedBy is always US for FATCA GIIN
        tin = reporting_fi.find('sfa_ftc:TIN', namespaces=ns)
        if tin is not None:
            tin.text = self.config.reporting_fi_tins[fi_index]
            tin.set('issuedBy', 'US')
        
        # Name
        name = reporting_fi.find('sfa_ftc:Name', namespaces=ns)
        if name is not None:
            name.text = self.data_gen.company_name()
            name.set('nameType', 'OECD207')
        
        # Address
        address = reporting_fi.find('sfa_ftc:Address', namespaces=ns)
        if address is not None:
            country_code = address.find('sfa:CountryCode', namespaces=ns)
            if country_code is not None:
                country_code.text = self.config.sending_country
            
            # Randomize address fields
            addr_fix = address.find('sfa:AddressFix', namespaces=ns)
            if addr_fix is not None:
                street = addr_fix.find('sfa:Street', namespaces=ns)
                if street is not None:
                    street.text = self.data_gen.street()
                building = addr_fix.find('sfa:BuildingIdentifier', namespaces=ns)
                if building is not None:
                    building.text = str(self.data_gen.rng.randint(1, 999))
                city = addr_fix.find('sfa:City', namespaces=ns)
                if city is not None:
                    city.text = self.data_gen.city()
                postcode = addr_fix.find('sfa:PostCode', namespaces=ns)
                if postcode is not None:
                    postcode.text = self.data_gen.postcode()
        
        # FilerCategory
        filer_cat = reporting_fi.find('sfa_ftc:FilerCategory', namespaces=ns)
        if filer_cat is not None:
            filer_cat.text = self.config.filer_category
        
        # DocSpec
        doc_spec = reporting_fi.find('sfa_ftc:DocSpec', namespaces=ns)
        if doc_spec is not None:
            doc_type = doc_spec.find('sfa_ftc:DocTypeIndic', namespaces=ns)
            if doc_type is not None:
                doc_type.text = self._get_doc_type_indic('new')
            
            doc_ref = doc_spec.find('sfa_ftc:DocRefId', namespaces=ns)
            if doc_ref is not None:
                doc_ref.text = self._next_docref_id()


def generate_fatca(
    sending_country: str = "CW",
    receiving_country: str = "CW",
    tax_year: int = 2024,
    individual_accounts: int = 100,
    organisation_accounts: int = 100,
    output_path: Optional[str] = None,
    test_mode: bool = True,
    **kwargs
) -> Path:
    """Convenience function to generate FATCA-CRS combined XML."""
    config = FATCAGeneratorConfig(
        sending_country=sending_country,
        receiving_country=receiving_country,
        tax_year=tax_year,
        individual_accounts_per_fi=individual_accounts,
        organisation_accounts_per_fi=organisation_accounts,
        output_path=Path(output_path) if output_path else None,
        test_mode=test_mode,
        **kwargs
    )
    
    generator = FATCAGenerator(config)
    return generator.generate()


if __name__ == "__main__":
    # Test generation
    output = generate_fatca(
        sending_country="CW",
        receiving_country="CW",
        tax_year=2024,
        individual_accounts=10,
        organisation_accounts=5,
        test_mode=True
    )
    print(f"Generated: {output}")
