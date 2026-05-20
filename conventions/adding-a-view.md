# Adding a new view (and its mock)

A "view" is a screen the agent can switch to via a `UiCommand`. Read [`agent-ui.md`](./agent-ui.md) first.

## Checklist

1. **Add the variant to `UiView`** in [`lib/agent-ui/ui-view-types.ts`](../lib/agent-ui/ui-view-types.ts):

   ```ts
   export type UiView =
     | { type: 'start' }
     | { type: 'presentation' }
     | { type: 'my_new_view'; /* extra fields if any */ }
     | ...;
   ```

   Use **snake_case** for the `type` literal (matches the wire protocol).

2. **Create the component** at `components/agent-ui/views/my-new-view.tsx`:

   ```tsx
   import type { UiView } from '@/lib/agent-ui/ui-view-types';

   export function MyNewView({ view }: { view: Extract<UiView, { type: 'my_new_view' }> }) {
     return <div>...</div>;
   }
   ```

   Even if the view has no extra fields, keep the `view` prop — it makes the registry's generic types work.

3. **Register it** in [`components/agent-ui/view-registry.ts`](../components/agent-ui/view-registry.ts):

   ```ts
   import { MyNewView } from './views/my-new-view';

   export const VIEW_REGISTRY: ViewRegistry = {
     // ...
     my_new_view: MyNewView,
   };
   ```

   The `ViewRegistry` mapped type forces this map to be exhaustive — the build fails until every `UiView['type']` has an entry.

4. **Add at least one mock** in [`lib/dev/mocks.ts`](../lib/dev/mocks.ts) (see the next section).

5. **Wire it to a command** if an agent should be able to trigger it. Follow [`adding-a-command.md`](./adding-a-command.md).

## Adding a mock

Mocks let you preview a view in the dev panel without running the agent. `VIEW_MOCKS` is `Record<UiView['type'], ViewMock[]>` — every view type must have at least one entry.

```ts
export const VIEW_MOCKS: Record<UiView['type'], ViewMock[]> = {
  // ...
  my_new_view: [
    { id: 'default', label: 'Default', view: { type: 'my_new_view' } },
    { id: 'edge_case', label: 'Empty list', view: { type: 'my_new_view' /* ...fields */ } },
  ],
};
```

Conventions:

- **`id`** is `snake_case`, stable, and unique within the view. The dev panel uses it as a `<select>` value.
- **`label`** is short human copy shown in the dev panel dropdown.
- Always include a `default` mock as the first entry. The dev panel picks `mocks[0]` when the user switches view types.
- Mocks should cover the **interesting states** of the view: empty, one item, many items, error, edge data — not every permutation.

## Using the dev panel

`pnpm dev`, open the app, click `dev` in the bottom-right corner. Pick a view + mock + **Apply**. The store's `source` flips to `dev` so you can tell it apart from real agent output. **Reset** returns to the `start` view.
