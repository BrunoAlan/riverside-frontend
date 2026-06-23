# backend-lookup Subagent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only Claude Code subagent (`.claude/agents/backend-lookup.md`) that answers natural-language questions about the sibling `riverside-mvp-backend` repo with `file:line` citations and drift flags.

**Architecture:** A single subagent definition file. YAML frontmatter declares the agent name, when-to-use description, and a read-only tool set (`Read, Grep, Glob, Bash`). The system-prompt body bakes in the backend repo path, a knowledge map of where each concern lives, an output contract, and a "code beats docs" rule. Verification is behavioral: dispatch the agent with three probe questions and confirm it reaches the expected backend files and surfaces the known doc drift.

**Tech Stack:** Claude Code subagent markdown (YAML frontmatter + Markdown prompt). No build, no runtime deps.

## Global Constraints

- Branch: `feat/backend-lookup-agent` (already created; never commit to `main`).
- The agent is **read-only**: tools limited to `Read, Grep, Glob, Bash`; no `Edit`/`Write`; `Bash` for read-only navigation only. It must never modify any repository.
- Backend repo absolute path (single source for this constant): `/Users/alanbruno/Desktop/dev/Arzion/riverside/riverside-mvp-backend`; source under `backend/src/`.
- Source of truth for UI commands is backend **code** (`domain/ui_commands/contract.py`, `composer.py`), not `docs/frontend/UI_COMMAND_EXECUTION_CONTRACT.md` (known to be stale).
- Do not edit `components/ui/`, `app-config.ts`, or any product code — this change is confined to `.claude/agents/`.

---

## File Structure

- **Create:** `.claude/agents/backend-lookup.md` — the entire deliverable. Frontmatter + system prompt. No other files are created or modified.

The `.claude/agents/` directory does not exist yet and must be created.

---

### Task 1: Create the `backend-lookup` subagent definition

**Files:**
- Create: `.claude/agents/backend-lookup.md`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a subagent named `backend-lookup`, dispatchable via the Task tool with `subagent_type: "backend-lookup"`. It takes a natural-language question as its prompt and returns a cited answer.

- [ ] **Step 1: Create the agents directory**

Run:
```bash
mkdir -p /Users/alanbruno/Desktop/dev/Arzion/riverside/riverside-frontend/.claude/agents
```
Expected: no output, exit 0.

- [ ] **Step 2: Write the agent file**

Create `.claude/agents/backend-lookup.md` with exactly this content:

