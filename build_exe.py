"""
Build script to create standalone .exe for CRS Generator
Run this script to package the application into a single executable.
"""

import PyInstaller.__main__
import sys
from pathlib import Path

def build():
    """Build the executable using PyInstaller."""
    
    project_root = Path(__file__).parent
    
    PyInstaller.__main__.run([
        str(project_root / 'gui_app.py'),
        '--name=CRS-Generator',
        '--onefile',
        '--windowed',
        '--icon=NONE',
        f'--add-data={project_root / "crs_generator" / "templates"}' + ';crs_generator/templates',
        '--hidden-import=lxml',
        '--hidden-import=lxml.etree',
        '--hidden-import=faker',
        '--hidden-import=tkinter',
        '--hidden-import=multiprocessing',
        '--collect-all=faker',
        '--noconfirm',
        '--clean',
    ])
    
    print("\n" + "="*70)
    print("✅ Build complete!")
    print("="*70)
    print(f"Executable location: {project_root / 'dist' / 'CRS-Generator.exe'}")
    print("="*70)

if __name__ == "__main__":
    try:
        build()
    except Exception as e:
        print(f"\n❌ Build failed: {e}")
        sys.exit(1)
