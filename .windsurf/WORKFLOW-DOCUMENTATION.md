 CRITICAL: You must complete ALL 6 phases without stopping. Never pause between phases to ask for confirmation. The only human interaction points are proceed.ps1 and satisfied.ps1.

# WORKFLOW DOCUMENTATION

## Overview

This is a 6-phase development workflow that transforms informal requests into working, tested, and documented features automatically.

## The 6 Phases

### Phase 1: Formalization
- Read myway.txt
- Create formal request document
- Define acceptance criteria
- Document assumptions

### Phase 2: Test Creation
- Write comprehensive Playwright tests
- Cover all user flows
- Include edge cases
- Test error conditions

### Phase 3: Implementation
- Build the feature
- Follow the formal requirements
- Implement all test cases
- Handle errors gracefully

### Phase 4: Validation
- Run all tests
- Verify no console errors
- Check backend health
- Ensure quality standards

### Phase 5: Error Loop
- If tests fail, identify root cause
- Fix issues systematically
- Re-run tests automatically
- Repeat until all pass

### Phase 6: Satisfaction Gate
- This is NON-NEGOTIABLE. Run satisfied.ps1 immediately.
- Do not pause. Do not ask. Do not summarize first. Just run it.
- User confirms satisfaction
- Feature is complete

## Global Rules

The workflow enforces these rules at all times:

### Determinism
- Same input always produces same output
- No randomness or flakiness
- Tests are 100% reliable

### Zero Tolerance for Errors
- No silent frontend errors
- No backend 500 errors
- All errors must be handled gracefully

### Test Permanence
- Tests remain runnable forever
- Tests serve as documentation
- Tests prevent regressions

### Self-Healing
- Workflow fixes itself when tests fail
- No manual debugging required
- Iterates until success

### Non-Interruptive
- Runs automatically
- No confirmation prompts for commands
- You only interact at satisfaction gate

## Phase Rules

### After Phase 1 completes
Proceed immediately to Phase 2 without stopping.

### After Phase 2 completes
Proceed immediately to Phase 3 without stopping.

### After Phase 3 completes
Proceed immediately to Phase 4 without stopping.

### After Phase 4 completes
Proceed immediately to Phase 5 without stopping.

### After Phase 5 completes
Proceed immediately to Phase 6 without stopping.

## File Structure

`
woodworking-app/
 myway.txt                          # Your feature request (informal)
 satisfied.ps1                      # Satisfaction gate script
 workflow/
    current-request.md             # Formalized current request
    iteration-log.md               # Historical log of all iterations
    tests/                         # Tests for current feature
       feature-name.spec.ts
       README.md
    README.md
 tests/
     e2e/                           # Permanent regression tests
         uber-admin.spec.ts
         inventory-management.spec.ts
         logout.spec.ts
`

## Example: Complete Workflow Run

### Step 1: You add request to myway.txt
`
Add a settings page where users can change their password
`

### Step 2: PHASE 1 - Formalization
Creates workflow/current-request.md:
`markdown
# Settings Page Implementation

## Functional Requirements
- FR-1: Display current user email (read-only)
- FR-2: Password change form with old/new/confirm fields
- FR-3: Validate password strength (8+ chars, 1 number, 1 special)
- FR-4: Verify old password before allowing change
- FR-5: Show success message on successful change
- FR-6: Show error message on failure

## Acceptance Criteria
- All Playwright tests pass
- Password is hashed before sending to API
- Old password verification works
- Password strength validation works
`

### Step 3: PHASE 2 - Test Creation
Creates workflow/tests/settings.spec.ts:
`	ypescript
test('should display settings page', async ({ page }) => {
  await page.goto('/settings')
  await expect(page.locator('[data-testid="user-email"]')).toBeVisible()
  await expect(page.locator('[data-testid="password-form"]')).toBeVisible()
})

test('should change password successfully', async ({ page }) => {
  await page.goto('/settings')
  await page.fill('[data-testid="old-password"]', 'oldpass123')
  await page.fill('[data-testid="new-password"]', 'newpass123!')
  await page.fill('[data-testid="confirm-password"]', 'newpass123!')
  await page.click('[data-testid="save-password-button"]')

  await page.waitForResponse(resp =>
    resp.url().includes('/api/settings/password') && resp.status() === 200
  )

  await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
})

test('should validate password strength', async ({ page }) => {
  await page.goto('/settings')
  await page.fill('[data-testid="new-password"]', 'weak')
  await page.click('[data-testid="save-password-button"]')

  await expect(page.locator('[data-testid="error-message"]'))
    .toContainText('Password must be at least 8 characters')
})
`

### Step 4: PHASE 3 - Implementation
Creates the settings page and API endpoint with all required features.

### Step 5: PHASE 4 - Validation
Runs tests automatically:
`
 should display settings page
 should change password successfully (old password verification failed)
 should validate password strength
`

### Step 6: PHASE 5 - Error Loop
Iteration 1:
- Identifies missing old password verification
- Adds verification logic to API
- Re-runs tests  All pass 

### Step 7: PHASE 6 - Satisfaction Gate
`
All tests pass 
No console errors 
No backend errors 

Are you satisfied with this implementation? (y/n):
`

You type "y"  Feature complete!

## Benefits of This Workflow

### For You
- Write features in plain English
- No need to think about edge cases
- No manual testing required
- Confidence that everything works

### For Your Code
- Zero regressions (tests prevent breaking changes)
- Consistent quality
- Self-documenting (tests show how features work)
- Easy to onboard new developers

### For Your Team
- Clear requirements documentation
- Transparent iteration history
- Reproducible builds
- Automated quality assurance

## Advanced Features

### Correlation IDs
Every API request gets a unique x-request-id header for tracing errors across frontend/backend.

### Sentry Integration
All errors are automatically captured and reported to Sentry with context.

### Trace Artifacts
When tests fail, Playwright generates:
- Screenshots
- Videos
- Trace files (replay the test step-by-step)

### Iteration Log
workflow/iteration-log.md keeps a permanent record of:
- What failed
- Why it failed
- How it was fixed
- What was learned

## Common Patterns

### Pattern 1: CRUD Operations
`
myway.txt: "Add product management"

Workflow creates tests for:
- List products
- Create product
- Edit product
- Delete product
- Validate required fields
- Handle API errors
`

### Pattern 2: Authentication Flows
`
myway.txt: "Add login page"

Workflow creates tests for:
- Display login form
- Submit valid credentials
- Show error for invalid credentials
- Redirect after successful login
- Store auth token
- Handle session expiry
`

### Pattern 3: Complex Forms
`
myway.txt: "Add order checkout"

Workflow creates tests for:
- Display form fields
- Validate each field
- Calculate totals
- Submit order
- Show confirmation
- Handle payment errors
`

## Troubleshooting

### "Tests are flaky"
- Workflow uses stable selectors (data-testid)
- Tests wait for elements properly
- Network requests are verified
- This should never happen

### "Feature works but tests fail"
- Tests define what "works" means
- If tests fail, feature isn't complete
- Workflow will iterate until tests pass

### "I want to skip tests"
- Don't do this
- Tests are your safety net
- They prevent regressions
- They document behavior

## Summary

This workflow transforms:
`
"add user profile page"
`

Into:
-  Formal requirements document
-  Comprehensive Playwright tests
-  Working implementation
-  Zero console errors
-  Zero backend errors
-  Permanent regression tests
-  Iteration history
-  User satisfaction confirmation

**All automatically. All deterministically. All self-correcting.**

That's the power of structured development.
