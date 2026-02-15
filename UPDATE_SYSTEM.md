# Auto-Update System Documentation

## Overview

The CRS Generator now includes an automatic update system that checks GitHub releases for new versions and allows users to update with a single click.

## How It Works

### 1. **Version Tracking**
- Current version is stored in `crs_generator/__init__.py` as `__version__ = "2.1.0"`
- Version follows semantic versioning: `MAJOR.MINOR.PATCH`

### 2. **Update Check on Startup**
When the application starts:
1. Checks GitHub API for latest release
2. Compares current version with latest version
3. If newer version exists, shows dialog to user
4. User can choose to update or skip

### 3. **Update Process**
If user chooses to update:
1. Downloads new `.exe` from GitHub release
2. Shows progress bar during download
3. Creates update installer script
4. Replaces old exe with new one
5. Restarts application automatically

## For Users

### When You See "Update Available"
1. Click **Yes** to download and install
2. Click **No** to skip (you'll be asked again next time)

### What Happens During Update
- Progress bar shows download status
- Application will close and restart automatically
- Your settings and data are preserved

## For Developers

### Publishing a New Release

1. **Update Version Number**
   ```python
   # In crs_generator/__init__.py
   __version__ = "2.2.0"  # Increment version
   ```

2. **Build the EXE**
   ```bash
   python build_exe.py
   ```

3. **Create GitHub Release**
   - Go to: https://github.com/zmokiem-ui/CRS-xml-generator/releases/new
   - Tag version: `v2.2.0` (must start with 'v')
   - Release title: `CRS Generator v2.2.0`
   - Description: Add release notes
   - **Upload the .exe file** from `dist/CRS-Generator.exe`
   - Click "Publish release"

4. **Users Get Notified**
   - Next time they start the app, they'll see update notification
   - One-click update to new version

### Version Numbering Guide

- **MAJOR** (2.x.x): Breaking changes, major new features
- **MINOR** (x.1.x): New features, improvements (backward compatible)
- **PATCH** (x.x.1): Bug fixes, small improvements

Examples:
- `2.0.0` → `2.1.0`: Added auto-update feature
- `2.1.0` → `2.1.1`: Fixed a bug
- `2.1.0` → `3.0.0`: Complete rewrite

### Testing Updates Locally

```python
from crs_generator.updater import UpdateChecker

checker = UpdateChecker("2.0.0")  # Test with old version
update_info = checker.check_for_updates()

if update_info and update_info['available']:
    print(f"Update available: {update_info['latest_version']}")
    print(f"Download: {update_info['download_url']}")
```

### Disabling Auto-Update

To disable update checks, modify `main.py`:

```python
# Change this:
check_for_updates_on_startup(silent=False)

# To this:
check_for_updates_on_startup(silent=True)  # Silent mode
# Or remove the line entirely
```

## Files Added

- `crs_generator/updater.py` - Core update logic
- `crs_generator/startup.py` - Startup dialogs and UI
- `main.py` - Application entry point with update check
- `UPDATE_SYSTEM.md` - This documentation

## Requirements

- `requests>=2.31.0` (added to requirements.txt)
- Internet connection for update checks
- GitHub repository with releases

## Troubleshooting

### "Update check failed"
- Check internet connection
- GitHub API might be temporarily unavailable
- App continues normally, just skips update check

### "Download failed"
- Check internet connection
- Try again later
- Can manually download from GitHub releases page

### "Update installation failed"
- Antivirus might be blocking
- Try running as administrator
- Can manually replace exe file

## Security Notes

- Updates only download from official GitHub repository
- HTTPS connection ensures secure download
- User must approve before downloading
- No automatic updates without user consent

## Future Enhancements

Possible improvements:
- [ ] Update history/changelog viewer
- [ ] Automatic update scheduling
- [ ] Delta updates (only download changes)
- [ ] Rollback to previous version
- [ ] Update notifications without blocking startup
