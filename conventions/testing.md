# Testing

We use **Vitest** in a Node environment. Tests live next to the source file (`foo.ts` ↔ `foo.test.ts`).

```bash
pnpm test           # full suite
pnpm test foo       # filter by name
pnpm test --watch   # watch mode
```

Config: [`vitest.config.ts`](../vitest.config.ts). Only `lib/**/*.test.ts` is collected — UI components are not unit-tested here.

## What we test

| Area                             | Test it? | Why                                       |
| -------------------------------- | -------- | ----------------------------------------- |
| Zod schemas (`commands.ts`)      | Yes      | Wire-protocol contract with the agent.    |
| Reducers (`ui-view-store.ts`)    | Yes      | Pure logic, easy to break on refactor.    |
| Transport parsing/error handling | Yes      | Network edge cases the agent can produce. |
| Map/clustering helpers           | Yes      | Pure logic with non-obvious math.         |
| React components                 | No       | Verified visually via the dev panel.      |
| LiveKit room behavior            | No       | Smoke-test against a real agent + room.   |

## How we test

- **No mocks for code we own.** Use `createUiViewStore()` to get a fresh store. Build small fakes inline (`ReaderLike` in `transport.test.ts` is the pattern).
- **Arrange-act-assert.** One concept per `it(...)`. Keep names declarative: `it('records a parse error when JSON is invalid')`.
- **Test behavior, not implementation.** Don't assert on internal calls — assert on the resulting store state or returned value.
- **Snapshot tests:** avoid. They drift and reviewers rubber-stamp them.

## When you add a feature

- New `UiCommand` variant → add a schema test (`commands.test.ts`) and a reducer test (`ui-view-store.test.ts`).
- New transport edge case → add to `transport.test.ts`.
- New helper in `lib/` → add a `.test.ts` next to it.

If your change is UI-only (view component, styling, layout), there's nothing to add here — verify in the dev panel.
