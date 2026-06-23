# Design: `backend-lookup` subagent

**Date:** 2026-06-23
**Status:** Approved (design), pending implementation
**Branch:** `feat/backend-lookup-agent`

## 1. Problem

While building the frontend, we constantly need to know how the backend behaves:
what UI commands it emits, the exact payload shapes, which intents/actions trigger
them, and the business logic behind a given command. Today that means opening the
sibling backend repo (`../riverside-mvp-backend`) by hand and tracing Python code.

This is slow and error-prone. Worse, the backend's own handoff doc
(`docs/frontend/UI_COMMAND_EXECUTION_CONTRACT.md`) has **already drifted** from
reality: it lists command types like `show_comparison`, `show_cabin_selector`,
`show_confirmation_summary`, `show_booking_form`, `show_system_status` and a
`version: 'v1'` + `timestamp` envelope, while the frontend source of truth
(`lib/agent-ui/commands.ts`) has `show_cabin_options`, `show_cabin_detail`,
`set_booking_summary` and a different `Base`. Building UI against the stale doc
would be a bug. The real source of truth is the backend **code**.

## 2. Goal

A read-only Claude Code subagent that answers natural-language questions about the
backend by reading its actual code, returning the answer with `file:line`
citations and the relevant payload/contract shapes — so frontend development can
proceed against ground truth without manually spelunking the backend repo.

## 3. Non-goals (YAGNI)

- It does **not** auto-sync frontend docs/contracts (explicitly chose read-only).
- It does **not** edit the backend repo, ever.
- It is **not** an MCP server or a running service. It is a single subagent
  markdown file.

## 4. Form & location

- A subagent defined at `.claude/agents/backend-lookup.md` in the **frontend** repo
  (versioned, shared with the team).
- Invoked via the Task tool with a question; returns a structured answer.
- Backend repo location is a fixed sibling path:
  `/Users/alanbruno/Desktop/dev/Arzion/riverside/riverside-mvp-backend`.
  Source lives under `backend/src/`. The agent prompt records this path so it does
  not need to rediscover it. (If the repo is ever relocated, this one path in the
  agent file is the single thing to update.)

## 5. Knowledge map (baked into the agent prompt)

All paths relative to `../riverside-mvp-backend/backend/src/` unless noted.

| Concern | Where to look |
| --- | --- |
| UI command contract / payload types (**source of truth**) | `domain/ui_commands/contract.py`, `domain/ui_commands/composer.py` |
| Intents (catalog, classification, entity extraction) | `domain/intents/catalog.py`, `classifier.py`, `entity_extractor.py` |
| Actions that emit commands (one file per action) | `domain/actions/handlers/*.py`, `domain/actions/registry.py`, `domain/actions/base.py` |
| Turn orchestration | `app/orchestration/turn_handler.py` |
| State machine & policies | `domain/state_machine/`, `domain/policies/` |
| Session & domain models | `domain/session/`, `domain/models/` |
| Publishing commands to LiveKit | `livekit_modules/ui_command_publisher.py`, `livekit_modules/agent_app.py`, `livekit_modules/runtime.py` |
| Business logic | `services/` (booking, pricing, availability, holds, recommendation, content, share, destination_data.py) |
| HTTP API (currently sparse) | `app/api/routes/`, `app/api/schemas/` |
| Docs — **may be stale, verify against code** | `docs/frontend/UI_COMMAND_EXECUTION_CONTRACT.md`, `docs/api/`, `docs/flows/` |

The frontend side of the bridge, for cross-referencing drift:
`lib/agent-ui/commands.ts`, `conventions/ui-commands.md`, `conventions/frontend-intents.md`.

## 6. Behavior contract

**Input:** a natural-language question about the backend (commands, intents,
actions, services, state machine, or any implementation detail).

**Output:** a structured answer containing
1. **Direct answer** to the question.
2. **Citations** — `file:line` references into the backend repo for every claim.
3. **Shape** — the relevant payload/contract as TS or JSON when the question is
   about a command or data structure.
4. **Drift flag** — if the code disagrees with
   `UI_COMMAND_EXECUTION_CONTRACT.md` or with the frontend's `commands.ts`, call it
   out explicitly rather than papering over it.

**Golden rule:** code beats docs. Always cite the code.

**Read-only enforcement:**
- Allowed tools: `Read, Grep, Glob, Bash`.
- `Bash` is for read-only navigation only (`ls`, `find`, `grep`, `git -C <backend> log/show/blame`). No mutating commands, no `Edit`, no `Write`.
- The agent never modifies any repo. Frontend changes are applied by the user or
  the main session, not by this agent.

## 7. Verification

Probe with questions whose answers we can check:

1. *"What UI command types does the backend define today?"* → must read
   `domain/ui_commands/contract.py` (not the doc) and flag the drift vs. the doc
   and vs. `commands.ts`.
2. *"What triggers `set_booking_summary` / the booking summary?"* → must reach
   `domain/actions/handlers/_booking_summary_ui.py`.
3. *"How is an incoming intent classified?"* → must reach
   `domain/intents/classifier.py`.

Success = correct answer, accurate `file:line` citations, and the drift in probe 1
surfaced rather than hidden.

## 8. Open questions

None blocking. Future option (not now): a companion mode that syncs frontend
contract docs from the backend code — deferred per the read-only decision.
