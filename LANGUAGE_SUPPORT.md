# Multi-Language Data Generation Guide

## 🌍 Overview

CRS Generator now supports **multi-language data generation** with proper handling for non-Latin scripts (Cyrillic, Chinese, Hindi, Arabic, etc.). This solves database encoding issues where VARCHAR columns fail to store international characters.

## ⚠️ The Problem This Solves

### Database Encoding Issues:
```sql
-- ❌ WRONG - Will corrupt non-Latin characters
CREATE TABLE Persons (
    FirstName VARCHAR(255),    -- Fails with Cyrillic, Chinese, etc.
    LastName VARCHAR(255)
);

-- ✅ CORRECT - Properly stores all Unicode characters
CREATE TABLE Persons (
    FirstName NVARCHAR(255),   -- Works with all languages
    LastName NVARCHAR(255)
);
```

**Real-world example:**
- Russian name: `Владимир Петров` 
- With VARCHAR: `????????? ??????` (corrupted)
- With NVARCHAR: `Владимир Петров` (correct)

## 🎯 Supported Languages

### Western European (Latin Script - VARCHAR Safe)
- ✅ **English (US)** - Default
- ✅ **Dutch (Netherlands)**
- ✅ **French (France)**
- ✅ **German (Germany)**
- ✅ **Spanish (Spain)**
- ✅ **Italian (Italy)**
- ✅ **Portuguese (Brazil)**

### Nordic (Latin Script - VARCHAR Safe)
- ✅ **Swedish (Sweden)**
- ✅ **Norwegian (Norway)**
- ✅ **Danish (Denmark)**
- ✅ **Finnish (Finland)**

### Eastern European
- ⚠️ **Russian (Russia)** - Cyrillic - **Requires NVARCHAR**
- ⚠️ **Ukrainian (Ukraine)** - Cyrillic - **Requires NVARCHAR**
- ✅ **Polish (Poland)** - Latin - VARCHAR Safe
- ✅ **Turkish (Turkey)** - Latin - VARCHAR Safe

### East Asian
- ⚠️ **Chinese (Simplified)** - **Requires NVARCHAR**
- ⚠️ **Chinese (Traditional)** - **Requires NVARCHAR**
- ⚠️ **Japanese** - **Requires NVARCHAR**
- ⚠️ **Korean** - **Requires NVARCHAR**

### South Asian
- ⚠️ **Hindi (India)** - Devanagari - **Requires NVARCHAR**

### Middle Eastern
- ⚠️ **Arabic (Saudi Arabia)** - **Requires NVARCHAR**
- ⚠️ **Hebrew (Israel)** - **Requires NVARCHAR**

## 🚀 How to Use

### **Method 1: GUI (Recommended)**

1. **Launch Application**
   ```
   Run CRS-Generator.exe
   ```

2. **In the Wizard/Form:**
   - Look for "Language Options (Optional)" section
   - Check the box: "Use custom language for generated data"
   - Click "🌍 Select Language..." button

3. **Select Language:**
   - Choose "Single Language" or "Mixed Languages"
   - Select your language(s) from the list
   - Languages with ⚠️ icon require NVARCHAR
   - Click OK

4. **Generate Data:**
   - Continue with normal generation
   - Data will be in selected language(s)

### **Method 2: Programmatic**

```python
from crs_generator.language_config import LanguageConfig
from crs_generator.generator import CRSGenerator, GeneratorConfig

# Single language (Russian)
lang_config = LanguageConfig(
    primary_language='ru_RU',
    use_mixed=False
)

# Create generator with language config
gen_config = GeneratorConfig(
    num_reporting_fi=1,
    num_individual_accounts=10
)

generator = CRSGenerator(gen_config, language_config=lang_config)
generator.save_to_file('output_russian.xml')
```

### **Method 3: Mixed Languages**

```python
# 70% English, 30% Russian
lang_config = LanguageConfig(
    primary_language='en_US',
    additional_languages=['ru_RU'],
    language_weights={'en_US': 0.7, 'ru_RU': 0.3},
    use_mixed=True
)

generator = CRSGenerator(gen_config, language_config=lang_config)
```

## 📊 Example Output

### English (Default):
```xml
<Individual>
    <ResCountryCode>NL</ResCountryCode>
    <TIN>123456789</TIN>
    <Name>
        <FirstName>John</FirstName>
        <LastName>Smith</LastName>
    </Name>
    <Address>
        <Street>Main Street</Street>
        <City>Amsterdam</City>
    </Address>
</Individual>
```

