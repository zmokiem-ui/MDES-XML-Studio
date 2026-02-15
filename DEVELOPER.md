# MDES XML Studio — Developer Guide

## Quick Start

```bash
# 1. Clone
git clone https://github.com/zmokiem-ui/CRS-xml-generator.git
cd CRS-xml-generator

# 2. Python setup
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# 3. Electron setup
cd electron-app
npm install

# 4. Run in dev mode
npm run build          # Build Vite frontend
npm run electron       # Launch Electron app
```

---

## Branch Strategy

```
main              ← Tagged releases only (v1.0.0, v1.1.0, ...)
  └── develop     ← Daily work merges here
       ├── feature/xyz
       ├── fix/bug-name
       └── hotfix/urgent  (branch from main)
```

### Rules
- **Never push directly to `main`** — merge from `develop` via PR only
- **`develop`** is the default working branch
- **Feature branches** branch from `develop`, merge back via PR
- **Hotfixes** branch from `main`, merge to both `main` and `develop`

---

## Daily Developer Workflow

### 1. Start work
```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### 2. Code and commit
```bash
# Make your changes...

# Run E2E tests before committing
cd electron-app
npm run build
npx playwright test full-regression.e2e.js

# Commit with conventional commit messages
git add .
git commit -m "feat: add new validation mode"
```

### Commit Message Format
| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code change that doesn't add/fix |
| `test:` | Adding or updating tests |
| `docs:` | Documentation only |
| `chore:` | Build/tooling changes |

### 3. Push and create PR
```bash
git push origin feature/my-feature
```
Then on GitHub: **New Pull Request** → `feature/my-feature` → `develop`

### 4. After merge
```bash
git checkout develop
git pull origin develop
git branch -d feature/my-feature
```

---

## Testing

### E2E Tests (Playwright)
```bash
cd electron-app

# Full regression (73 tests, ~2 min)
npm run build
npx playwright test full-regression.e2e.js --reporter=list

# Smoke test (quick sanity check)
npx playwright test smoke.e2e.js

# Specific test file
npx playwright test regression.e2e.js
```

### Python CLI Tests
```bash
cd ..   # project root

# Smoke test (fast)
powershell -File tests/smoke_test.ps1

# Full regression (generates all XML variants)
powershell -File tests/regression_test.ps1
```

### Before Every PR
1. `npm run build` passes
2. `npx playwright test full-regression.e2e.js` — 73/73 pass
3. No console errors in the Electron app

---

## How to Release an Update

### Step 1: Merge develop → main
```bash
git checkout main
git pull origin main
git merge develop
```

### Step 2: Bump version
```bash
cd electron-app
npm version patch      # 1.0.0 → 1.0.1 (bug fix)
# npm version minor    # 1.0.0 → 1.1.0 (new feature)
# npm version major    # 1.0.0 → 2.0.0 (breaking change)
cd ..
```

### Step 3: Commit and tag
```bash
git add .
git commit -m "release: v1.0.1"
git tag v1.0.1
git push origin main --tags
```

### Step 4: Build the installer
```bash
# Bundle Python backend
python build_python_backend.py

