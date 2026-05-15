# Welcome Window Background — Design

**Date:** 2026-05-15
**Status:** Approved

## Goal

Redesign the agent welcome screen (`/agent`, pre-connection state) to match the
provided mockup: a looping window video framed by a hand-drawn room overlay,
with the "Welcome Aboard" card floating in the center.

## Assets (already in `public/`)

- `window-video.mp4` — 1920×1080, 5s clip, the river/city view.
- `window-overlay.png` — 2752×1536 RGBA, hand-drawn room with a transparent
  window cutout in the center. Both assets share a ~16:9 aspect ratio.

## Approach

Two stacked full-bleed `cover` layers. Because the video and overlay share the
same aspect ratio, both can use `object-cover` and will crop identically at any
viewport size — the video stays aligned behind the overlay's transparent
cutout with no positioning math. The drawn room is opaque and hides the video
everywhere except the window.

## Components

### New: `components/app/window-background.tsx`

Renders two `fixed inset-0` layers, `aria-hidden`, pointer-events none:

1. `<video>` (z-0): `src="/window-video.mp4"`, `autoPlay muted loop playsInline`,
   `className="object-cover"`, sized to fill the viewport.
2. Overlay `<Image>` (z-10): `src="/window-overlay.png"`, `fill`,
   `className="object-cover"`, `priority`.

Client component (`'use client'`) — the `<video>` element needs autoplay.

### Redesigned: `components/app/welcome-view.tsx`

Replace the current generic content with the mockup card:

- Floating card centered on screen: `bg-beige-50` (#FBF9F8, "Surface/Card"),
  rounded corners, soft shadow, padding, `max-w-md`.
- Top row: decorative microphone and speaker icons (centered).
- Heading: **"Welcome Aboard"**.
- Body text: *"Please grant the concierge permission to use your microphone and
  play sound."*
- Button: label from `appConfig.startButtonText`, calls `onStartCall`
  (unchanged — connects the session; the browser shows its own native mic
  prompt). The icons are decorative only; no `getUserMedia` call.

`WelcomeViewProps` interface (`startButtonText`, `onStartCall`) is unchanged.

### Modified: `components/app/view-controller.tsx`

Render `<WindowBackground />` only while `!isConnected`, behind the
`MotionWelcomeView`. It is removed from the DOM once the session view takes
over (`isConnected`). The existing `motion` fade on the card is kept.

### Modified: `app-config.ts`

Change `startButtonText` default from `'Start call'` to
`'Start the experience'`.

## Layering / z-index

```
z-0   window-video.mp4   (fixed inset-0, object-cover)
z-10  window-overlay.png (fixed inset-0, object-cover)
z-20  WelcomeView card   (centered, existing motion fade)
```

## Responsive

Plain `cover` crop at all sizes. On narrow/portrait screens the wide room
drawing crops at the edges; the window cutout stays roughly centered so the
video still reads. No mobile-specific layout.

## Out of scope

- No real microphone/permission API calls (`getUserMedia`).
- No changes to the connected session view.
- No changes to other routes.

## Testing

- Welcome screen shows video playing through the window cutout, framed by the
  room overlay, card centered.
- Clicking the button connects the session; background unmounts when the
  session view appears.
- Video autoplays muted and loops.
