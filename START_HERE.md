# Start Here — MDES XML Studio

Quick-reference index for contributors and maintainers. Existing docs are kept as-is; this file points you to the right one.

---

## Who are you?

### 🆕 New Developer
1. **[README.md](README.md)** — Project overview, features, Python-only quick start
2. **[DEVELOPER.md](DEVELOPER.md)** — Full dev setup (Python + Electron), branch strategy, release flow
3. **[electron-app/README.md](electron-app/README.md)** — Electron architecture, IPC layer, npm scripts
4. **[JUNIOR_DEVELOPER_GUIDE.md](JUNIOR_DEVELOPER_GUIDE.md)** — Step-by-step onboarding for junior devs

### 🧪 Tester / QA
1. **[E2E_TESTING.md](E2E_TESTING.md)** — Playwright E2E setup and test suite
2. **[tests/](tests/)** — Existing test files (E2E + scenarios)

### 📦 Releaser
1. **[DEVELOPER_WORKFLOW.md](DEVELOPER_WORKFLOW.md)** — Repo structure, CI, release process
2. **[CREATE_RELEASE.md](CREATE_RELEASE.md)** — Step-by-step GitHub release creation
3. **[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)** — Pre-release verification checklist
4. **[BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md)** — Building the standalone `.exe`
5. **[UPDATE_SYSTEM.md](UPDATE_SYSTEM.md)** — Auto-update system documentation

### 🔒 Security / Ops
1. **[SECURITY.md](SECURITY.md)** — Security policy, repository visibility
2. **[MAKE_REPOSITORY_PUBLIC.md](MAKE_REPOSITORY_PUBLIC.md)** — How to make the repo public
3. **[MAKE_REPOSITORY_PRIVATE.md](MAKE_REPOSITORY_PRIVATE.md)** — How to make the repo private
4. **[GITHUB_SETUP_CHECKLIST.md](GITHUB_SETUP_CHECKLIST.md)** — GitHub repo configuration

---

## First Run (local dev)

```powershell
# 1. Clone & enter
git clone https://github.com/zmokiem-ui/MDES-XML-Studio.git
cd MDES-XML-Studio

# 2. Python backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Electron frontend
cd electron-app
npm install

# 4. Run dev mode
npm run electron:dev
```

> Canonical source: **[DEVELOPER.md](DEVELOPER.md)** § Quick Start

---

## Day-to-Day Workflow

| Task | Command | Docs |
|------|---------|------|
| Dev mode | `cd electron-app && npm run electron:dev` | [electron-app/README.md](electron-app/README.md) |
| Build frontend | `cd electron-app && npm run build` | [electron-app/README.md](electron-app/README.md) |
| Build installer | `cd electron-app && npm run electron:build` | [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) |
| Run E2E tests | `cd electron-app && npx playwright test` | [E2E_TESTING.md](E2E_TESTING.md) |
| Python CLI | `python -m crs_generator.wizard` | [README.md](README.md) |

> Canonical source: **[DEVELOPER.md](DEVELOPER.md)** § Daily Workflow

---

## Testing Matrix

| Layer | Scope | Speed | Location |
|-------|-------|-------|----------|
| **Unit (Python)** | Config validation, data invariants, CLI args | Fast | `tests/unit/` *(planned)* |
| **E2E (Playwright)** | Full UI flows in Electron | Slow | `tests/e2e/` |
| **Scenario tests** | Python generation scenarios | Moderate | `test_scenarios.py` |

> Canonical source: **[E2E_TESTING.md](E2E_TESTING.md)**

---

## Release Flow

1. Bump version in `electron-app/package.json`
2. Update changelog in `electron-app/src/i18n/translations.js` (EN/NL/ES)
3. Build: `cd electron-app && npm run electron:build`
4. Create GitHub release, upload `.exe` + `latest.yml`
5. Verify auto-updater detects new version

> Canonical source: **[CREATE_RELEASE.md](CREATE_RELEASE.md)** + **[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)**

---

## Troubleshooting

| Problem | Where to look |
|---------|---------------|
| Build fails | [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) |
| Icon not showing | [DEPLOYMENT.md](DEPLOYMENT.md) § Icon configuration |
| Auto-update 404 | [UPDATE_SYSTEM.md](UPDATE_SYSTEM.md) — check filename matches `latest.yml` |
| E2E tests fail | [E2E_TESTING.md](E2E_TESTING.md) § Troubleshooting |
| Language/encoding issues | [LANGUAGE_SUPPORT.md](LANGUAGE_SUPPORT.md) |
| Template system | [TEMPLATE_LIBRARY_GUIDE.md](TEMPLATE_LIBRARY_GUIDE.md) |

---

## Feature Documentation

| Feature | Canonical Doc |
|---------|--------------|
| Multi-language data generation | [LANGUAGE_SUPPORT.md](LANGUAGE_SUPPORT.md) |
| Language implementation details | [LANGUAGE_FEATURE_SUMMARY.md](LANGUAGE_FEATURE_SUMMARY.md) |
| Template library system | [TEMPLATE_LIBRARY_GUIDE.md](TEMPLATE_LIBRARY_GUIDE.md) |
| Template implementation details | [TEMPLATE_SYSTEM_SUMMARY.md](TEMPLATE_SYSTEM_SUMMARY.md) |
| Auto-update system | [UPDATE_SYSTEM.md](UPDATE_SYSTEM.md) |
| Bug reporting (v1.2.0) | In-app: Settings → Report a Bug |

---

## Doc Inventory

> Each topic has one **canonical source**. Other docs may reference it but should not duplicate content.

| Topic | Canonical Source | Also mentioned in |
|-------|-----------------|-------------------|
| Project overview | README.md | DEVELOPER.md |
| Dev setup | DEVELOPER.md | electron-app/README.md, JUNIOR_DEVELOPER_GUIDE.md |
| Electron architecture | electron-app/README.md | DEVELOPER.md |
| E2E testing | E2E_TESTING.md | — |
| Release process | CREATE_RELEASE.md | DEVELOPER_WORKFLOW.md, RELEASE_CHECKLIST.md |
| Build instructions | BUILD_INSTRUCTIONS.md | DEPLOYMENT.md |
| Auto-update | UPDATE_SYSTEM.md | — |
| Security | SECURITY.md | — |
| Repo visibility | MAKE_REPOSITORY_PUBLIC.md | MAKE_REPOSITORY_PRIVATE.md |
| Language generation | LANGUAGE_SUPPORT.md | LANGUAGE_FEATURE_SUMMARY.md, LANGUAGE_INTEGRATION_COMPLETE.md |
| Template system | TEMPLATE_LIBRARY_GUIDE.md | TEMPLATE_SYSTEM_SUMMARY.md |
| GitHub config | GITHUB_SETUP_CHECKLIST.md | — |
| Deployment | DEPLOYMENT.md | BUILD_INSTRUCTIONS.md |
