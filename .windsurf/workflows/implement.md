---
description: Implement feature with test-first, self-correcting workflow
---

# Structured Development Workflow

This workflow implements features using a deterministic, test-first, self-correcting approach.

## Prerequisites

1. Feature request must be in `myway.txt`
2. Dev server should be running (`npm run dev`)
3. Database should be accessible

## Workflow Steps

### PHASE 1: Request Formalization

Read the feature request from `.windsurf/myway.txt` and create a formal specification.

1. Read `.windsurf/myway.txt` to understand the informal request
2. Create or update `.windsurf/current-request.md` with:
   - Clear feature description
   - Functional requirements (FR-1, FR-2, etc.)
   - Non-functional requirements (performance, security)
   - Edge cases to handle
   - Acceptance criteria (how we know it's done)
   - Expected frontend behavior
   - Expected backend behavior
   - Known risks

**Example:**
```
myway.txt: "add user settings page"

becomes →

workflow/current-request.md:
- FR-1: Display user settings form
- FR-2: Allow editing email, name, password
- FR-3: Validate email format
- FR-4: Show success/error messages
- Edge case: Handle missing user data
- Acceptance: All Playwright tests pass
```

---

### PHASE 1.5: Review and Proceed

**REVIEW GATE - User confirms formalized request**

After PHASE 1 completes, run proceed.ps1 to allow user review.

// turbo
1. Run proceed script:
```bash
.windsurf\proceed.ps1
```

2. Script displays the formalized `current-request.md`

3. User reviews the requirements and decides:
   - **If satisfied** → Answer "y" to proceed to PHASE 2
   - **If modifications needed** → Answer "n", modify `current-request.md`, run proceed.ps1 again

**Purpose:**
- Gives user chance to review formalized requirements
- Allows modifications before tests are created
- Prevents wasted effort on incorrect specifications
- Ensures alignment between user intent and formal requirements

---

### PHASE 2: Test-First Design

Create Playwright tests BEFORE writing any implementation code.

1. Create test file in `tests/workflow/[feature-name]-[YYYY-MM-DD].spec.ts`
   - Use current date in filename for tracking
   - Example: `tests/workflow/quick-notes-2026-02-17.spec.ts`
2. Tests must:
   - Run in headed mode (visible browser)
   - Use stable selectors (`data-testid` attributes)
   - Assert UI state changes
   - Verify network requests (endpoint + status)
   - Fail on console errors
   - Fail on HTTP 4xx/5xx responses
   - Be re-runnable at any time

**Test template:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test('should display feature page', async ({ page }) => {
    await page.goto('/feature-route')
    await expect(page.locator('[data-testid="main-element"]')).toBeVisible()
  })

  test('should perform main action', async ({ page }) => {
    await page.goto('/feature-route')
    await page.click('[data-testid="action-button"]')
    
    // Verify API call
    await page.waitForResponse(resp => 
      resp.url().includes('/api/endpoint') && resp.status() === 200
    )
    
    // Verify UI update
    await expect(page.locator('[data-testid="result"]')).toBeVisible()
  })
})
```

---

### PHASE 3: Implementation

Implement the feature to make tests pass.

1. Create necessary files:
   - Frontend: `app/[route]/page.jsx` (client component if interactive)
   - Backend: `app/api/[endpoint]/route.js` (if needed)
   - Models: Update `backend/models/` (if needed)

2. Add all required `data-testid` attributes
3. Ensure zero errors:
   - No console errors
   - No unhandled promise rejections
   - No hydration errors
   - No server 500 responses

**Frontend template:**
```jsx
'use client'
import { useState } from 'react'

export default function FeaturePage() {
  const [data, setData] = useState(null)
  
  const handleAction = async () => {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* data */ })
    })
    
    if (response.ok) {
      const result = await response.json()
      setData(result)
    }
  }
  
  return (
    <div>
      <h1>Feature Title</h1>
      <button data-testid="action-button" onClick={handleAction}>
        Action
      </button>
      <div data-testid="result">{data?.value}</div>
    </div>
  )
}
```

**Backend template:**
```javascript
import { NextResponse } from 'next/server'
import { requireAuth } from '../../lib/auth.js'

