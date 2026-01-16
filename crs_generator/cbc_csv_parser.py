"""
CBC CSV Parser for Country-by-Country Reporting Data
Parses CSV files with CBC data and converts to CBC XML format
"""

import csv
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class ConstEntityData:
    """Data for a constituent entity within a jurisdiction"""
    tin: str
    name: str
    country_code: str
    role: str  # CBC801, CBC802, CBC803
    incorporation_country: str
    biz_activity1: str
    biz_activity2: str = ''
    other_entity_info: str = ''


@dataclass 
class CbcReportData:
    """Data for a CBC report (one per tax jurisdiction)"""
    jurisdiction_code: str
    revenue_unrelated: float
    revenue_related: float
    revenue_total: float
    profit_loss: float
    tax_paid: float
    tax_accrued: float
    capital: float
    earnings: float
    num_employees: int
    tangible_assets: float
    currency: str
    const_entities: List[ConstEntityData] = field(default_factory=list)


@dataclass
class ReportingEntityData:
    """Data for the reporting entity (MNE parent)"""
    tin: str
    name: str
    country_code: str
    mne_group_name: str
    reporting_role: str  # CBC701, CBC702, CBC703


@dataclass
class CBCMessageSpecData:
    """Message specification data"""
    transmitting_country: str
    receiving_country: str
    tax_year: int
    sending_entity_in: str


@dataclass
class CBCDataFromCSV:
    """Complete CBC data parsed from CSV"""
    message_spec: CBCMessageSpecData
    reporting_entity: ReportingEntityData
    cbc_reports: List[CbcReportData] = field(default_factory=list)


class CBCCSVValidationError(Exception):
    """Raised when CBC CSV validation fails"""
    def __init__(self, errors: List[str]):
        self.errors = errors
        super().__init__(f"CBC CSV validation failed with {len(errors)} error(s)")


