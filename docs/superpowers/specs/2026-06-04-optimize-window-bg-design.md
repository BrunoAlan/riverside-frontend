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

Generated once from the 1080p original (not kept in the repo — this is a one-off
optimization). Outputs:

- `public/window-video.webm` — **AV1** (libsvtav1, CRF 46), 720p (preferred source, ~1.8 MB)
- `public/window-video.mp4` — H.264, 720p, ~900 kbps (fallback, ~2.7 MB) — replaces current
- `public/window-poster.jpg` — first frame, ~111 KB

ffmpeg commands used (run from the 1080p source `$SRC`), kept here for reference if
the assets ever need regenerating:

```bash
# MP4 H.264 720p fallback
ffmpeg -y -i "$SRC" -vf "scale=-2:720" \
  -c:v libx264 -profile:v high -preset slow -b:v 900k -maxrate 1300k -bufsize 2000k \
  -pix_fmt yuv420p -movflags +faststart -an public/window-video.mp4

# AV1 720p preferred source (libsvtav1; local ffmpeg has no libvpx for VP9)
ffmpeg -y -i "$SRC" -vf "scale=-2:720" \
  -c:v libsvtav1 -crf 46 -preset 6 -g 240 -pix_fmt yuv420p -an public/window-video.webm

# Poster: first frame as JPEG (local ffmpeg has no libwebp; video has no alpha)
ffmpeg -y -i "$SRC" -frames:v 1 -vf "scale=-2:720" -c:v mjpeg -q:v 4 public/window-poster.jpg

# Overlay PNG -> WebP, keeping alpha (needs cwebp: brew install webp)
cwebp -q 90 -alpha_q 100 window-overlay.png -o public/window-overlay.webp
```

**Codec note:** the original plan was VP9, but the local ffmpeg has no `libvpx`. It
does have `libsvtav1`, so we use AV1 — newer and smaller than VP9, no toolchain
install. AV1 in Safari only decodes on devices with hardware AV1 support, so the
H.264 MP4 fallback covers Apple users and older browsers (kept well-compressed too).
Poster is JPEG because `libwebp` is also absent from the local ffmpeg; the video has
no alpha so JPEG is fine.

720p is sufficient: the video sits behind a full-screen overlay.

**Overlay:** `public/window-overlay.png` (4.3 MB) → `public/window-overlay.webp`
(220 KB, −95%), via `cwebp -q 90 -alpha_q 100` (preserves the alpha the window
glass needs). `next/image` already serves AVIF/WebP in production, so end users
weren't downloading the full 4.3 MB; the win is the repo artifact and dev payload.
Verified visually (full screen + zoom on the fine curtain line-art): no ringing,
alpha intact. The old PNG is removed. ffmpeg/sips can't write alpha WebP, so this
step needs `cwebp` (`brew install webp`).

### 2. Code changes — `components/layout/window-background.tsx` (only code file)

`<video>` markup:
- Add `poster="/window-poster.jpg"`.
- Keep `preload="auto"` (see preload timing below).
- Two `<source>` elements: `window-video.webm` first, then `window-video.mp4`
  fallback. **The `type` includes the codec** (`video/webm; codecs="av01.0.05M.08"`
  and `video/mp4; codecs="avc1.64001f"`), not just the container. Without the codec,
  a browser that supports the WebM container but not the AV1 codec would select the
  WebM by MIME, download it, fail to decode, and never fall back to the MP4 (source
  selection is by type, one-shot — it does not retry on a later decode error). With
  the codec declared, non-AV1 browsers skip the WebM and use the MP4 cleanly.

**Preload timing.** The `<video>` mounts on the `start` view ("Welcome Aboard"),
*before* the user clicks "Start the experience" which both connects the LiveKit
agent and calls `play()`. With `preload="auto"`, the now-small (~1.8 MB) clip
downloads during the idle welcome screen, so by the time the agent connection
starts there is no bandwidth contention and playback is instant. `preload="auto"`
was only a problem when the clip was 10 MB; at 1.8 MB shifting the fetch to idle
time helps both playback smoothness and agent-connection speed.

No fade-in: the poster IS the video's first frame, so the poster→video handoff is
visually seamless. A cross-fade would add state for no visible benefit (and the
`poster` attribute renders inside the `<video>`, so fading the element would hide the
poster too). Simplicity wins.

Preserved unchanged:
- The `useEffect` driving `play()`/`pause()` from `isPlaying`.
- The overlay `<Image>` (unless the optional overlay step is taken).

No changes to `view-controller.tsx`, `presentation-view.tsx`, or view logic.

### Resulting behavior

- On `start` (welcome): background mounts, poster shows instantly, and the ~1.8 MB
  clip preloads during this idle screen.
- On `presentation`: `isPlaying=true`, the already-buffered video plays immediately
  (poster = first frame, so the handoff is seamless). No bandwidth contention with
  the agent connection, which starts at this same moment.

## Testing / verification

- `pnpm lint` and `pnpm test` clean (repo hard rule).
- Confirm generated asset sizes (`ls -lh`) and 720p via `ffprobe`.
- No browser testing unless requested.

## Out of scope

- Changing the video content or overlay artwork.
- Touching view-switching logic or the LiveKit connection itself.
