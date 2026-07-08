# AGENTS.md

## Project Overview
This repository contains the CRS test data generator application.

Main areas:
- Python generator logic
- Electron app integration
- Build/release scripts
- Automated tests

## Working Style
- Continue the active task instead of restarting analysis.
- Keep responses compact and action-oriented.
- Prefer small, targeted changes over broad refactors.
- Do not modify unrelated files.
- Preserve existing behavior unless the current task explicitly requires a change.
- Do not commit, push, or create branches unless explicitly asked.
- Ask before making breaking, risky, or architecture-level changes.

## Code Change Rules
- Keep edits minimal and focused on the requested task.
- Reuse existing patterns and structure where possible.
- Avoid introducing unnecessary dependencies.
- Avoid large-scale renames or file moves unless required.
- When fixing a bug, patch the cause directly and add a focused test if appropriate.

## Testing Rules
- Run the smallest relevant test(s) first.
- Prefer targeted validation before broad full-suite runs.
- If tests are expensive, explain what should be run and why.
- Do not claim something is working unless it was verified or the uncertainty is clearly stated.

## Communication Rules
- State the next concrete step before large changes.
- Summarize progress briefly.
- Avoid repeating long plans unless the task changed.

## Pause Behavior
When pausing after a chunk of work, end with:
- what was completed
- the next concrete step
- whether you are blocked or can continue






## Testing Policy
- When code is changed, run the smallest relevant validation first.
- For user-facing or logic changes, run relevant smoke tests before claiming the work is complete.
- For broader or risky changes, run relevant regression tests before claiming the work is complete.
- If a test fails because of the change, investigate and fix the issue before marking the task done.
- When new functionality is added or behavior changes, add or update focused tests that cover the new behavior.
- Do not claim success unless the relevant tests were run or the reason they were not run is clearly stated.
- Never hardcode secrets or tokens in code, prompts, or tracked files.