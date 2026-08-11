# ============================================================
# SMOKE TEST - CRS Test Data Generator
# ============================================================
# Quick validation that all core features work.
# Run from project root: powershell -ExecutionPolicy Bypass -File tests\smoke_test.ps1
# ============================================================

param(
    [string]$OutputDir = "tests\smoke_output"
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $ProjectRoot

$pass = 0
$fail = 0
$skip = 0
$results = @()

function Write-TestHeader($name) {
    Write-Host "`n--- $name ---" -ForegroundColor Cyan
}

function Assert-FileExists($path, $testName) {
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        Write-Host "  PASS: $testName ($size bytes)" -ForegroundColor Green
        $script:pass++
        $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="$size bytes"}
        return $true
    } else {
        Write-Host "  FAIL: $testName - File not created" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details="File not created"}
        return $false
    }
}

function Assert-XsdValid($path, $testName) {
    $out = python -m crs_generator.xsd_validator $path 2>&1 | Out-String
    if ($out -match '"valid":\s*true') {
        Write-Host "  PASS: $testName (XSD valid)" -ForegroundColor Green
        $script:pass++
        $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="XSD valid"}
        return $true
    } else {
        $err = if ($out -match '"message":\s*"([^"]+)"') { $Matches[1] } else { $out.Substring(0, [Math]::Min(200, $out.Length)) }
        Write-Host "  FAIL: $testName - $err" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details=$err}
        return $false
    }
}

function Assert-XmlContains($path, $pattern, $testName) {
    if (-not (Test-Path $path)) {
        Write-Host "  FAIL: $testName - File not found" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details="File not found"}
        return $false
    }
    $content = Get-Content $path -Raw
    if ($content -match [regex]::Escape($pattern)) {
        Write-Host "  PASS: $testName" -ForegroundColor Green
        $script:pass++
        $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="Pattern found"}
        return $true
    } else {
        Write-Host "  FAIL: $testName - Pattern '$pattern' not found" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details="Pattern not found"}
        return $false
    }
}

function Assert-Match($output, $pattern, $testName) {
    if ($output -match $pattern) {
        Write-Host "  PASS: $testName" -ForegroundColor Green
        $script:pass++
        $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="Matched"}
        return $true
    } else {
        Write-Host "  FAIL: $testName - No match for '$pattern'" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details="No match"}
        return $false
    }
}

function Assert-NoMdesFindings($path, $testName) {
    # XSD validity is not enough: MDES also enforces record-level business
    # rules (60011/60012 residence, 60017-60023 account-type consistency) that
    # the schema cannot express. v2.0.0 shipped violating several of them.
    $out = python -c "import sys, json; from crs_generator.mdes_rules import check_file; print(json.dumps([f.code for f in check_file(sys.argv[1], environment_is_test=True)]))" $path 2>&1 | Out-String
    $out = $out.Trim()
    if ($out -eq '[]') {
        Write-Host "  PASS: $testName (no MDES findings)" -ForegroundColor Green
        $script:pass++
        $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="no findings"}
        return $true
    } else {
        Write-Host "  FAIL: $testName - MDES findings: $out" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details=$out.Substring(0, [Math]::Min(200, $out.Length))}
        return $false
    }
}

function Assert-JsonSuccess($output, $testName) {
    if ($output -match '"success":\s*true') {
        Write-Host "  PASS: $testName" -ForegroundColor Green
        $script:pass++
        $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="success=true"}
        return $true
    } elseif ($output -match '"is_valid":\s*true') {
        Write-Host "  PASS: $testName" -ForegroundColor Green
        $script:pass++
        $script:results += [PSCustomObject]@{Test=$testName; Status="PASS"; Details="is_valid=true"}
        return $true
    } else {
        $err = if ($output -match '"error":\s*"([^"]+)"') { $Matches[1] } else { $output.Substring(0, [Math]::Min(200, $output.Length)) }
        Write-Host "  FAIL: $testName - $err" -ForegroundColor Red
        $script:fail++
        $script:results += [PSCustomObject]@{Test=$testName; Status="FAIL"; Details=$err}
        return $false
    }
}

