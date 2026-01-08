"""
FATCA XML Generator using validated templates with performance optimizations.

This generator:
1. Uses FATCA template as base
2. Generates Individual and Organisation accounts
3. Supports Substantial Owners (similar to CRS Controlling Persons)
4. Handles FATCA-specific fields (FilerCategory, etc.)
5. Generates realistic data
"""

from pathlib import Path
from copy import deepcopy
from lxml import etree
from dataclasses import dataclass, field
from typing import Optional, List, Dict
import random
from datetime import datetime, timedelta
from faker import Faker
import logging
from .reportable_jurisdictions import get_reportable_jurisdictions, get_all_country_codes

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


# FATCA-specific constants
FATCA_DOC_TYPE_INDIC = {
    'new': 'FATCA1',
    'corrected': 'FATCA2',
    'void': 'FATCA3',
    'amended': 'FATCA4',
    'new_test': 'FATCA11',
    'corrected_test': 'FATCA12',
    'void_test': 'FATCA13',
    'amended_test': 'FATCA14'
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

FATCA_ACCT_HOLDER_TYPES = [
    'FATCA101',  # Owner-Documented FFI with specified U.S. owner(s)
    'FATCA102',  # Passive NFFE with substantial U.S. owner(s)
    'FATCA103',  # Non-Participating FFI
    'FATCA104',  # Specified U.S. Person
    'FATCA105',  # Direct Reporting NFFE
]

FATCA_PAYMENT_TYPES = [
    'FATCA501',  # Dividends
    'FATCA502',  # Interest
    'FATCA503',  # Gross Proceeds/Redemptions
    'FATCA504',  # Other
]


@dataclass
class FATCAGeneratorConfig:
    """Configuration for FATCA XML generation."""
    # Basic info
    sending_country: str = "NL"  # Transmitting country
    receiving_country: str = "US"  # Always US for FATCA
    tax_year: int = 2021
    sending_company_in: str = "000000.00000.TA.531"  # GIIN format
    
    # ReportingFI TINs/GIINs (one per ReportingFI)
    reporting_fi_tins: List[str] = field(default_factory=list)
    filer_category: str = "FATCA601"  # Default filer category
    
    # Scale
    num_reporting_fis: int = 1
    individual_accounts_per_fi: int = 100
    organisation_accounts_per_fi: int = 100
    substantial_owners_per_org: int = 1  # Similar to controlling persons
    
    # AccountHolder Country Selection
    account_holder_country_mode: str = "random"
    account_holder_countries: List[str] = field(default_factory=list)
    account_holder_country_weights: Dict[str, float] = field(default_factory=dict)
    
    # Realism
    closed_account_ratio: float = 0.1
    currencies: List[str] = field(default_factory=lambda: ["USD", "EUR", "GBP"])
    
    # Output
    output_path: Optional[Path] = None
    
    # Performance
    show_progress: bool = True
    progress_every: int = 500
    seed: int = 42
    pretty_print: bool = True
    
    # Test mode (FATCA11-14 vs FATCA1-4)
    test_mode: bool = True
    
    def __post_init__(self):
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
            self.reporting_fi_tins = [f"KTQDFL.{99999 + i:05d}.SL.{532 + i}" for i in range(self.num_reporting_fis)]
        
        if len(self.reporting_fi_tins) != self.num_reporting_fis:
            raise ValueError(
                f"Number of ReportingFI TINs ({len(self.reporting_fi_tins)}) "
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
    """Generates realistic random data for FATCA fields."""
    
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
        """Generate a US-style TIN (SSN format for individuals)."""
        return f"{self.rng.randint(100, 999)}-{self.rng.randint(10, 99)}-{self.rng.randint(1000, 9999)}"
    
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
    
    def acct_holder_type(self) -> str:
        """Random FATCA account holder type for organisations."""
        return self.rng.choice(FATCA_ACCT_HOLDER_TYPES)
    
    def payment_type(self) -> str:
        return self.rng.choice(FATCA_PAYMENT_TYPES)


class FATCAGenerator:
    """High-performance FATCA XML generator."""
    
    def __init__(self, config: FATCAGeneratorConfig):
        self.config = config
        self.data_gen = FATCADataGenerator(config.seed, config)
        
        # FATCA namespace map
        self.ns = {
            'ftc': 'urn:oecd:ties:fatca:v2',
            'sfa': 'urn:oecd:ties:stffatcatypes:v2',
            'iso': 'urn:oecd:ties:isofatcatypes:v1',
            'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        }
        
        self.docref_counter = 0
        
    def _load_base_template(self) -> tuple[etree._ElementTree, dict]:
        """Load the base FATCA template."""
        template_path = Path(__file__).parent / "template FATCA" / "FATCA.Generiek.2019.Nieuw.xml"
        if not template_path.exists():
            raise FileNotFoundError(f"Base template not found: {template_path}")
        
        parser = etree.XMLParser(remove_blank_text=True)
        tree = etree.parse(str(template_path), parser)
        
        root = tree.getroot()
        ns = dict(root.nsmap or {})
        if None in ns:
            ns['ftc'] = ns[None]
            ns.pop(None, None)
        
        return tree, ns
    
    def _next_docref_id(self) -> str:
        """Generate next unique DocRefId."""
        self.docref_counter += 1
        giin_base = self.config.reporting_fi_tins[0].replace('.', '')[:10] if self.config.reporting_fi_tins else "FATCA"
        return f"{giin_base}.{self.config.tax_year}.{self.docref_counter:06d}"
    
    def _get_doc_type_indic(self, doc_type: str = 'new') -> str:
        """Get appropriate DocTypeIndic based on test mode."""
        if self.config.test_mode:
            return FATCA_DOC_TYPE_INDIC.get(f'{doc_type}_test', 'FATCA11')
        return FATCA_DOC_TYPE_INDIC.get(doc_type, 'FATCA1')
    
    def _create_individual_account(self, template: etree._Element, ns: dict) -> etree._Element:
        """Create an individual account from template."""
        account = deepcopy(template)
        
        # Update DocSpec
        doc_spec = account.find('.//ftc:DocSpec', namespaces=ns)
        if doc_spec is not None:
            doc_type = doc_spec.find('ftc:DocTypeIndic', namespaces=ns)
            if doc_type is not None:
                doc_type.text = self._get_doc_type_indic('new')
            
            doc_ref = doc_spec.find('ftc:DocRefId', namespaces=ns)
            if doc_ref is not None:
                doc_ref.text = self._next_docref_id()
        
        # Update account number
        acc_num = account.find('.//ftc:AccountNumber', namespaces=ns)
        if acc_num is not None:
            acc_num.text = self.data_gen.account_number()
        
        # Update AccountClosed
        acc_closed = account.find('.//ftc:AccountClosed', namespaces=ns)
        if acc_closed is not None:
            is_closed = self.data_gen.rng.random() < self.config.closed_account_ratio
            acc_closed.text = 'true' if is_closed else 'false'
        
        # Get country codes
        res_country = self.data_gen.account_holder_res_country()
        address_country = self.data_gen.address_country()
        
        # Update Individual
        individual = account.find('.//ftc:Individual', namespaces=ns)
        if individual is not None:
            # ResCountryCode
            res_elem = individual.find('sfa:ResCountryCode', namespaces=ns)
            if res_elem is not None:
                res_elem.text = res_country
            
            # TIN
            tin_elem = individual.find('sfa:TIN', namespaces=ns)
            if tin_elem is not None:
                tin_elem.text = self.data_gen.tin()
                tin_elem.set('issuedBy', res_country)
            
            # Name
            name_elem = individual.find('sfa:Name', namespaces=ns)
            if name_elem is not None:
                first_name = name_elem.find('sfa:FirstName', namespaces=ns)
                last_name = name_elem.find('sfa:LastName', namespaces=ns)
                if first_name is not None:
                    first_name.text = self.data_gen.first_name()
                if last_name is not None:
                    last_name.text = self.data_gen.last_name()
            
            # Address
            address = individual.find('sfa:Address', namespaces=ns)
            if address is not None:
                country_code = address.find('sfa:CountryCode', namespaces=ns)
                if country_code is not None:
                    country_code.text = address_country
                
                # AddressFree or AddressFix
                addr_free = address.find('sfa:AddressFree', namespaces=ns)
                if addr_free is not None:
                    addr_free.text = f"{self.data_gen.street()} {self.data_gen.rng.randint(1, 999)}, {self.data_gen.city()}"
                
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
            
            # BirthInfo
            birth_info = individual.find('sfa:BirthInfo', namespaces=ns)
            if birth_info is not None:
                birth_date = birth_info.find('sfa:BirthDate', namespaces=ns)
                if birth_date is not None:
                    birth_date.text = self.data_gen.birth_date()
        
        # Update balance
        self._randomize_balance_and_payment(account, ns)
        
        return account
    
    def _create_organisation_account(self, template: etree._Element, ns: dict) -> etree._Element:
        """Create an organisation account with substantial owners."""
        account = deepcopy(template)
        
        # Update DocSpec
        doc_spec = account.find('.//ftc:DocSpec', namespaces=ns)
        if doc_spec is not None:
            doc_type = doc_spec.find('ftc:DocTypeIndic', namespaces=ns)
            if doc_type is not None:
                doc_type.text = self._get_doc_type_indic('new')
            
            doc_ref = doc_spec.find('ftc:DocRefId', namespaces=ns)
            if doc_ref is not None:
                doc_ref.text = self._next_docref_id()
        
        # Update account number
        acc_num = account.find('.//ftc:AccountNumber', namespaces=ns)
        if acc_num is not None:
            acc_num.text = self.data_gen.account_number()
        
        # Update AccountClosed
        acc_closed = account.find('.//ftc:AccountClosed', namespaces=ns)
        if acc_closed is not None:
            is_closed = self.data_gen.rng.random() < self.config.closed_account_ratio
            acc_closed.text = 'true' if is_closed else 'false'
        
        res_country = self.data_gen.account_holder_res_country()
        address_country = self.data_gen.address_country()
        
        # Find or create AccountHolder with Organisation
        account_holder = account.find('.//ftc:AccountHolder', namespaces=ns)
        if account_holder is not None:
            # Remove Individual if exists (we're creating org account)
            individual = account_holder.find('ftc:Individual', namespaces=ns)
            if individual is not None:
                account_holder.remove(individual)
            
            # Create Organisation element
            org = account_holder.find('ftc:Organisation', namespaces=ns)
            if org is None:
                org = etree.SubElement(account_holder, f"{{{self.ns['ftc']}}}Organisation")
            
            # ResCountryCode
            res_elem = org.find('sfa:ResCountryCode', namespaces=ns)
            if res_elem is None:
                res_elem = etree.SubElement(org, f"{{{self.ns['sfa']}}}ResCountryCode")
            res_elem.text = res_country
            
            # TIN
            tin_elem = org.find('sfa:TIN', namespaces=ns)
            if tin_elem is None:
                tin_elem = etree.SubElement(org, f"{{{self.ns['sfa']}}}TIN")
            tin_elem.text = self.data_gen.tin()
            tin_elem.set('issuedBy', res_country)
            
            # Name
            name_elem = org.find('sfa:Name', namespaces=ns)
            if name_elem is None:
                name_elem = etree.SubElement(org, f"{{{self.ns['sfa']}}}Name")
            name_elem.text = self.data_gen.company_name()
            
            # Address
            address = org.find('sfa:Address', namespaces=ns)
            if address is None:
                address = etree.SubElement(org, f"{{{self.ns['sfa']}}}Address")
            
            country_code = address.find('sfa:CountryCode', namespaces=ns)
            if country_code is None:
                country_code = etree.SubElement(address, f"{{{self.ns['sfa']}}}CountryCode")
            country_code.text = address_country
            
            addr_free = address.find('sfa:AddressFree', namespaces=ns)
            if addr_free is None:
                addr_free = etree.SubElement(address, f"{{{self.ns['sfa']}}}AddressFree")
            addr_free.text = f"{self.data_gen.street()} {self.data_gen.rng.randint(1, 999)}, {self.data_gen.city()}"
            
            # AcctHolderType (required for organisations in FATCA)
            acct_holder_type = account_holder.find('ftc:AcctHolderType', namespaces=ns)
            if acct_holder_type is None:
                acct_holder_type = etree.SubElement(account_holder, f"{{{self.ns['ftc']}}}AcctHolderType")
            acct_holder_type.text = self.data_gen.acct_holder_type()
        
        # Add SubstantialOwners
        self._add_substantial_owners(account, ns)
        
        # Update balance
        self._randomize_balance_and_payment(account, ns)
        
        return account
    
    def _add_substantial_owners(self, account: etree._Element, ns: dict):
        """Add substantial owners to an organisation account."""
        for _ in range(self.config.substantial_owners_per_org):
            so = etree.SubElement(account, f"{{{self.ns['ftc']}}}SubstantialOwner")
            
            individual = etree.SubElement(so, f"{{{self.ns['ftc']}}}Individual")
            
            res_country = self.data_gen.account_holder_res_country()
            
            # ResCountryCode
            res_elem = etree.SubElement(individual, f"{{{self.ns['sfa']}}}ResCountryCode")
            res_elem.text = res_country
            
            # TIN
            tin_elem = etree.SubElement(individual, f"{{{self.ns['sfa']}}}TIN")
            tin_elem.text = self.data_gen.tin()
            tin_elem.set('issuedBy', res_country)
            
            # Name
            name = etree.SubElement(individual, f"{{{self.ns['sfa']}}}Name")
            first_name = etree.SubElement(name, f"{{{self.ns['sfa']}}}FirstName")
            first_name.text = self.data_gen.first_name()
            last_name = etree.SubElement(name, f"{{{self.ns['sfa']}}}LastName")
            last_name.text = self.data_gen.last_name()
            
            # Address
            address = etree.SubElement(individual, f"{{{self.ns['sfa']}}}Address")
            country_code = etree.SubElement(address, f"{{{self.ns['sfa']}}}CountryCode")
            country_code.text = self.data_gen.address_country()
            addr_free = etree.SubElement(address, f"{{{self.ns['sfa']}}}AddressFree")
            addr_free.text = f"{self.data_gen.street()} {self.data_gen.rng.randint(1, 999)}, {self.data_gen.city()}"
            
            # BirthInfo
            birth_info = etree.SubElement(individual, f"{{{self.ns['sfa']}}}BirthInfo")
            birth_date = etree.SubElement(birth_info, f"{{{self.ns['sfa']}}}BirthDate")
            birth_date.text = self.data_gen.birth_date()
    
    def _randomize_balance_and_payment(self, account: etree._Element, ns: dict):
        """Randomize account balance and payments."""
        currency = self.data_gen.rng.choice(self.config.currencies)
        balance = self.data_gen.balance()
        
        # Update balance
        balance_elem = account.find('.//ftc:AccountBalance', namespaces=ns)
        if balance_elem is not None:
            balance_elem.set('currCode', currency)
            balance_elem.text = f"{balance:.2f}"
        
        # Handle payments
        payment_nodes = account.findall('.//ftc:Payment', namespaces=ns)
        
        # Remove existing payments
        for payment in payment_nodes:
            payment.getparent().remove(payment)
        
        # Add 1-3 random payments
        num_payments = self.data_gen.rng.randint(1, 3)
        
        # Find where to insert payments (after AccountBalance)
        parent = balance_elem.getparent() if balance_elem is not None else account
        
        for _ in range(num_payments):
            payment = etree.SubElement(parent, f"{{{self.ns['ftc']}}}Payment")
            
            type_elem = etree.SubElement(payment, f"{{{self.ns['ftc']}}}Type")
            type_elem.text = self.data_gen.payment_type()
            
            amnt_elem = etree.SubElement(payment, f"{{{self.ns['ftc']}}}PaymentAmnt")
            amnt_elem.set('currCode', currency)
            amnt_elem.text = f"{self.data_gen.payment_amount(balance):.2f}"
    
    def generate(self) -> Path:
        """Generate the FATCA XML file."""
        logger.info(f"Starting FATCA generation for {self.config.tax_year}")
        logger.info(f"  ReportingFIs: {self.config.num_reporting_fis}")
        logger.info(f"  Individual accounts/FI: {self.config.individual_accounts_per_fi}")
        logger.info(f"  Organisation accounts/FI: {self.config.organisation_accounts_per_fi}")
        
        tree, ns = self._load_base_template()
        root = tree.getroot()
        
        # Update MessageSpec
        self._update_message_spec(root, ns)
        
        # Find FATCA body
        fatca_body = root.find('.//ftc:FATCA', namespaces=ns)
        if fatca_body is None:
            raise ValueError("No FATCA body found in template")
        
        # Update ReportingFI
        reporting_fi = fatca_body.find('.//ftc:ReportingFI', namespaces=ns)
        if reporting_fi is not None:
            self._update_reporting_fi(reporting_fi, ns, 0)
        
        # Find ReportingGroup and template account
        reporting_group = fatca_body.find('.//ftc:ReportingGroup', namespaces=ns)
        if reporting_group is None:
            raise ValueError("No ReportingGroup found in template")
        
        # Get template account
        template_account = reporting_group.find('.//ftc:AccountReport', namespaces=ns)
        if template_account is None:
            raise ValueError("No AccountReport template found")
        
        # Remove template account
        reporting_group.remove(template_account)
        
        total_accounts = self.config.individual_accounts_per_fi + self.config.organisation_accounts_per_fi
        account_count = 0
        
        # Generate individual accounts
        for i in range(self.config.individual_accounts_per_fi):
            account = self._create_individual_account(template_account, ns)
            reporting_group.append(account)
            account_count += 1
            
            if self.config.show_progress and account_count % self.config.progress_every == 0:
                logger.info(f"  Generated {account_count}/{total_accounts} accounts...")
        
        # Generate organisation accounts
        for i in range(self.config.organisation_accounts_per_fi):
            account = self._create_organisation_account(template_account, ns)
            reporting_group.append(account)
            account_count += 1
            
            if self.config.show_progress and account_count % self.config.progress_every == 0:
                logger.info(f"  Generated {account_count}/{total_accounts} accounts...")
        
        # Write output
        tree.write(
            str(self.config.output_path),
            pretty_print=self.config.pretty_print,
            xml_declaration=True,
            encoding='UTF-8'
        )
        
        logger.info(f"Generated FATCA XML: {self.config.output_path}")
        logger.info(f"  Total accounts: {account_count}")
        
        return self.config.output_path
    
    def _update_message_spec(self, root: etree._Element, ns: dict):
        """Update MessageSpec with config values."""
        msg_spec = root.find('.//ftc:MessageSpec', namespaces=ns)
        if msg_spec is None:
            return
        
        # SendingCompanyIN
        sending_in = msg_spec.find('sfa:SendingCompanyIN', namespaces=ns)
        if sending_in is not None:
            sending_in.text = self.config.sending_company_in
        
        # TransmittingCountry
        trans_country = msg_spec.find('sfa:TransmittingCountry', namespaces=ns)
        if trans_country is not None:
            trans_country.text = self.config.sending_country
        
        # ReceivingCountry
        recv_country = msg_spec.find('sfa:ReceivingCountry', namespaces=ns)
        if recv_country is not None:
            recv_country.text = self.config.receiving_country
        
        # MessageRefId
        msg_ref = msg_spec.find('sfa:MessageRefId', namespaces=ns)
        if msg_ref is not None:
            msg_ref.text = f"{self.config.sending_country}{self.config.tax_year}{self.config.receiving_country}{self.data_gen.rng.randint(100000, 999999)}"
        
        # ReportingPeriod
        reporting_period = msg_spec.find('sfa:ReportingPeriod', namespaces=ns)
        if reporting_period is not None:
            reporting_period.text = f"{self.config.tax_year}-12-31"
        
        # Timestamp
        timestamp = msg_spec.find('sfa:Timestamp', namespaces=ns)
        if timestamp is not None:
            timestamp.text = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    
    def _update_reporting_fi(self, reporting_fi: etree._Element, ns: dict, fi_index: int):
        """Update ReportingFI with config values."""
        # ResCountryCode
        res_country = reporting_fi.find('sfa:ResCountryCode', namespaces=ns)
        if res_country is not None:
            res_country.text = self.config.sending_country
        
        # TIN (GIIN)
        tin = reporting_fi.find('sfa:TIN', namespaces=ns)
        if tin is not None:
            tin.text = self.config.reporting_fi_tins[fi_index]
            tin.set('issuedBy', self.config.sending_country)
        
        # Name
        name = reporting_fi.find('sfa:Name', namespaces=ns)
        if name is not None:
            name.text = self.data_gen.company_name()
        
        # Address CountryCode
        address = reporting_fi.find('.//sfa:Address', namespaces=ns)
        if address is not None:
            country_code = address.find('sfa:CountryCode', namespaces=ns)
            if country_code is not None:
                country_code.text = self.config.sending_country
        
        # FilerCategory
        filer_cat = reporting_fi.find('ftc:FilerCategory', namespaces=ns)
        if filer_cat is not None:
            filer_cat.text = self.config.filer_category
        
        # DocSpec
        doc_spec = reporting_fi.find('ftc:DocSpec', namespaces=ns)
        if doc_spec is not None:
            doc_type = doc_spec.find('ftc:DocTypeIndic', namespaces=ns)
            if doc_type is not None:
                doc_type.text = self._get_doc_type_indic('new')
            
            doc_ref = doc_spec.find('ftc:DocRefId', namespaces=ns)
            if doc_ref is not None:
                doc_ref.text = self._next_docref_id()


def generate_fatca(
    sending_country: str = "NL",
    receiving_country: str = "US",
    tax_year: int = 2021,
    individual_accounts: int = 100,
    organisation_accounts: int = 100,
    output_path: Optional[str] = None,
    test_mode: bool = True,
    **kwargs
) -> Path:
    """Convenience function to generate FATCA XML."""
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
        sending_country="NL",
        receiving_country="US",
        tax_year=2024,
        individual_accounts=10,
        organisation_accounts=5,
        test_mode=True
    )
    print(f"Generated: {output}")
