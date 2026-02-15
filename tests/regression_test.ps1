# ============================================================
# REGRESSION TEST - CRS Test Data Generator
# ============================================================
# Comprehensive test covering all modules, presets, edge cases,
# corrections, deletions, error injector, CSV, and validation.
# Run from project root: powershell -ExecutionPolicy Bypass -File tests\regression_test.ps1
# ============================================================

param(
    [string]$OutputDir = "tests\regression_output"
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $ProjectRoot

$pass = 0
$fail = 0
$results = @()
$startTime = Get-Date

function Write-Section($name) {
    Write-Host "`n================================================================" -ForegroundColor Magenta
    Write-Host " $name" -ForegroundColor Magenta
    Write-Host "================================================================" -ForegroundColor Magenta
}

function Write-TestHeader($name) {
    Write-Host "`n  --- $name ---" -ForegroundColor Cyan
}

function Assert-FileExists($path, $testName) {
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        if ($size -gt 0) {
            Write-Host "    PASS: $testName ($size bytes)" -ForegroundColor Green
            $script:pass++
            $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="$size bytes"}
            return $true
        } else {
            Write-Host "    FAIL: $testName - File is empty (0 bytes)" -ForegroundColor Red
            $script:fail++
            $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details="Empty file"}
            return $false
        }
    } else {
        Write-Host "    FAIL: $testName - File not created" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details="File not created"}
        return $false
    }
}