### Russian (Cyrillic):
```xml
<Individual>
    <ResCountryCode>RU</ResCountryCode>
    <TIN>987654321</TIN>
    <Name>
        <FirstName>Владимир</FirstName>
        <LastName>Петров</LastName>
    </Name>
    <Address>
        <Street>Ленина улица</Street>
        <City>Москва</City>
    </Address>
</Individual>
```

### Chinese (Simplified):
```xml
<Individual>
    <ResCountryCode>CN</ResCountryCode>
    <TIN>456789123</TIN>
    <Name>
        <FirstName>伟</FirstName>
        <LastName>王</LastName>
    </Name>
    <Address>
        <Street>长安街</Street>
        <City>北京</City>
    </Address>
</Individual>
```

### Hindi (Devanagari):
```xml
<Individual>
    <ResCountryCode>IN</ResCountryCode>
    <TIN>789123456</TIN>
    <Name>
        <FirstName>राज</FirstName>
        <LastName>शर्मा</LastName>
    </Name>
    <Address>
        <Street>महात्मा गांधी मार्ग</Street>
        <City>मुंबई</City>
    </Address>
</Individual>
```

## 🔧 Database Setup

### SQL Server:

```sql
-- Create table with NVARCHAR for international characters
CREATE TABLE AccountHolders (
    AccountID INT PRIMARY KEY,
    FirstName NVARCHAR(255),      -- Unicode support
    LastName NVARCHAR(255),       -- Unicode support
    Street NVARCHAR(500),         -- Unicode support
    City NVARCHAR(255),           -- Unicode support
    PostCode NVARCHAR(50),        -- Unicode support
    CompanyName NVARCHAR(255),    -- Unicode support
    TIN VARCHAR(50),              -- Numbers only - VARCHAR OK
    Balance DECIMAL(18,2)         -- Numbers only
);
```

### MySQL:

```sql
-- Use utf8mb4 character set
CREATE TABLE AccountHolders (
    AccountID INT PRIMARY KEY,
    FirstName VARCHAR(255) CHARACTER SET utf8mb4,
    LastName VARCHAR(255) CHARACTER SET utf8mb4,
    Street VARCHAR(500) CHARACTER SET utf8mb4,
    City VARCHAR(255) CHARACTER SET utf8mb4,
    PostCode VARCHAR(50) CHARACTER SET utf8mb4,
    CompanyName VARCHAR(255) CHARACTER SET utf8mb4,
    TIN VARCHAR(50),
    Balance DECIMAL(18,2)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### PostgreSQL:

```sql
-- PostgreSQL uses UTF-8 by default
CREATE TABLE AccountHolders (
    AccountID INT PRIMARY KEY,
    FirstName VARCHAR(255),
    LastName VARCHAR(255),
    Street VARCHAR(500),
    City VARCHAR(255),
    PostCode VARCHAR(50),
    CompanyName VARCHAR(255),
    TIN VARCHAR(50),
    Balance DECIMAL(18,2)
);
```

## ⚠️ Important Warnings

### 1. **Database Column Types**
If you select languages with ⚠️ warning icon:
- **MUST use NVARCHAR** (SQL Server)
- **MUST use utf8mb4** (MySQL)
- **MUST use UTF-8 encoding** (PostgreSQL)

### 2. **Application Shows Warning**
When you select a non-Latin language, the application will show:
```
⚠️ Database Encoding Warning:

The selected language(s) contain non-Latin characters:
Russian (Cyrillic)

Your database columns MUST use NVARCHAR (not VARCHAR) to properly
store these characters. Using VARCHAR will cause data corruption.

Recommended SQL Server column types:
  • Name fields: NVARCHAR(255)
  • Address fields: NVARCHAR(500)
  • Company names: NVARCHAR(255)
```

### 3. **XML Encoding**
Generated XML files use UTF-8 encoding:
```xml
<?xml version="1.0" encoding="UTF-8"?>
```

This is correct and required for international characters.

## 🎨 Use Cases

### **Testing International Systems**
```python
# Test with multiple languages to ensure system handles all scripts
lang_config = LanguageConfig(
    primary_language='en_US',
    additional_languages=['ru_RU', 'zh_CN', 'ar_SA'],
    use_mixed=True
)
```

### **Region-Specific Testing**
```python
# Test Russian system with Russian data
lang_config = LanguageConfig(primary_language='ru_RU')

