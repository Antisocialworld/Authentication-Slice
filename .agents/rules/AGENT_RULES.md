# Agent Rules — Product Engineering Bootcamp, Four Build Assessments

These rules apply to every task in this repository. Read this file
before writing any code.

## Git

- Never run a git command that commits, stages, pushes, or creates a
  branch without explicit authorization from me first.
- You may run read-only git commands (status, diff, log) freely.
- Commit messages, when authorized, must describe what changed, not
  "update" or "fix". Commit history is graded on showing real
  incremental work, so never squash multiple unrelated changes into
  one commit, and never ask to commit everything at once.

## Scope discipline

- Build only what is listed under "What to build" for the current
  assessment. If something is not explicitly asked for, do not add
  it, even if it seems like an obvious improvement.
- Every assessment has a "Do not build" list. Treat it as a hard
  boundary, not a suggestion. If you are unsure whether something
  falls inside or outside the brief, stop and ask rather than guess.
- The placeholder dashboard is deliberately close to empty. Do not
  add styling, navigation, or content beyond what the brief
  specifies.

## Environment variables and secrets

- API keys and secrets are written into `.env` by hand, by me, never
  generated or written into `.env` by you.
- Never write a real key or secret directly into any source file.
- Always create and maintain a `.env.example` with commented
  placeholders describing what each variable is and where it comes
  from. Never put a real value in `.env.example`.
- Confirm `.env` is listed in `.gitignore` before any commit is
  authorized.

## Database and migrations

- Migrations are forward-only. Never write a migration that deletes
  or undoes existing data as a way to "fix" a previous migration.
- Every constraint (unique, check, foreign key, not-null) must be a
  deliberate choice you can justify, not a default you didn't think
  about. If you add one, tell me what invalid state it prevents.

## Documentation is not optional

- `DOCUMENTATION.md` is written progressively, not at the end. As
  you implement each concept, note what you did, what you chose
  against, and why, before moving to the next thing. Do not wait
  until the slice is finished to reconstruct this from memory.
- Section 6, "What Went Wrong", requires real problems with real
  investigations. When something breaks or behaves unexpectedly
  while building, tell me immediately rather than quietly working
  around it. That moment is documentation material, not just a
  bug to fix and forget.

## Evidence

- Every "Prove it works" requirement needs an actual screenshot,
  actual curl output, or actual database query result, not a
  description of what should happen. If you cannot produce the
  actual evidence, say so rather than describing the expected
  behaviour as if it were confirmed.

## Sequencing

- Work through the required behaviours in the order they appear in
  "Behaviour", not in whichever order is easiest to build. Each step
  should be verified working before the next one is built on top of
  it.