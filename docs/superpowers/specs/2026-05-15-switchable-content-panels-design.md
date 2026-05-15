# Switchable Content Panels — Design

Date: 2026-05-15

## Goal

After the conversation starts, replace the video/`WindowBackground` with a
content area that can display different types of content. The user can switch
between contents from the UI via a dropdown selector. Initial contents are
generic empty placeholders for mocking designs later.

## Flow

- **Before start (`started = false`):** unchanged — `WelcomeView` rendered over
  `WindowBackground` (video).
- **After start (`started = true`):** `WindowBackground`/video is no longer
  rendered. A `ContentView` takes its place.

## Components

### `components/app/content-view.tsx`

Container for the post-start content area. Holds the active-panel state,
renders the dropdown selector and the active panel.

### `components/app/content-panels/`

One file per placeholder panel:

- `panel-a.tsx`
- `panel-b.tsx`
- `panel-c.tsx`

Each is a neutral, empty placeholder (e.g. centered label "Contenido A") ready
to receive real design later.

### Panel registry

A registry array exported alongside the panels:

```ts
{ id: string; label: string; component: React.ComponentType }
```

Adding a new panel = add one file + one registry entry. The registry drives
both the dropdown options and which panel renders.

## Selector

A shadcn `Select` (`components/ui/select.tsx`, already present) placed in a
discreet top bar above the content area. Selecting an option sets the active
panel id.

## `ViewController` changes

- `!started`: render `WindowBackground` + `WelcomeView` (as today).
- `started`: render `ContentView` only (no `WindowBackground`).
- Keep the existing `AnimatePresence` transition between views.

## Out of scope

- Real designs for the panels (placeholders only).
- Any link between panel selection and the LiveKit session state.
