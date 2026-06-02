# Conventions

How we work in this codebase. Each file is short and focused — read the one that matches what you're doing.

| File                                           | When to read                                                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`code-style.md`](./code-style.md)             | Before writing any TypeScript/React in this repo.                                                               |
| [`project-layout.md`](./project-layout.md)     | When deciding where a new file or component should live.                                                        |
| [`agent-ui.md`](./agent-ui.md)                 | Before touching anything under `lib/agent-ui/` or `components/agent-ui/`. Explains how the agent drives the UI. |
| [`adding-a-command.md`](./adding-a-command.md) | When the backend wants to send a new UI command over LiveKit.                                                   |
| [`adding-a-view.md`](./adding-a-view.md)       | When you need a new agent-driven view (and its dev-panel mock).                                                 |
| [`analytics.md`](./analytics.md)               | When tracking a PostHog event, adding a new one, or wiring up analytics.                                        |
| [`testing.md`](./testing.md)                   | Before writing tests — what we test, what we don't, and with what.                                              |
| [`git-workflow.md`](./git-workflow.md)         | Branch naming, commit style, PR expectations.                                                                   |

If a convention here disagrees with code on `main`, the code is the source of truth — open a PR to fix the doc.
