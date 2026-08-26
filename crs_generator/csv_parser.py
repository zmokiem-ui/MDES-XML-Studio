"""
CSV Parser for CRS Data
Parses CSV files with custom data and converts to CRS XML format
"""

import csv
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime

from .generator import default_crs_version


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
    # CtrlgPersonType is required whenever a controlling person is reported;
    # self_cert is additionally mandatory from CRS 3.0 on.
    ctrlg_person_type: str = 'CRS801'
    self_cert: str = 'CRS1001'


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
    # OECD605 ("unspecified") is the default: OECD601/OECD603 oblige the account
    # number to follow the IBAN/ISIN formats (MDES 60000/60001), which generated
    # numbers do not, and OECD601/OECD606 force account_type CRS1101 in CRS 3.0.
    acct_number_type: str = 'OECD605'
    # CRS 3.0 classification. Ignored when generating 2.0.
    self_cert: str = 'CRS901'
    dd_procedure: str = 'CRS1201'
    account_type: str = 'CRS1101'
    equity_interest_types: List[str] = field(default_factory=list)
    joint_account_number: Optional[int] = None


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
    
    # CRS 3.0 columns. All optional — a 2.0-era CSV keeps working, and any
    # column left out falls back to the documented default below. Values are
    # checked against the CrsXML_v3.0.xsd enumerations.
    CRS3_COLUMNS = [
        'AcctNumberType', 'SelfCert', 'DDProcedure', 'AccountType',
        'EquityInterestType', 'JointAccount_Number',
        'ControllingPerson_CtrlgPersonType', 'ControllingPerson_SelfCert',
    ]

    VALID_PAYMENT_TYPES = ['CRS501', 'CRS502', 'CRS503', 'CRS504']

    # The trailing "xx00" member of each CRS 3.0 enumeration means "not
    # reported" and exists for correcting pre-3.0 data. Accepted on input
    # because MDES accepts it, but never a default.
    VALID_ACCT_NUMBER_TYPES = ['OECD601', 'OECD602', 'OECD603', 'OECD604', 'OECD605', 'OECD606']
    VALID_SELF_CERT = ['CRS901', 'CRS902', 'CRS900']
    VALID_CP_SELF_CERT = ['CRS1001', 'CRS1002', 'CRS1000']
    VALID_DD_PROCEDURES = ['CRS1201', 'CRS1202', 'CRS1200']
    VALID_ACCOUNT_TYPES = ['CRS1101', 'CRS1102', 'CRS1103', 'CRS1104', 'CRS1100']
    VALID_EQUITY_INTEREST_TYPES = [f'CRS4{i:02d}' for i in range(1, 11)]
    VALID_CTRLG_PERSON_TYPES = (
        [f'CRS8{i:02d}' for i in range(1, 14)] + ['CRS800']
    )

    def __init__(self, csv_path: Path, crs_version: Optional[str] = None):
        # None means "whatever the standard schema is today" - see
        # default_crs_version() in generator.py for the cutover.
        self.csv_path = Path(csv_path)
        self.crs_version = str(crs_version or default_crs_version()).strip()
        self.errors: List[str] = []
        self.warnings: List[str] = []

    @property
    def is_v3(self) -> bool:
        return self.crs_version == '3.0'
    
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
            
            # A Controlling Person is optional: it makes the holder a passive NFE
            # (CRS101), and omitting it reports a CRS103 holder instead. MDES
            # rule 60005 forbids a controlling person on CRS102/CRS103, so
            # demanding one for every organisation was wrong. When present,
            # every controlling-person field must be complete.
            has_cp = bool(self._safe_get(row, 'ControllingPerson_FirstName'))
            if has_cp:
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
        
        # A closed account must report a zero balance (MDES rule 60003). The CSV
        # states both values, so a contradiction is rejected rather than silently
        # rewritten.
        if self._safe_get(row, 'AccountClosed').lower() == 'true':
            balance = self._safe_get(row, 'AccountBalance')
            try:
                if balance and float(balance) != 0:
                    self.errors.append(
                        f"Row {row_num}: AccountClosed is true, so AccountBalance must be 0, "
                        f"got '{balance}' (MDES Error 60003)")
                    valid = False
            except ValueError:
                pass

        if not self._validate_crs3_row(row, row_num):
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
    
    def _validate_crs3_row(self, row: Dict[str, str], row_num: int) -> bool:
        """Validate the optional CRS 3.0 columns.

        AcctNumberType is checked for every version — it has always been written
        into the output. The rest only constrain a 3.0 run, but an out-of-range
        value is reported whatever the version so a typo is not silently dropped
        when the same CSV is later regenerated as 3.0.
        """
        valid = True

        enum_columns = [
            ('AcctNumberType', self.VALID_ACCT_NUMBER_TYPES),
            ('SelfCert', self.VALID_SELF_CERT),
            ('DDProcedure', self.VALID_DD_PROCEDURES),
            ('AccountType', self.VALID_ACCOUNT_TYPES),
            ('ControllingPerson_CtrlgPersonType', self.VALID_CTRLG_PERSON_TYPES),
            ('ControllingPerson_SelfCert', self.VALID_CP_SELF_CERT),
        ]
        for col, allowed in enum_columns:
            value = self._safe_get(row, col)
            if value and value not in allowed:
                self.errors.append(
                    f"Row {row_num}: Invalid {col} '{value}'. Must be one of: {', '.join(allowed)}")
                valid = False

        # EquityInterestType is repeatable; a single cell holds a comma-separated list.
        for value in self._split_list(self._safe_get(row, 'EquityInterestType')):
            if value not in self.VALID_EQUITY_INTEREST_TYPES:
                self.errors.append(
                    f"Row {row_num}: Invalid EquityInterestType '{value}'. Must be one of: "
                    f"{', '.join(self.VALID_EQUITY_INTEREST_TYPES)}")
                valid = False

        joint = self._safe_get(row, 'JointAccount_Number')
        if joint:
            try:
                holders = int(joint)
            except ValueError:
                self.errors.append(
                    f"Row {row_num}: JointAccount_Number must be a whole number, got '{joint}'")
                valid = False
            else:
                if not 1 <= holders <= 200:
                    self.errors.append(
                        f"Row {row_num}: JointAccount_Number must be between 1 and 200, got {holders}")
                    valid = False

        # MDES rules 60017-60023, checked at the source so a rule-violating file
        # is never generated in the first place. These combinations are legal
        # per the XSD, so nothing downstream would catch them before upload.
        number_type = self._safe_get(row, 'AcctNumberType')
        account_type = self._safe_get(row, 'AccountType')
        payment_type = self._safe_get(row, 'Payment_Type')
        equity = self._split_list(self._safe_get(row, 'EquityInterestType'))

        # MDES 60011/60012: the account is only reportable if the holder - or,
        # for an entity holder, one of its controlling persons - is resident in
        # the receiving country.
        receiving = self._safe_get(row, 'ReceivingCountry').upper()
        if receiving:
            if self._safe_get(row, 'Individual_FirstName'):
                if self._safe_get(row, 'Individual_ResCountryCode').upper() != receiving:
                    self.errors.append(
                        f"Row {row_num}: Individual_ResCountryCode must match "
                        f"ReceivingCountry '{receiving}' (MDES Error 60011)")
                    valid = False
            elif self._safe_get(row, 'Organisation_Name'):
                residences = {
                    self._safe_get(row, 'Organisation_ResCountryCode').upper(),
                    self._safe_get(row, 'ControllingPerson_ResCountryCode').upper(),
                }
                if receiving not in residences:
                    self.errors.append(
                        f"Row {row_num}: Organisation_ResCountryCode or "
                        f"ControllingPerson_ResCountryCode must match ReceivingCountry "
                        f"'{receiving}' (MDES Error 60012)")
                    valid = False

        # Only when generating 3.0: these columns are not emitted at all for
        # 2.0, so a 2.0 run must not be blocked by a combination that will never
        # reach the output.
        if not self.is_v3:
            return valid

        for code, forcing_type in (('60017', 'OECD606'), ('60018', 'OECD601')):
            if number_type == forcing_type and account_type and account_type != 'CRS1101':
                self.errors.append(
                    f"Row {row_num}: AcctNumberType {forcing_type} requires AccountType "
                    f"CRS1101, got '{account_type}' (MDES Error {code})")
                valid = False

        if equity and account_type and account_type != 'CRS1104':
            self.errors.append(
                f"Row {row_num}: EquityInterestType is provided, so AccountType must be "
                f"CRS1104, got '{account_type}' (MDES Error 60019)")
            valid = False

        if account_type == 'CRS1103' and number_type and number_type != 'OECD605':
            self.errors.append(
                f"Row {row_num}: AccountType CRS1103 requires AcctNumberType OECD605, "
                f"got '{number_type}' (MDES Error 60020)")
            valid = False

        payment_constraints = (
            ('60021', 'CRS1101', {'CRS502'}),
            ('60022', 'CRS1104', {'CRS503', 'CRS504'}),
            ('60023', 'CRS1103', {'CRS503', 'CRS504'}),
        )
        for code, constrained_type, allowed in payment_constraints:
            if account_type == constrained_type and payment_type and payment_type not in allowed:
                self.errors.append(
                    f"Row {row_num}: AccountType {constrained_type} requires Payment_Type "
                    f"in {', '.join(sorted(allowed))}, got '{payment_type}' "
                    f"(MDES Error {code})")
                valid = False

        return valid

    @staticmethod
    def _split_list(value: str) -> List[str]:
        """Split a comma-separated cell into trimmed, non-empty entries."""
        return [part.strip() for part in value.split(',') if part.strip()]

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
        
        has_controlling_person = bool(self._get_value(row, 'ControllingPerson_FirstName'))

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
            # Parse controlling person. Absent means the holder is reported as
            # CRS103 rather than CRS101 — see the generator.
            cp = None
            if has_controlling_person:
                cp = ControllingPersonData(
                    first_name=self._get_value(row, 'ControllingPerson_FirstName'),
                    last_name=self._get_value(row, 'ControllingPerson_LastName'),
                    birth_date=self._parse_date(self._get_value(row, 'ControllingPerson_BirthDate')) or '',
                    tin=self._get_value(row, 'ControllingPerson_TIN'),
                    tin_country_code=self._get_value(row, 'ControllingPerson_TIN_CountryCode').upper(),
                    address_street=self._get_value(row, 'ControllingPerson_Address_Street'),
                    address_city=self._get_value(row, 'ControllingPerson_Address_City'),
                    address_country_code=self._get_value(row, 'ControllingPerson_Address_CountryCode').upper(),
                    res_country_code=self._get_value(row, 'ControllingPerson_ResCountryCode').upper(),
                    ctrlg_person_type=self._get_value(row, 'ControllingPerson_CtrlgPersonType') or 'CRS801',
                    self_cert=self._get_value(row, 'ControllingPerson_SelfCert') or 'CRS1001',
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
        
        # OECD605 ("unspecified") is the safe default: OECD601 and OECD603
        # oblige the account number to follow the IBAN/ISIN structured formats
        # (MDES 60000/60001), and OECD601 additionally forces AccountType
        # CRS1101 in CRS 3.0 (60018).
        acct_number_type = self._get_value(row, 'AcctNumberType') or 'OECD605'
        # CRS1101 (depository account) is the default AccountType, which also
        # happens to be the only value rule 60017 allows for an OECD606 account
        # number — a conflicting explicit value is rejected during validation.
        joint_account_number = self._get_value(row, 'JointAccount_Number')

        return AccountData(
            account_number=self._get_value(row, 'AccountNumber'),
            balance=float(self._get_value(row, 'AccountBalance') or '0'),
            currency=self._get_value(row, 'AccountCurrency').upper() or 'EUR',
            is_closed=self._get_value(row, 'AccountClosed').lower() == 'true',
            is_dormant=self._get_value(row, 'AccountDormant').lower() == 'true',
            individual=individual,
            organisation=organisation,
            payment=payment,
            acct_number_type=acct_number_type,
            self_cert=self._get_value(row, 'SelfCert') or 'CRS901',
            dd_procedure=self._get_value(row, 'DDProcedure') or 'CRS1201',
            account_type=self._get_value(row, 'AccountType') or 'CRS1101',
            equity_interest_types=self._split_list(self._get_value(row, 'EquityInterestType')),
            joint_account_number=int(joint_account_number) if joint_account_number else None,
        )


def generate_csv_preview(
    sending_country: str,
    receiving_country: str,
    tax_year: int,
    mytin: str,
    num_fis: int,
    individual_accounts: int,
    organisation_accounts: int,
    controlling_persons: int = 1,
    crs_version: Optional[str] = None
) -> List[Dict[str, str]]:
    """
    Generate CSV preview data using Faker for random data.
    Returns list of dictionaries representing CSV rows.

    With crs_version '3.0' the CRS 3.0 columns are included and populated, so a
    preview CSV can be saved, edited and re-imported as a 3.0 file. They are
    omitted for 2.0 to keep that template unchanged.
    """
    from faker import Faker
    import random

    from .identifiers import normalize_identifier

    # The preview CSV is also what users save and re-import, so the identifier
    # is trimmed here too rather than only on the XML path.
    mytin = normalize_identifier(mytin)

    is_v3 = str(crs_version or default_crs_version()).strip() == '3.0'
    # Organisation accounts only get a controlling person when one was asked
    # for; without one the holder is reported as CRS103 (MDES 60005/60006).
    include_controlling_person = controlling_persons > 0

    def crs3_columns(is_organisation: bool) -> Dict[str, str]:
        """CRS 3.0 classification columns for one row (empty dict on 2.0).

        AccountType is drawn first and the account-number type, payment type and
        EquityInterestType follow from it, because MDES rules 60017-60023
        constrain those combinations. Payment_Type is deliberately returned here
        so it overrides the unconstrained value set earlier in the row.
        """
        if not is_v3:
            return {}

        from .generator import CRS3_ACCOUNT_PROFILES

        account_type = random.choice(list(CRS3_ACCOUNT_PROFILES))
        profile = CRS3_ACCOUNT_PROFILES[account_type]

        columns = {
            'AcctNumberType': random.choice(profile['number_types']),
            'SelfCert': random.choice(['CRS901', 'CRS902']),
            'DDProcedure': random.choice(['CRS1201', 'CRS1202']),
            'AccountType': account_type,
            'Payment_Type': random.choice(profile['payment_types']),
            'EquityInterestType': '',
            'JointAccount_Number': str(random.randint(2, 5)) if random.random() < 0.2 else '',
            'ControllingPerson_CtrlgPersonType': '',
            'ControllingPerson_SelfCert': '',
        }
        if profile['equity_interest']:
            columns['EquityInterestType'] = ','.join(random.sample(
                [f'CRS4{i:02d}' for i in range(1, 11)], 2 if is_organisation else 1))
        if is_organisation and include_controlling_person:
            columns['ControllingPerson_CtrlgPersonType'] = random.choice(
                [f'CRS8{i:02d}' for i in range(1, 14)])
            columns['ControllingPerson_SelfCert'] = random.choice(['CRS1001', 'CRS1002'])
        return columns

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
                'Payment_Currency': random.choice(['EUR', 'USD', 'GBP']),
                **crs3_columns(is_organisation=False)
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
                'ControllingPerson_FirstName': fake.first_name() if include_controlling_person else '',
                'ControllingPerson_LastName': fake.last_name() if include_controlling_person else '',
                'ControllingPerson_BirthDate': (
                    fake.date_of_birth(minimum_age=25, maximum_age=70).strftime('%Y-%m-%d')
                    if include_controlling_person else ''),
                'ControllingPerson_TIN': fake.bothify(text='CP######') if include_controlling_person else '',
                'ControllingPerson_TIN_CountryCode': receiving_country if include_controlling_person else '',
                'ControllingPerson_Address_Street': (
                    f"{fake.street_name()} {fake.building_number()}"
                    if include_controlling_person else ''),
                'ControllingPerson_Address_City': fake.city() if include_controlling_person else '',
                'ControllingPerson_Address_CountryCode': receiving_country if include_controlling_person else '',
                'ControllingPerson_ResCountryCode': receiving_country if include_controlling_person else '',
                'Payment_Type': random.choice(['CRS501', 'CRS502', 'CRS503', 'CRS504']),
                'Payment_Amount': f"{random.uniform(500, 100000):.2f}",
                'Payment_Currency': random.choice(['EUR', 'USD', 'GBP']),
                **crs3_columns(is_organisation=True)
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
