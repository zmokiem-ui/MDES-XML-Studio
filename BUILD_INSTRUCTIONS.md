# Building CRS Generator Executable

This guide explains how to build the standalone `.exe` file for the CRS Test Data Generator.

## Prerequisites

- Python 3.8 or higher
- All project dependencies installed

## Quick Build

### Step 1: Install Build Dependencies

```powershell
pip install -r requirements-build.txt
```

### Step 2: Run Build Script

```powershell
python build_exe.py
```

### Step 3: Find Your Executable

The executable will be created at:
```
dist\CRS-Generator.exe
```

## Distribution

Once built, you can distribute **only** the `CRS-Generator.exe` file to other developers. They don't need:
- Python installed
- Any dependencies
- Any other files

Just run the `.exe` and it works!

## File Size

The executable will be approximately 40-60 MB due to bundled dependencies (Python runtime, lxml, faker, etc.).

## Testing the Executable

1. Navigate to the `dist` folder
2. Double-click `CRS-Generator.exe`
3. The GUI should open immediately

## Troubleshooting

### Build fails with "PyInstaller not found"
```powershell
pip install pyinstaller
```

### Missing template files error
Make sure the `crs_generator/templates` folder exists with the CRS-Master.xml template.

### Antivirus flags the .exe
This is common with PyInstaller executables. You may need to:
- Add an exception in your antivirus
- Sign the executable with a code signing certificate (for production use)

## Advanced: Custom Build Options

Edit `build_exe.py` to customize:
- Icon: Change `--icon=NONE` to `--icon=your_icon.ico`
- Console: Remove `--windowed` to show console window
- Name: Change `--name=CRS-Generator` to your preferred name

## Notes

- First build may take 2-5 minutes
- Subsequent builds are faster
- The `build` and `dist` folders can be deleted after distribution
- Keep the `.spec` file if you want to rebuild with same settings
