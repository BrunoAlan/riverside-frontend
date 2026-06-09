# Show Itinerary Summary — round-trip design

## Goal

Replace the locally-mocked opening of the Itinerary Summary modal with the
standard agent-driven round-trip: the user clicks **"Itinerary Summary"**, the
frontend emits an intent, the backend answers with a command carrying the real
data, and the modal opens from store state.

Today (`components/agent-ui/booking-summary.tsx`) the button toggles local
`useState` and renders `ItinerarySummaryModal` with `ITINERARY_SUMMARY_MOCK`.
That violates the convention "never open a modal on your own; emit the intent
and wait for the backend command." This change brings the modal into the same
pattern as `explore_cabin` → `show_cabin_detail`.

## Non-goals

- The booking summary **bar** snapshot (`set_booking_summary` / `bookingSummary`
  slice) is unrelated and stays untouched.
- No backend implementation — this is the frontend contract + wiring only.
- Closing the modal is **purely local** (no intent on close).

## Wire contract

### Intent (FE → BE): `view_itinerary_summary`

- **Trigger:** click on the "Itinerary Summary" button.
- **entities:** none.
- **user_message:** optional human-readable trace string.
- **Returns:** `show_itinerary_summary`.

### Command (BE → FE): `show_itinerary_summary`

- **payload:** the full `ItinerarySummary` (header, details, cabin, package,
  itinerary, total) — same shape currently in `ITINERARY_SUMMARY_MOCK`.
- **Effect:** fills the `itinerarySummary` store slice → modal opens.

Naming uses `itinerary_summary` (not `booking_summary`) to match the
`ItinerarySummary` type and `ItinerarySummaryModal`, and to stay distinct from
the existing booking summary bar slice.

## Schema (`lib/agent-ui/commands.ts`)

Promote the `ItinerarySummary` shape (today a plain `type` in
`lib/itinerary-summary/types.ts`) into a Zod schema, reusing the existing
`Cabin` schema:

```ts
export const ItinerarySummary = z.object({
  header: z.object({ title: z.string(), subtitle: z.string(), image: z.string() }),
  details: z.object({
    guests: z.string(),
    month: z.string(),
    embarkation: z.string(),
    stops: z.string(),
    dates: z.string(),
    pricePerPerson: z.string(),
    cabinName: z.string(),
  }),
  cabin: Cabin,
  package: z.object({
    pricePerPerson: z.string(),
    name: z.string(),
    inclusions: z.array(z.string()),
  }),
  itinerary: z.object({
    title: z.string(),
    countries: z.array(z.string()),
    description: z.string(),
    cities: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        country: z.string(),
        days: z.string(),
        image: z.string(),
      })
    ),
  }),
  total: z.string(),
});
export type ItinerarySummary = z.infer<typeof ItinerarySummary>;

const ShowItinerarySummary = Base.extend({
  type: z.literal('show_itinerary_summary'),
  payload: ItinerarySummary,
});
```

Add `ShowItinerarySummary` to the `UiCommand` discriminated union.

`lib/itinerary-summary/types.ts` re-exports the inferred type (or is replaced by
the import) so existing modal components keep their `ItinerarySummary` type. The
field names stay camelCase to match the existing internal type and the modal's
consumers — this command's payload is internal-shaped, like `ui-view-types`.

> Note: payload fields here are camelCase (not the usual snake_case) because the
> modal sub-components already consume this exact camelCase shape. Confirm with
> backend that they emit camelCase for this payload.

## Store (`lib/agent-ui/ui-view-store.ts`)

- New slice: `itinerarySummary: ItinerarySummary | null` (initial `null`).
- New reducer case:

  ```ts
  case 'show_itinerary_summary':
    return {
      itinerarySummary: cmd.payload,
      source: 'agent',
      lastCorrelationId: cmd.correlationId,
    };
  ```
  (Does not touch `view` — the modal is an overlay.)
- New local setter for close + dev:
  ```ts
  setItinerarySummaryFromDev: (s: ItinerarySummary | null) => void; // dev panel
  closeItinerarySummary: () => void;  // local close, source 'user'
  ```
  `closeItinerarySummary` sets `{ itinerarySummary: null, source: 'user' }`.

Hooks in `lib/agent-ui/hooks.ts`:
`useItinerarySummary`, `useCloseItinerarySummary`, `useSetItinerarySummaryFromDev`.

## Component (`components/agent-ui/booking-summary.tsx`)

- Remove local `summaryOpen` state and the `ITINERARY_SUMMARY_MOCK` import.
- Button `onClick` → `sendIntent('view_itinerary_summary')` via `useFrontendIntent`.
- Render the modal from store state:
  ```tsx
  const summary = useItinerarySummary();
  const close = useCloseItinerarySummary();
  // ...
  {summary && (
    <ItinerarySummaryModal
      open
      onOpenChange={(o) => { if (!o) close(); }}
      data={summary}
    />
  )}
  ```

The modal mounts only when data is present; closing clears the slice locally.

## Dev panel + mock

- Keep `ITINERARY_SUMMARY_MOCK` but reuse it as the dev payload.
- Add an `ITINERARY_SUMMARY_MOCKS` list + a dev-panel control that calls
  `setItinerarySummaryFromDev`, mirroring the existing booking summary control in
  `lib/dev/dev-panel.tsx`.

## Tests

- `lib/agent-ui/commands.test.ts`: `show_itinerary_summary` valid / invalid payload.
- `lib/agent-ui/ui-view-store.test.ts`: command fills slice; `closeItinerarySummary`
  clears it with source `user`; command leaves `view` untouched.

## Verification

- `pnpm lint` and `pnpm test` clean (exhaustive reducer switch will fail to
  compile until the case is added — intended).
- Manual: dev panel can open/close the modal; close clears the slice.