export async function POST(request) {
  try {
    const user = await requireAuth(request)
    const data = await request.json()
    
    // Implement logic
    const result = { /* result */ }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

### PHASE 4: Automated Validation

Run tests automatically in HEADED MODE (visible browser) and capture results.

// turbo
1. Run Playwright tests in headed mode:
```bash
npm run test:workflow
```

**Note:** Tests run with visible browser (headless: false) and slowMo: 250ms for visibility.

2. **Auto-detect test failures:**
   - Monitor test exit code
   - If exit code != 0, tests failed
   - Append failure summary to myway.txt
   - satisfied.ps1 will auto-continue workflow
   - No manual intervention needed

3. **Monitor for errors - CRITICAL:**
   - **ALWAYS check command exit codes** - if exit code is not 0, the command failed
   - **Read error messages carefully** - they tell you exactly what's wrong
   - **Fix errors immediately** - do not proceed if commands fail
   - **Common errors to watch for:**
     - Migration errors (wrong table names, schema issues)
     - Test file not found (wrong path)
     - Module errors (wrong import paths)
     - Database connection errors
   - **When a command fails:**
     1. Read the full error message
     2. Identify the root cause
     3. Fix the issue
     4. Re-run the command
     5. **WAIT for command to complete** - do not proceed until exit code is 0
     6. Verify it succeeds before proceeding
   - **CRITICAL: satisfied.ps1 must only run after ALL commands complete successfully**
     - Check exit codes of all commands
     - Fix any errors before running satisfied.ps1
     - Do not run satisfied.ps1 yet if any command failed, keep fixing and run it after all commands are fixed

4. Check results:
   - ✅ All tests pass → Proceed to PHASE 6
   - ❌ Any test fails → Auto-append failures to myway.txt, proceed to PHASE 5
   - ❌ Command error → Fix command/files and retry
   
**Auto-continue behavior:**
- When tests fail, Cascade appends failure details to myway.txt
- satisfied.ps1 detects failures and auto-answers "no"
- Workflow continues automatically to PHASE 5
- No manual intervention required

---

### PHASE 5: Error Translation Loop

When tests fail, analyze and fix systematically.

1. Analyze the failure:
   - Read error message
   - Check screenshots in `test-results/`
   - Review trace files if available

2. Determine root cause:
   - Missing functionality?
   - Wrong selector?
   - API error?
   - Timing issue?

3. Update `.windsurf/current-request.md` with iteration findings:
```markdown
### Iteration Findings

#### Iteration 1 (2026-02-17)
**Failure:** Element not found
**Root Cause:** Missing data-testid attribute
**Fix Implemented:** Added data-testid to button
**Preventive Test:** None needed
```

4. Fix the code
5. Re-run tests (go back to PHASE 4)
6. Repeat until all tests pass

---

### PHASE 6: Satisfaction Gate

When all tests pass, confirm completion.

// turbo
1. Run satisfaction script:
```bash
.windsurf\satisfied.ps1
```

2. Ask user: "Are you satisfied with this implementation?"

3. If YES:
   - Feature complete
   - Tests remain for regression testing
   - Workflow ends

4. If NO:
   - User updates `.windsurf/myway.txt` with what's missing
   - Restart from PHASE 1

---

## Global Rules

- **Deterministic:** Same input = same output
- **Zero errors:** No silent failures, no 500 errors
- **Test permanence:** Tests remain runnable forever
- **Self-healing:** Workflow fixes itself when tests fail
- **Non-interruptive:** Runs automatically, no manual steps
- **Satisfaction gate is mandatory:** ALWAYS run `.windsurf\satisfied.ps1` at the end of EVERY workflow execution - this step can NEVER be skipped
- **No premature completion:** Do NOT return control to chat until satisfied.ps1 has been executed and user has responded

---

## File Structure

```
.
├── .windsurf/
│   ├── myway.txt                # Feature requests (informal)
│   ├── current-request.md       # Formalized current request
│   ├── iteration-log.md         # Historical log
│   ├── satisfied.ps1            # Satisfaction gate script
│   ├── WORKFLOW-DOCUMENTATION.md # Complete documentation
│   ├── features/                # Feature documentation
│   │   └── [feature-name].md    # Functional & technical docs
│   └── workflows/
│       └── implement.md         # This workflow
├── tests/
│   ├── workflow/                # Workflow-generated tests (timestamped)
│   │   ├── README.md
│   │   └── [feature]-[date].spec.ts
│   └── e2e/                     # Manual/system tests
│       └── [test].spec.ts
└── app/                         # Application code
    ├── [route]/page.jsx
    └── api/[endpoint]/route.js
```

---

## Example: Complete Run

**Input (.windsurf/myway.txt):**
```
Add a notes page where users can create and view notes
```

**PHASE 1 - Formalization:**
- Creates `.windsurf/current-request.md` with FR-1 through FR-5
- Defines acceptance criteria

**PHASE 2 - Tests:**
- Creates `.windsurf/features/notes.md` (documentation)
- Creates `tests/e2e/notes.spec.ts` with 5 tests

**PHASE 3 - Implementation:**
- Creates `app/notes/page.jsx`
- Creates `app/api/notes/route.js`
- Adds all data-testid attributes

**PHASE 4 - Validation:**
- Runs tests → 4/5 pass, 1 fails

**PHASE 5 - Error Loop:**
- Iteration 1: Fix missing API endpoint
- Re-run → All pass ✅

**PHASE 6 - Satisfaction:**
- Run `.windsurf\satisfied.ps1`
- User confirms → Complete!

---

## Tips

- Keep features small and focused
- Write tests before code (test-first)
- Use descriptive data-testid values
- Handle all edge cases
- Document iterations in current-request.md

---

## Troubleshooting

**Tests are flaky:**
- Use stable selectors (data-testid)
- Add proper waits for elements
- Verify network requests complete

**Feature works but tests fail:**
- Tests define what "works" means
- If tests fail, feature isn't complete
- Fix code to make tests pass

**Want to skip tests:**
- Don't do this
- Tests prevent regressions
- Tests document behavior
