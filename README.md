# CRS XML Data Generator

A high-performance CLI tool for generating valid Common Reporting Standard (CRS) XML data for testing purposes. Supports generating millions of accounts with realistic fake data, parallel processing, and structural validation.

## 🚀 Features

-   **Scalable:** optimized for speed using multiprocessing and streaming XML writing.
-   **Realistic Data:** Uses `Faker` to generate plausible names, addresses, and TINs.
-   **Valid Structure:** output adheres to CRS XML schema constraints.
-   **Configurable:** Wizard interface to set country codes, file size, tax year, and more.
-   **Smart Validation:** Auto-corrects common mistakes (like invalid country codes) and warn about test data usage.

## 🛠️ Setup Instructions

If you are new to this project, follow these steps to get started.

### 1. Prerequisites
-   Python 3.8 or higher installed.

### 2. Create a Virtual Environment
It's recommended to use a virtual environment to manage dependencies.

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Mac/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
Run this command to install the required packages (`lxml`, `Faker`, `tqdm`, etc.):

```bash
pip install -r requirements.txt
```

## 🏃‍♂️ How to Run (Easy Method)

Simply double-click **`start_generator.bat`** in the project folder.

This script will automatically:
1.  Check if Python is installed.
2.  Set up the virtual environment.
3.  Install all required dependencies.
4.  Launch the wizard.

## 💻 Manual Run Method

If you prefer using the command line:

1.  **Activate Environment:**
    ```powershell
    .\.venv\Scripts\Activate.ps1
    ```

2.  **Run Wizard:**
    ```bash
    python -m crs_generator.wizard
    ```

The generated XML file will be saved in the `out/` directory.

## ⚠️ Notes
-   **Validation:** The generator prevents using invalid ISO codes like "UK" (auto-converted to "GB").
-   **Performance:** For extremely large files (1M+ accounts), disable "Pretty Printing" in the advanced options to save disk space and time.