# Setup
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host " SMOKE TEST - CRS Test Data Generator" -ForegroundColor Yellow
Write-Host " $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

if (Test-Path $OutputDir) { Remove-Item $OutputDir -Recurse -Force }
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# ============================================================
# 1. CRS MODULE
# ============================================================
Write-TestHeader "1. CRS Generation (Random)"
$out = python -m crs_generator.cli --mode random --sending-country NL --receiving-country DE --tax-year 2024 --mytin 123456789 --num-fis 1 --individual-accounts 2 --organisation-accounts 1 --controlling-persons 1 --output "$OutputDir\crs_new.xml" 2>&1 | Out-String
Assert-FileExists "$OutputDir\crs_new.xml" "CRS random XML generation"
Assert-XsdValid "$OutputDir\crs_new.xml" "CRS XSD validity"
Assert-NoMdesFindings "$OutputDir\crs_new.xml" "CRS 2.0 MDES business rules"

Write-TestHeader "1b. CRS Validation"
$out = python -m crs_generator.cli --mode validate-xml --xml-input "$OutputDir\crs_new.xml" --output dummy 2>&1 | Out-String
Assert-JsonSuccess $out "CRS XML validation"

Write-TestHeader "1c. CRS Correction"
$out = python -m crs_generator.cli --mode correction --xml-input "$OutputDir\crs_new.xml" --output "$OutputDir\crs_correction.xml" --correct-individual 1 --modify-balance --test-mode 2>&1 | Out-String
Assert-JsonSuccess $out "CRS correction generation"
Assert-FileExists "$OutputDir\crs_correction.xml" "CRS correction file created"
Assert-XsdValid "$OutputDir\crs_correction.xml" "CRS correction XSD validity"

Write-TestHeader "1d. CRS 3.0 Generation (Random)"
$out = python -m crs_generator.cli --mode random --crs-version 3.0 --sending-country NL --receiving-country DE --tax-year 2024 --mytin 123456789 --num-fis 1 --individual-accounts 2 --organisation-accounts 1 --controlling-persons 1 --output "$OutputDir\crs3_new.xml" 2>&1 | Out-String
Assert-FileExists "$OutputDir\crs3_new.xml" "CRS 3.0 random XML generation"
Assert-XsdValid "$OutputDir\crs3_new.xml" "CRS 3.0 XSD validity"
Assert-NoMdesFindings "$OutputDir\crs3_new.xml" "CRS 3.0 MDES business rules"
Assert-XmlContains "$OutputDir\crs3_new.xml" "urn:oecd:ties:crs:v3" "CRS 3.0 uses the v3 namespace"
Assert-XmlContains "$OutputDir\crs3_new.xml" "<crs:DDProcedure>" "CRS 3.0 emits DDProcedure"
Assert-XmlContains "$OutputDir\crs3_new.xml" "<crs:AccountType>" "CRS 3.0 emits AccountType"
Assert-XmlContains "$OutputDir\crs3_new.xml" "<crs:SelfCert>" "CRS 3.0 emits SelfCert"

Write-TestHeader "1e. CRS 3.0 Validation + Correction"
$out = python -m crs_generator.cli --mode validate-xml --xml-input "$OutputDir\crs3_new.xml" --output dummy 2>&1 | Out-String
Assert-JsonSuccess $out "CRS 3.0 XML validation"
Assert-Match $out '"version":\s*"3.0"' "CRS 3.0 version auto-detected on validation"
$out = python -m crs_generator.cli --mode correction --xml-input "$OutputDir\crs3_new.xml" --output "$OutputDir\crs3_correction.xml" --correct-individual 1 --modify-balance --test-mode 2>&1 | Out-String
Assert-JsonSuccess $out "CRS 3.0 correction generation"
Assert-XsdValid "$OutputDir\crs3_correction.xml" "CRS 3.0 correction XSD validity"

