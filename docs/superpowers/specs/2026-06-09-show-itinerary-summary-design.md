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

The wire payload is **snake_case** (like every other command). The schema below
parses snake_case; the reducer maps it to the internal camelCase
`ItinerarySummary` type that the modal sub-components consume.

Promote the `ItinerarySummary` shape (today a plain `type` in
`lib/itinerary-summary/types.ts`) into a Zod schema, reusing the existing
`Cabin` schema:

**Everything is nullable** — the modal can open with a partial booking (no cabin
/ package / itinerary chosen yet). Every leaf field and every section is
`.nullable()`; the reducer maps `null` straight through and each modal
sub-component renders a placeholder.

```ts
const nstr = z.string().nullable();

export const ItinerarySummaryWire = z.object({
  header: z.object({ title: nstr, subtitle: nstr, image: nstr }),
  details: z.object({
    guests: nstr,
    month: nstr,
    embarkation: nstr,
    stops: nstr,
    dates: nstr,
    price_per_person: nstr,
    cabin_name: nstr,
  }),
  cabin: Cabin.nullable(),
  package: z
    .object({
      price_per_person: nstr,
      name: nstr,
      inclusions: z.array(z.string()),
    })
    .nullable(),
  itinerary: z
    .object({
      title: nstr,
      countries: z.array(z.string()),
      description: nstr,
      cities: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          country: z.string(),
          days: z.string(),
          image: z.string(),
        })
      ),
    })
    .nullable(),
  total: nstr,
});
export type ItinerarySummaryWire = z.infer<typeof ItinerarySummaryWire>;

const ShowItinerarySummary = Base.extend({
  type: z.literal('show_itinerary_summary'),
  payload: ItinerarySummaryWire,
});
```

Add `ShowItinerarySummary` to the `UiCommand` discriminated union.

The schema's inferred type is the **wire** type (snake_case, fully nullable). The
reducer maps it to the internal camelCase `ItinerarySummary` in
`lib/itinerary-summary/types.ts`. That internal type must also become nullable
(every section/field `T | null`), and the modal sub-components
(`SummaryCabinCard`, `SummaryPackageCard`, `SummaryItineraryColumn`,
`SummaryDetailsRow`, `SummaryHeader`, `SummaryFooterBar`) must each render a
**placeholder** for their `null` inputs. The snake→camel boundary lives in the
reducer, per repo convention.

## Store (`lib/agent-ui/ui-view-store.ts`)

- New slice: `itinerarySummary: ItinerarySummary | null` (initial `null`).
- New reducer case:

  ```ts
  case 'show_itinerary_summary':
    return {
      itinerarySummary: toItinerarySummary(cmd.payload), // snake → camel mapper
      source: 'agent',
      lastCorrelationId: cmd.correlationId,
    };
  ```
  (Does not touch `view` — the modal is an overlay.) The `toItinerarySummary`
  mapper lives next to the type in `lib/itinerary-summary/`, renames
  `price_per_person`→`pricePerPerson` / `cabin_name`→`cabinName`, and passes
  `null` sections/fields through unchanged; the rest of the fields are identical.
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

The modal mounts only when the slice is non-null; closing clears it locally.
Note: a non-null slice with all-`null` sections is still "open" — presence of the
slice (not its contents) drives open/closed.

## Placeholders (partial bookings)

Every modal sub-component must tolerate `null` and render a placeholder, since
the booking can be half-built:

- `SummaryHeader` — null title → generic/empty; null image → fallback image.
- `SummaryDetailsRow` — each null field → muted "—".
- `SummaryCabinCard` — null cabin → "Aún no seleccionaste tu cabina" card.
- `SummaryPackageCard` — null package → "Aún no seleccionaste tu paquete" card.
- `SummaryItineraryColumn` — null itinerary → "Itinerario aún sin definir".
- `SummaryFooterBar` — null total → muted "—".

Exact copy is the front's call; the wire only sends `null`.

## Dev panel + mock

- Keep `ITINERARY_SUMMARY_MOCK` but reuse it as the dev payload.
- Add an `ITINERARY_SUMMARY_MOCKS` list (a "full" entry + an "empty / partial"
  entry with all sections `null`) + a dev-panel control that calls
  `setItinerarySummaryFromDev`, mirroring the existing booking summary control in
  `lib/dev/dev-panel.tsx`.

## Tests

- `lib/agent-ui/commands.test.ts`: `show_itinerary_summary` valid (full + all-null
  payload) / invalid payload.
- `lib/agent-ui/ui-view-store.test.ts`: command fills slice; `closeItinerarySummary`
  clears it with source `user`; command leaves `view` untouched.

## Verification

- `pnpm lint` and `pnpm test` clean (exhaustive reducer switch will fail to
  compile until the case is added — intended).
- Manual: dev panel can open/close the modal; close clears the slice.
