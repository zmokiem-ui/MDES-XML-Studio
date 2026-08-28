"""
Build Python backend into standalone executables for Electron distribution.

Creates 6 executables in electron-app/python-dist/:
  - crs_cli.exe       (CRS generation, validation, corrections, previews)
  - cbc_cli.exe       (CBC generation, validation, corrections)
  - fatca_cli.exe     (FATCA generation, validation, corrections)
  - error_injector.exe (Error injection for testing)
  - cts_cli.exe       (CTS/IDES encryption and packaging for MDES upload)
  - mdes_target_cli.exe (Reads an MDES instance and builds packages it accepts)

Usage:
  python build_python_backend.py

Requirements:
  pip install pyinstaller
"""

import PyInstaller.__main__
import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent
OUTPUT_DIR = PROJECT_ROOT / 'electron-app' / 'python-dist'

# All data directories that need to be bundled with the executables
DATA_DIRS = [
    ('crs_generator/templates', 'crs_generator/templates'),
    ('crs_generator/schemas', 'crs_generator/schemas'),
    ('crs_generator/template CBC', 'crs_generator/template CBC'),
    ('crs_generator/template FATCA', 'crs_generator/template FATCA'),
    ('crs_generator/template corrections', 'crs_generator/template corrections'),
    ('crs_generator/validators', 'crs_generator/validators'),
    # The seed certificate pack. The desktop app copies its own copy from
    # extraResources, but cts_cli.exe must also work when run on its own.
    ('crs_generator/certificates', 'crs_generator/certificates'),
]

# Hidden imports required by the CLI modules
HIDDEN_IMPORTS = [
    'lxml', 'lxml.etree', 'lxml._elementpath',
    'faker', 'faker.providers',
    'multiprocessing', 'tqdm',
    'csv', 'json', 'xml.etree.ElementTree',
    'crs_generator',
    'crs_generator.generator',
    'crs_generator.config',
    'crs_generator.base_data_generator',
    'crs_generator.csv_parser',
    'crs_generator.csv_generator',
    'crs_generator.correction_generator',
    'crs_generator.xml_validator',
    'crs_generator.cli_utils',
    'crs_generator.language_config',
    'crs_generator.reportable_jurisdictions',
    'crs_generator.cbc_generator',
    'crs_generator.cbc_csv_parser',
    'crs_generator.cbc_csv_generator',
    'crs_generator.cbc_correction_generator',
    'crs_generator.fatca_generator',
    'crs_generator.fatca_validator',
    'crs_generator.fatca_correction_generator',
    'crs_generator.error_injector',
    'crs_generator.cts_cli',
    'crs_generator.cts',
    'crs_generator.cts.certificates',
    'crs_generator.cts.metadata',
    'crs_generator.cts.naming',
    'crs_generator.cts.packager',
    'crs_generator.cts.signing',
    'crs_generator.mdes_target_cli',
    'crs_generator.mdes_target',
    'crs_generator.mdes_target.database',
    'crs_generator.mdes_target.preflight',
    'crs_generator.mdes_target.profile',
    'crs_generator.mdes_target.props',
    # cryptography loads its Rust backend through these; PyInstaller does not
    # find them from the high-level imports alone.
    'cryptography',
    'cryptography.hazmat.bindings._rust',
    'cryptography.hazmat.primitives.serialization.pkcs12',
    'cryptography.hazmat.primitives.ciphers',
    'cryptography.hazmat.primitives.asymmetric.padding',
    'cryptography.x509',
]

# CLI modules to build: (entry_script, output_name)
CLI_MODULES = [
    ('entry_crs_cli.py', 'crs_cli'),
    ('entry_cbc_cli.py', 'cbc_cli'),
    ('entry_fatca_cli.py', 'fatca_cli'),
    ('entry_error_injector.py', 'error_injector'),
    ('entry_cts_cli.py', 'cts_cli'),
    ('entry_mdes_target_cli.py', 'mdes_target_cli'),
]

# pyodbc is optional: MDES targets need it, nothing else does. Passing
# --hidden-import for a module that is not installed makes PyInstaller fail, so
# it is only added when it is actually importable.
try:
    import pyodbc  # noqa: F401
    HIDDEN_IMPORTS.append('pyodbc')
except ImportError:
    print('  [note] pyodbc not installed - MDES target support will be unavailable '
          'in the bundled executables.')


