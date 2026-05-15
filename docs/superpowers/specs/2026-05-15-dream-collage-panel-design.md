# Dream Collage Panel — Design Spec

Date: 2026-05-15

## Purpose

Replace the placeholder Panel A in the switchable content panels with a
"Dream" panel: a screen showing five images arranged as a scattered collage,
each clipped by a soft-edged organic mask. All other elements from the
reference mock (logo, bottom bar, settings, voice input) are out of scope —
only the masked images and their tags.

## Scope

In scope:
- A new presentational panel component replacing Panel A.
- Five images from `public/dream/` clipped by organic masks.
- A placeholder tag pill on each image.

Out of scope:
- Tag interactivity or real per-image labels (placeholder text only).
- Data/props — the panel is static.
- Any other UI from the mock.

## Files

- **Rename** `components/app/content-panels/panel-a.tsx` →
  `components/app/content-panels/panel-dream.tsx`, exporting `PanelDream`.
- **Modify** `components/app/content-panels/registry.ts`: the Panel A entry
  becomes `{ id: 'dream', label: 'Dream', component: PanelDream }`. Panels B,
  C and Window are unchanged.
- **New assets** `public/dream/masks/blob-1.svg` … `blob-5.svg`: five black
  organic blob silhouettes with feathered edges (via `feGaussianBlur`), one
  per image, used as `mask-image`.

## Layout

`PanelDream` fills the content area (`h-full w-full`), cream background
(`bg-beige-50`), `relative` with `overflow-hidden`.

- **Desktop (md+):** the five images are absolutely positioned with
  percentage coordinates replicating the mock collage (three across the top,
  two across the bottom, scattered). The collage area has top padding so the
  top-row images do not collide with the panel selector, which is fixed at
  the top-right of `ContentView`.
- **Mobile (<md):** images switch to normal flow, stacked in a single
  centered column, vertically scrollable if needed. Same mask applied.

## Each Image

- Rendered with `next/image` using `fill` + `object-cover`.
- Clipped by its blob via inline `style` (`maskImage` + `WebkitMaskImage`)
  referencing the corresponding `public/dream/masks/blob-N.svg`.
- A tag pill overlaid bottom-left: dark translucent background, white text,
  placeholder content `"1 – Image Tag"`.

## Data

A `DREAM_IMAGES` array at the top of `panel-dream.tsx`. Each entry:
`src`, `mask`, `tag`, and desktop position (`top`, `left`, `width`,
`height` as percentages). The component is purely presentational and takes
no props.

## Error Handling & Testing

- No special error handling — all assets are local.
- No automated tests; the project has no test suite and this is a visual
  component. Verification is visual/manual.

## Decisions

- Responsive behavior: adaptive collage (desktop scatter, mobile stack) —
  chosen over a uniform fluid grid.
- Mask style: varied organic SVG blobs with feathered edges — chosen over a
  single uniform soft-ellipse gradient.
- Tag text: generic placeholder `"1 – Image Tag"`, ready to be replaced.
- Images: the existing five files in `public/dream/`.