# Build frontend + installer
cd electron-app
npm run build
npx electron-builder --win --x64
```
Output: `electron-app/dist-electron/MDES-XML-Studio-Setup-1.0.1.exe`

### Step 5: Create GitHub Release
1. Go to: https://github.com/zmokiem-ui/CRS-xml-generator/releases/new
2. **Tag**: Select `v1.0.1`
3. **Title**: `v1.0.1 — [Brief description]`
4. **Description**: List what changed (features, fixes)
5. **Upload files**:
   - `MDES-XML-Studio-Setup-1.0.1.exe`
   - `latest.yml` (from `dist-electron/`)
6. Click **Publish release**

### Step 6: Sync back to develop
```bash
git checkout develop
git merge main
git push origin develop
```

> **IMPORTANT**: Always upload `latest.yml` alongside the `.exe`. This file tells the auto-updater where to find the new version and its checksum. Without it, auto-updates won't work.

---

## How Auto-Updates Work (For Users)

```
┌─────────────────────────────────────────────────────────────┐
│  User opens MDES XML Studio (v1.0.0)                        │
│       ↓                                                     │
│  App checks GitHub Releases (if auto-update is ON)          │
│       ↓                                                     │
│  Finds v1.0.1 → downloads in background                    │
│       ↓                                                     │
│  Blue banner: "Downloading update v1.0.1... 45%"            │
│       ↓                                                     │
│  Green banner: "Update ready! [Restart Now]"                │
│       ↓                                                     │
│  User clicks Restart → app updates automatically            │
└─────────────────────────────────────────────────────────────┘
```

### User Controls (in Settings → Updates & Version)
- **Auto-update toggle**: ON/OFF — controls whether the app checks on startup
- **Check for Updates button**: Manual check anytime
- **Current version display**: Shows which version is running
- **Restart & Install button**: Appears when update is downloaded

### What Happens Technically
1. `electron-updater` reads `latest.yml` from GitHub Releases
2. Compares version with `package.json` version
3. If newer: downloads the `.exe` in the background
4. Notifies the renderer via IPC → shows banner
5. When user clicks "Restart Now" → `autoUpdater.quitAndInstall()`
6. App closes, installs update, restarts with new version

---

## Project Structure

```
CRS-xml-generator/
├── .github/workflows/
│   └── build-release.yml          # CI: auto-build on tag push
│
├── crs_generator/                 # Python backend
│   ├── cli.py                     # CRS CLI
│   ├── cbc_cli.py                 # CBC CLI
│   ├── fatca_cli.py               # FATCA CLI
│   ├── error_injector.py          # Error injector CLI
│   ├── templates/                 # XML templates
│   └── schemas/                   # XSD validation schemas
│
├── electron-app/                  # Electron + React frontend
│   ├── electron/
│   │   ├── main.js                # Main process (IPC, auto-update)
│   │   └── preload.js             # Context bridge
│   ├── src/
│   │   ├── App.jsx                # Main app component
│   │   ├── components/            # UI components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── i18n/                  # Translations (en, nl, es)
│   │   └── assets/                # Logos (MDES, BLYCE)
│   ├── e2e-tests/                 # Playwright E2E tests
│   ├── build/                     # App icon
│   ├── python-dist/               # Bundled Python exes (gitignored)
│   ├── dist/                      # Vite output (gitignored)
│   └── dist-electron/             # Installer output (gitignored)
│
├── tests/                         # Python CLI regression tests
├── build_python_backend.py        # PyInstaller build script
├── requirements.txt               # Python dependencies
├── DEVELOPER.md                   # This file
└── DEPLOYMENT.md                  # Deployment architecture guide
```

---

## Key Architecture Decisions

### Python Backend
- **Dev mode**: Electron spawns `python -m crs_generator.cli ...`
- **Production**: Electron spawns bundled `crs_cli.exe` (no Python needed)
- Detection is automatic via `isDev` flag in `main.js`

### Auto-Update
- Uses `electron-updater` reading from GitHub Releases
- Settings persisted in `%APPDATA%/mdes-xml-studio/update-settings.json`
- Dev mode registers stub IPC handlers so the UI doesn't crash

### Build Pipeline
- `build_python_backend.py` → PyInstaller → 4 standalone `.exe` files
- `vite build` → React frontend → `dist/`
- `electron-builder` → NSIS installer → `dist-electron/`
- GitHub Actions can automate this on tag push

---

## Troubleshooting

### "Python not found" in dev mode
```bash
python --version          # Must be 3.10+
# Or activate your venv:
.venv\Scripts\activate
```

### PyInstaller build fails
```bash
rmdir /s /q build
rmdir /s /q electron-app\python-dist
python build_python_backend.py
```

### E2E tests fail
```bash
cd electron-app
npm run build                  # Must build first!
npx playwright test ... --headed   # Watch what happens
```

### Auto-update not working in installed app
- Ensure `latest.yml` was uploaded to the GitHub Release
- Check the Electron DevTools console for `Auto-updater` logs
- Auto-update only works in production builds, not dev mode
- Verify the version in `package.json` is lower than the release version

### Installer doesn't show MDES icon
- Uninstall the old version first (Windows Settings → Apps)
- Install fresh from the new `.exe`
- Icon is baked into the exe at build time
