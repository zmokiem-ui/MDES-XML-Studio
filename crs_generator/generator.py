"""
Modern CRS Generator using validated templates with performance optimizations.

This generator:
1. Uses your validated CRS.Generic.2021.Domestic.xml as base
2. Clones account structures efficiently
3. Scales to 100k-200k accounts
4. Shows progress
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
from multiprocessing import Pool, cpu_count
import tempfile
import shutil
from .reportable_jurisdictions import get_reportable_jurisdictions, get_all_country_codes

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)


@dataclass
class GeneratorConfig:
    """Configuration for CRS XML generation."""
    # Basic info
    sending_country: str = "NL"
    receiving_country: str = "NL"
    tax_year: int = 2021
    mytin: str = "999999999"  # Default test TIN - replace with actual SendingCompanyIN
    
    # ReportingFI TINs (one per ReportingFI)
    reporting_fi_tins: List[str] = field(default_factory=list)
    
    # Scale
    num_reporting_fis: int = 1
    individual_accounts_per_fi: int = 100
    organisation_accounts_per_fi: int = 100
    controlling_persons_per_org: int = 1
    
    # AccountHolder Country Selection
    account_holder_country_mode: str = "random"  # "random", "single", "multiple"
    account_holder_countries: List[str] = field(default_factory=list)  # Used for "single" or "multiple" modes
    account_holder_country_weights: Dict[str, float] = field(default_factory=dict)  # Optional weighted distribution
    
    # Realism
    closed_account_ratio: float = 0.1
    currencies: List[str] = field(default_factory=lambda: ["EUR", "USD", "GBP", "ANG"])
    
    # Output
    output_path: Optional[Path] = None
    
    # Performance
    show_progress: bool = True
    progress_every: int = 500  # Show progress every N accounts
    seed: int = 42
    pretty_print: bool = True  # Enabled by default for readability
    
    def __post_init__(self):

        # Handle output path
        if isinstance(self.output_path, str):
            self.output_path = Path(self.output_path)
        
        if self.output_path is None:
            self.output_path = Path.cwd() / "out" / f"crs_{self.sending_country}_{self.tax_year}.xml"
        else:
            # If user provides just a filename (no directory), auto-prepend 'out/'
            if not self.output_path.parent or str(self.output_path.parent) == '.':
                self.output_path = Path.cwd() / "out" / self.output_path.name
        
        # Ensure output directory exists
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Generate default TINs if not provided
        if not self.reporting_fi_tins:
            self.reporting_fi_tins = [f"FI{999999000 + i}" for i in range(self.num_reporting_fis)]
        
        # Validate TIN count
        if len(self.reporting_fi_tins) != self.num_reporting_fis:
            raise ValueError(
                f"Number of ReportingFI TINs ({len(self.reporting_fi_tins)}) "
                f"must match num_reporting_fis ({self.num_reporting_fis})"
            )
        
        # Validate and setup account holder countries
        if self.account_holder_country_mode == "random":
            # Use full reportable jurisdictions whitelist
            if not self.account_holder_countries:
                self.account_holder_countries = get_reportable_jurisdictions()
        elif self.account_holder_country_mode == "single":
            # Must have exactly one country
            if not self.account_holder_countries:
                self.account_holder_countries = [self.receiving_country]
            elif len(self.account_holder_countries) != 1:
                raise ValueError("Single mode requires exactly one country in account_holder_countries")
        elif self.account_holder_country_mode == "multiple":
            # Must have at least one country
            if not self.account_holder_countries:
                raise ValueError("Multiple mode requires at least one country in account_holder_countries")
        else:
            raise ValueError(f"Invalid account_holder_country_mode: {self.account_holder_country_mode}")


class DataGenerator:
    """Generates realistic random data for CRS fields."""
    
    def __init__(self, seed: int = 42, config: Optional[GeneratorConfig] = None):
        self.rng = random.Random(seed)
        Faker.seed(seed)
        self.faker = Faker('en_US')
        self.config = config
        
        # Cache common data for 100x speedup
        self._cache = {}
        self._precompute_caches()
        
        # Cache country codes
        self._all_countries = get_all_country_codes()
        
    def _precompute_caches(self):
        """Pre-generate pools of data to avoid Faker call overhead."""
        pool_size = 1000
        self._cache['first_names'] = [self.faker.first_name() for _ in range(pool_size)]
        self._cache['last_names'] = [self.faker.last_name() for _ in range(pool_size)]
        self._cache['cities'] = [self.faker.city() for _ in range(pool_size)]
        self._cache['streets'] = [self.faker.street_name() for _ in range(pool_size)]
        self._cache['postcodes'] = [self.faker.postcode() for _ in range(pool_size)]
        self._cache['companies'] = [self.faker.company() for _ in range(pool_size)]
        
    def tin(self) -> str:
        return str(self.rng.randint(100000000, 999999999))
    
    def account_number(self) -> str:
        return f"ACC{self.rng.randint(1, 9999999999):010d}"
    
    def birth_date(self) -> str:
        days_back = self.rng.randint(18*365, 80*365)
        birth_date = datetime.now() - timedelta(days=days_back)
        return birth_date.strftime("%Y-%m-%d")
    
    def balance(self) -> float:
        # Log-normal distribution for realistic balances
        mean = 11  # log(~60k)
        sigma = 2.5
        balance = self.rng.lognormvariate(mean, sigma)
        return round(balance, 2)
    
    def payment_amount(self, balance: float) -> float:
        """Generate a realistic payment amount (usually smaller than balance)."""
        # Payment is typically 1-20% of balance
        return round(balance * self.rng.uniform(0.01, 0.20), 2)
    
    def first_name(self) -> str: return self.rng.choice(self._cache['first_names'])
    def last_name(self) -> str: return self.rng.choice(self._cache['last_names'])
    def city(self) -> str: return self.rng.choice(self._cache['cities'])
    def street(self) -> str: return self.rng.choice(self._cache['streets'])
    def postcode(self) -> str: return self.rng.choice(self._cache['postcodes'])
    def company(self) -> str: return self.rng.choice(self._cache['companies'])
    
    def company_name(self) -> str:
        """Generate a realistic financial institution name."""
        patterns = [
            lambda: f"{self.city()} Capital Bank",
            lambda: f"{self.last_name()} Financial Services",
            lambda: f"Bank of {self.city()}",
            lambda: f"{self.last_name()} & {self.last_name()} Investment Bank",
            lambda: f"First {self.city()} Bank",
            lambda: f"{self.last_name()} Trust Company",
            lambda: f"National Bank of {self.city()}",
            lambda: f"{self.city()} Savings & Loan",
            lambda: f"{self.company()} Financial Group",
            lambda: f"Pacific {self.city()} Bank",
            lambda: f"{self.last_name()} Capital",
            lambda: f"Global {self.last_name()} Bank",
        ]
        pattern = self.rng.choice(patterns)
        return pattern()
    
    def account_holder_res_country(self) -> str:
        """Select AccountHolder ResCountryCode from reportable jurisdictions whitelist."""
        if not self.config:
            return "NL"  # Default fallback
        
        countries = self.config.account_holder_countries
        weights = self.config.account_holder_country_weights
        
        if weights and len(weights) > 0:
            # Use weighted distribution
            country_list = list(weights.keys())
            weight_list = list(weights.values())
            return self.rng.choices(country_list, weights=weight_list, k=1)[0]
        else:
            # Random selection from list
            return self.rng.choice(countries)
    
    def tin_issued_by_country(self) -> str:
        """Select TIN issuedBy country from reportable jurisdictions whitelist."""
        if not self.config:
            return "NL"  # Default fallback
        
        # TIN issuedBy uses same whitelist as ResCountryCode
        countries = self.config.account_holder_countries
        return self.rng.choice(countries)
    
    def address_country(self) -> str:
        """Select Address CountryCode - can be ANY country (unrestricted)."""
        # Address can be from any country in the world
        return self.rng.choice(self._all_countries)


class CRSGenerator:
    """
    High-performance CRS XML generator using validated templates.
    """
    
    def __init__(self, config: GeneratorConfig):
        self.config = config
        self.data_gen = DataGenerator(config.seed, config)
        
        # Namespace map
        self.ns = {
            'crs': 'urn:oecd:ties:crs:v2',
            'stf': 'urn:oecd:ties:crsstf:v5',
            'cfc': 'urn:oecd:ties:commontypesfatcacrs:v2',
            'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            'iso': 'urn:oecd:ties:isocrstypes:v1',
            'ftc': 'urn:oecd:ties:fatca:v1'
        }
        
        # ID counter for unique DocRefIds
        self.docref_counter = 0
        
    def _load_base_template(self) -> tuple[etree._ElementTree, dict]:
        """Load the base CRS template."""
        template_path = Path(__file__).parent / "templates" / "CRS.Generic.2021.Domestic.xml"
        if not template_path.exists():
            raise FileNotFoundError(f"Base template not found: {template_path}")
        
        parser = etree.XMLParser(remove_blank_text=True)
        tree = etree.parse(str(template_path), parser)
        
        # Build namespace map from root
        root = tree.getroot()
        ns = dict(root.nsmap or {})
        if None in ns:
            ns['crs'] = ns[None]
            ns.pop(None, None)
        
        return tree, ns
    
    def _next_docref_id(self) -> str:
        """Generate next unique DocRefId."""
        self.docref_counter += 1
        base = f"{self.config.sending_country}{self.config.tax_year}{self.config.mytin}"
        return f"{base}{self.docref_counter:09d}"
    
    def _randomize_element_text(self, elem: etree._Element):
        """Replace placeholder text in element with realistic data."""
        if not hasattr(elem, 'text') or not elem.text:
            return
        
        text = elem.text.strip()
        
        # Skip if already looks like real data (no placeholders)
        if not any(marker in text.upper() for marker in ['FIRSTNAME', 'LASTNAME', 'CITY', 'STREET', 
                                                           'BUILDING', 'POSTCODE', 'BIRTHDATE', 
                                                           'ACCOUNTNUMBER', 'ORGNAME', 'TIN', 'CP_',
                                                           'ADDRESSADDRESS', 'ABC', 'DOCTYPEINDIC']):
            return
        
        # DocTypeIndic should always be OECD11
        if 'DOCTYPEINDIC' in text:
            elem.text = 'OECD11'
            return
        
        # Special case for TIN - only replace if it's a placeholder
        if text == '1234567' or text.startswith('123456789') or text.upper() == 'TIN':
            elem.text = self.data_gen.tin()
            return
        
        # Replace CP_ prefixes first (for controlling persons)
        if text.startswith('CP_'):
            text = text[3:]  # Remove "CP_" prefix
        
        # Map placeholders to generators
        replacements = {
            'FIRSTNAME': self.data_gen.first_name(),
            'LASTNAME': self.data_gen.last_name(),
            'ASTNAME': self.data_gen.last_name(),  # Typo in template
            'CITY': self.data_gen.city(),
            'STREET': self.data_gen.street(),
            'BUILDING': str(self.data_gen.rng.randint(1, 999)),
            'POSTCODE': self.data_gen.postcode(),
            'BIRTHDATE': self.data_gen.birth_date(),
            'ACCOUNTNUMBER': self.data_gen.account_number(),
            'ORGNAME': self.data_gen.company_name(),
        }
        
        # Replace standard placeholders
        for placeholder, value in replacements.items():
            if placeholder in text.upper():
                text = text.replace(placeholder, value)
                text = text.replace(placeholder.lower(), value)
        
        # Replace template junk like "AddressAddressFixStreet. abc"
        if 'AddressAddressFix' in text or '. abc' in text:
            # Generate appropriate replacement based on context
            tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            
            if tag == 'Street':
                text = self.data_gen.street()
            elif tag == 'BuildingIdentifier':
                text = str(self.data_gen.rng.randint(1, 999))
            elif tag == 'PostCode':
                text = self.data_gen.postcode()
            elif tag == 'City':
                text = self.data_gen.city()
            elif tag == 'AddressFree':
                text = f"{self.data_gen.street()}, {self.data_gen.city()}"
            elif 'Suite' in tag or 'Floor' in tag or 'District' in tag or 'POB' in tag or 'CountrySubentity' in tag:
                # Optional fields - generate realistic data
                if 'Suite' in tag:
                    text = f"Suite {self.data_gen.rng.randint(1, 500)}"
                elif 'Floor' in tag:
                    text = f"Floor {self.data_gen.rng.randint(1, 50)}"
                elif 'District' in tag:
                    text = self.data_gen.city()
                elif 'POB' in tag:
                    text = f"PO Box {self.data_gen.rng.randint(1, 9999)}"
                elif 'CountrySubentity' in tag:
                    text = self.data_gen.faker.state()
        
        elem.text = text
    
    def _randomize_balance_and_payment(self, account: etree._Element, ns: dict):
        """Randomize account balance and create 1-5 random payment nodes."""
        currency = self.data_gen.rng.choice(self.config.currencies)
        balance = self.data_gen.balance()
        
        # Update balance
        balance_elem = account.find('.//crs:AccountBalance', namespaces=ns)
        if balance_elem is not None:
            balance_elem.set('currCode', currency)
            balance_elem.text = f"{balance:.2f}"
        
        # Find existing payment nodes and remove all but the first one (template)
        payment_nodes = account.findall('.//crs:Payment', namespaces=ns)
        if not payment_nodes:
            return  # No payment template found
        
        # Keep first payment as template, remove the rest
        template_payment = payment_nodes[0]
        for payment in payment_nodes[1:]:
            payment.getparent().remove(payment)
        
        # Determine number of payments (1-5 random)
        num_payments = self.data_gen.rng.randint(1, 5)
        
        # Payment types available in CRS
        payment_types = ['CRS501', 'CRS502', 'CRS503', 'CRS504']
        
        # Update first payment
        payment_type_elem = template_payment.find('crs:Type', namespaces=ns)
        payment_amnt_elem = template_payment.find('crs:PaymentAmnt', namespaces=ns)
        
        if payment_type_elem is not None and payment_amnt_elem is not None:
            payment_type_elem.text = self.data_gen.rng.choice(payment_types)
            payment_amount = self.data_gen.payment_amount(balance)
            payment_amnt_elem.set('currCode', currency)
            payment_amnt_elem.text = f"{payment_amount:.2f}"
        
        # Create additional payments if needed
        parent = template_payment.getparent()
        for i in range(1, num_payments):
            new_payment = deepcopy(template_payment)
            
            # Randomize payment type and amount
            payment_type_elem = new_payment.find('crs:Type', namespaces=ns)
            payment_amnt_elem = new_payment.find('crs:PaymentAmnt', namespaces=ns)
            
            if payment_type_elem is not None:
                payment_type_elem.text = self.data_gen.rng.choice(payment_types)
            
            if payment_amnt_elem is not None:
                payment_amount = self.data_gen.payment_amount(balance)
                payment_amnt_elem.set('currCode', currency)
                payment_amnt_elem.text = f"{payment_amount:.2f}"
            
            parent.append(new_payment)
    
    def _create_individual_account(self, template: etree._Element, ns: dict) -> etree._Element:
        """Create an individual account from template."""
        account = deepcopy(template)
        
        # Set closed status
        is_closed = self.data_gen.rng.random() < self.config.closed_account_ratio
        acc_num = account.find('.//crs:AccountNumber', namespaces=ns)
        if acc_num is not None:
            acc_num.set('ClosedAccount', 'true' if is_closed else 'false')
        
        # Update DocTypeIndic to OECD11
        doc_type = account.find('.//stf:DocTypeIndic', namespaces=ns)
        if doc_type is not None:
            doc_type.text = 'OECD11'
        
        # Apply AccountHolder country rules BEFORE randomizing text
        res_country = self.data_gen.account_holder_res_country()
        tin_issued_by = self.data_gen.tin_issued_by_country()
        address_country = self.data_gen.address_country()
        
        # Update Individual ResCountryCode
        individual = account.find('.//crs:Individual', namespaces=ns)
        if individual is not None:
            res_country_elem = individual.find('crs:ResCountryCode', namespaces=ns)
            if res_country_elem is not None:
                res_country_elem.text = res_country
            
            # Update TIN issuedBy
            tin_elem = individual.find('crs:TIN', namespaces=ns)
            if tin_elem is not None:
                tin_elem.set('issuedBy', tin_issued_by)
            
            # Update Address CountryCode
            address = individual.find('crs:Address', namespaces=ns)
            if address is not None:
                country_code_elem = address.find('cfc:CountryCode', namespaces=ns)
                if country_code_elem is not None:
                    country_code_elem.text = address_country
        
        # Randomize all text content
        for elem in account.iter():
            self._randomize_element_text(elem)
        
        # Randomize balance and payments
        # IMPORTANT: Closed accounts MUST have zero balance
        if is_closed:
            balance_elem = account.find('.//crs:AccountBalance', namespaces=ns)
            if balance_elem is not None:
                currency = balance_elem.get('currCode', 'EUR')
                balance_elem.set('currCode', currency)
                balance_elem.text = "0.00"
            
            # Also set all payments to zero for closed accounts
            payment_nodes = account.findall('.//crs:Payment/crs:PaymentAmnt', namespaces=ns)
            for payment_elem in payment_nodes:
                currency = payment_elem.get('currCode', 'EUR')
                payment_elem.set('currCode', currency)
                payment_elem.text = "0.00"
        else:
            self._randomize_balance_and_payment(account, ns)
        
        # Update DocRefId
        docref = account.find('.//stf:DocRefId', namespaces=ns)
        if docref is not None:
            docref.text = self._next_docref_id()
        
        return account
    
    def _create_organisation_account(self, template: etree._Element, ns: dict) -> etree._Element:
        """Create an organisation account from template."""
        account = deepcopy(template)
        
        # Set closed status
        is_closed = self.data_gen.rng.random() < self.config.closed_account_ratio
        acc_num = account.find('.//crs:AccountNumber', namespaces=ns)
        if acc_num is not None:
            acc_num.set('ClosedAccount', 'true' if is_closed else 'false')

        # Update DocTypeIndic to OECD11
        doc_type = account.find('.//stf:DocTypeIndic', namespaces=ns)
        if doc_type is not None:
            doc_type.text = 'OECD11'
        
        # Apply AccountHolder country rules BEFORE randomizing text
        res_country = self.data_gen.account_holder_res_country()
        tin_issued_by = self.data_gen.tin_issued_by_country()
        address_country = self.data_gen.address_country()
        
        # Update Organisation fields
        organisation = account.find('.//crs:Organisation', namespaces=ns)
        if organisation is not None:
            # Update ResCountryCode
            res_country_elem = organisation.find('crs:ResCountryCode', namespaces=ns)
            if res_country_elem is not None:
                res_country_elem.text = res_country
            
            # Update IN (TIN) and issuedBy
            org_in = organisation.find('crs:IN', namespaces=ns)
            if org_in is not None:
                org_in.text = self.data_gen.tin()
                org_in.set('issuedBy', tin_issued_by)
            
            # Update Address CountryCode
            address = organisation.find('crs:Address', namespaces=ns)
            if address is not None:
                country_code_elem = address.find('cfc:CountryCode', namespaces=ns)
                if country_code_elem is not None:
                    country_code_elem.text = address_country
        
        # Apply same country rules to ControllingPerson (they inherit from AccountHolder)
        controlling_persons = account.findall('.//crs:ControllingPerson', namespaces=ns)
        for cp in controlling_persons:
            cp_individual = cp.find('crs:Individual', namespaces=ns)
            if cp_individual is not None:
                # ControllingPerson uses same ResCountryCode as AccountHolder
                cp_res_country_elem = cp_individual.find('crs:ResCountryCode', namespaces=ns)
                if cp_res_country_elem is not None:
                    cp_res_country_elem.text = res_country
                
                # ControllingPerson TIN can be from whitelist
                cp_tin_elem = cp_individual.find('crs:TIN', namespaces=ns)
                if cp_tin_elem is not None:
                    cp_tin_elem.set('issuedBy', tin_issued_by)
                
                # ControllingPerson Address can be any country
                cp_address = cp_individual.find('crs:Address', namespaces=ns)
                if cp_address is not None:
                    cp_country_code_elem = cp_address.find('cfc:CountryCode', namespaces=ns)
                    if cp_country_code_elem is not None:
                        cp_country_code_elem.text = address_country
        
        # Randomize all text content
        for elem in account.iter():
            self._randomize_element_text(elem)
        
        # Randomize balance and payments
        # IMPORTANT: Closed accounts MUST have zero balance
        if is_closed:
            balance_elem = account.find('.//crs:AccountBalance', namespaces=ns)
            if balance_elem is not None:
                currency = balance_elem.get('currCode', 'EUR')
                balance_elem.set('currCode', currency)
                balance_elem.text = "0.00"
            
            # Also set all payments to zero for closed accounts
            payment_nodes = account.findall('.//crs:Payment', namespaces=ns)
            for payment in payment_nodes:
                payment_amnt_elem = payment.find('crs:PaymentAmnt', namespaces=ns)
                if payment_amnt_elem is not None:
                    currency = payment_amnt_elem.get('currCode', 'EUR')
                    payment_amnt_elem.set('currCode', currency)
                    payment_amnt_elem.text = "0.00"
        else:
            self._randomize_balance_and_payment(account, ns)
        
        # Update DocRefId
        docref = account.find('.//stf:DocRefId', namespaces=ns)
        if docref is not None:
            docref.text = self._next_docref_id()
        
        # Handle controlling persons
        controlling_persons = account.findall('.//crs:ControllingPerson', namespaces=ns)
        if controlling_persons:
            if self.config.controlling_persons_per_org == 0:
                # Remove all controlling persons
                for cp in controlling_persons:
                    cp.getparent().remove(cp)
            elif self.config.controlling_persons_per_org > 1:
                # Clone to reach desired count
                first_cp = controlling_persons[0]
                parent = first_cp.getparent()
                
                # Remove extras or add more
                for cp in controlling_persons[1:]:
                    parent.remove(cp)
                
                for _ in range(self.config.controlling_persons_per_org - 1):
                    new_cp = deepcopy(first_cp)
                    # Regenerate TIN for controlling person
                    cp_tin = new_cp.find('.//crs:TIN', namespaces=ns)
                    if cp_tin is not None:
                        cp_tin.text = self.data_gen.tin()
                    for elem in new_cp.iter():
                        self._randomize_element_text(elem)
                    parent.append(new_cp)
        
        return account
    
    def _update_message_spec(self, root: etree._Element, ns: dict):
        """Update MessageSpec with config values."""
        msg_spec = root.find('.//crs:MessageSpec', namespaces=ns)
        if msg_spec is None:
            return
        
        updates = {
            'crs:SendingCompanyIN': self.config.mytin,
            'crs:TransmittingCountry': self.config.sending_country,
            'crs:ReceivingCountry': self.config.receiving_country,
            'crs:ReportingPeriod': f"{self.config.tax_year}-12-31",
            'crs:Timestamp': datetime.now().isoformat() + "Z",
        }
        
        for tag, value in updates.items():
            elem = msg_spec.find(tag, namespaces=ns)
            if elem is not None:
                elem.text = value
        
        # Update MessageRefId
        msg_ref = msg_spec.find('crs:MessageRefId', namespaces=ns)
        if msg_ref is not None:
            msg_ref.text = self._next_docref_id()
    
    def _update_reporting_fi(self, rfi: etree._Element, ns: dict, fi_index: int):
        """Update ReportingFI with config values and random data."""
        # Generate realistic financial institution name
        fi_name = self.data_gen.company_name()
        
        updates = {
            'crs:ResCountryCode': self.config.sending_country,
            'crs:Name': fi_name,
        }
        
        for tag, value in updates.items():
            elem = rfi.find(tag, namespaces=ns)
            if elem is not None:
                elem.text = value
        
        # Update IN element with TIN from config
        in_elem = rfi.find('.//crs:IN', namespaces=ns)
        if in_elem is not None:
            # Use the TIN from config for this FI (fi_index is 1-based)
            in_elem.text = self.config.reporting_fi_tins[fi_index - 1]
            in_elem.set('issuedBy', self.config.sending_country)
        
        # Update all country codes
        for country_elem in rfi.findall('.//cfc:CountryCode', namespaces=ns):
            country_elem.text = self.config.sending_country
        
        # Completely regenerate address with realistic data
        address = rfi.find('.//crs:Address', namespaces=ns)
        if address is not None:
            # Find or create AddressFix
            address_fix = address.find('cfc:AddressFix', namespaces=ns)
            if address_fix is not None:
                # Regenerate all address fields
                street_elem = address_fix.find('cfc:Street', namespaces=ns)
                if street_elem is not None:
                    street_elem.text = self.data_gen.street()
                
                building_elem = address_fix.find('cfc:BuildingIdentifier', namespaces=ns)
                if building_elem is not None:
                    building_elem.text = str(self.data_gen.rng.randint(1, 999))
                
                suite_elem = address_fix.find('cfc:SuiteIdentifier', namespaces=ns)
                if suite_elem is not None:
                    suite_elem.text = f"Suite {self.data_gen.rng.randint(100, 500)}"
                
                floor_elem = address_fix.find('cfc:FloorIdentifier', namespaces=ns)
                if floor_elem is not None:
                    floor_elem.text = f"Floor {self.data_gen.rng.randint(1, 30)}"
                
                district_elem = address_fix.find('cfc:DistrictName', namespaces=ns)
                if district_elem is not None:
                    district_elem.text = self.data_gen.city()
                
                pob_elem = address_fix.find('cfc:POB', namespaces=ns)
                if pob_elem is not None:
                    pob_elem.text = f"PO Box {self.data_gen.rng.randint(1000, 9999)}"
                
                postcode_elem = address_fix.find('cfc:PostCode', namespaces=ns)
                if postcode_elem is not None:
                    postcode_elem.text = self.data_gen.postcode()
                
                city_elem = address_fix.find('cfc:City', namespaces=ns)
                if city_elem is not None:
                    city_elem.text = self.data_gen.city()
                
                subentity_elem = address_fix.find('cfc:CountrySubentity', namespaces=ns)
                if subentity_elem is not None:
                    subentity_elem.text = self.data_gen.faker.state()
            
            # Update AddressFree
            address_free = address.find('cfc:AddressFree', namespaces=ns)
            if address_free is not None:
                address_free.text = f"{self.data_gen.street()}, {self.data_gen.city()}"
        
        # Update DocRefId and DocTypeIndic
        doc_spec = rfi.find('.//crs:DocSpec', namespaces=ns)
        if doc_spec is not None:
            doctype = doc_spec.find('stf:DocTypeIndic', namespaces=ns)
            if doctype is not None:
                doctype.text = 'OECD11'
            
            docref = doc_spec.find('stf:DocRefId', namespaces=ns)
            if docref is not None:
                docref.text = self._next_docref_id()
    
    def generate(self, use_parallel: bool = True, num_workers: int = None) -> Path:
        """
        Generate CRS XML file with optional parallel processing.
        
        Args:
            use_parallel: If True, use multiprocessing for large files
            num_workers: Number of worker processes (default: CPU count - 1)
        """
        total_accounts = self.config.num_reporting_fis * (
            self.config.individual_accounts_per_fi + 
            self.config.organisation_accounts_per_fi
        )
        
        logger.info("\n" + "="*70)
        logger.info("🏦 CRS XML GENERATOR")
        logger.info("="*70)
        logger.info(f"📊 Configuration:")
        logger.info(f"   Country: {self.config.sending_country} → {self.config.receiving_country}")
        logger.info(f"   Tax Year: {self.config.tax_year}")
        logger.info(f"   MYTIN: {self.config.mytin}")
        logger.info(f"   ReportingFIs: {self.config.num_reporting_fis}")
        logger.info(f"   Total Accounts: {total_accounts:,}")
        logger.info(f"     • Individual: {self.config.num_reporting_fis * self.config.individual_accounts_per_fi:,}")
        logger.info(f"     • Organisation: {self.config.num_reporting_fis * self.config.organisation_accounts_per_fi:,}")
        if self.config.controlling_persons_per_org > 0:
            total_cps = self.config.num_reporting_fis * self.config.organisation_accounts_per_fi * self.config.controlling_persons_per_org
            logger.info(f"     • Controlling Persons: {total_cps:,}")
        logger.info(f"   Output: {self.config.output_path}")
        
        # Decide whether to use parallel processing
        # Use parallel for files with 10k+ accounts
        if use_parallel and total_accounts >= 10000:
            if num_workers is None:
                num_workers = max(1, cpu_count() - 1)  # Leave 1 core free
            
            logger.info(f"   ⚡ Parallel Mode: {num_workers} workers")
            logger.info("="*70 + "\n")
            
            return self._generate_parallel(num_workers)
        else:
            logger.info(f"   ⚙️  Serial Mode (< 10k accounts)")
            logger.info("="*70 + "\n")
            
            return self._generate_serial()
    
    def _generate_serial(self) -> Path:
        """Original serial generation (for smaller files)."""
        from tqdm import tqdm
        
        total_accounts = self.config.num_reporting_fis * (
            self.config.individual_accounts_per_fi + 
            self.config.organisation_accounts_per_fi
        )
        
        # Load base template
        logger.info("📂 Loading base template...")
        tree, ns = self._load_base_template()
        root = tree.getroot()
        
        # Update MessageSpec
        logger.info("⚙️  Updating MessageSpec...")
        self._update_message_spec(root, ns)
        
        # Get the template CrsBody
        template_crs_body = root.find('.//crs:CrsBody', namespaces=ns)
        if template_crs_body is None:
            raise ValueError("CrsBody not found in template")
        
        # Get templates from the CrsBody
        template_rfi = template_crs_body.find('.//crs:ReportingFI', namespaces=ns)
        if template_rfi is None:
            raise ValueError("ReportingFI not found in template")
            
        template_reporting_group = template_crs_body.find('.//crs:ReportingGroup', namespaces=ns)
        if template_reporting_group is None:
            raise ValueError("ReportingGroup not found in template")
        
        # Extract account templates
        account_reports = template_reporting_group.findall('crs:AccountReport', namespaces=ns)
        if len(account_reports) < 2:
            raise ValueError("Template must have at least 2 AccountReports")
        
        individual_template = account_reports[0]
        org_template = account_reports[1]
        
        # Remove template CrsBody
        root.remove(template_crs_body)
        
        # Generate CrsBody elements
        logger.info(f"\n🔄 Generating {self.config.num_reporting_fis} ReportingFI(s)...")
        
        accounts_generated = 0
        
        fi_pbar = tqdm(total=self.config.num_reporting_fis, desc="ReportingFIs", unit="FI", position=0, leave=True)
        
        for fi_index in range(1, self.config.num_reporting_fis + 1):
            new_crs_body = deepcopy(template_crs_body)
            new_rfi = new_crs_body.find('.//crs:ReportingFI', namespaces=ns)
            new_reporting_group = new_crs_body.find('.//crs:ReportingGroup', namespaces=ns)
            
            self._update_reporting_fi(new_rfi, ns, fi_index)
            
            for acc in new_reporting_group.findall('crs:AccountReport', namespaces=ns):
                new_reporting_group.remove(acc)
            
            fi_total_accounts = self.config.individual_accounts_per_fi + self.config.organisation_accounts_per_fi
            
            if fi_total_accounts > 0:
                account_pbar = tqdm(total=fi_total_accounts, desc=f"  FI #{fi_index} Accounts", 
                                   unit="acct", position=1, leave=False)
            
            for i in range(self.config.individual_accounts_per_fi):
                account = self._create_individual_account(individual_template, ns)
                new_reporting_group.append(account)
                accounts_generated += 1
                if fi_total_accounts > 0:
                    account_pbar.update(1)
            
            for i in range(self.config.organisation_accounts_per_fi):
                account = self._create_organisation_account(org_template, ns)
                new_reporting_group.append(account)
                accounts_generated += 1
                if fi_total_accounts > 0:
                    account_pbar.update(1)
            
            if fi_total_accounts > 0:
                account_pbar.close()
            
            root.append(new_crs_body)
            fi_pbar.update(1)
        
        fi_pbar.close()
        
        # Write output
        logger.info(f"\n💾 Writing to file: {self.config.output_path}")
        tree.write(
            str(self.config.output_path),
            encoding='utf-8',
            xml_declaration=True,
            pretty_print=self.config.pretty_print
        )
        
        file_size = self.config.output_path.stat().st_size / (1024 * 1024)
        logger.info("\n" + "="*70)
        logger.info("✅ GENERATION COMPLETE!")
        logger.info("="*70)
        logger.info(f"   📄 File: {self.config.output_path}")
        logger.info(f"   💾 Size: {file_size:.2f} MB")
        logger.info(f"   📊 ReportingFIs: {self.config.num_reporting_fis}")
        logger.info(f"   📊 Total Accounts: {accounts_generated:,}")
        logger.info(f"   🔢 DocRefIds: {self.docref_counter:,}")
        logger.info("="*70 + "\n")
        
        return self.config.output_path
    
    def _generate_parallel(self, num_workers: int) -> Path:
        """
        Parallel generation for large files.
        
        Strategy:
        1. Split work into chunks (one per ReportingFI or per batch)
        2. Each worker generates its chunk independently
        3. Merge chunks into final file
        """
        from multiprocessing import Pool
        from tqdm import tqdm
        import tempfile
        
        logger.info("📂 Loading base template...")
        tree, ns = self._load_base_template()
        root = tree.getroot()
        
        logger.info("⚙️  Updating MessageSpec...")
        self._update_message_spec(root, ns)
        
        # Get templates
        template_crs_body = root.find('.//crs:CrsBody', namespaces=ns)
        template_rfi = template_crs_body.find('.//crs:ReportingFI', namespaces=ns)
        template_reporting_group = template_crs_body.find('.//crs:ReportingGroup', namespaces=ns)
        
        account_reports = template_reporting_group.findall('crs:AccountReport', namespaces=ns)
        individual_template = account_reports[0]
        org_template = account_reports[1]
        
        # Remove template CrsBody
        root.remove(template_crs_body)
        
        # Prepare work chunks
        logger.info(f"\n⚡ Processing data in parallel mode...")
        
        # Split ReportingFIs across workers
        fis_per_worker = max(1, self.config.num_reporting_fis // num_workers)
        
        work_chunks = []
        for worker_id in range(num_workers):
            start_fi = worker_id * fis_per_worker + 1
            end_fi = min((worker_id + 1) * fis_per_worker, self.config.num_reporting_fis)
            
            if start_fi > self.config.num_reporting_fis:
                break
            
            # Handle remainder
            if worker_id == num_workers - 1:
                end_fi = self.config.num_reporting_fis
            
            work_chunks.append({
                'worker_id': worker_id,
                'start_fi': start_fi,
                'end_fi': end_fi,
                'config': self.config,
                'template_crs_body': etree.tostring(template_crs_body, encoding='unicode'),
                'individual_template': etree.tostring(individual_template, encoding='unicode'),
                'org_template': etree.tostring(org_template, encoding='unicode'),
                'ns': ns
            })
        
        logger.info(f"   Split into {len(work_chunks)} chunks")
        logger.info(f"   Each chunk handles ~{fis_per_worker} ReportingFI(s)")
        
        # Create temp directory for chunk files
        temp_dir = Path(tempfile.mkdtemp(prefix='crs_gen_'))
        logger.info(f"   Temp directory: {temp_dir}")
        
        try:
            # Generate chunks in parallel
            logger.info(f"\n🔄 Generating chunks in parallel...")
            
            with Pool(processes=num_workers) as pool:
                chunk_files = list(tqdm(
                    pool.imap(_generate_chunk_worker, work_chunks),
                    total=len(work_chunks),
                    desc="Workers",
                    unit="chunk"
                ))
            
            # Merge chunks with low-memory streaming
            logger.info(f"\n🔗 Merging {len(chunk_files)} chunks into final file (Streaming)...")
            logger.info(f"   Writing to: {self.config.output_path}")
            
            with etree.xmlfile(str(self.config.output_path), encoding='utf-8') as xf:
                xf.write_declaration()
                
                with xf.element(root.tag, nsmap=root.nsmap, version="2.0"):
                    # Write MessageSpec
                    msg_spec = root.find('.//crs:MessageSpec', namespaces=ns)
                    if msg_spec is not None:
                        xf.write(msg_spec)
                    
                    # Stream chunks
                    for chunk_file in tqdm(chunk_files, desc="Merging", unit="chunk"):
                        context = etree.iterparse(str(chunk_file), events=('end',), tag=f'{{{ns["crs"]}}}CrsBody')
                        for event, elem in context:
                            xf.write(elem)
                            # Cleanup memory
                            elem.clear()
                            while elem.getprevious() is not None:
                                del elem.getparent()[0]
                        del context
            
            # Stats
            total_accounts = self.config.num_reporting_fis * (
                self.config.individual_accounts_per_fi + 
                self.config.organisation_accounts_per_fi
            )
            file_size = self.config.output_path.stat().st_size / (1024 * 1024)
            
            logger.info("\n" + "="*70)
            logger.info("✅ GENERATION COMPLETE!")
            logger.info("="*70)
            logger.info(f"   📄 File: {self.config.output_path}")
            logger.info(f"   💾 Size: {file_size:.2f} MB")
            logger.info(f"   📊 ReportingFIs: {self.config.num_reporting_fis}")
            logger.info(f"   📊 Total Accounts: {total_accounts:,}")
            logger.info(f"   ⚡ Parallel Workers: {num_workers}")
            logger.info("="*70 + "\n")
            
            return self.config.output_path
            
        finally:
            # Cleanup temp files
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)


# Worker function for parallel processing (must be at module level)
def _generate_chunk_worker(chunk_data: dict) -> Path:
    """
    Worker function to generate a chunk of CrsBody elements.
    Must be at module level for multiprocessing to pickle it.
    """
    import tempfile
    from lxml import etree
    from copy import deepcopy
    
    worker_id = chunk_data['worker_id']
    start_fi = chunk_data['start_fi']
    end_fi = chunk_data['end_fi']
    config = chunk_data['config']
    ns = chunk_data['ns']
    
    # Parse templates from strings
    parser = etree.XMLParser(remove_blank_text=True)
    template_crs_body = etree.fromstring(chunk_data['template_crs_body'], parser)
    individual_template = etree.fromstring(chunk_data['individual_template'], parser)
    org_template = etree.fromstring(chunk_data['org_template'], parser)
    
    # Create a mini generator for this worker
    worker_gen = CRSGenerator(config)
    worker_gen.docref_counter = worker_id * 100000  # Offset to avoid ID collisions
    
    # Create root for this chunk
    root = etree.Element(
        '{urn:oecd:ties:crs:v2}CRS_OECD',
        nsmap={
            'crs': 'urn:oecd:ties:crs:v2',
            'stf': 'urn:oecd:ties:crsstf:v5',
            'cfc': 'urn:oecd:ties:commontypesfatcacrs:v2',
            'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            'iso': 'urn:oecd:ties:isocrstypes:v1',
            'ftc': 'urn:oecd:ties:fatca:v1'
        },
        version="2.0"
    )
    
    # Generate FIs for this chunk
    for fi_index in range(start_fi, end_fi + 1):
        new_crs_body = deepcopy(template_crs_body)
        new_rfi = new_crs_body.find('.//crs:ReportingFI', namespaces=ns)
        new_reporting_group = new_crs_body.find('.//crs:ReportingGroup', namespaces=ns)
        
        # worker_gen._update_reporting_fi(new_rfi, ns, fi_index)
        # BUG FIX: self is worker_gen
        worker_gen._update_reporting_fi(new_rfi, ns, fi_index)
        
        # Clear existing accounts
        for acc in new_reporting_group.findall('crs:AccountReport', namespaces=ns):
            new_reporting_group.remove(acc)
        
        # Generate accounts
        for i in range(config.individual_accounts_per_fi):
            account = worker_gen._create_individual_account(individual_template, ns)
            new_reporting_group.append(account)
        
        for i in range(config.organisation_accounts_per_fi):
            account = worker_gen._create_organisation_account(org_template, ns)
            new_reporting_group.append(account)
        
        root.append(new_crs_body)
    
    # Write chunk to temp file
    chunk_file = Path(tempfile.mkdtemp()) / f"chunk_{worker_id}.xml"
    tree = etree.ElementTree(root)
    tree.write(
        str(chunk_file), 
        encoding='utf-8', 
        xml_declaration=True, 
        pretty_print=config.pretty_print
    )
    
    return chunk_file


# Simple CLI interface
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        # Quick test
        config = GeneratorConfig(
            sending_country="NL",
            tax_year=2021,
            mytin="20001010",
            num_reporting_fis=1,
            individual_accounts_per_fi=10,
            organisation_accounts_per_fi=10,
            controlling_persons_per_org=1,
            output_path="out/test_crs.xml"
        )
    else:
        # Default production config
        config = GeneratorConfig(
            sending_country="NL",
            tax_year=2021,
            mytin="20001010",
            num_reporting_fis=1,
            individual_accounts_per_fi=100,
            organisation_accounts_per_fi=100,
            controlling_persons_per_org=1,
            output_path="out/crs.xml"
        )
    
    generator = CRSGenerator(config)
    generator.generate()