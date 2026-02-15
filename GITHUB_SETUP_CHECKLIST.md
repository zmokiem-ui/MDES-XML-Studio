# GitHub Setup Checklist for MDES XML Studio

## Current Status ✅

- ✅ Repository exists: `https://github.com/zmokiem-ui/CRS-xml-generator`
- ✅ Remote configured correctly
- ✅ Main branch exists and is default
- ❌ **Missing**: `develop` branch
- ❌ **Missing**: Branch protection rules
- ❌ **Missing**: GitHub Actions workflow (auto-build)

---

## What to Set Up on GitHub

### 1. Create `develop` Branch
```bash
# From your local repo:
git checkout -b develop
git push origin develop
```

### 2. Set Up Branch Protection (Crucial!)

Go to: **GitHub → Your Repo → Settings → Branches → Add branch protection rule**

#### Protect `main` branch:
- **Branch name pattern**: `main`
- ✅ **Require pull request reviews before merging**
  - Required approvals: **1**
  - Dismiss stale PR approvals: ✅
- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date: ✅
- ✅ **Require conversation resolution before merging**
- ❌ **Do NOT** check "Include administrators" (unless you want to enforce rules on yourself too)
- ✅ **Restrict pushes that create files**
- ✅ **Do not allow bypassing the above settings**

#### Why this matters:
- Prevents accidental direct pushes to `main`
- Ensures code review before production changes
- Maintains code quality

### 3. Set Up Default Branch
Go to: **Settings → Branches → Default branch**
- Change from `main` to `develop`
- This way new contributors default to working on `develop`

### 4. Enable GitHub Actions (Auto-Build)
The `.github/workflows/build-release.yml` file is already in your repo. It will:
- Auto-build installers when you push version tags
- Upload installers to GitHub Releases
- Enable auto-updates for users

### 5. Add Repository Description
Go to: **Your repo → Settings → General**
- **Description**: "MDES XML Studio - Professional XML generation for CRS, FATCA & CBC reporting"
- **Website**: (if you have one)
- **Topics**: `electron`, `react`, `python`, `xml`, `crs`, `fatca`, `cbc`, `tax-reporting`

---

## Team Management (When You Add Team Members)

### 1. Invite Collaborators
Go to: **Settings → Collaborators and teams → People**
- Add team members as **Collaborators**
- Give them **Write** access (not Admin)

### 2. Create Teams (Optional but Recommended)
Go to: **Settings → Collaborators and teams → Teams**
- **Developers**: Can push to branches, open PRs
- **Maintainers**: Can merge PRs, manage releases

---

## Security Settings

### 1. Dependabot Alerts
Go to: **Settings → Code security and analysis → Dependabot alerts**
- ✅ **Enable Dependabot alerts** (finds vulnerable dependencies)
- ✅ **Enable Dependabot security updates** (auto-creates PRs for security fixes)

### 2. Security Policies
Go to: **Settings → Security → Security policies**
- Set up a security policy if you want users to report security issues privately

---

## Workflow After Setup

### For Junior Developers:
1. Clone repo
2. Work on `develop` (via feature branches)
3. Open PRs to `develop`
4. Senior devs review and merge

### For Releases:
1. Merge `develop` → `main` (by maintainers only)
2. Push version tag
3. GitHub Actions auto-builds installer
4. Create GitHub Release
5. Users get auto-updated

---

## Verification Checklist

After setting up GitHub, verify:

- [ ] `develop` branch exists and is default
- [ ] `main` branch is protected (requires PR review)
- [ ] You can't push directly to `main` (test this!)
- [ ] GitHub Actions workflow is enabled
- [ ] Repository description and topics are set
- [ ] Dependabot alerts are enabled
- [ ] Team members have correct permissions

---

## Common Issues & Fixes

### Issue: "Can't push to protected branch"
**Solution**: This is intentional! Create a PR instead.

### Issue: "GitHub Actions not running"
**Solution**: Check that the workflow file is in `.github/workflows/` and is enabled in repo settings.

### Issue: "New contributors can't push"
**Solution**: Add them as Collaborators with Write access.

---

## Need Help?

If you're unsure about any of these settings:
1. Ask in the repo discussions
2. Check GitHub's documentation
3. Start with basic protections and add more as needed

Remember: **It's easier to add protections later than to remove broken code from `main`!**
