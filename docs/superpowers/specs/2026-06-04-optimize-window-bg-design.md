# Optimize window background loading (presentation view)

**Date:** 2026-06-04
**Branch:** `perf/optimize-window-bg`

## Problem

The presentation view's background (`WindowBackground`) ships heavy decorative
assets that make the view feel slow to load:

- `public/window-video.mp4` — 1920×1080, H.264, 24 fps, 24 s, 3.5 Mbps → **10 MB**,
  served raw (no Next optimization), with `preload="auto"` (eager full download).
- `public/window-overlay.png` — 2752×1536 with alpha → **4.3 MB** (served via
  `next/image`, so optimized at runtime in production).

The video is **decorative**: `z-0`, `aria-hidden`, `pointer-events-none`, and fully
covered by the overlay PNG (`object-cover`, full screen). Visual fidelity is not
critical, which justifies aggressive compression.

## Goal

Cut the background payload from ~10 MB (video) to ~1.5 MB and smooth perceived load,
without changing the visual result or competing with the LiveKit agent connection
for bandwidth.

## Approach

Re-encode the assets + improve the loading strategy. Chosen over code-only because
the real cost is bytes, and over MP4-only because we run ffmpeg anyway and WebM is a
free extra command with the best result.

### 1. Asset re-encoding

Generated from the 1080p originals (kept outside `/public` in `assets-src/` for
re-generation), via documented ffmpeg commands in `scripts/optimize-window-bg.sh`:

- `public/window-video.webm` — VP9, 720p, ~1 Mbps (preferred source, ~0.8–1.2 MB)
- `public/window-video.mp4` — H.264, 720p, ~1.2 Mbps (fallback, ~1.2–1.8 MB) — replaces current
- `public/window-poster.webp` — first frame, ~30–60 KB

720p is sufficient: the video sits behind a full-screen overlay.

**Overlay (optional / nice-to-have):** `next/image` already serves AVIF/WebP in
production, so converting the source gives marginal prod benefit (helps dev + LCP
preload weight). Not a blocker; can be done as a follow-up.

### 2. Code changes — `components/layout/window-background.tsx` (only code file)

`<video>` markup:
- Add `poster="/window-poster.webp"`.
- Change `preload="auto"` → `preload="metadata"`.
- Two `<source>` elements: `window-video.webm` (`video/webm`) first, then
  `window-video.mp4` (`video/mp4`) fallback.
- Fade-in: video starts `opacity-0`, transitions to `opacity-100` on `onCanPlay`
  (a `useState` "ready" flag) so the poster shows underneath while loading.

Preserved unchanged:
- The `useEffect` driving `play()`/`pause()` from `isPlaying`.
- The overlay `<Image>` (unless the optional overlay step is taken).

No changes to `view-controller.tsx`, `presentation-view.tsx`, or view logic.

### Resulting behavior

- On `start` (welcome): background mounts, poster shows instantly, only video
  metadata is fetched.
- On `presentation`: `isPlaying=true`, video (now ~1.5 MB) plays; on `canplay` it
  fades in over the poster. No bandwidth contention with the agent connection.

## Testing / verification

- `pnpm lint` and `pnpm test` clean (repo hard rule).
- Confirm generated asset sizes (`ls -lh`) and 720p via `ffprobe`.
- No browser testing unless requested.

## Out of scope

- Changing the video content or overlay artwork.
- Touching view-switching logic or the LiveKit connection itself.
