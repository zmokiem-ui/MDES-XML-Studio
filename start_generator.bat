@echo off
setlocal
echo ========================================================
echo        CRS XML Generator - Environment Setup & Run
echo ========================================================
echo.

REM 1. CHECK PYTHON
echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Python is NOT found in your PATH!
    echo         Please install Python 3.8+ from https://www.python.org/
    echo         IMPORTANT: Check the box "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo        Found: %%i
echo        [OK] Python is ready.
echo.

REM 2. CHECK VIRTUAL ENVIRONMENT
echo [2/4] Checking Virtual Environment...
if not exist ".venv" (
    echo        Creating new virtual environment (.venv)...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo        [OK] Created .venv
) else (
    echo        [OK] Virtual environment found
)

REM 3. ACTIVATE & INSTALL DEPENDENCIES
echo [3/4] Checking Dependencies...
call .venv\Scripts\activate.bat

echo        Installing/Updating libraries from requirements.txt...
pip install -r requirements.txt >nul
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies. Check your internet connection.
    pause
    exit /b 1
)
echo        [OK] Dependencies are up to date (lxml, Faker, tqdm, etc.)
echo.

REM 4. RUN GENERATOR
echo [4/4] Starting Generator Wizard...
echo ========================================================
echo.
python -m crs_generator.wizard

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The generator crashed. See error above.
)

echo.
echo Closing in 5 seconds...
timeout /t 5 >nul
