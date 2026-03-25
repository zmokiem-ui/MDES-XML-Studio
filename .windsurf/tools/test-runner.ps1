# Workflow Test Runner for CRS-xml-generator
# Runs Playwright tests for workflow-created features

param(
    [string]$TestFile = "",
    [switch]$Headed = $false,
    [switch]$Debug = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Workflow Test Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to electron-app directory
$electronAppPath = Join-Path $PSScriptRoot "..\..\..\electron-app"
Set-Location $electronAppPath

# Build frontend first
Write-Host "[1/3] Building frontend..." -ForegroundColor Yellow
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend built successfully" -ForegroundColor Green

# Determine which tests to run
$testCommand = "npx playwright test"

if ($TestFile) {
    $testCommand += " $TestFile"
    Write-Host "[2/3] Running test: $TestFile" -ForegroundColor Yellow
} else {
    Write-Host "[2/3] Running all workflow tests..." -ForegroundColor Yellow
}

# Add options
if ($Headed) {
    $testCommand += " --headed"
}

if ($Debug) {
    $testCommand += " --debug"
}

$testCommand += " --reporter=list"

# Run tests
Invoke-Expression $testCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ All tests passed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ❌ Tests failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