def create_entry_scripts():
    """Create thin entry-point scripts that PyInstaller can bundle."""
    scripts = {
        'entry_crs_cli.py': 'from crs_generator.cli import main; raise SystemExit(main())',
        'entry_cbc_cli.py': 'from crs_generator.cbc_cli import main; raise SystemExit(main())',
        'entry_fatca_cli.py': 'from crs_generator.fatca_cli import main; raise SystemExit(main())',
        'entry_error_injector.py': 'from crs_generator.error_injector import main; raise SystemExit(main())',
        'entry_cts_cli.py': 'from crs_generator.cts_cli import main; raise SystemExit(main())',
        'entry_mdes_target_cli.py': 'from crs_generator.mdes_target_cli import main; raise SystemExit(main())',
    }
    paths = []
    for filename, code in scripts.items():
        p = PROJECT_ROOT / filename
        p.write_text(code, encoding='utf-8')
        paths.append(p)
    return paths


def cleanup_entry_scripts():
    """Remove temporary entry-point scripts."""
    for name in ['entry_crs_cli.py', 'entry_cbc_cli.py', 'entry_fatca_cli.py', 'entry_error_injector.py',
                 'entry_cts_cli.py', 'entry_mdes_target_cli.py']:
        p = PROJECT_ROOT / name
        if p.exists():
            p.unlink()


def build_exe(entry_script, output_name):
    """Build a single CLI module into a standalone executable."""
    print(f'\n{"="*60}')
    print(f'  Building {output_name}.exe from {entry_script}')
    print(f'{"="*60}')

    # Construct --add-data flags (use ; on Windows, : on Unix)
    sep = ';' if sys.platform == 'win32' else ':'
    add_data_args = []
    for src, dst in DATA_DIRS:
        src_path = PROJECT_ROOT / src
        if src_path.exists():
            add_data_args.append(f'--add-data={src_path}{sep}{dst}')

    hidden_import_args = []
    for mod in HIDDEN_IMPORTS:
        hidden_import_args.append(f'--hidden-import={mod}')

    pyinstaller_args = [
        str(PROJECT_ROOT / entry_script),
        f'--name={output_name}',
        '--onefile',
        '--console',
        f'--distpath={OUTPUT_DIR}',
        f'--workpath={PROJECT_ROOT / "build" / "pyinstaller" / output_name}',
        f'--specpath={PROJECT_ROOT / "build" / "pyinstaller"}',
        '--collect-all=faker',
        '--noconfirm',
        '--clean',
        *add_data_args,
        *hidden_import_args,
    ]

    PyInstaller.__main__.run(pyinstaller_args)
    
    exe_path = OUTPUT_DIR / f'{output_name}.exe'
    if exe_path.exists():
        size_mb = exe_path.stat().st_size / (1024 * 1024)
        print(f'  [OK] {output_name}.exe built successfully ({size_mb:.1f} MB)')
    else:
        print(f'  [FAIL] {output_name}.exe was NOT created')
        sys.exit(1)


def main():
    print('='*60)
    print('  CRS Test Data Generator - Python Backend Builder')
    print('='*60)
    print(f'  Project root: {PROJECT_ROOT}')
    print(f'  Output dir:   {OUTPUT_DIR}')

    # Clean output directory
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True)

    # Create entry scripts
    create_entry_scripts()

    try:
        # Build each CLI module
        for entry_script, output_name in CLI_MODULES:
            build_exe(entry_script, output_name)
    finally:
        # Always clean up entry scripts
        cleanup_entry_scripts()

    # Summary
    print(f'\n{"="*60}')
    print('  BUILD COMPLETE')
    print(f'{"="*60}')
    total_size = 0
    for _, name in CLI_MODULES:
        exe = OUTPUT_DIR / f'{name}.exe'
        if exe.exists():
            size = exe.stat().st_size / (1024 * 1024)
            total_size += size
            print(f'  [OK] {name}.exe  ({size:.1f} MB)')
    print(f'  -------------------------')
    print(f'  Total: {total_size:.1f} MB')
    print(f'  Location: {OUTPUT_DIR}')
    print(f'{"="*60}')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        cleanup_entry_scripts()
        print(f'\n[FAIL] Build failed: {e}')
        sys.exit(1)
