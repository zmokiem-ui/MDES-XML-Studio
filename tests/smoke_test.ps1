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

Write-TestHeader "1b. CRS Validation"
$out = python -m crs_generator.cli --mode validate-xml --xml-input "$OutputDir\crs_new.xml" --output dummy 2>&1 | Out-String
Assert-JsonSuccess $out "CRS XML validation"

Write-TestHeader "1c. CRS Correction"
$out = python -m crs_generator.cli --mode correction --xml-input "$OutputDir\crs_new.xml" --output "$OutputDir\crs_correction.xml" --correct-individual 1 --modify-balance --test-mode 2>&1 | Out-String
Assert-JsonSuccess $out "CRS correction generation"
Assert-FileExists "$OutputDir\crs_correction.xml" "CRS correction file created"

# ============================================================
# 2. FATCA MODULE
# ============================================================
Write-TestHeader "2. FATCA Generation (Random)"
$out = python -m crs_generator.fatca_cli --mode random --sending-country NL --receiving-country US --tax-year 2024 --sending-company-in "A1B2C3.00000.SP.350" --num-fis 1 --individual-accounts 2 --organisation-accounts 1 --output "$OutputDir\fatca_new.xml" 2>&1 | Out-String
Assert-FileExists "$OutputDir\fatca_new.xml" "FATCA random XML generation"

Write-TestHeader "2b. FATCA Validation"
$out = python -m crs_generator.fatca_cli --mode validate-xml --xml-input "$OutputDir\fatca_new.xml" --output dummy 2>&1 | Out-String
Assert-JsonSuccess $out "FATCA XML validation"

Write-TestHeader "2c. FATCA Correction"
$out = python -m crs_generator.fatca_cli --mode correction --xml-input "$OutputDir\fatca_new.xml" --output "$OutputDir\fatca_correction.xml" --correct-individual 1 --modify-balance --test-mode 2>&1 | Out-String
Assert-JsonSuccess $out "FATCA correction generation"
Assert-FileExists "$OutputDir\fatca_correction.xml" "FATCA correction file created"

# ============================================================
# 3. CBC MODULE
# ============================================================
Write-TestHeader "3. CBC Generation"
$out = python -m crs_generator.cbc_cli generate --country NL --year 2024 --reports 3 --output "$OutputDir\cbc_new.xml" 2>&1 | Out-String
Assert-FileExists "$OutputDir\cbc_new.xml" "CBC XML generation"

Write-TestHeader "3b. CBC Correction"
$out = python -m crs_generator.cbc_cli correct --source "$OutputDir\cbc_new.xml" --output "$OutputDir\cbc_correction.xml" --type correction 2>&1 | Out-String
Assert-FileExists "$OutputDir\cbc_correction.xml" "CBC correction file created"

Write-TestHeader "3c. CBC Deletion"
$out = python -m crs_generator.cbc_cli correct --source "$OutputDir\cbc_new.xml" --output "$OutputDir\cbc_deletion.xml" --type deletion 2>&1 | Out-String
Assert-FileExists "$OutputDir\cbc_deletion.xml" "CBC deletion file created"

# ============================================================
# 4. ERROR INJECTOR - One preset per module
# ============================================================
Write-TestHeader "4. Error Injector - CRS"
$out = python -m crs_generator.error_injector --input "$OutputDir\crs_new.xml" --output "$OutputDir\ei_crs.xml" --module crs --file-type xml --preset missing_required --level 3 --options "{}" 2>&1 | Out-String
Assert-JsonSuccess $out "Error Injector CRS missing_required"

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
