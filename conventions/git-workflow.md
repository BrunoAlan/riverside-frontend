# Git workflow

## Branches

- `main` is always deployable.
- Feature branches: `<kind>/<short-slug>` — e.g. `feat/cabin-selection-view`, `fix/welcome-centering`.
- One concern per branch. If you discover unrelated work, branch separately.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), lowercase. Common types in this repo:

| Type       | When                                                |
| ---------- | --------------------------------------------------- |
| `feat`     | User-visible behavior added.                        |
| `fix`      | Bug fix.                                            |
| `refactor` | Code shape change with no behavior change.          |
| `docs`     | README, `conventions/`, code comments.              |
| `chore`    | Dependencies, tooling, cleanup that isn't refactor. |
| `test`     | Tests only.                                         |

Scope is optional but useful: `feat(agent-ui): add cabin_selection view`.

The subject line is **why this commit exists**, not what files changed. Prefer present tense, no period. Examples from recent history:

```
fix(welcome-view): center card vertically by adding h-full to flex wrapper
refactor: rename components/app/ to components/layout/
docs(readme): sync APP_CONFIG_DEFAULTS snippet and scripts table
```

Use the body when the why is non-obvious. Reference issues with `Refs: #123` or `Closes: #123`.

## Before opening a PR

```bash
pnpm lint
pnpm test
pnpm format:check
pnpm build      # optional but catches Next.js issues lint won't
```

## Pull requests

- Title follows the same Conventional-Commit style as a commit subject.
- Description covers **why**, **what changed**, and **how to verify** (dev panel mock to load, command to run, etc.).
- Keep PRs small. If a diff crosses ~400 lines and isn't a mechanical rename, consider splitting.
- Don't merge your own PRs unless explicitly green-lit.
