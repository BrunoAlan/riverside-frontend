# Adding a new UI command

A "command" is a message the backend agent sends to the frontend over the LiveKit `ui-commands` text stream. Read [`agent-ui.md`](./agent-ui.md) first for the big picture.

## Checklist

1. **Agree on the wire shape with the backend.** Snake_case fields. Must include `correlation_id: string` (Base requires it) and optionally `session_id: string`.

2. **Define the Zod schema** in [`lib/agent-ui/commands.ts`](../lib/agent-ui/commands.ts):

   ```ts
   const MyNewCommand = Base.extend({
     type: z.literal('my_new_command'),
     payload: z.object({
       /* fields */
     }),
   });
   ```

3. **Add it to the discriminated union** in the same file:

   ```ts
   export const UiCommand = z.discriminatedUnion('type', [
     ShowDiscoveryCanvas,
     SoftRedirect,
     ShowItineraryOptions,
     MyNewCommand, // ← here
   ]);
   ```

4. **Handle it in the reducer** in [`lib/agent-ui/ui-view-store.ts`](../lib/agent-ui/ui-view-store.ts).
   Add a `case 'my_new_command':` to `applyCommand`. TypeScript will fail the build until you do — the `_exhaustive: never` line is intentional.

   Decide what the command does:
   - Switch the view? Return `{ view: ..., hint: null, source: 'agent', lastCorrelationId: ... }`.
   - Only show a hint? Return `{ hint: { ... }, source: 'agent', lastCorrelationId: ... }` and leave `view` alone.

5. **If the command introduces a new view type**, follow [`adding-a-view.md`](./adding-a-view.md) for the view, registry entry, and mock.

6. **Write a test** in [`lib/agent-ui/commands.test.ts`](../lib/agent-ui/commands.test.ts) (schema valid / invalid) and, if relevant, [`ui-view-store.test.ts`](../lib/agent-ui/ui-view-store.test.ts) (reducer effect).

## Conventions

- **Naming:** `type` is `snake_case` matching the agent's vocabulary (`show_x`, `soft_redirect`, `update_y`).
- **Payload optionality:** if the command has no payload, mark it `payload: z.object({}).optional()` like `ShowDiscoveryCanvas`.
- **Don't mutate `app-config.ts`** from a command — commands change view state, not configuration.
- **Always set `lastCorrelationId`** so debugging tools can trace which agent message produced which view.
