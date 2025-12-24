"""
Reportable Jurisdictions Whitelist for CRS Account Holders.

This whitelist defines which countries are valid for AccountHolder ResCountryCode.
The ReportingFI must report on accounts held by residents of these jurisdictions.

You can easily add or remove countries from this list as needed.
"""

# Reportable Jurisdictions - Countries that participate in CRS reporting
REPORTABLE_JURISDICTIONS = [
    "NL",  # Netherlands
    "DE",  # Germany

    "FR",  # France
    "BE",  # Belgium
    "ES",  # Spain
    "IT",  # Italy
]

# Extended list (commented out) - Uncomment to add more jurisdictions
EXTENDED_JURISDICTIONS = [
    # Additional EU Countries
    "AT",  # Austria
    "PT",  # Portugal
    "IE",  # Ireland
    "LU",  # Luxembourg
    "DK",  # Denmark
    "SE",  # Sweden
    "FI",  # Finland
    "PL",  # Poland
    "CZ",  # Czech Republic
    "GR",  # Greece
    
    # Major Non-EU CRS Jurisdictions
    "CH",  # Switzerland
    "NO",  # Norway
    "CA",  # Canada
    "AU",  # Australia
    "NZ",  # New Zealand
    "SG",  # Singapore
    "JP",  # Japan
    "KR",  # South Korea
    "IN",  # India
    "BR",  # Brazil
    "MX",  # Mexico
    "AR",  # Argentina
    "ZA",  # South Africa
]

# All ISO 3166-1 alpha-2 country codes for Address CountryCode (any country allowed)
ALL_COUNTRY_CODES = [
    "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT",
    "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI",
    "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY",
    "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
    "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM",
    "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK",
    "FM", "FO", "FR", "GA", "GD", "GE", "GF", "GG", "GH", "GI", "GL",
    "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
    "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR",
    "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN",
    "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS",
    "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
    "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW",
    "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP",
    "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM",
    "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
    "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM",
    "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF",
    "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW",
    "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG",
    "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW"
]


def get_reportable_jurisdictions():
    """Get the list of reportable jurisdictions for AccountHolder ResCountryCode."""
    return REPORTABLE_JURISDICTIONS.copy()


def get_all_country_codes():
    """Get all ISO country codes for Address CountryCode (unrestricted)."""
    return ALL_COUNTRY_CODES.copy()


def is_reportable_jurisdiction(country_code: str) -> bool:
    """Check if a country code is a reportable jurisdiction."""
    return country_code.upper() in REPORTABLE_JURISDICTIONS


def is_valid_country_code(country_code: str) -> bool:
    """Check if a country code is valid (any ISO code)."""
    return country_code.upper() in ALL_COUNTRY_CODES