function Assert-JsonField($output, $field, $expected, $testName) {
    if ($output -match "`"$field`":\s*$expected") {
        Write-Host "    PASS: $testName" -ForegroundColor Green
        $script:pass++
        $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="$field=$expected"}
        return $true
    } else {
        $snippet = $output.Substring(0, [Math]::Min(300, $output.Length))
        Write-Host "    FAIL: $testName - Expected $field=$expected" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details="Expected $field=$expected in: $snippet"}
        return $false
    }
}

function Assert-JsonSuccess($output, $testName) {
    if ($output -match '"success":\s*true' -or $output -match '"is_valid":\s*true') {
        Write-Host "    PASS: $testName" -ForegroundColor Green
        $script:pass++
        $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="success"}
        return $true
    } else {
        $snippet = $output.Substring(0, [Math]::Min(300, $output.Length))
        Write-Host "    FAIL: $testName" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details=$snippet}
        return $false
    }
}

function Assert-OutputContains($output, $pattern, $testName) {
    if ($output -match $pattern) {
        Write-Host "    PASS: $testName" -ForegroundColor Green
        $script:pass++
        $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="Contains '$pattern'"}
        return $true
    } else {
        Write-Host "    FAIL: $testName - Pattern '$pattern' not found" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details="Missing '$pattern'"}
        return $false
    }
}

function Assert-XmlContains($filePath, $pattern, $testName) {
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        if ($content -match $pattern) {
            Write-Host "    PASS: $testName" -ForegroundColor Green
            $script:pass++
            $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="XML contains '$pattern'"}
            return $true
        } else {
            Write-Host "    FAIL: $testName - Pattern not in XML" -ForegroundColor Red
            $script:fail++
            $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details="XML missing '$pattern'"}
            return $false
        }
    } else {
        Write-Host "    FAIL: $testName - File not found" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details="File not found"}
        return $false
    }
}

# ============================================================
# SETUP
# ============================================================
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host " REGRESSION TEST - CRS Test Data Generator" -ForegroundColor Yellow
Write-Host " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow

if (Test-Path $OutputDir) { Remove-Item $OutputDir -Recurse -Force }
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# ============================================================
# SECTION 1: CRS MODULE - FULL COVERAGE
# ============================================================
Write-Section "SECTION 1: CRS MODULE"

# 1.1 Basic random generation
Write-TestHeader "1.1 CRS Random Generation (basic)"
$null = python -m crs_generator.cli --mode random --sending-country NL --receiving-country DE --tax-year 2024 --mytin 123456789 --num-fis 1 --individual-accounts 2 --organisation-accounts 1 --controlling-persons 1 --output "$OutputDir\crs_basic.xml" 2>&1
Assert-FileExists "$OutputDir\crs_basic.xml" "CRS basic random generation"
Assert-XmlContains "$OutputDir\crs_basic.xml" "CRS_OECD" "CRS XML has CRS_OECD namespace"
Assert-XmlContains "$OutputDir\crs_basic.xml" "SendingCompanyIN" "CRS XML has SendingCompanyIN"
Assert-XmlContains "$OutputDir\crs_basic.xml" "DE" "CRS XML has receiving country DE"

# 1.2 Multiple FIs
Write-TestHeader "1.2 CRS Multiple FIs"
$null = python -m crs_generator.cli --mode random --sending-country NL --receiving-country DE --tax-year 2024 --mytin 123456789 --num-fis 3 --individual-accounts 1 --organisation-accounts 1 --controlling-persons 1 --output "$OutputDir\crs_multi_fi.xml" 2>&1
Assert-FileExists "$OutputDir\crs_multi_fi.xml" "CRS multi-FI generation"

# 1.3 Test mode
Write-TestHeader "1.3 CRS Test Mode"
$null = python -m crs_generator.cli --mode random --sending-country NL --receiving-country DE --tax-year 2024 --mytin 123456789 --num-fis 1 --individual-accounts 1 --organisation-accounts 0 --test-mode --output "$OutputDir\crs_testmode.xml" 2>&1
Assert-FileExists "$OutputDir\crs_testmode.xml" "CRS test mode generation"
Assert-XmlContains "$OutputDir\crs_testmode.xml" "OECD1[123]" "CRS test mode has OECD11/12/13 indicators"

# 1.4 Different country pairs
Write-TestHeader "1.4 CRS Different Countries"
$null = python -m crs_generator.cli --mode random --sending-country GB --receiving-country FR --tax-year 2023 --mytin 987654321 --num-fis 1 --individual-accounts 1 --organisation-accounts 0 --output "$OutputDir\crs_gb_fr.xml" 2>&1
Assert-FileExists "$OutputDir\crs_gb_fr.xml" "CRS GB->FR generation"
Assert-XmlContains "$OutputDir\crs_gb_fr.xml" "GB" "CRS XML has sending country GB"

# 1.5 Validation
Write-TestHeader "1.5 CRS Validation"
$out = python -m crs_generator.cli --mode validate-xml --xml-input "$OutputDir\crs_basic.xml" --output dummy 2>&1 | Out-String
Assert-JsonField $out "is_valid" "true" "CRS basic file is valid"
Assert-JsonField $out "individual_accounts" "2" "CRS has 2 individual accounts"
Assert-JsonField $out "organisation_accounts" "1" "CRS has 1 organisation account"

# 1.6 Correction - correct individual
Write-TestHeader "1.6 CRS Correction (individual)"
$out = python -m crs_generator.cli --mode correction --xml-input "$OutputDir\crs_basic.xml" --output "$OutputDir\crs_corr_ind.xml" --correct-individual 1 --modify-balance --test-mode 2>&1 | Out-String
Assert-JsonSuccess $out "CRS individual correction"
Assert-FileExists "$OutputDir\crs_corr_ind.xml" "CRS correction file exists"

# 1.7 Correction - delete individual
Write-TestHeader "1.7 CRS Deletion (individual)"
$out = python -m crs_generator.cli --mode correction --xml-input "$OutputDir\crs_basic.xml" --output "$OutputDir\crs_del_ind.xml" --delete-individual 1 --test-mode 2>&1 | Out-String
Assert-JsonSuccess $out "CRS individual deletion"
Assert-FileExists "$OutputDir\crs_del_ind.xml" "CRS deletion file exists"

# 1.8 Correction - correct organisation
Write-TestHeader "1.8 CRS Correction (organisation)"
$out = python -m crs_generator.cli --mode correction --xml-input "$OutputDir\crs_basic.xml" --output "$OutputDir\crs_corr_org.xml" --correct-organisation 1 --modify-name --modify-address --test-mode 2>&1 | Out-String
Assert-JsonSuccess $out "CRS organisation correction"
Assert-FileExists "$OutputDir\crs_corr_org.xml" "CRS org correction file exists"

# 1.9 Correction - mixed
Write-TestHeader "1.9 CRS Mixed Correction + Deletion"
$out = python -m crs_generator.cli --mode correction --xml-input "$OutputDir\crs_basic.xml" --output "$OutputDir\crs_mixed.xml" --correct-individual 1 --delete-organisation 1 --modify-balance --test-mode 2>&1 | Out-String
Assert-JsonSuccess $out "CRS mixed correction/deletion"

# 1.10 CSV Preview
Write-TestHeader "1.10 CRS CSV Preview"
$out = python -m crs_generator.cli --mode preview --output dummy --preview-json 2>&1 | Out-String
Assert-OutputContains $out "AccountNumber|DocRefId|TIN" "CRS CSV preview has expected columns"

# ============================================================
# SECTION 2: FATCA MODULE - FULL COVERAGE
# ============================================================
Write-Section "SECTION 2: FATCA MODULE"

# 2.1 Basic random
Write-TestHeader "2.1 FATCA Random Generation"
$null = python -m crs_generator.fatca_cli --mode random --sending-country NL --receiving-country US --tax-year 2024 --sending-company-in "A1B2C3.00000.SP.350" --num-fis 1 --individual-accounts 2 --organisation-accounts 1 --substantial-owners 1 --output "$OutputDir\fatca_basic.xml" 2>&1
Assert-FileExists "$OutputDir\fatca_basic.xml" "FATCA basic random generation"
Assert-XmlContains "$OutputDir\fatca_basic.xml" "FATCA" "FATCA XML has FATCA namespace"

# 2.2 Different filer categories
Write-TestHeader "2.2 FATCA Filer Category FATCA602"
$null = python -m crs_generator.fatca_cli --mode random --sending-country NL --receiving-country US --tax-year 2024 --sending-company-in "X9Y8Z7.11111.SP.350" --num-fis 1 --filer-category FATCA602 --individual-accounts 1 --organisation-accounts 0 --output "$OutputDir\fatca_602.xml" 2>&1
Assert-FileExists "$OutputDir\fatca_602.xml" "FATCA filer category 602"

# 2.3 Test mode
Write-TestHeader "2.3 FATCA Test Mode"
$null = python -m crs_generator.fatca_cli --mode random --sending-country NL --receiving-country US --tax-year 2024 --sending-company-in "A1B2C3.00000.SP.350" --num-fis 1 --individual-accounts 1 --organisation-accounts 0 --test-mode --output "$OutputDir\fatca_testmode.xml" 2>&1
Assert-FileExists "$OutputDir\fatca_testmode.xml" "FATCA test mode generation"

# 2.4 Validation
Write-TestHeader "2.4 FATCA Validation"
$out = python -m crs_generator.fatca_cli --mode validate-xml --xml-input "$OutputDir\fatca_basic.xml" --output dummy 2>&1 | Out-String
Assert-JsonField $out "is_valid" "true" "FATCA basic file is valid"
Assert-JsonField $out "individual_accounts" "2" "FATCA has 2 individual accounts"

# 2.5 Correction
Write-TestHeader "2.5 FATCA Correction"
$out = python -m crs_generator.fatca_cli --mode correction --xml-input "$OutputDir\fatca_basic.xml" --output "$OutputDir\fatca_corr.xml" --correct-individual 1 --modify-balance --test-mode 2>&1 | Out-String
Assert-JsonSuccess $out "FATCA correction generation"
Assert-FileExists "$OutputDir\fatca_corr.xml" "FATCA correction file exists"

# 2.6 Deletion
Write-TestHeader "2.6 FATCA Deletion"
$out = python -m crs_generator.fatca_cli --mode correction --xml-input "$OutputDir\fatca_basic.xml" --output "$OutputDir\fatca_del.xml" --delete-individual 1 --test-mode 2>&1 | Out-String
Assert-JsonSuccess $out "FATCA deletion generation"
Assert-FileExists "$OutputDir\fatca_del.xml" "FATCA deletion file exists"

# ============================================================
# SECTION 3: CBC MODULE - FULL COVERAGE
# ============================================================
Write-Section "SECTION 3: CBC MODULE"

# 3.1 Basic generation
Write-TestHeader "3.1 CBC Generation (3 reports)"
$null = python -m crs_generator.cbc_cli generate --country NL --year 2024 --reports 3 --output "$OutputDir\cbc_basic.xml" 2>&1
Assert-FileExists "$OutputDir\cbc_basic.xml" "CBC basic generation"
Assert-XmlContains "$OutputDir\cbc_basic.xml" "CBC_OECD" "CBC XML has CBC_OECD namespace"

# 3.2 Different country
Write-TestHeader "3.2 CBC Different Country"
$null = python -m crs_generator.cbc_cli generate --country GB --year 2023 --reports 5 --output "$OutputDir\cbc_gb.xml" 2>&1
Assert-FileExists "$OutputDir\cbc_gb.xml" "CBC GB generation"

# 3.3 Single report
Write-TestHeader "3.3 CBC Single Report"
$null = python -m crs_generator.cbc_cli generate --country DE --year 2024 --reports 1 --output "$OutputDir\cbc_single.xml" 2>&1
Assert-FileExists "$OutputDir\cbc_single.xml" "CBC single report"

# 3.4 Correction
Write-TestHeader "3.4 CBC Correction"
$out = python -m crs_generator.cbc_cli correct --source "$OutputDir\cbc_basic.xml" --output "$OutputDir\cbc_corr.xml" --type correction 2>&1 | Out-String
Assert-FileExists "$OutputDir\cbc_corr.xml" "CBC correction file"

# 3.5 Deletion
Write-TestHeader "3.5 CBC Deletion"
$out = python -m crs_generator.cbc_cli correct --source "$OutputDir\cbc_basic.xml" --output "$OutputDir\cbc_del.xml" --type deletion 2>&1 | Out-String
Assert-FileExists "$OutputDir\cbc_del.xml" "CBC deletion file"

# ============================================================
# SECTION 4: ERROR INJECTOR - ALL PRESETS
# ============================================================
Write-Section "SECTION 4: ERROR INJECTOR"

# 4.1 CRS presets
$crsPresets = @("missing_required","invalid_dates","wrong_country_codes","invalid_amounts","duplicate_docrefids","wrong_message_type","malformed_xml","invalid_tin_format")
foreach ($p in $crsPresets) {
    Write-TestHeader "4.1 EI CRS: $p"
    $out = python -m crs_generator.error_injector --input "$OutputDir\crs_basic.xml" --output "$OutputDir\ei_crs_$p.xml" --module crs --file-type xml --preset $p --level 3 --options "{}" 2>&1 | Out-String
    Assert-JsonSuccess $out "Error Injector CRS $p"
    Assert-FileExists "$OutputDir\ei_crs_$p.xml" "EI CRS $p file created"
}

# 4.2 FATCA presets
$fatcaPresets = @("missing_required","invalid_giin","wrong_filer_category","invalid_account_types","wrong_payment_types","us_indicia_errors","malformed_xml")
foreach ($p in $fatcaPresets) {
    Write-TestHeader "4.2 EI FATCA: $p"
    $out = python -m crs_generator.error_injector --input "$OutputDir\fatca_basic.xml" --output "$OutputDir\ei_fatca_$p.xml" --module fatca --file-type xml --preset $p --level 3 --options "{}" 2>&1 | Out-String
    Assert-JsonSuccess $out "Error Injector FATCA $p"
    Assert-FileExists "$OutputDir\ei_fatca_$p.xml" "EI FATCA $p file created"
}

# 4.3 CBC presets
$cbcPresets = @("missing_required","invalid_revenues","wrong_entity_types","missing_cbc_reports","invalid_message_type","duplicate_entities","malformed_xml")
foreach ($p in $cbcPresets) {
    Write-TestHeader "4.3 EI CBC: $p"
    $out = python -m crs_generator.error_injector --input "$OutputDir\cbc_basic.xml" --output "$OutputDir\ei_cbc_$p.xml" --module cbc --file-type xml --preset $p --level 3 --options "{}" 2>&1 | Out-String
    Assert-JsonSuccess $out "Error Injector CBC $p"
    Assert-FileExists "$OutputDir\ei_cbc_$p.xml" "EI CBC $p file created"
}

# 4.4 Error Injector intensity levels
Write-TestHeader "4.4 EI Intensity Levels (1-5)"
foreach ($lvl in 1..5) {
    $out = python -m crs_generator.error_injector --input "$OutputDir\crs_basic.xml" --output "$OutputDir\ei_level_$lvl.xml" --module crs --file-type xml --preset missing_required --level $lvl --options "{}" 2>&1 | Out-String
    Assert-JsonSuccess $out "Error Injector level $lvl"
}

# ============================================================
# SECTION 5: EDGE CASES & VALIDATION
# ============================================================
Write-Section "SECTION 5: EDGE CASES"

# 5.1 Validate corrupted file (should be invalid)
Write-TestHeader "5.1 Corrupted CRS file should fail validation"
$out = python -m crs_generator.cli --mode validate-xml --xml-input "$OutputDir\ei_crs_missing_required.xml" --output dummy 2>&1 | Out-String
Assert-JsonField $out "is_valid" "false" "Corrupted CRS file is invalid"

# 5.2 Zero accounts edge case
Write-TestHeader "5.2 CRS Zero Individual Accounts"
$null = python -m crs_generator.cli --mode random --sending-country NL --receiving-country DE --tax-year 2024 --mytin 123456789 --num-fis 1 --individual-accounts 0 --organisation-accounts 1 --controlling-persons 1 --output "$OutputDir\crs_zero_ind.xml" 2>&1
Assert-FileExists "$OutputDir\crs_zero_ind.xml" "CRS with 0 individual accounts"

# 5.3 Zero org accounts
Write-TestHeader "5.3 CRS Zero Organisation Accounts"
$null = python -m crs_generator.cli --mode random --sending-country NL --receiving-country DE --tax-year 2024 --mytin 123456789 --num-fis 1 --individual-accounts 2 --organisation-accounts 0 --output "$OutputDir\crs_zero_org.xml" 2>&1
Assert-FileExists "$OutputDir\crs_zero_org.xml" "CRS with 0 org accounts"

# 5.4 Large dataset
Write-TestHeader "5.4 CRS Large Dataset (5 FIs, 10 accounts each)"
$null = python -m crs_generator.cli --mode random --sending-country NL --receiving-country DE --tax-year 2024 --mytin 123456789 --num-fis 5 --individual-accounts 5 --organisation-accounts 5 --controlling-persons 2 --output "$OutputDir\crs_large.xml" 2>&1
Assert-FileExists "$OutputDir\crs_large.xml" "CRS large dataset"
$size = (Get-Item "$OutputDir\crs_large.xml").Length
if ($size -gt 10000) {
    Write-Host "    PASS: Large file size is $size bytes (>10KB)" -ForegroundColor Green
    $pass++
    $results += [PSCustomObject]@{Test="CRS large file size check"; Status="PASS"; Details="$size bytes"}
} else {
    Write-Host "    FAIL: Large file too small ($size bytes)" -ForegroundColor Red
    $fail++
    $results += [PSCustomObject]@{Test="CRS large file size check"; Status="FAIL"; Details="$size bytes"}
}

# ============================================================
# SECTION 6: FRONTEND BUILD
# ============================================================
Write-Section "SECTION 6: FRONTEND BUILD"

Write-TestHeader "6.1 Vite Build"
Push-Location "$ProjectRoot\electron-app"
$buildOut = npm run build 2>&1 | Out-String
Pop-Location
if ($buildOut -match "built in") {
    Write-Host "    PASS: Vite build succeeded" -ForegroundColor Green
    $pass++
    $results += [PSCustomObject]@{Test="Frontend Vite build"; Status="PASS"; Details="Build OK"}
} else {
    Write-Host "    FAIL: Vite build failed" -ForegroundColor Red
    $fail++
    $results += [PSCustomObject]@{Test="Frontend Vite build"; Status="FAIL"; Details=$buildOut.Substring(0, [Math]::Min(300, $buildOut.Length))}
}

Write-TestHeader "6.2 Build Output Exists"
Assert-FileExists "$ProjectRoot\electron-app\dist\index.html" "dist/index.html exists"
Assert-FileExists "$ProjectRoot\electron-app\dist\assets" "dist/assets directory exists"

# ============================================================
# SECTION 7: FILE CONTENT INTEGRITY
# ============================================================
Write-Section "SECTION 7: FILE CONTENT INTEGRITY"

Write-TestHeader "7.1 CRS XML Structure"
Assert-XmlContains "$OutputDir\crs_basic.xml" "MessageSpec>" "CRS has MessageSpec"
Assert-XmlContains "$OutputDir\crs_basic.xml" "ReportingFI>" "CRS has ReportingFI"
Assert-XmlContains "$OutputDir\crs_basic.xml" "AccountReport>" "CRS has AccountReport"
Assert-XmlContains "$OutputDir\crs_basic.xml" "DocRefId>" "CRS has DocRefId"

Write-TestHeader "7.2 FATCA XML Structure"
Assert-XmlContains "$OutputDir\fatca_basic.xml" "MessageSpec>" "FATCA has MessageSpec"
Assert-XmlContains "$OutputDir\fatca_basic.xml" "ReportingFI>" "FATCA has ReportingFI"
Assert-XmlContains "$OutputDir\fatca_basic.xml" "AccountReport>" "FATCA has AccountReport"
Assert-XmlContains "$OutputDir\fatca_basic.xml" "DocRefId>" "FATCA has DocRefId"

Write-TestHeader "7.3 CBC XML Structure"
Assert-XmlContains "$OutputDir\cbc_basic.xml" "MessageSpec>" "CBC has MessageSpec"
Assert-XmlContains "$OutputDir\cbc_basic.xml" "ReportingEntity>" "CBC has ReportingEntity"
Assert-XmlContains "$OutputDir\cbc_basic.xml" "CbcReports>" "CBC has CbcReports"
Assert-XmlContains "$OutputDir\cbc_basic.xml" "DocRefId>" "CBC has DocRefId"

Write-TestHeader "7.4 Correction File Structure"
Assert-XmlContains "$OutputDir\crs_corr_ind.xml" "OECD1[23]" "CRS correction has OECD12 or OECD13 indicator"
Assert-XmlContains "$OutputDir\crs_del_ind.xml" "OECD1[23]" "CRS deletion has OECD12 or OECD13 indicator"

# ============================================================
# SUMMARY
# ============================================================
$elapsed = (Get-Date) - $startTime

Write-Host "`n================================================================" -ForegroundColor Yellow
Write-Host " REGRESSION TEST RESULTS" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "  PASSED:  $pass" -ForegroundColor Green
Write-Host "  FAILED:  $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  TOTAL:   $($pass + $fail)" -ForegroundColor White
Write-Host "  TIME:    $($elapsed.TotalSeconds.ToString('F1'))s" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Yellow

# Show failures only
$failures = $results | Where-Object { $_.Status -eq "FAIL" }
if ($failures.Count -gt 0) {
    Write-Host "`nFAILED TESTS:" -ForegroundColor Red
    $failures | Format-Table -AutoSize
}

# Export full results to file
$reportPath = "$OutputDir\regression_report.txt"
"REGRESSION TEST REPORT - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $reportPath
"PASSED: $pass | FAILED: $fail | TOTAL: $($pass + $fail) | TIME: $($elapsed.TotalSeconds.ToString('F1'))s" | Out-File $reportPath -Append
"" | Out-File $reportPath -Append
$results | Format-Table -AutoSize | Out-String | Out-File $reportPath -Append
Write-Host "`nFull report saved to: $reportPath" -ForegroundColor Cyan

if ($fail -gt 0) {
    Write-Host "`nREGRESSION TEST FAILED - $fail test(s) failed" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`nREGRESSION TEST PASSED - All $pass tests passed" -ForegroundColor Green
    exit 0
}
