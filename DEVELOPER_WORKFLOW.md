# MDES XML Studio - Developer Workflow

## Repository Structure

| Repo | Visibility | Purpose |
|------|-----------|---------|
| `zmokiem-ui/CRS-xml-generator` | **Private** | Source code, development |
| `rramratan-ai/MDES-XML-Studio-releases` | **Public** | Downloads & auto-updates |

---

## Daily Development

### 1. Setup (First Time Only)
```bash
git clone https://github.com/zmokiem-ui/CRS-xml-generator.git
cd CRS-xml-generator/electron-app
npm install
```

### 2. Run the App Locally
```bash
cd electron-app
npm run electron:dev
```

### 3. Make Changes & Push
```bash
git add .
git commit -m "feat: description of your change"
git push origin main
```

---

## Releasing a New Version

### Step 1: Bump the Version
Edit `electron-app/package.json` and update the `"version"` field:
- **Bug fix:** `1.0.0` → `1.0.1`
- **New feature:** `1.0.0` → `1.1.0`
- **Major change:** `1.0.0` → `2.0.0`

### Step 2: Commit the Version Bump
```bash
git add electron-app/package.json
git commit -m "release: v1.1.0"
git push origin main
```

### Step 3: Create & Push a Tag
```bash
git tag v1.1.0
git push origin v1.1.0
```

### Step 4: Wait for GitHub Actions
- GitHub Actions automatically:
  1. Builds the Python backend (4 executables)
  2. Builds the Electron installer (EXE)
  3. Publishes the EXE to the public releases repo
- Monitor: https://github.com/zmokiem-ui/CRS-xml-generator/actions
- Release appears: https://github.com/rramratan-ai/MDES-XML-Studio-releases/releases

### Step 5: Done!
- Users with the app installed get auto-update notifications
- New users can download from the releases page

---

## Building Locally (Optional)

If you need to test the built EXE locally before releasing:

### Build Python Backend
```bash
pip install pyinstaller
python build_python_backend.py
```

### Build Electron Installer
```bash
cd electron-app
npm run electron:build
```

The installer will be at: `electron-app/dist-electron/MDES-XML-Studio-Setup-X.X.X.exe`

---

## Commit Message Convention

Use prefixes for clear history:

| Prefix | When to Use | Example |
|--------|------------|---------|
| `feat:` | New feature | `feat: add CBC correction mode` |
| `fix:` | Bug fix | `fix: app icon not showing` |
| `docs:` | Documentation | `docs: update README` |
| `refactor:` | Code cleanup | `refactor: extract helper functions` |
| `release:` | Version bump | `release: v1.1.0` |

---

## Auto-Update Flow

```
Developer pushes tag (v1.1.0)
        ↓
GitHub Actions builds EXE (private repo)
        ↓
EXE + latest.yml published to public releases repo
        ↓
User opens MDES XML Studio
        ↓
App checks public repo for latest.yml
        ↓
If newer version found → downloads in background
        ↓
User sees "Update available" notification
        ↓
User clicks Install → app restarts with new version
```

---

## Important Links

- **Source code:** https://github.com/zmokiem-ui/CRS-xml-generator (private)
- **Releases:** https://github.com/rramratan-ai/MDES-XML-Studio-releases/releases
- **Build status:** https://github.com/zmokiem-ui/CRS-xml-generator/actions
- **Latest download:** https://github.com/rramratan-ai/MDES-XML-Studio-releases/releases/latest

---

## Secrets & Tokens

| Secret | Location | Purpose |
|--------|----------|---------|
| `RELEASE_TOKEN` | Private repo → Settings → Secrets | PAT for publishing to public releases repo |

If the token expires, create a new one at https://github.com/settings/tokens?type=beta with **Contents: Read and write** permission on the `MDES-XML-Studio-releases` repo.