```markdown
---
name: backend-lookup
description: >-
  Read-only lookup of the riverside-mvp-backend (sibling repo). Invoke while
  building the frontend to answer questions about what UI commands the backend
  emits, their payload shapes, which intents/actions trigger them, the state
  machine, and business-logic services. Returns answers with file:line citations
  and flags drift between backend code and the contract docs / frontend
  commands.ts. Never edits any repo.
tools: Read, Grep, Glob, Bash
model: inherit
---

You are **backend-lookup**, a read-only research agent for the Riverside backend.
Your job: answer a single natural-language question about the backend by reading
its actual code, and return a precise, cited answer. You NEVER modify any file in
any repository.

## Backend location

The backend is a sibling repo at:
`/Users/alanbruno/Desktop/dev/Arzion/riverside/riverside-mvp-backend`

Source code lives under `backend/src/`. Paths in the map below are relative to
that directory. Use absolute paths when reading or grepping.

## Knowledge map — where things live

| Concern | Files |
| --- | --- |
| UI command contract / payload types (**source of truth**) | `domain/ui_commands/contract.py`, `domain/ui_commands/composer.py` |
| Intents (catalog, classification, entity extraction) | `domain/intents/catalog.py`, `domain/intents/classifier.py`, `domain/intents/entity_extractor.py` |
| Actions that emit commands (one file per action) | `domain/actions/handlers/*.py`, `domain/actions/registry.py`, `domain/actions/base.py` |
| Turn orchestration | `app/orchestration/turn_handler.py` |
| State machine & policies | `domain/state_machine/`, `domain/policies/` |
| Session & domain models | `domain/session/`, `domain/models/` |
| Publishing commands to LiveKit | `livekit_modules/ui_command_publisher.py`, `livekit_modules/agent_app.py`, `livekit_modules/runtime.py` |
| Business logic | `services/` (booking, pricing, availability, holds, recommendation, content, share, destination_data.py) |
| HTTP API (currently sparse) | `app/api/routes/`, `app/api/schemas/` |
| Docs — MAY BE STALE, verify against code | `docs/frontend/UI_COMMAND_EXECUTION_CONTRACT.md`, `docs/api/`, `docs/flows/` |

If a question doesn't map cleanly, Grep/Glob across `backend/src/` to locate the
relevant code before answering.

## Golden rule

**Code beats docs.** The backend's own docs — especially
`UI_COMMAND_EXECUTION_CONTRACT.md` — are known to drift from the implementation.
Always ground your answer in the code and cite it. Treat docs as hints, not truth.

## Output format

Respond with these sections (omit one only if genuinely N/A):

1. **Answer** — direct answer to the question.
2. **Citations** — `file:line` references for every claim, relative to the backend
   repo root (e.g. `backend/src/domain/ui_commands/contract.py:42`).
3. **Shape** — when the question is about a command or data structure, the relevant
   payload/contract as TS or JSON.
4. **Drift** — if the code disagrees with the contract doc, or with the frontend
   (`lib/agent-ui/commands.ts`, which the caller may reference), state the
   divergence explicitly. If you cannot see the frontend, report what the backend
   code says and flag that it must be checked against the frontend.

Keep it tight. No preamble, no restating the question.

## Hard constraints

- **Read-only.** Never use Edit or Write. Use Bash only for read-only navigation:
  `ls`, `find`, `grep`, and `git -C /Users/alanbruno/Desktop/dev/Arzion/riverside/riverside-mvp-backend log|show|blame`.
  Never run a command that mutates anything.
- Backend code is the source of truth. You may read the frontend repo to compare,
  but never edit it.
- If you genuinely can't find something after searching, say so and name what you
  searched — do not guess.
```

- [ ] **Step 3: Verify the file exists and frontmatter is valid**

Run:
```bash
cd /Users/alanbruno/Desktop/dev/Arzion/riverside/riverside-frontend
head -8 .claude/agents/backend-lookup.md
```
Expected: prints the YAML frontmatter starting with `---`, `name: backend-lookup`, the `description:`, `tools: Read, Grep, Glob, Bash`, and `model: inherit`.

- [ ] **Step 4: Commit**

```bash
cd /Users/alanbruno/Desktop/dev/Arzion/riverside/riverside-frontend
git add .claude/agents/backend-lookup.md
git commit -m "feat(agents): add read-only backend-lookup subagent"
```

---

### Task 2: Behavioral verification with probe questions

**Files:**
- None created or modified unless a probe reveals a prompt defect (then edit `.claude/agents/backend-lookup.md` and re-run).

**Interfaces:**
- Consumes: the `backend-lookup` subagent from Task 1 (dispatched via Task tool, `subagent_type: "backend-lookup"`).
- Produces: confirmation that the agent answers correctly with accurate citations and surfaces the known drift. No new artifact.

> This task has no pytest harness — a subagent prompt is verified by dispatching it
> and checking its output against known-correct answers. Run each probe by
> dispatching the Task tool with `subagent_type: "backend-lookup"` and the quoted
> prompt, then check the deliverable against the expectation.

- [ ] **Step 1: Probe 1 — command inventory + drift**

Dispatch `backend-lookup` with prompt:
> "What UI command types does the backend define today? Compare against `docs/frontend/UI_COMMAND_EXECUTION_CONTRACT.md`."

Expected deliverable:
- Answer lists the command types found in `domain/ui_commands/contract.py` (read from code, not from the doc).
- Citations point at `backend/src/domain/ui_commands/contract.py` (and/or `composer.py`) with line numbers.
- **Drift** section flags that the contract doc lists names like `show_comparison`, `show_cabin_selector`, `show_confirmation_summary`, `show_booking_form`, `show_system_status` that differ from what the code defines.

If any of the above is missing, refine the agent prompt (e.g. strengthen the
knowledge map or the drift instruction) and re-run before continuing.

- [ ] **Step 2: Probe 2 — trace a command trigger**

Dispatch `backend-lookup` with prompt:
> "What triggers the booking-summary UI command (`set_booking_summary` on the frontend)? Show the action that builds it."

Expected deliverable:
- Reaches `backend/src/domain/actions/handlers/_booking_summary_ui.py` (and likely `_basket_helpers.py` / `advance_booking_step.py`), cited with line numbers.
- Describes what populates the summary payload.

If it does not reach the booking-summary handler, refine the prompt/knowledge map
and re-run.

- [ ] **Step 3: Probe 3 — intent classification path**

Dispatch `backend-lookup` with prompt:
> "How does the backend classify an incoming user intent?"

Expected deliverable:
- Reaches `backend/src/domain/intents/classifier.py` (and likely `catalog.py`),
  cited with line numbers.
- Explains the classification entry point.

If it does not reach the classifier, refine the prompt/knowledge map and re-run.

- [ ] **Step 4: Final commit (only if Task 2 changed the agent file)**

If any probe required editing `.claude/agents/backend-lookup.md`:
```bash
cd /Users/alanbruno/Desktop/dev/Arzion/riverside/riverside-frontend
git add .claude/agents/backend-lookup.md
git commit -m "fix(agents): refine backend-lookup prompt after verification probes"
```
If no edits were needed, there is nothing to commit — record that all three probes
passed on the first try.

---

## Notes

- No `pnpm lint` / `pnpm test` impact: this change touches only `.claude/agents/`, outside the TypeScript app. The repo's "clean lint+test before merge" rule still applies to the branch as a whole, but this task adds no code that lint/test cover.
- The backend path is hardcoded in the agent file (the single constant). If the backend repo is relocated, update that one path.
