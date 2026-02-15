"""
Language Configuration for Multi-Language Data Generation

Supports various languages including those with non-Latin scripts (Cyrillic, Chinese, Hindi, etc.)
to properly handle database encoding issues (varchar vs nvarchar).
"""

from typing import List, Dict, Optional
from dataclasses import dataclass


# Language configurations with Faker locale codes
SUPPORTED_LANGUAGES = {
    'en_US': {
        'name': 'English (US)',
        'display': 'English',
        'script': 'Latin',
        'faker_locale': 'en_US',
        'encoding_safe': True
    },
    'nl_NL': {
        'name': 'Dutch (Netherlands)',
        'display': 'Dutch',
        'script': 'Latin',
        'faker_locale': 'nl_NL',
        'encoding_safe': True
    },
    'fr_FR': {
        'name': 'French (France)',
        'display': 'French',
        'script': 'Latin',
        'faker_locale': 'fr_FR',
        'encoding_safe': True
    },
    'de_DE': {
        'name': 'German (Germany)',
        'display': 'German',
        'script': 'Latin',
        'faker_locale': 'de_DE',
        'encoding_safe': True
    },
    'es_ES': {
        'name': 'Spanish (Spain)',
        'display': 'Spanish',
        'script': 'Latin',
        'faker_locale': 'es_ES',
        'encoding_safe': True
    },
    'ru_RU': {
        'name': 'Russian (Russia)',
        'display': 'Russian (Cyrillic)',
        'script': 'Cyrillic',
        'faker_locale': 'ru_RU',
        'encoding_safe': False,  # Requires nvarchar
        'warning': 'Requires NVARCHAR in database'
    },
    'uk_UA': {
        'name': 'Ukrainian (Ukraine)',
        'display': 'Ukrainian (Cyrillic)',
        'script': 'Cyrillic',
        'faker_locale': 'uk_UA',
        'encoding_safe': False,  # Requires nvarchar
        'warning': 'Requires NVARCHAR in database'
    },
    'zh_CN': {
        'name': 'Chinese (Simplified)',
        'display': 'Chinese (Simplified)',
        'script': 'Chinese',
        'faker_locale': 'zh_CN',
        'encoding_safe': False,  # Requires nvarchar
        'warning': 'Requires NVARCHAR in database'
    },
    'zh_TW': {
        'name': 'Chinese (Traditional)',
        'display': 'Chinese (Traditional)',
        'script': 'Chinese',
        'faker_locale': 'zh_TW',
        'encoding_safe': False,  # Requires nvarchar
        'warning': 'Requires NVARCHAR in database'
    },
    'ja_JP': {
        'name': 'Japanese (Japan)',
        'display': 'Japanese',
        'script': 'Japanese',
        'faker_locale': 'ja_JP',
        'encoding_safe': False,  # Requires nvarchar
        'warning': 'Requires NVARCHAR in database'
    },
    'ko_KR': {
        'name': 'Korean (Korea)',
        'display': 'Korean',
        'script': 'Korean',
        'faker_locale': 'ko_KR',
        'encoding_safe': False,  # Requires nvarchar
        'warning': 'Requires NVARCHAR in database'
    },
    'hi_IN': {
        'name': 'Hindi (India)',
        'display': 'Hindi (Devanagari)',
        'script': 'Devanagari',
        'faker_locale': 'hi_IN',
        'encoding_safe': False,  # Requires nvarchar
        'warning': 'Requires NVARCHAR in database'
    },
    'ar_SA': {
        'name': 'Arabic (Saudi Arabia)',
        'display': 'Arabic',
        'script': 'Arabic',
        'faker_locale': 'ar_SA',
        'encoding_safe': False,  # Requires nvarchar
        'warning': 'Requires NVARCHAR in database'
    },
    'he_IL': {
        'name': 'Hebrew (Israel)',
        'display': 'Hebrew',
        'script': 'Hebrew',
        'faker_locale': 'he_IL',
        'encoding_safe': False,  # Requires nvarchar
        'warning': 'Requires NVARCHAR in database'
    },
    'tr_TR': {
        'name': 'Turkish (Turkey)',
        'display': 'Turkish',
        'script': 'Latin',
        'faker_locale': 'tr_TR',
        'encoding_safe': True
    },
    'pl_PL': {
        'name': 'Polish (Poland)',
        'display': 'Polish',
        'script': 'Latin',
        'faker_locale': 'pl_PL',
        'encoding_safe': True
    },
    'pt_BR': {
        'name': 'Portuguese (Brazil)',
        'display': 'Portuguese',
        'script': 'Latin',
        'faker_locale': 'pt_BR',
        'encoding_safe': True
    },
    'it_IT': {
        'name': 'Italian (Italy)',
        'display': 'Italian',
        'script': 'Latin',
        'faker_locale': 'it_IT',
        'encoding_safe': True
    },
    'sv_SE': {
        'name': 'Swedish (Sweden)',
        'display': 'Swedish',
        'script': 'Latin',
        'faker_locale': 'sv_SE',
        'encoding_safe': True
    },
    'no_NO': {
        'name': 'Norwegian (Norway)',
        'display': 'Norwegian',
        'script': 'Latin',
        'faker_locale': 'no_NO',
        'encoding_safe': True
    },
    'da_DK': {
        'name': 'Danish (Denmark)',
        'display': 'Danish',
        'script': 'Latin',
        'faker_locale': 'da_DK',
        'encoding_safe': True
    },
    'fi_FI': {
        'name': 'Finnish (Finland)',
        'display': 'Finnish',
        'script': 'Latin',
        'faker_locale': 'fi_FI',
        'encoding_safe': True
    }
}