class CBCCSVParser:
    """Parser for CBC CSV data files"""
    
    REQUIRED_COLUMNS = [
        'TransmittingCountry', 'ReceivingCountry', 'TaxYear', 'SendingEntityIN',
        'ReportingEntity_TIN', 'ReportingEntity_Name', 'ReportingEntity_CountryCode',
        'MNEGroup_Name', 'ReportingRole',
        'JurisdictionCode', 'Entity_TIN', 'Entity_Name', 'Entity_CountryCode',
        'Entity_Role', 'IncorporationCountry', 'BizActivity1',
        'Revenue_Unrelated', 'Revenue_Related', 'Revenue_Total',
        'ProfitLoss', 'TaxPaid', 'TaxAccrued', 'Capital', 'Earnings',
        'NumEmployees', 'TangibleAssets', 'Currency'
    ]
    
    OPTIONAL_COLUMNS = [
        'BizActivity2', 'OtherEntityInfo'
    ]
    
    VALID_REPORTING_ROLES = ['CBC701', 'CBC702', 'CBC703']
    VALID_ENTITY_ROLES = ['CBC801', 'CBC802', 'CBC803']
    VALID_BIZ_ACTIVITIES = [
        'CBC501', 'CBC502', 'CBC503', 'CBC504', 'CBC505', 'CBC506',
        'CBC507', 'CBC508', 'CBC509', 'CBC510', 'CBC511', 'CBC512', 'CBC513'
    ]
    
    def __init__(self, csv_path: Path):
        self.csv_path = Path(csv_path)
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def validate(self) -> Dict[str, Any]:
        """Validate CSV file and return validation result"""
        try:
            if not self.csv_path.exists():
                return {
                    'valid': False,
                    'errors': [f"CSV file not found: {self.csv_path}"],
                    'warnings': [],
                    'statistics': None
                }
            
            rows = self._read_csv()
            self._validate_columns(rows)
            
            if not self.errors:
                self._validate_rows(rows)
            
            # Calculate statistics
            stats = None
            if not self.errors and rows:
                jurisdictions = set()
                entities = 0
                for row in rows:
                    jurisdictions.add(self._safe_get(row, 'JurisdictionCode'))
                    entities += 1
                
                stats = {
                    'total_rows': len(rows),
                    'jurisdictions': len(jurisdictions),
                    'entities': entities
                }
            
            return {
                'valid': len(self.errors) == 0,
                'errors': self.errors,
                'warnings': self.warnings,
                'statistics': stats
            }
        except Exception as e:
            return {
                'valid': False,
                'errors': [str(e)],
                'warnings': [],
                'statistics': None
            }
    
    def parse(self) -> CBCDataFromCSV:
        """Parse CSV file and return structured CBC data"""
        if not self.csv_path.exists():
            raise FileNotFoundError(f"CSV file not found: {self.csv_path}")
        
        rows = self._read_csv()
        self._validate_columns(rows)
        
        if self.errors:
            raise CBCCSVValidationError(self.errors)
        
        self._validate_rows(rows)
        
        if self.errors:
            raise CBCCSVValidationError(self.errors)
        
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
        missing = set(self.REQUIRED_COLUMNS) - columns
        if missing:
            self.errors.append(f"Missing required columns: {', '.join(sorted(missing))}")
    
    def _safe_get(self, row: Dict[str, str], key: str) -> str:
        """Safely get a value from row, handling None"""
        val = row.get(key)
        return val.strip() if val else ''
    
    def _safe_float(self, row: Dict[str, str], key: str, row_num: int) -> float:
        """Safely convert to float"""
        val = self._safe_get(row, key)
        if not val:
            return 0.0
        try:
            return float(val.replace(',', ''))
        except ValueError:
            self.errors.append(f"Row {row_num}: '{key}' must be a number, got '{val}'")
            return 0.0
    
    def _safe_int(self, row: Dict[str, str], key: str, row_num: int) -> int:
        """Safely convert to int"""
        val = self._safe_get(row, key)
        if not val:
            return 0
        try:
            return int(float(val.replace(',', '')))
        except ValueError:
            self.errors.append(f"Row {row_num}: '{key}' must be an integer, got '{val}'")
            return 0
    
    def _validate_rows(self, rows: List[Dict[str, str]]) -> None:
        """Validate all rows"""
        for i, row in enumerate(rows, start=2):  # Start at 2 (1 = header)
            self._validate_row(row, i)
    
    def _validate_row(self, row: Dict[str, str], row_num: int) -> bool:
        """Validate a single row"""
        valid = True
        
        # Check required string fields
        required_strings = [
            'TransmittingCountry', 'TaxYear', 'SendingEntityIN',
            'ReportingEntity_TIN', 'ReportingEntity_Name', 'ReportingEntity_CountryCode',
            'MNEGroup_Name', 'ReportingRole', 'JurisdictionCode',
            'Entity_TIN', 'Entity_Name', 'Entity_CountryCode', 'Entity_Role',
            'IncorporationCountry', 'BizActivity1', 'Currency'
        ]
        for col in required_strings:
            if not self._safe_get(row, col):
                self.errors.append(f"Row {row_num}: Missing required field '{col}'")
                valid = False
        
        # Check country codes (2 letters)
        country_cols = [
            'TransmittingCountry', 'ReceivingCountry', 
            'ReportingEntity_CountryCode', 'Entity_CountryCode',
            'JurisdictionCode', 'IncorporationCountry'
        ]
        for col in country_cols:
            val = self._safe_get(row, col)
            if val and len(val) != 2:
                self.errors.append(f"Row {row_num}: '{col}' must be a 2-letter country code, got '{val}'")
                valid = False
        
        # Check currency code (3 letters)
        currency = self._safe_get(row, 'Currency')
        if currency and len(currency) != 3:
            self.errors.append(f"Row {row_num}: 'Currency' must be a 3-letter code, got '{currency}'")
            valid = False
        
        # Check reporting role
        role = self._safe_get(row, 'ReportingRole')
        if role and role not in self.VALID_REPORTING_ROLES:
            self.errors.append(f"Row {row_num}: Invalid ReportingRole '{role}', must be one of {self.VALID_REPORTING_ROLES}")
            valid = False
        
        # Check entity role
        entity_role = self._safe_get(row, 'Entity_Role')
        if entity_role and entity_role not in self.VALID_ENTITY_ROLES:
            self.errors.append(f"Row {row_num}: Invalid Entity_Role '{entity_role}', must be one of {self.VALID_ENTITY_ROLES}")
            valid = False
        
        # Check business activities
        for col in ['BizActivity1', 'BizActivity2']:
            val = self._safe_get(row, col)
            if val and val not in self.VALID_BIZ_ACTIVITIES:
                self.errors.append(f"Row {row_num}: Invalid {col} '{val}', must be one of {self.VALID_BIZ_ACTIVITIES}")
                valid = False
        
        return valid
    
    def _parse_rows(self, rows: List[Dict[str, str]]) -> CBCDataFromCSV:
        """Parse all rows into structured CBC data"""
        if not rows:
            raise CBCCSVValidationError(["No data rows found"])
        
        first_row = rows[0]
        
        # Parse message spec from first row
        message_spec = CBCMessageSpecData(
            transmitting_country=self._safe_get(first_row, 'TransmittingCountry').upper(),
            receiving_country=self._safe_get(first_row, 'ReceivingCountry').upper() or self._safe_get(first_row, 'TransmittingCountry').upper(),
            tax_year=int(self._safe_get(first_row, 'TaxYear')),
            sending_entity_in=self._safe_get(first_row, 'SendingEntityIN')
        )
        
        # Parse reporting entity from first row
        reporting_entity = ReportingEntityData(
            tin=self._safe_get(first_row, 'ReportingEntity_TIN'),
            name=self._safe_get(first_row, 'ReportingEntity_Name'),
            country_code=self._safe_get(first_row, 'ReportingEntity_CountryCode').upper(),
            mne_group_name=self._safe_get(first_row, 'MNEGroup_Name'),
            reporting_role=self._safe_get(first_row, 'ReportingRole')
        )
        
        # Group rows by jurisdiction
        jurisdictions: Dict[str, List[Dict[str, str]]] = {}
        for row in rows:
            jur_code = self._safe_get(row, 'JurisdictionCode').upper()
            if jur_code not in jurisdictions:
                jurisdictions[jur_code] = []
            jurisdictions[jur_code].append(row)
        
        # Parse CBC reports (one per jurisdiction)
        cbc_reports = []
        for jur_code, jur_rows in jurisdictions.items():
            # Use first row for financial summary data
            first_jur_row = jur_rows[0]
            row_num = 2  # For error reporting
            
            # Parse constituent entities for this jurisdiction
            const_entities = []
            for row in jur_rows:
                entity = ConstEntityData(
                    tin=self._safe_get(row, 'Entity_TIN'),
                    name=self._safe_get(row, 'Entity_Name'),
                    country_code=self._safe_get(row, 'Entity_CountryCode').upper(),
                    role=self._safe_get(row, 'Entity_Role'),
                    incorporation_country=self._safe_get(row, 'IncorporationCountry').upper(),
                    biz_activity1=self._safe_get(row, 'BizActivity1'),
                    biz_activity2=self._safe_get(row, 'BizActivity2'),
                    other_entity_info=self._safe_get(row, 'OtherEntityInfo')
                )
                const_entities.append(entity)
            
            report = CbcReportData(
                jurisdiction_code=jur_code,
                revenue_unrelated=self._safe_float(first_jur_row, 'Revenue_Unrelated', row_num),
                revenue_related=self._safe_float(first_jur_row, 'Revenue_Related', row_num),
                revenue_total=self._safe_float(first_jur_row, 'Revenue_Total', row_num),
                profit_loss=self._safe_float(first_jur_row, 'ProfitLoss', row_num),
                tax_paid=self._safe_float(first_jur_row, 'TaxPaid', row_num),
                tax_accrued=self._safe_float(first_jur_row, 'TaxAccrued', row_num),
                capital=self._safe_float(first_jur_row, 'Capital', row_num),
                earnings=self._safe_float(first_jur_row, 'Earnings', row_num),
                num_employees=self._safe_int(first_jur_row, 'NumEmployees', row_num),
                tangible_assets=self._safe_float(first_jur_row, 'TangibleAssets', row_num),
                currency=self._safe_get(first_jur_row, 'Currency').upper(),
                const_entities=const_entities
            )
            cbc_reports.append(report)
        
        return CBCDataFromCSV(
            message_spec=message_spec,
            reporting_entity=reporting_entity,
            cbc_reports=cbc_reports
        )