# Test Chinese system with Chinese data
lang_config = LanguageConfig(primary_language='zh_CN')
```

### **Realistic Multi-National Data**
```python
# Simulate international bank with 60% English, 40% mixed
lang_config = LanguageConfig(
    primary_language='en_US',
    additional_languages=['fr_FR', 'de_DE', 'es_ES'],
    language_weights={
        'en_US': 0.6,
        'fr_FR': 0.15,
        'de_DE': 0.15,
        'es_ES': 0.10
    },
    use_mixed=True
)
```

## 🧪 Testing Your Database

### Test Script:

```python
from crs_generator.language_config import LanguageConfig
from crs_generator.generator import CRSGenerator, GeneratorConfig

# Generate test data with problematic characters
test_languages = ['ru_RU', 'zh_CN', 'hi_IN', 'ar_SA']

for lang in test_languages:
    lang_config = LanguageConfig(primary_language=lang)
    gen_config = GeneratorConfig(num_reporting_fi=1, num_individual_accounts=5)
    
    generator = CRSGenerator(gen_config, language_config=lang_config)
    generator.save_to_file(f'test_{lang}.xml')
    
    print(f"Generated test file: test_{lang}.xml")
    print(f"Import this into your database to test encoding")
```

### Validation Checklist:
- [ ] Import generated XML into database
- [ ] Check names display correctly (not ??????)
- [ ] Check addresses display correctly
- [ ] Check company names display correctly
- [ ] Verify data can be queried and filtered
- [ ] Test data export back to XML

## 📝 Configuration Reference

### LanguageConfig Parameters:

```python
LanguageConfig(
    primary_language='en_US',           # Main language (required)
    additional_languages=['ru_RU'],     # Additional languages (optional)
    language_weights={                  # Distribution weights (optional)
        'en_US': 0.7,
        'ru_RU': 0.3
    },
    use_mixed=True                      # Enable mixed mode (optional)
)
```

### Available Language Codes:

| Code | Language | Script | NVARCHAR Required |
|------|----------|--------|-------------------|
| `en_US` | English (US) | Latin | No |
| `nl_NL` | Dutch | Latin | No |
| `fr_FR` | French | Latin | No |
| `de_DE` | German | Latin | No |
| `es_ES` | Spanish | Latin | No |
| `ru_RU` | Russian | Cyrillic | **Yes** |
| `uk_UA` | Ukrainian | Cyrillic | **Yes** |
| `zh_CN` | Chinese (Simplified) | Chinese | **Yes** |
| `zh_TW` | Chinese (Traditional) | Chinese | **Yes** |
| `ja_JP` | Japanese | Japanese | **Yes** |
| `ko_KR` | Korean | Korean | **Yes** |
| `hi_IN` | Hindi | Devanagari | **Yes** |
| `ar_SA` | Arabic | Arabic | **Yes** |
| `he_IL` | Hebrew | Hebrew | **Yes** |

## 🐛 Troubleshooting

### **Problem: Characters show as ??????**
**Solution:** Database columns must be NVARCHAR, not VARCHAR

### **Problem: XML file won't open**
**Solution:** Ensure file is saved with UTF-8 encoding

### **Problem: Mixed languages not working**
**Solution:** Set `use_mixed=True` in LanguageConfig

### **Problem: Language not available**
**Solution:** Check supported languages list above

### **Problem: Database import fails**
**Solution:** 
1. Check database character set (UTF-8)
2. Check column types (NVARCHAR)
3. Check XML encoding (UTF-8)

## 💡 Best Practices

1. **Always test with sample data first**
   - Generate small test file
   - Import to database
   - Verify encoding works

2. **Use appropriate database types**
   - NVARCHAR for text fields
   - VARCHAR for numeric-only fields (TIN, etc.)

3. **Document your language choice**
   - Note which languages you're testing
   - Keep track of encoding requirements

4. **Backup before bulk import**
   - Test with small dataset first
   - Verify before importing thousands of records

5. **Consider your use case**
   - Single language for region-specific testing
   - Mixed languages for international testing

## 📚 Additional Resources

- **Faker Documentation:** https://faker.readthedocs.io/
- **Unicode in SQL Server:** https://docs.microsoft.com/sql/relational-databases/collations/
- **UTF-8 Support:** https://en.wikipedia.org/wiki/UTF-8

## ✅ Summary

**What You Get:**
- ✅ 20+ language support
- ✅ Proper Unicode handling
- ✅ Database encoding warnings
- ✅ Mixed language support
- ✅ Realistic international data

**What You Need:**
- ⚠️ NVARCHAR columns for non-Latin scripts
- ⚠️ UTF-8 database encoding
- ⚠️ Proper XML import settings

**Result:**
Perfect test data in any language without encoding issues! 🌍
