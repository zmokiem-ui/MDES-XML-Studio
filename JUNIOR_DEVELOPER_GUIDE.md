# MDES XML Studio — Junior Developer Guide

## Welcome! 🎉

This guide is for junior developers joining the MDES XML Studio project. We'll cover everything you need to start contributing safely and effectively.

---

## Quick Start (Your First Day)

### 1. Get the Code
```bash
# Clone the repository
git clone https://github.com/zmokiem-ui/CRS-xml-generator.git
cd CRS-xml-generator

# Set up Python
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Set up Electron
cd electron-app
npm install

# Test everything works
npm run build
npm run electron
```

### 2. What You're Looking At
- **Frontend**: React + Vite (in `electron-app/src/`)
- **Backend**: Python CLI tools (in `crs_generator/`)
- **Desktop App**: Electron wraps everything together

---

## The Most Important Rule

### 🚨 NEVER work directly on `main` branch!

`main` is what users download. Any changes here immediately affect real users.

### ✅ ALWAYS work this way:
```bash
# 1. Get the latest work
git checkout develop
git pull origin develop

# 2. Create your own branch
git checkout -b feature/your-name/your-feature

# 3. Do your work...
# (code, test, commit)

# 4. Push and create Pull Request
git push origin feature/your-name/your-feature
# Then on GitHub: New Pull Request → your branch → develop
```

---

## Branch Names (Pick One)

| Type | Format | Example |
|------|--------|---------|
| New feature | `feature/your-name/what-it-does` | `feature/alex/add-csv-export` |
| Bug fix | `fix/your-name/what-you-fix` | `fix/sarah/validation-error` |
| Small tweak | `chore/your-name/what-it-is` | `chore/mike/update-dependencies` |

---

## Making Your First Change

### Step 1: Understand the Task
Ask yourself:
- What exactly needs to change?
- Which files are involved?
- How will I test it?

### Step 2: Make the Change
```bash
# Make your code changes...
# Save the files
```

### Step 3: Test Your Changes
```bash
cd electron-app

# Build the frontend
npm run build

# Run the app
npm run electron

# Test your feature manually
```

### Step 4: Run Automated Tests
```bash
cd electron-app

# Run all E2E tests (takes ~2 minutes)
npx playwright test full-regression.e2e.js --reporter=list

# Quick smoke test (30 seconds)
npx playwright test smoke.e2e.js
```

### Step 5: Commit Your Work
```bash
git add .
git commit -m "feat: add csv export functionality"
```

**Commit message format:**
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for code cleanup
- `test:` for test changes
- `docs:` for documentation

### Step 6: Push and Create PR
```bash
git push origin feature/your-name/your-feature
```
Then on GitHub:
1. Click "New Pull Request"
2. Select your branch → `develop`
3. Fill in the PR description
4. Click "Create Pull Request"

---

## Code Review Process

### What Happens After You Open a PR
1. **Automated tests run** (must pass)
2. **Senior developer reviews** your code
3. **Feedback** might be requested
4. **Merge** once approved

### How to Handle Feedback
- ✅ **Be open to suggestions** - we're here to help you learn
- ✅ **Ask questions** if you don't understand
- ✅ **Make requested changes** and push to your branch
- ✅ **Comment on the PR** when you've made changes

---

## Common Junior Developer Mistakes (and How to Avoid Them)

### 1. Working on the wrong branch
❌ **Wrong**: `git checkout main` and start coding  
✅ **Right**: `git checkout develop` → `git checkout -b feature/my-name/what-im-doing`

### 2. Not testing before committing
❌ **Wrong**: Commit without running tests  
✅ **Right**: Always run `npm run build` and at least one E2E test

### 3. Making huge commits
❌ **Wrong**: 500 lines changed in one commit  
✅ **Right**: Small, focused commits with clear messages

### 4. Breaking the app
❌ **Wrong**: Pushing code that crashes the app  
✅ **Right**: Test your changes manually before committing

---

## Testing Guide (For Junior Devs)

### Manual Testing Checklist
Before you commit, verify:
- [ ] App launches without errors
- [ ] Your feature works as expected
- [ ] Existing features still work
- [ ] No console errors (check DevTools: F12)

### Automated Testing
```bash
cd electron-app

# Quick test (30 seconds)
npx playwright test smoke.e2e.js

# Full test (2 minutes) - run this before big PRs
npx playwright test full-regression.e2e.js
```

### If Tests Fail
1. **Don't panic!** Tests fail for everyone sometimes
2. **Read the error message** carefully
3. **Ask for help** in the PR comments
4. **Don't push broken code** - fix it first

---

## Project Structure (Where Things Live)

```
CRS-xml-generator/
├── electron-app/                  # Frontend + Electron wrapper
│   ├── src/
│   │   ├── App.jsx               # Main app component
│   │   ├── components/           # UI components (buttons, forms, etc.)
│   │   ├── i18n/                 # Translations (English, Dutch, Spanish)
│   │   └── assets/               # Images, logos
│   ├── electron/
│   │   ├── main.js               # Electron main process
│   │   └── preload.js            # Security bridge
│   └── e2e-tests/                # Automated tests
├── crs_generator/                # Python backend
│   ├── cli.py                    # CRS functionality
│   ├── cbc_cli.py                # CBC functionality
│   ├── fatca_cli.py              # FATCA functionality
│   └── error_injector.py         # Error testing
└── tests/                        # Python tests
```

---

## Getting Help (It's Okay to Ask!)

### When to Ask for Help
- You're stuck on a problem for more than 30 minutes
- You're not sure about something
- Tests are failing and you don't know why
- You're unsure about the best way to implement something

### How to Ask
1. **Check the documentation first** (`DEVELOPER.md`, this guide)
2. **Search existing issues** on GitHub
3. **Ask in your PR comments** (if related to your work)
4. **Message the team** on your communication platform

### Good Questions vs Bad Questions
❌ **Bad**: "It doesn't work"  
✅ **Good**: "I'm trying to add CSV export. I added the button but the export function isn't being called. Here's what I tried..."

---

## Your First Week Checklist

- [ ] Set up your development environment
- [ ] Read through `DEVELOPER.md`
- [ ] Try making a small change (like updating text)
- [ ] Run the full test suite successfully
- [ ] Create your first Pull Request
- [ ] Get your first PR merged 🎉

---

## Learning Resources

### If you're new to:
- **React**: Start with the official React tutorial
- **Electron**: Read the Electron documentation
- **Playwright (testing)**: Check the Playwright docs
- **Git**: Use GitHub's interactive tutorials

### Recommended Learning Path
1. **Week 1**: Get comfortable with the codebase
2. **Week 2**: Make small UI changes
3. **Week 3**: Try fixing a simple bug
4. **Week 4**: Add a small feature

---

## You're Part of the Team! 🚀

We're excited to have you contributing to MDES XML Studio. Remember:
- **Mistakes are how we learn**
- **Ask questions early and often**
- **Focus on writing clean, working code**
- **Test everything before committing**

Welcome aboard! If you have any questions, just ask.
