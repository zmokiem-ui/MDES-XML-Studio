# Context Efficiency Rule

Always read `AGENTS.md` and `.windsurf/current-request.md` first before continuing work.

## Primary behavior
- Continue the current task from saved state.
- Do not restart planning unless the task changed.
- Keep responses concise and execution-focused.
- Avoid repeating large summaries that are already captured in the saved state.

## Task handling
- Prefer one clear next step at a time.
- Make focused edits only in relevant files.
- Avoid unrelated exploration.
- Use existing project patterns instead of inventing new structure unless required.

## Continuity
- Treat `.windsurf/current-request.md` as the active task memory.
- Before large edits or multi-step work, ensure the current request file reflects:
  - goal
  - relevant files
  - constraints
  - progress
  - next step
- If interrupted, resume from that file instead of asking the user to restate context.

## Communication
- Be direct.
- Be brief.
- State uncertainty clearly when something was not verified.
- Do not claim completion without validation or clear explanation.