Write-TestHeader "1f. CRS CSV Round Trip (2.0)"
$out = python -m crs_generator.cli --mode preview --sending-country NL --receiving-country DE --tax-year 2024 --mytin 123456789 --num-fis 1 --individual-accounts 2 --organisation-accounts 1 --controlling-persons 1 --output "$OutputDir\crs_data.csv" 2>&1 | Out-String
Assert-FileExists "$OutputDir\crs_data.csv" "CRS 2.0 preview CSV created"
$out = python -m crs_generator.cli --mode csv --csv-input "$OutputDir\crs_data.csv" --output "$OutputDir\crs_from_csv.xml" 2>&1 | Out-String
Assert-FileExists "$OutputDir\crs_from_csv.xml" "CRS 2.0 XML generated from CSV"
Assert-XsdValid "$OutputDir\crs_from_csv.xml" "CRS 2.0 CSV output XSD validity"
Assert-NoMdesFindings "$OutputDir\crs_from_csv.xml" "CRS 2.0 CSV output MDES business rules"

Write-TestHeader "1g. CRS CSV Round Trip (3.0)"
$out = python -m crs_generator.cli --mode preview --crs-version 3.0 --sending-country NL --receiving-country DE --tax-year 2024 --mytin 123456789 --num-fis 1 --individual-accounts 2 --organisation-accounts 1 --controlling-persons 1 --output "$OutputDir\crs3_data.csv" 2>&1 | Out-String
Assert-FileExists "$OutputDir\crs3_data.csv" "CRS 3.0 preview CSV created"
$out = python -m crs_generator.cli --mode csv --crs-version 3.0 --csv-input "$OutputDir\crs3_data.csv" --output "$OutputDir\crs3_from_csv.xml" 2>&1 | Out-String
Assert-FileExists "$OutputDir\crs3_from_csv.xml" "CRS 3.0 XML generated from CSV"
Assert-XsdValid "$OutputDir\crs3_from_csv.xml" "CRS 3.0 CSV output XSD validity"
Assert-NoMdesFindings "$OutputDir\crs3_from_csv.xml" "CRS 3.0 CSV output MDES business rules"

# ============================================================
# 2. FATCA MODULE
# ============================================================
Write-TestHeader "2. FATCA Generation (Random)"
$out = python -m crs_generator.fatca_cli --mode random --sending-country NL --receiving-country US --tax-year 2024 --sending-company-in "A1B2C3.00000.SP.350" --num-fis 1 --individual-accounts 2 --organisation-accounts 1 --output "$OutputDir\fatca_new.xml" 2>&1 | Out-String
Assert-FileExists "$OutputDir\fatca_new.xml" "FATCA random XML generation"
Assert-XsdValid "$OutputDir\fatca_new.xml" "FATCA XSD validity"

Write-TestHeader "2b. FATCA Validation"
$out = python -m crs_generator.fatca_cli --mode validate-xml --xml-input "$OutputDir\fatca_new.xml" --output dummy 2>&1 | Out-String
Assert-JsonSuccess $out "FATCA XML validation"

Write-TestHeader "2c. FATCA Correction"
$out = python -m crs_generator.fatca_cli --mode correction --xml-input "$OutputDir\fatca_new.xml" --output "$OutputDir\fatca_correction.xml" --correct-individual 1 --modify-balance --test-mode 2>&1 | Out-String
Assert-JsonSuccess $out "FATCA correction generation"
Assert-FileExists "$OutputDir\fatca_correction.xml" "FATCA correction file created"
Assert-XsdValid "$OutputDir\fatca_correction.xml" "FATCA correction XSD validity"

# ============================================================
# 3. CBC MODULE
# ============================================================
Write-TestHeader "3. CBC Generation"
$out = python -m crs_generator.cbc_cli generate --country NL --year 2024 --reports 3 --output "$OutputDir\cbc_new.xml" 2>&1 | Out-String
Assert-FileExists "$OutputDir\cbc_new.xml" "CBC XML generation"
Assert-XsdValid "$OutputDir\cbc_new.xml" "CBC XSD validity"