# Language categories for UI organization
LANGUAGE_CATEGORIES = {
    'Western European': ['en_US', 'nl_NL', 'fr_FR', 'de_DE', 'es_ES', 'it_IT', 'pt_BR'],
    'Nordic': ['sv_SE', 'no_NO', 'da_DK', 'fi_FI'],
    'Eastern European': ['ru_RU', 'uk_UA', 'pl_PL', 'tr_TR'],
    'East Asian': ['zh_CN', 'zh_TW', 'ja_JP', 'ko_KR'],
    'South Asian': ['hi_IN'],
    'Middle Eastern': ['ar_SA', 'he_IL']
}


@dataclass
class LanguageConfig:
    """Configuration for language-specific data generation."""
    
    # Primary language (required)
    primary_language: str = 'en_US'
    
    # Additional languages for mixed data (optional)
    additional_languages: List[str] = None
    
    # Mix ratio (if multiple languages selected)
    # E.g., {'en_US': 0.7, 'ru_RU': 0.3} = 70% English, 30% Russian
    language_weights: Dict[str, float] = None
    
    # Whether to use mixed languages
    use_mixed: bool = False
    
    def __post_init__(self):
        if self.additional_languages is None:
            self.additional_languages = []
        
        if self.language_weights is None:
            self.language_weights = {self.primary_language: 1.0}
    
    def get_all_languages(self) -> List[str]:
        """Get all configured languages (primary + additional)."""
        languages = [self.primary_language]
        if self.use_mixed and self.additional_languages:
            languages.extend(self.additional_languages)
        return languages
    
    def requires_nvarchar(self) -> bool:
        """Check if any configured language requires NVARCHAR encoding."""
        for lang in self.get_all_languages():
            lang_info = SUPPORTED_LANGUAGES.get(lang, {})
            if not lang_info.get('encoding_safe', True):
                return True
        return False
    
    def get_encoding_warning(self) -> Optional[str]:
        """Get warning message about encoding requirements."""
        if self.requires_nvarchar():
            non_safe_langs = []
            for lang in self.get_all_languages():
                lang_info = SUPPORTED_LANGUAGES.get(lang, {})
                if not lang_info.get('encoding_safe', True):
                    non_safe_langs.append(lang_info.get('display', lang))
            
            return (
                f"⚠️ Database Encoding Warning:\n\n"
                f"The selected language(s) contain non-Latin characters:\n"
                f"{', '.join(non_safe_langs)}\n\n"
                f"Your database columns MUST use NVARCHAR (not VARCHAR) to properly "
                f"store these characters. Using VARCHAR will cause data corruption.\n\n"
                f"Recommended SQL Server column types:\n"
                f"  • Name fields: NVARCHAR(255)\n"
                f"  • Address fields: NVARCHAR(500)\n"
                f"  • Company names: NVARCHAR(255)"
            )
        return None
    
    def get_faker_locales(self) -> List[str]:
        """Get Faker locale codes for all configured languages."""
        locales = []
        for lang in self.get_all_languages():
            lang_info = SUPPORTED_LANGUAGES.get(lang, {})
            locale = lang_info.get('faker_locale', 'en_US')
            locales.append(locale)
        return locales


def get_language_display_name(language_code: str) -> str:
    """Get display name for a language code."""
    lang_info = SUPPORTED_LANGUAGES.get(language_code, {})
    return lang_info.get('display', language_code)


def get_languages_by_category() -> Dict[str, List[Dict]]:
    """Get languages organized by category for UI display."""
    result = {}
    for category, lang_codes in LANGUAGE_CATEGORIES.items():
        result[category] = [
            {
                'code': code,
                'name': SUPPORTED_LANGUAGES[code]['display'],
                'script': SUPPORTED_LANGUAGES[code]['script'],
                'safe': SUPPORTED_LANGUAGES[code]['encoding_safe'],
                'warning': SUPPORTED_LANGUAGES[code].get('warning', '')
            }
            for code in lang_codes
        ]
    return result


def validate_language_config(config: LanguageConfig) -> tuple[bool, Optional[str]]:
    """
    Validate language configuration.
    
    Returns:
        (is_valid, error_message)
    """
    # Check primary language exists
    if config.primary_language not in SUPPORTED_LANGUAGES:
        return False, f"Invalid primary language: {config.primary_language}"
    
    # Check additional languages exist
    for lang in config.additional_languages:
        if lang not in SUPPORTED_LANGUAGES:
            return False, f"Invalid language: {lang}"
    
    # Check weights sum to 1.0 if using mixed
    if config.use_mixed and config.language_weights:
        total_weight = sum(config.language_weights.values())
        if abs(total_weight - 1.0) > 0.01:  # Allow small floating point errors
            return False, f"Language weights must sum to 1.0 (currently {total_weight:.2f})"
    
    return True, None
