"""
CSV Parser for CRS Data
Parses CSV files with custom data and converts to CRS XML format
"""

import csv
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class PaymentData:
    payment_type: str
    amount: float
    currency: str


@dataclass
class ControllingPersonData:
    first_name: str
    last_name: str
    birth_date: str
    tin: str
    tin_country_code: str
    address_street: str
    address_city: str
    address_country_code: str
    res_country_code: str


@dataclass
class IndividualData:
    first_name: str
    last_name: str
    birth_date: str
    tin: str
    tin_country_code: str
    address_street: str
    address_city: str
    address_post_code: str
    address_country_code: str
    res_country_code: str


@dataclass
class OrganisationData:
    name: str
    tin: str
    tin_country_code: str
    address_street: str
    address_city: str
    address_post_code: str
    address_country_code: str
    res_country_code: str
    controlling_person: Optional[ControllingPersonData] = None


@dataclass
class AccountData:
    account_number: str
    balance: float
    currency: str
    is_closed: bool
    is_dormant: bool
    individual: Optional[IndividualData] = None
    organisation: Optional[OrganisationData] = None
    payment: Optional[PaymentData] = None


@dataclass
class ReportingFIData:
    tin: str
    name: str
    address_street: str
    address_building_number: str
    address_city: str
    address_post_code: str
    address_country_code: str
    accounts: List[AccountData] = field(default_factory=list)


@dataclass
class MessageSpecData:
    sending_company_in: str
    transmitting_country: str
    receiving_country: str
    tax_year: int


@dataclass
class CRSDataFromCSV:
    message_spec: MessageSpecData
    reporting_fis: List[ReportingFIData] = field(default_factory=list)


class CSVValidationError(Exception):
    """Raised when CSV validation fails"""
    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__(f"CSV validation failed with {len(errors)} error(s)")


