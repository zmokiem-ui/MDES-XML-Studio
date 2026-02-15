"""
Shared Base Data Generator for CRS, FATCA, and CBC generators.
Eliminates code duplication across different generator types.
Supports multi-language data generation.
"""

import random
from datetime import datetime, timedelta
from faker import Faker
from typing import Optional, List, Dict
from .reportable_jurisdictions import get_all_country_codes
from .language_config import LanguageConfig


class BaseDataGenerator:
    """Base class for generating realistic random data for tax reporting fields."""
    
    def __init__(self, seed: int = 42, config: Optional[object] = None, language_config: Optional[LanguageConfig] = None):
        self.rng = random.Random(seed)
        Faker.seed(seed)
        
        # Language configuration
        self.language_config = language_config or LanguageConfig()
        
        # Create Faker instances for each language
        self.fakers = {}
        for locale in self.language_config.get_faker_locales():
            self.fakers[locale] = Faker(locale)
        
        # Primary faker (for backward compatibility)
        primary_locale = self.language_config.get_faker_locales()[0]
        self.faker = self.fakers[primary_locale]
        
        self.config = config
        
        # Cache common data for performance
        self._cache = {}
        self._precompute_caches()
        
        # Cache country codes
        self._all_countries = get_all_country_codes()
    
    def _get_random_faker(self) -> Faker:
        """Get a random Faker instance based on language weights."""
        if not self.language_config.use_mixed or len(self.fakers) == 1:
            return self.faker
        
        # Use weights if configured
        if self.language_config.language_weights:
            locales = list(self.language_config.language_weights.keys())
            weights = list(self.language_config.language_weights.values())
            chosen_locale = self.rng.choices(locales, weights=weights, k=1)[0]
            return self.fakers.get(chosen_locale, self.faker)
        
        # Otherwise random selection
        return self.rng.choice(list(self.fakers.values()))
        
    def _precompute_caches(self):
        """Pre-generate pools of data to avoid Faker call overhead."""
        pool_size = 1000
        
        # If using mixed languages, distribute cache across languages
        if self.language_config.use_mixed and len(self.fakers) > 1:
            self._cache['first_names'] = []
            self._cache['last_names'] = []
            self._cache['cities'] = []
            self._cache['streets'] = []
            self._cache['postcodes'] = []
            self._cache['companies'] = []
            
            # Distribute based on weights
            for locale, faker_instance in self.fakers.items():
                weight = self.language_config.language_weights.get(locale, 1.0 / len(self.fakers))
                count = int(pool_size * weight)
                
                self._cache['first_names'].extend([faker_instance.first_name() for _ in range(count)])
                self._cache['last_names'].extend([faker_instance.last_name() for _ in range(count)])
                self._cache['cities'].extend([faker_instance.city() for _ in range(count)])
                self._cache['streets'].extend([faker_instance.street_name() for _ in range(count)])
                self._cache['postcodes'].extend([faker_instance.postcode() for _ in range(count)])
                self._cache['companies'].extend([faker_instance.company() for _ in range(count)])
        else:
            # Single language - use primary faker
            self._cache['first_names'] = [self.faker.first_name() for _ in range(pool_size)]
            self._cache['last_names'] = [self.faker.last_name() for _ in range(pool_size)]
            self._cache['cities'] = [self.faker.city() for _ in range(pool_size)]
            self._cache['streets'] = [self.faker.street_name() for _ in range(pool_size)]
            self._cache['postcodes'] = [self.faker.postcode() for _ in range(pool_size)]
            self._cache['companies'] = [self.faker.company() for _ in range(pool_size)]
    
    def tin(self) -> str:
        """Generate a Tax Identification Number."""
        return str(self.rng.randint(100000000, 999999999))
    
    def birth_date(self) -> str:
        """Generate a birth date for an adult (18-80 years old)."""
        days_back = self.rng.randint(18*365, 80*365)
        birth_date = datetime.now() - timedelta(days=days_back)
        return birth_date.strftime("%Y-%m-%d")
    
    def balance(self) -> float:
        """Generate realistic account balance using log-normal distribution."""
        mean = 11  # log(~60k)
        sigma = 2.5
        balance = self.rng.lognormvariate(mean, sigma)
        return round(balance, 2)
    
    def payment_amount(self, balance: float) -> float:
        """Generate a realistic payment amount (usually 1-20% of balance)."""
        return round(balance * self.rng.uniform(0.01, 0.20), 2)
    
    def first_name(self) -> str:
        return self.rng.choice(self._cache['first_names'])
    
    def last_name(self) -> str:
        return self.rng.choice(self._cache['last_names'])
    
    def city(self) -> str:
        return self.rng.choice(self._cache['cities'])
    
    def street(self) -> str:
        return self.rng.choice(self._cache['streets'])
    
    def postcode(self) -> str:
        return self.rng.choice(self._cache['postcodes'])
    
    def company(self) -> str:
        return self.rng.choice(self._cache['companies'])
    
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
        """Select AccountHolder ResCountryCode from configured countries."""
        if not self.config:
            return "NL"  # Default fallback
        
        countries = getattr(self.config, 'account_holder_countries', [])
        weights = getattr(self.config, 'account_holder_country_weights', {})
        
        if not countries:
            return "NL"
        
        if weights and len(weights) > 0:
            # Use weighted distribution
            country_list = list(weights.keys())
            weight_list = list(weights.values())
            return self.rng.choices(country_list, weights=weight_list, k=1)[0]
        else:
            # Random selection from list
            return self.rng.choice(countries)
    
    def address_country(self) -> str:
        """Select Address CountryCode - can be ANY country (unrestricted)."""
        return self.rng.choice(self._all_countries)
