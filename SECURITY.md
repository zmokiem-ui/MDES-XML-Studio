# Security Policy

## Repository Visibility

**UPDATE: Repository Recommended to be PUBLIC**

After security audit, the repository can safely be made public because:
- No hardcoded secrets found in codebase
- All sensitive data uses environment variables
- .gitignore properly excludes sensitive files
- Git history is clean of sensitive data

**Making the repository public allows:**
- Users to download releases without authentication
- Auto-updater to work seamlessly
- Community contributions and issue reporting
- Increased project visibility

See `MAKE_REPOSITORY_PUBLIC.md` for instructions.

## Making the Repository Private

### Steps to Secure the Repository:

1. **Navigate to Repository Settings**
   - Go to: https://github.com/zmokiem-ui/MDES-XML-Studio/settings

2. **Change Visibility**
   - Scroll down to the "Danger Zone" section
   - Click "Change visibility"
   - Select "Make private"
   - Type the repository name to confirm
   - Click "I understand, make this repository private"

3. **Verify Privacy**
   - Confirm the repository is no longer publicly accessible
   - Check that the repository shows a "Private" badge

## Public Releases

Even with a private repository, GitHub Releases can remain public:

1. **Release Binaries Stay Public**
   - Compiled executables (.exe files) in GitHub Releases remain publicly downloadable
   - Users can download releases without accessing the source code

2. **Auto-Updater Compatibility**
   - The electron-updater will continue to work with public releases
   - No changes needed to the update mechanism

## Environment Variables

The following environment variables are used and should NEVER be committed to the repository:

### Required for Bug Reporting Feature
- `GH_TOKEN` - GitHub Personal Access Token for creating issues
  - Required scopes: `repo` (for private repos) or `public_repo` (for public repos)
  - Set this in your local environment or CI/CD secrets
  - Never hardcode this value

### Setting Environment Variables

**Windows (PowerShell):**
```powershell
$env:GH_TOKEN = "your_github_token_here"
```

**Windows (Persistent):**
```powershell
[System.Environment]::SetEnvironmentVariable('GH_TOKEN', 'your_token_here', 'User')
```

**Linux/macOS:**
```bash
export GH_TOKEN="your_github_token_here"
```

## Protected Files

The following file patterns are excluded from git via `.gitignore`:

### Secrets & Credentials
- `.env`, `.env.local`, `.env.*.local`
- `*.key`, `*.pem`, `*.p12`, `*.pfx`
- `secrets.json`, `credentials.json`, `auth.json`
- `*-secrets.json`, `*.secret`

### Build Artifacts
- `dist/`, `dist-electron/`, `out/`
- `*.exe`, `*.dmg`, `*.AppImage`
- `electron-app/python-dist/`

### Development
- `node_modules/`, `.venv/`, `venv/`
- `.vscode/`, `.idea/`
- `windsurf/` (workflow files)

## Security Best Practices

### For Developers

1. **Never commit secrets**
   - Use environment variables for all sensitive data
   - Review changes before committing
   - Use `git diff` to check for accidental secrets

2. **Review .gitignore**
   - Ensure all sensitive files are listed
   - Add new patterns as needed
   - Never use `git add -f` to force-add ignored files

3. **Check git history**
   - If secrets were accidentally committed, they must be removed from history
   - Use `git filter-branch` or BFG Repo-Cleaner to purge sensitive data
   - Force push after cleaning (coordinate with team)

4. **Use GitHub Secrets for CI/CD**
   - Store tokens in GitHub repository secrets
   - Never log secret values in CI/CD output
   - Rotate tokens regularly

### For Users

1. **Download only from official releases**
   - Only download executables from GitHub Releases page
   - Verify the release is from the official repository
   - Check file signatures if available

2. **Report security issues**
   - Use the bug reporting feature in the app
   - Or email security concerns directly to maintainers
   - Do not publicly disclose security vulnerabilities

## Incident Response

If sensitive data is accidentally exposed:

1. **Immediate Actions**
   - Rotate all exposed credentials immediately
   - Revoke compromised API tokens
   - Change affected passwords

2. **Repository Cleanup**
   - Remove sensitive data from current codebase
   - Purge from git history if committed
   - Force push cleaned history

3. **Notification**
   - Notify team members of the exposure
   - Document the incident
   - Review security practices to prevent recurrence

## Audit Log

### Security Changes
- **2024-03-02**: Enhanced .gitignore with additional secret patterns
- **2024-03-02**: Created SECURITY.md documentation
- **2024-03-02**: Documented repository privacy requirements
- **2024-03-02**: Verified no hardcoded secrets in codebase

## Contact

For security concerns, please use the bug reporting feature in the application or contact the repository maintainers directly.

**Do not publicly disclose security vulnerabilities.**