class CRSCSVParser:
    """Parser for CRS CSV data files"""
    
    REQUIRED_COLUMNS = [
        'SendingCompanyIN', 'TransmittingCountry', 'ReceivingCountry', 'TaxYear',
        'ReportingFI_TIN', 'ReportingFI_Name', 'ReportingFI_Address_Street',
        'ReportingFI_Address_BuildingNumber', 'ReportingFI_Address_City',
        'ReportingFI_Address_PostCode', 'ReportingFI_Address_CountryCode',
        'AccountNumber', 'AccountBalance', 'AccountCurrency', 'AccountClosed', 'AccountDormant',
        'Payment_Type', 'Payment_Amount', 'Payment_Currency'
    ]
    
    INDIVIDUAL_COLUMNS = [
        'Individual_FirstName', 'Individual_LastName', 'Individual_BirthDate',
        'Individual_TIN', 'Individual_TIN_CountryCode', 'Individual_Address_Street',
        'Individual_Address_City', 'Individual_Address_PostCode',
        'Individual_Address_CountryCode', 'Individual_ResCountryCode'
    ]
    
    ORGANISATION_COLUMNS = [
        'Organisation_Name', 'Organisation_TIN', 'Organisation_TIN_CountryCode',
        'Organisation_Address_Street', 'Organisation_Address_City',
        'Organisation_Address_PostCode', 'Organisation_Address_CountryCode',
        'Organisation_ResCountryCode'
    ]
    
    CONTROLLING_PERSON_COLUMNS = [
        'ControllingPerson_FirstName', 'ControllingPerson_LastName',
        'ControllingPerson_BirthDate', 'ControllingPerson_TIN',
        'ControllingPerson_TIN_CountryCode', 'ControllingPerson_Address_Street',
        'ControllingPerson_Address_City', 'ControllingPerson_Address_CountryCode',
        'ControllingPerson_ResCountryCode'
    ]
    
    VALID_PAYMENT_TYPES = ['CRS501', 'CRS502', 'CRS503', 'CRS504']
    
    def __init__(self, csv_path: Path):
        self.csv_path = Path(csv_path)
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def parse(self) -> CRSDataFromCSV:
        """Parse CSV file and return structured CRS data"""
        if not self.csv_path.exists():
            raise FileNotFoundError(f"CSV file not found: {self.csv_path}")
        
        rows = self._read_csv()
        self._validate_columns(rows)
        
        if self.errors:
            raise CSVValidationError(self.errors)
        
        return self._parse_rows(rows)
    
    def _read_csv(self) -> List[Dict[str, str]]:
        """Read CSV file and return list of row dictionaries"""
        rows = []
        with open(self.csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
        return rows
    
    def _validate_columns(self, rows: List[Dict[str, str]]) -> None:
        """Validate that all required columns exist"""
        if not rows:
            self.errors.append("CSV file is empty or has no data rows")
            return
        
        columns = set(rows[0].keys())
        
        # Only check base required columns (not Individual/Organisation specific ones)
        # Those will be validated per-row based on what data is present
        missing = set(self.REQUIRED_COLUMNS) - columns
        if missing:
            self.errors.append(f"Missing required columns: {', '.join(sorted(missing))}")
    
    def _safe_get(self, row: Dict[str, str], key: str) -> str:
        """Safely get a value from row, handling None"""
        val = row.get(key)
        return val.strip() if val else ''
    
    def _parse_date(self, date_str: str) -> Optional[str]:
        """
        Parse date from multiple common formats and return normalized YYYY-MM-DD format.
        Returns None if date cannot be parsed.
        Accepts: YYYY-MM-DD, M/D/YYYY, D/M/YYYY, DD-MM-YYYY, DD/MM/YYYY, MM-DD-YYYY
        """
        if not date_str:
            return None
        
        date_str = date_str.strip()
        
        # List of formats to try (order matters - more specific first)
        formats = [
            '%Y-%m-%d',    # 2024-01-15 (ISO format - preferred)
            '%d-%m-%Y',    # 15-01-2024
            '%d/%m/%Y',    # 15/01/2024
            '%m/%d/%Y',    # 01/15/2024 (US format)
            '%m-%d-%Y',    # 01-15-2024
            '%Y/%m/%d',    # 2024/01/15
        ]
        
        for fmt in formats:
            try:
                parsed = datetime.strptime(date_str, fmt)
                return parsed.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        return None

    def _validate_row(self, row: Dict[str, str], row_num: int) -> bool:
        """Validate a single row and return True if valid"""
        valid = True
        
        # Check required fields
        for col in self.REQUIRED_COLUMNS:
            if not self._safe_get(row, col):
                self.errors.append(f"Row {row_num}: Missing required field '{col}'")
                valid = False
        
        # Check country codes (2 letters)
        country_cols = [
            'TransmittingCountry', 'ReceivingCountry', 
            'ReportingFI_Address_CountryCode', 'Individual_Address_CountryCode',
            'Individual_TIN_CountryCode', 'Individual_ResCountryCode',
            'Organisation_Address_CountryCode', 'Organisation_TIN_CountryCode',
            'Organisation_ResCountryCode', 'ControllingPerson_Address_CountryCode',
            'ControllingPerson_TIN_CountryCode', 'ControllingPerson_ResCountryCode'
        ]
        for col in country_cols:
            val = self._safe_get(row, col)
            if val and len(val) != 2:
                self.errors.append(f"Row {row_num}: '{col}' must be a 2-letter country code, got '{val}'")
                valid = False
        
        # Check currency codes (3 letters)
        currency_cols = ['AccountCurrency', 'Payment_Currency']
        for col in currency_cols:
            val = self._safe_get(row, col)
            if val and len(val) != 3:
                self.errors.append(f"Row {row_num}: '{col}' must be a 3-letter currency code, got '{val}'")
                valid = False
        
        # Check payment type
        payment_type = self._safe_get(row, 'Payment_Type')
        if payment_type and payment_type not in self.VALID_PAYMENT_TYPES:
            self.errors.append(f"Row {row_num}: Invalid Payment_Type '{payment_type}'. Must be one of: {', '.join(self.VALID_PAYMENT_TYPES)}")
            valid = False
        
        # Check Individual vs Organisation
        has_individual = bool(self._safe_get(row, 'Individual_FirstName'))
        has_organisation = bool(self._safe_get(row, 'Organisation_Name'))
        
        if has_individual and has_organisation:
            self.errors.append(f"Row {row_num}: Cannot have both Individual and Organisation data. Choose one.")
            valid = False
        elif not has_individual and not has_organisation:
            self.errors.append(f"Row {row_num}: Must have either Individual or Organisation data.")
            valid = False
        
        # Validate Individual required fields if Individual data is present
        if has_individual:
            for col in self.INDIVIDUAL_COLUMNS:
                if col not in row:
                    self.errors.append(f"Row {row_num}: Missing column '{col}' required for Individual accounts.")
                    valid = False
                elif not self._safe_get(row, col):
                    self.errors.append(f"Row {row_num}: Missing required Individual field '{col}'")
                    valid = False
        
        # Validate Organisation required fields if Organisation data is present
        if has_organisation:
            for col in self.ORGANISATION_COLUMNS:
                if col not in row:
                    self.errors.append(f"Row {row_num}: Missing column '{col}' required for Organisation accounts.")
                    valid = False
                elif not self._safe_get(row, col):
                    self.errors.append(f"Row {row_num}: Missing required Organisation field '{col}'")
                    valid = False
            
            # Check Controlling Person for Organisation
            has_cp = bool(self._safe_get(row, 'ControllingPerson_FirstName'))
            if not has_cp:
                self.errors.append(f"Row {row_num}: Organisation accounts must have a Controlling Person.")
                valid = False
            else:
                # Validate Controlling Person required fields
                for col in self.CONTROLLING_PERSON_COLUMNS:
                    if col not in row:
                        self.errors.append(f"Row {row_num}: Missing column '{col}' required for Controlling Person.")
                        valid = False
                    elif not self._safe_get(row, col):
                        self.errors.append(f"Row {row_num}: Missing required Controlling Person field '{col}'")
                        valid = False
        
        # Validate date formats (accept multiple common formats)
        date_cols = ['Individual_BirthDate', 'ControllingPerson_BirthDate']
        for col in date_cols:
            val = self._safe_get(row, col)
            if val:
                if not self._parse_date(val):
                    self.errors.append(f"Row {row_num}: '{col}' must be a valid date, got '{val}'")
                    valid = False
        
        # Validate numeric fields
        numeric_cols = ['AccountBalance', 'Payment_Amount']
        for col in numeric_cols:
            val = self._safe_get(row, col)
            if val:
                try:
                    float(val)
                except ValueError:
                    self.errors.append(f"Row {row_num}: '{col}' must be a number, got '{val}'")
                    valid = False
        
        # Validate TaxYear
        tax_year = self._safe_get(row, 'TaxYear')
        if tax_year:
            try:
                year = int(tax_year)
                if year < 2000 or year > 2100:
                    self.errors.append(f"Row {row_num}: TaxYear must be between 2000 and 2100, got '{tax_year}'")
                    valid = False
            except ValueError:
                self.errors.append(f"Row {row_num}: TaxYear must be a 4-digit year, got '{tax_year}'")
                valid = False
        
        return valid
    
    def _parse_rows(self, rows: List[Dict[str, str]]) -> CRSDataFromCSV:
        """Parse validated rows into CRS data structure"""
        # Validate all rows first
        for i, row in enumerate(rows, start=2):  # Start at 2 (1 is header)
            self._validate_row(row, i)
        
        if self.errors:
            raise CSVValidationError(self.errors)
        
        # Parse message spec from first row
        first_row = rows[0]
        message_spec = MessageSpecData(
            sending_company_in=first_row['SendingCompanyIN'].strip(),
            transmitting_country=first_row['TransmittingCountry'].strip().upper(),
            receiving_country=first_row['ReceivingCountry'].strip().upper(),
            tax_year=int(first_row['TaxYear'].strip())
        )
        
        # Group accounts by Reporting FI
        fi_map: Dict[str, ReportingFIData] = {}
        
        for row in rows:
            fi_tin = row['ReportingFI_TIN'].strip()
            
            # Create FI if not exists
            if fi_tin not in fi_map:
                fi_map[fi_tin] = ReportingFIData(
                    tin=fi_tin,
                    name=row['ReportingFI_Name'].strip(),
                    address_street=row['ReportingFI_Address_Street'].strip(),
                    address_building_number=row['ReportingFI_Address_BuildingNumber'].strip(),
                    address_city=row['ReportingFI_Address_City'].strip(),
                    address_post_code=row['ReportingFI_Address_PostCode'].strip(),
                    address_country_code=row['ReportingFI_Address_CountryCode'].strip().upper()
                )
            
            # Parse account
            account = self._parse_account(row)
            fi_map[fi_tin].accounts.append(account)
        
        return CRSDataFromCSV(
            message_spec=message_spec,
            reporting_fis=list(fi_map.values())
        )
    
    def _get_value(self, row: Dict[str, str], key: str, default: str = '') -> str:
        """Safely get a value from row, handling None"""
        val = row.get(key)
        if val is None:
            return default
        return val.strip()

    def _parse_account(self, row: Dict[str, str]) -> AccountData:
        """Parse a single account from a row"""
        # Parse payment
        payment = PaymentData(
            payment_type=self._get_value(row, 'Payment_Type'),
            amount=float(self._get_value(row, 'Payment_Amount') or '0'),
            currency=self._get_value(row, 'Payment_Currency').upper() or 'EUR'
        )
        
        # Parse Individual or Organisation
        individual = None
        organisation = None
        
        if self._get_value(row, 'Individual_FirstName'):
            individual = IndividualData(
                first_name=self._get_value(row, 'Individual_FirstName'),
                last_name=self._get_value(row, 'Individual_LastName'),
                birth_date=self._parse_date(self._get_value(row, 'Individual_BirthDate')) or '',
                tin=self._get_value(row, 'Individual_TIN'),
                tin_country_code=self._get_value(row, 'Individual_TIN_CountryCode').upper(),
                address_street=self._get_value(row, 'Individual_Address_Street'),
                address_city=self._get_value(row, 'Individual_Address_City'),
                address_post_code=self._get_value(row, 'Individual_Address_PostCode'),
                address_country_code=self._get_value(row, 'Individual_Address_CountryCode').upper(),
                res_country_code=self._get_value(row, 'Individual_ResCountryCode').upper()
            )
        else:
            # Parse controlling person
            cp = ControllingPersonData(
                first_name=self._get_value(row, 'ControllingPerson_FirstName'),
                last_name=self._get_value(row, 'ControllingPerson_LastName'),
                birth_date=self._parse_date(self._get_value(row, 'ControllingPerson_BirthDate')) or '',
                tin=self._get_value(row, 'ControllingPerson_TIN'),
                tin_country_code=self._get_value(row, 'ControllingPerson_TIN_CountryCode').upper(),
                address_street=self._get_value(row, 'ControllingPerson_Address_Street'),
                address_city=self._get_value(row, 'ControllingPerson_Address_City'),
                address_country_code=self._get_value(row, 'ControllingPerson_Address_CountryCode').upper(),
                res_country_code=self._get_value(row, 'ControllingPerson_ResCountryCode').upper()
            )
            
            organisation = OrganisationData(
                name=self._get_value(row, 'Organisation_Name'),
                tin=self._get_value(row, 'Organisation_TIN'),
                tin_country_code=self._get_value(row, 'Organisation_TIN_CountryCode').upper(),
                address_street=self._get_value(row, 'Organisation_Address_Street'),
                address_city=self._get_value(row, 'Organisation_Address_City'),
                address_post_code=self._get_value(row, 'Organisation_Address_PostCode'),
                address_country_code=self._get_value(row, 'Organisation_Address_CountryCode').upper(),
                res_country_code=self._get_value(row, 'Organisation_ResCountryCode').upper(),
                controlling_person=cp
            )
        
        return AccountData(
            account_number=self._get_value(row, 'AccountNumber'),
            balance=float(self._get_value(row, 'AccountBalance') or '0'),
            currency=self._get_value(row, 'AccountCurrency').upper() or 'EUR',
            is_closed=self._get_value(row, 'AccountClosed').lower() == 'true',
            is_dormant=self._get_value(row, 'AccountDormant').lower() == 'true',
            individual=individual,
            organisation=organisation,
            payment=payment
        )


def generate_csv_preview(
    sending_country: str,
    receiving_country: str,
    tax_year: int,
    mytin: str,
    num_fis: int,
    individual_accounts: int,
    organisation_accounts: int,
    controlling_persons: int = 1
) -> List[Dict[str, str]]:
    """
    Generate CSV preview data using Faker for random data.
    Returns list of dictionaries representing CSV rows.
    """
    from faker import Faker
    import random
    
    fake = Faker()
    rows = []
    
    # Generate data for each FI
    for fi_idx in range(num_fis):
        fi_tin = f"FI{str(fi_idx + 1).zfill(3)}" if num_fis > 1 else mytin
        fi_name = fake.company()
        fi_street = fake.street_name()
        fi_building = str(fake.building_number())
        fi_city = fake.city()
        fi_postcode = fake.postcode()
        
        account_num = 1
        
        # Generate individual accounts
        for _ in range(individual_accounts):
            rows.append({
                'SendingCompanyIN': mytin,
                'TransmittingCountry': sending_country,
                'ReceivingCountry': receiving_country,
                'TaxYear': str(tax_year),
                'ReportingFI_TIN': fi_tin,
                'ReportingFI_Name': fi_name,
                'ReportingFI_Address_Street': fi_street,
                'ReportingFI_Address_BuildingNumber': fi_building,
                'ReportingFI_Address_City': fi_city,
                'ReportingFI_Address_PostCode': fi_postcode,
                'ReportingFI_Address_CountryCode': sending_country,
                'AccountNumber': f"ACC{str(account_num).zfill(6)}",
                'AccountBalance': f"{random.uniform(1000, 500000):.2f}",
                'AccountCurrency': random.choice(['EUR', 'USD', 'GBP']),
                'AccountClosed': 'false',
                'AccountDormant': 'false',
                'Individual_FirstName': fake.first_name(),
                'Individual_LastName': fake.last_name(),
                'Individual_BirthDate': fake.date_of_birth(minimum_age=18, maximum_age=80).strftime('%Y-%m-%d'),
                'Individual_TIN': fake.bothify(text='???######'),
                'Individual_TIN_CountryCode': receiving_country,
                'Individual_Address_Street': f"{fake.street_name()} {fake.building_number()}",
                'Individual_Address_City': fake.city(),
                'Individual_Address_PostCode': fake.postcode(),
                'Individual_Address_CountryCode': receiving_country,
                'Individual_ResCountryCode': receiving_country,
                'Organisation_Name': '',
                'Organisation_TIN': '',
                'Organisation_TIN_CountryCode': '',
                'Organisation_Address_Street': '',
                'Organisation_Address_City': '',
                'Organisation_Address_PostCode': '',
                'Organisation_Address_CountryCode': '',
                'Organisation_ResCountryCode': '',
                'ControllingPerson_FirstName': '',
                'ControllingPerson_LastName': '',
                'ControllingPerson_BirthDate': '',
                'ControllingPerson_TIN': '',
                'ControllingPerson_TIN_CountryCode': '',
                'ControllingPerson_Address_Street': '',
                'ControllingPerson_Address_City': '',
                'ControllingPerson_Address_CountryCode': '',
                'ControllingPerson_ResCountryCode': '',
                'Payment_Type': random.choice(['CRS501', 'CRS502', 'CRS503', 'CRS504']),
                'Payment_Amount': f"{random.uniform(100, 50000):.2f}",
                'Payment_Currency': random.choice(['EUR', 'USD', 'GBP'])
            })
            account_num += 1
        
        # Generate organisation accounts
        for _ in range(organisation_accounts):
            rows.append({
                'SendingCompanyIN': mytin,
                'TransmittingCountry': sending_country,
                'ReceivingCountry': receiving_country,
                'TaxYear': str(tax_year),
                'ReportingFI_TIN': fi_tin,
                'ReportingFI_Name': fi_name,
                'ReportingFI_Address_Street': fi_street,
                'ReportingFI_Address_BuildingNumber': fi_building,
                'ReportingFI_Address_City': fi_city,
                'ReportingFI_Address_PostCode': fi_postcode,
                'ReportingFI_Address_CountryCode': sending_country,
                'AccountNumber': f"ACC{str(account_num).zfill(6)}",
                'AccountBalance': f"{random.uniform(10000, 1000000):.2f}",
                'AccountCurrency': random.choice(['EUR', 'USD', 'GBP']),
                'AccountClosed': 'false',
                'AccountDormant': 'false',
                'Individual_FirstName': '',
                'Individual_LastName': '',
                'Individual_BirthDate': '',
                'Individual_TIN': '',
                'Individual_TIN_CountryCode': '',
                'Individual_Address_Street': '',
                'Individual_Address_City': '',
                'Individual_Address_PostCode': '',
                'Individual_Address_CountryCode': '',
                'Individual_ResCountryCode': '',
                'Organisation_Name': fake.company(),
                'Organisation_TIN': fake.bothify(text='ORG######'),
                'Organisation_TIN_CountryCode': receiving_country,
                'Organisation_Address_Street': f"{fake.street_name()} {fake.building_number()}",
                'Organisation_Address_City': fake.city(),
                'Organisation_Address_PostCode': fake.postcode(),
                'Organisation_Address_CountryCode': receiving_country,
                'Organisation_ResCountryCode': receiving_country,
                'ControllingPerson_FirstName': fake.first_name(),
                'ControllingPerson_LastName': fake.last_name(),
                'ControllingPerson_BirthDate': fake.date_of_birth(minimum_age=25, maximum_age=70).strftime('%Y-%m-%d'),
                'ControllingPerson_TIN': fake.bothify(text='CP######'),
                'ControllingPerson_TIN_CountryCode': receiving_country,
                'ControllingPerson_Address_Street': f"{fake.street_name()} {fake.building_number()}",
                'ControllingPerson_Address_City': fake.city(),
                'ControllingPerson_Address_CountryCode': receiving_country,
                'ControllingPerson_ResCountryCode': receiving_country,
                'Payment_Type': random.choice(['CRS501', 'CRS502', 'CRS503', 'CRS504']),
                'Payment_Amount': f"{random.uniform(500, 100000):.2f}",
                'Payment_Currency': random.choice(['EUR', 'USD', 'GBP'])
            })
            account_num += 1
    
    return rows


def save_csv_preview(rows: List[Dict[str, str]], output_path: Path) -> None:
    """Save CSV preview data to file"""
    if not rows:
        return
    
    fieldnames = list(rows[0].keys())
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