Write-TestHeader "3b. CBC Correction"
$out = python -m crs_generator.cbc_cli correct --source "$OutputDir\cbc_new.xml" --output "$OutputDir\cbc_correction.xml" --type correction 2>&1 | Out-String
Assert-FileExists "$OutputDir\cbc_correction.xml" "CBC correction file created"
Assert-XsdValid "$OutputDir\cbc_correction.xml" "CBC correction XSD validity"

Write-TestHeader "3c. CBC Deletion"
$out = python -m crs_generator.cbc_cli correct --source "$OutputDir\cbc_new.xml" --output "$OutputDir\cbc_deletion.xml" --type deletion 2>&1 | Out-String
Assert-FileExists "$OutputDir\cbc_deletion.xml" "CBC deletion file created"
Assert-XsdValid "$OutputDir\cbc_deletion.xml" "CBC deletion XSD validity"

# ============================================================
# 4. ERROR INJECTOR - One preset per module
# ============================================================
Write-TestHeader "4. Error Injector - CRS"
$out = python -m crs_generator.error_injector --input "$OutputDir\crs_new.xml" --output "$OutputDir\ei_crs.xml" --module crs --file-type xml --preset missing_required --level 3 --options "{}" 2>&1 | Out-String
Assert-JsonSuccess $out "Error Injector CRS missing_required"

Write-TestHeader "4a2. Error Injector - CRS 3.0"
$out = python -m crs_generator.error_injector --input "$OutputDir\crs3_new.xml" --output "$OutputDir\ei_crs3.xml" --module crs --file-type xml --preset missing_required --level 5 --options "{}" 2>&1 | Out-String
Assert-JsonSuccess $out "Error Injector CRS 3.0 missing_required"
Assert-Match $out 'SelfCert|DDProcedure|AccountType' "Error Injector strips CRS 3.0 mandatory fields"

Write-TestHeader "4b. Error Injector - FATCA"
$out = python -m crs_generator.error_injector --input "$OutputDir\fatca_new.xml" --output "$OutputDir\ei_fatca.xml" --module fatca --file-type xml --preset invalid_giin --level 3 --options "{}" 2>&1 | Out-String
Assert-JsonSuccess $out "Error Injector FATCA invalid_giin"

Write-TestHeader "4c. Error Injector - CBC"
$out = python -m crs_generator.error_injector --input "$OutputDir\cbc_new.xml" --output "$OutputDir\ei_cbc.xml" --module cbc --file-type xml --preset missing_required --level 3 --options "{}" 2>&1 | Out-String
Assert-JsonSuccess $out "Error Injector CBC missing_required"

# ============================================================
# 5. FRONTEND BUILD
# ============================================================
Write-TestHeader "5. Frontend Build"
Push-Location "$ProjectRoot\electron-app"
$buildOut = npm run build 2>&1 | Out-String
Pop-Location
if ($buildOut -match "built in") {
    Write-Host "  PASS: Vite build succeeded" -ForegroundColor Green
    $pass++
    $results += [PSCustomObject]@{Test="Frontend Vite build"; Status="PASS"; Details="Build OK"}
} else {
    Write-Host "  FAIL: Vite build failed" -ForegroundColor Red
    $fail++
    $results += [PSCustomObject]@{Test="Frontend Vite build"; Status="FAIL"; Details=$buildOut.Substring(0, [Math]::Min(200, $buildOut.Length))}
}

# ============================================================
# SUMMARY
# ============================================================
Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host " SMOKE TEST RESULTS" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  PASSED: $pass" -ForegroundColor Green
Write-Host "  FAILED: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  TOTAL:  $($pass + $fail)" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Yellow

# Export results
$results | Format-Table -AutoSize

if ($fail -gt 0) {
    Write-Host "`nSMOKE TEST FAILED - $fail test(s) failed" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`nSMOKE TEST PASSED - All $pass tests passed" -ForegroundColor Green
    exit 0
}
