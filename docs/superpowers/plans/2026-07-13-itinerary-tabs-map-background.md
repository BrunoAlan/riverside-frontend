# Excursions Map Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the itinerary map visible and persistent in the background while the "Excursions" tab is active, instead of unmounting it — the map becomes a static, non-interactive backdrop (no route, no city cards, no zoom/recenter controls, no pan/zoom gestures) with `ExcursionsPanel` overlaid on top, mirroring the existing city-detail overlay pattern.

**Architecture:** `MapCanvas` gains a single `interactive?: boolean` prop that gates every "overview-only" element (route, city cards, controls, gestures) at once. `PanelMap` forwards it unchanged. `ItineraryPanel` stops conditionally mounting one of `PanelMap`/`ExcursionsPanel` — both render always, toggled by CSS (`pointer-events`/`opacity`), so the `maplibregl.Map` instance (camera, WebGL context, tile cache) survives tab switches. Switching to Excursions with a city detail open silently clears it (no agent intent).

**Tech Stack:** Next.js 15 / React 19, MapLibre GL JS (native `dragPan`/`scrollZoom`/etc. handler API), Tailwind v4, Zustand (`useSetViewFromUser`).

## Global Constraints

- Package manager: `pnpm` only.
- Never hand-edit `components/ui/*`.
- No hex literals in component code.
- Per `conventions/testing.md`, React components are not unit-tested here — no `.test.ts(x)` files in this plan. Each task's automated verification is `pnpm exec tsc --noEmit` and `pnpm lint`. The final task also runs the full `pnpm test` suite (no `lib/**` file is touched by this plan, so it must stay at 169/169).
- `pnpm lint` and `pnpm test` must stay green throughout.
- Branch: `feat/itinerary-tabs` (existing, already has the tabs feature committed).
- This plan supersedes the "Excursions fully replaces the map" decision from
  `docs/superpowers/specs/2026-07-13-itinerary-tabs-design.md` — see
  `docs/superpowers/specs/2026-07-13-itinerary-tabs-map-background-design.md`
  for the full rationale.

---

### Task 1: `MapCanvas` gains an `interactive` prop

**Files:**
- Modify: `components/panels/map/map-canvas.tsx` (full new content below)

**Interfaces:**
- Produces: `MapCanvasProps.interactive?: boolean` (default `true`). When `false`: `RouteLayer` and `CityCardLayer` don't render, the `.maplibregl-ctrl-bottom-right` control container (holds both the zoom `NavigationControl` and the custom recenter control) is hidden via `style.display = 'none'`, and all map gesture handlers (`dragPan`, `scrollZoom`, `boxZoom`, `dragRotate`, `keyboard`, `doubleClickZoom`, `touchZoomRotate`) are `.disable()`d. Task 2 reads this prop name/type.

- [ ] **Step 1: Replace the file content**

Replace the entire file with:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CityCardLayer } from '@/components/panels/map/city-card-layer';
import { RouteLayer } from '@/components/panels/map/route-layer';
import { type City, cities } from '@/lib/map/cities';
import { cityBounds } from '@/lib/map/city-bounds';
import { parchmentStyle } from '@/lib/map/parchment-style';

// Paper-grain texture for the parchment look. The seamless feTurbulence tile
// lives in public/map/grain.svg (edit it there to tune the grain). Applied as a
// repeating background on an overlay div with mix-blend-multiply.
const GRAIN_IMAGE = "url('/map/grain.svg')";

// Module-level defaults so omitted props keep a stable reference across renders.
const DEFAULT_CENTER: [number, number] = [17.5, 48.0];
const DEFAULT_ZOOM = 6.8;

// Floor on interactive zoom-out so the user can't pull back past the Danube region.
const MIN_ZOOM = 5.5;

// Camera padding (px) when auto-fitting to cities, so cards — which anchor
// centered and cascade up-left — and the top/bottom gradients don't clip.
const FIT_PADDING = { top: 130, bottom: 100, left: 150, right: 130 };
// Cap auto-fit zoom so two near-adjacent cities don't snap to extreme zoom.
const FIT_MAX_ZOOM = 9;
// Zoom level the camera flies to when focusing a single city in detail mode.
const DETAIL_ZOOM = 8.5;

// "Fit to frame" glyph for the recenter control (phosphor FrameCorners). Inlined
// as SVG markup because the recenter button is a raw-DOM MapLibre control — a
// sibling of the zoom control, not a React/shadcn button.
const RECENTER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,48V96a8,8,0,0,1-16,0V56H160a8,8,0,0,1,0-16h48A8,8,0,0,1,216,48ZM96,200H56V160a8,8,0,0,0-16,0v48a8,8,0,0,0,8,8H96a8,8,0,0,0,0-16Zm112-48a8,8,0,0,0-8,8v40H160a8,8,0,0,0,0,16h48a8,8,0,0,0,8-8V160A8,8,0,0,0,208,152ZM96,40H48a8,8,0,0,0-8,8V96a8,8,0,0,0,16,0V56H96a8,8,0,0,0,0-16Z"></path></svg>`;

type MapCanvasProps = {
  cities?: City[];
  center?: [number, number];
  zoom?: number;
  focusCity?: City;
  onCityExpand?: (city: City) => void;
  // MapCanvas is shared with compare_itinerary; the voyage route is opt-in so it
  // only renders for the single itinerary view that asks for it.
  showRoute?: boolean;
  // False turns the map into a static, non-interactive background: no route,
  // no city cards, no zoom/recenter controls, no pan/zoom gestures. Used when
  // the itinerary view shows a different tab (e.g. Excursions) on top.
  interactive?: boolean;
};

export function MapCanvas({
  cities: cityList = cities,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  focusCity,
  onCityExpand,
  showRoute,
  interactive = true,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  // The recenter control's click handler is bound once at map creation, so it
  // reads the latest framing fn through this ref instead of a stale closure.
  const frameItineraryRef = useRef<((animate: boolean) => void) | null>(null);
  // The recenter control element, hidden in detail mode (see effect below).
  const recenterControlRef = useRef<HTMLElement | null>(null);
  // The corner container holding both the zoom and recenter controls, hidden
  // entirely while non-interactive (see effect below).
  const controlsContainerRef = useRef<HTMLElement | null>(null);

  // Frame the camera to all cities so cards spread out as closely as the viewport
  // allows instead of stacking. With fewer than two cities there's nothing to
  // fit, so fall back to the explicit center/zoom. Shared by the initial-framing
  // effect (animate: false, no jank) and the recenter button (animate: true).
  const frameItinerary = useCallback(
    (animate: boolean) => {
      if (!map) return;
      if (cityList.length >= 2) {
        const bounds = cityBounds(cityList);
        if (bounds) {
          map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, animate });
          return;
        }
      }
      if (animate) map.easeTo({ center, zoom });
      else map.jumpTo({ center, zoom });
    },
    [map, cityList, center, zoom]
  );

  // Keep the ref pointed at the current framing fn for the recenter control.
  useEffect(() => {
    frameItineraryRef.current = frameItinerary;
  }, [frameItinerary]);

  // Create the map exactly once. Camera props are only the initial view here;
  // later changes are handled by the camera effect below so the map (and its
  // markers) is never torn down and recreated.
  useEffect(() => {
    if (!containerRef.current) return;

    const mapInstance = new maplibregl.Map({
      container: containerRef.current,
      style: parchmentStyle,
      center,
      zoom,
      minZoom: MIN_ZOOM,
      attributionControl: false,
    });

    mapInstance.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    // Recenter control: a sibling of the zoom control reusing its .maplibregl-
    // ctrl-group styling. MapLibre prepends controls in bottom corners, so adding
    // this after NavigationControl stacks it above the zoom buttons.
    const recenterControl: maplibregl.IControl = {
      onAdd() {
        const group = document.createElement('div');
        group.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', 'Recenter itinerary');
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.innerHTML = RECENTER_ICON;
        button.addEventListener('click', () => frameItineraryRef.current?.(true));
        group.appendChild(button);
        recenterControlRef.current = group;
        return group;
      },
      onRemove() {
        recenterControlRef.current = null;
      },
    };
    mapInstance.addControl(recenterControl, 'bottom-right');

    // Both controls above stack into one MapLibre-managed corner container;
    // hiding this one element hides the whole zoom+recenter stack together.
    controlsContainerRef.current =
      containerRef.current.querySelector<HTMLElement>('.maplibregl-ctrl-bottom-right');

    mapInstance.on('load', () => {
      // Inject the grain overlay into the canvas container so it textures the
      // map tiles but stays below the city-card markers, which MapLibre appends
      // to this same container after load. As a sibling of the map it would
      // paint over the cards instead (the canvas and markers share one
      // container, so an outside z-index can't slot between them).
      const grain = document.createElement('div');
      grain.setAttribute('aria-hidden', 'true');
      grain.className = 'pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply';
      grain.style.backgroundImage = GRAIN_IMAGE;
      grain.style.backgroundRepeat = 'repeat';
      mapInstance.getCanvasContainer().appendChild(grain);

      setMap(mapInstance);
    });

    return () => {
      setMap(null);
      mapInstance.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once on mount
  }, []);

  // Drive the camera: fly to the focused city in detail mode, otherwise frame
  // the whole itinerary (without animation, to avoid jank on view changes).
  useEffect(() => {
    if (!map) return;
    if (focusCity) {
      map.flyTo({ center: [focusCity.lon, focusCity.lat], zoom: DETAIL_ZOOM, duration: 800 });
      return;
    }
    frameItinerary(false);
  }, [map, focusCity, frameItinerary]);

  // Hide the recenter control in detail mode: the detail card's close button
  // already returns to the itinerary, and recentering there would leave the
  // camera in overview while the detail overlay stays open.
  useEffect(() => {
    if (recenterControlRef.current) {
      recenterControlRef.current.style.display = focusCity ? 'none' : '';
    }
  }, [map, focusCity]);

  // Hide the whole zoom/recenter control stack while non-interactive (e.g. a
  // different tab is showing on top of the map).
  useEffect(() => {
    if (controlsContainerRef.current) {
      controlsContainerRef.current.style.display = interactive ? '' : 'none';
    }
  }, [interactive]);

  // Disable map gestures entirely while non-interactive, instead of tearing
  // down and recreating the map instance.
  useEffect(() => {
    if (!map) return;
    const handlers = [
      map.dragPan,
      map.scrollZoom,
      map.boxZoom,
      map.dragRotate,
      map.keyboard,
      map.doubleClickZoom,
      map.touchZoomRotate,
    ];
    if (interactive) {
      handlers.forEach((handler) => handler.enable());
    } else {
      handlers.forEach((handler) => handler.disable());
    }
  }, [map, interactive]);

  return (
    <div className="bg-beige-200 relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div
        aria-hidden
        className="from-beige-200 pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent"
      />
      <div
        aria-hidden
        className="from-beige-200 pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent"
      />
      {map && showRoute && !focusCity && interactive && <RouteLayer map={map} cities={cityList} />}
      {map && !focusCity && interactive && (
        <CityCardLayer map={map} cities={cityList} onCityExpand={onCityExpand} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors/warnings.

- [ ] **Step 4: Commit**

```bash
git add components/panels/map/map-canvas.tsx
git commit -m "feat(map): add interactive prop to gate route/cards/controls/gestures"
```

---

### Task 2: `PanelMap` forwards `interactive`

**Files:**
- Modify: `components/panels/map/panel-map.tsx` (full new content below)

**Interfaces:**
- Consumes: `MapCanvasProps.interactive` from Task 1 (same name/type, passed straight through).
- Produces: `PanelMapProps.interactive?: boolean` (default `true`). Task 4 passes this.

- [ ] **Step 1: Replace the file content**

Replace the entire file with:

```tsx
'use client';

import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CityDetailCard } from '@/components/panels/map/city-detail-card';
import { CityExperiencesPanel } from '@/components/panels/map/city-experiences-panel';
import { useFrontendIntent } from '@/hooks/use-frontend-intent';
import type { Experience } from '@/lib/agent-ui/commands';
import { useAddedExperiences, useSetViewFromUser } from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import type { City } from '@/lib/map/cities';
import { parseCityDays } from '@/lib/map/parse-city-days';

const MapCanvas = dynamic(
  () => import('@/components/panels/map/map-canvas').then((m) => m.MapCanvas),
  {
    ssr: false,
    loading: () => <div className="bg-beige-200 h-full w-full" />,
  }
);

type PanelMapProps = {
  view: Extract<UiView, { type: 'itinerary' }>;
  // False renders the map as a static, non-interactive background (e.g. when
  // a different itinerary tab is showing on top). Defaults to true so every
  // existing call site keeps behaving exactly as before.
  interactive?: boolean;
};

export function PanelMap({ view, interactive = true }: PanelMapProps) {
  const setViewFromUser = useSetViewFromUser();
  const sendIntent = useFrontendIntent();
  const addedExperiences = useAddedExperiences();

  const { itinerary, detailCityId, detailExperienceId } = view;

  const detailCity =
    detailCityId && itinerary
      ? (itinerary.cities.find((c) => c.id === detailCityId) ?? null)
      : null;

  // `days` is the full day list (e.g. "Days 1, 2, 6 & 7"); `day_details` only
  // carries descriptions for some of them, so it's not the source of options.
  const dayOptions = detailCity ? parseCityDays(detailCity.days) : [];

  const handleCityExpand = useCallback(
    (city: City) => {
      setViewFromUser({ type: 'itinerary', itinerary, detailCityId: city.id });
      void sendIntent('explore_destination', {
        entities: { destination_id: city.id },
        userMessage: `User opened ${city.name} detail`,
      });
    },
    [setViewFromUser, sendIntent, itinerary]
  );

  const handleClose = useCallback(() => {
    setViewFromUser({ type: 'itinerary', itinerary });
    void sendIntent('view_itinerary', {
      entities: { itinerary_name: itinerary?.name },
      userMessage: 'User returned to the itinerary',
    });
  }, [setViewFromUser, sendIntent, itinerary]);

  const handleExperienceExplore = useCallback(
    (experience: Experience) => {
      void sendIntent('explore_experience', {
        entities: { experience_id: experience.id },
        userMessage: `User opened ${experience.name} detail`,
      });
    },
    [sendIntent]
  );

  const handleExperienceConfirm = useCallback(
    (experience: Experience, day: string) => {
      void sendIntent('select_experience', {
        entities: { experience_id: experience.id, day },
        userMessage: `User added ${experience.name} for ${day}`,
      });
    },
    [sendIntent]
  );

  return (
    <div className="absolute inset-0">
      <MapCanvas
        cities={itinerary?.cities}
        center={itinerary?.center}
        zoom={itinerary?.zoom}
        focusCity={detailCity ?? undefined}
        onCityExpand={handleCityExpand}
        showRoute
        interactive={interactive}
      />
      {detailCity && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-4 p-6">
          <CityDetailCard city={detailCity} onClose={handleClose} />
          {detailCity.experiences && detailCity.experiences.length > 0 && (
            <CityExperiencesPanel
              experiences={detailCity.experiences}
              detailExperienceId={detailExperienceId ?? null}
              dayOptions={dayOptions}
              addedExperiences={addedExperiences}
              onExplore={handleExperienceExplore}
              onConfirm={handleExperienceConfirm}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors/warnings.

- [ ] **Step 4: Commit**

```bash
git add components/panels/map/panel-map.tsx
git commit -m "feat(map): forward interactive prop from PanelMap to MapCanvas"
```

---

### Task 3: `ExcursionsPanel` pointer-events for the map underneath

**Files:**
- Modify: `components/panels/itinerary/excursions-panel.tsx` (full new content below)

**Interfaces:**
- No signature change — `ExcursionsPanel({ itinerary }: { itinerary: ItineraryFull | undefined })` stays the same. Only `className`s change.

- [ ] **Step 1: Replace the file content**

Replace the entire file with:

```tsx
'use client';

import Image from 'next/image';
import { CityExperiencesPanel } from '@/components/panels/map/city-experiences-panel';
import { Card } from '@/components/ui/card';
import type { ItineraryFull } from '@/lib/agent-ui/commands';
import { useAddedExperiences } from '@/lib/agent-ui/hooks';
import { parseCityDays } from '@/lib/map/parse-city-days';

const CARD_WIDTH = 380;

type ExcursionsPanelProps = {
  itinerary: ItineraryFull | undefined;
};

export function ExcursionsPanel({ itinerary }: ExcursionsPanelProps) {
  const addedExperiences = useAddedExperiences();
  const cities = itinerary?.cities ?? [];
  const experiences = cities.flatMap((city) => city.experiences ?? []);
  const dayOptions = Array.from(new Set(cities.flatMap((city) => parseCityDays(city.days))));

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-4 p-6">
      <CruiseHeroCard />
      <CityExperiencesPanel
        experiences={experiences}
        detailExperienceId={null}
        dayOptions={dayOptions}
        addedExperiences={addedExperiences}
        onExplore={() => {}}
        onConfirm={() => {}}
      />
    </div>
  );
}

function CruiseHeroCard() {
  return (
    <Card
      className="bg-beige-50 border-beige-400/50 pointer-events-auto flex max-h-full flex-col gap-0 overflow-hidden rounded-2xl p-3 shadow-none"
      style={{ width: CARD_WIDTH }}
    >
      <div className="relative h-[200px] w-full shrink-0">
        <Image
          src="/hero-image.jpg"
          alt="Riverside cruise along the Danube"
          fill
          sizes="356px"
          className="rounded-lg object-cover"
        />
      </div>
      <div className="mt-4 flex flex-col gap-4 px-2 pb-2">
        <div>
          <p className="text-2xl leading-tight">Danube Legends</p>
          <p className="text-primary mt-1 text-sm leading-relaxed">
            Explore Riverside luxury along the Danube, visiting Budapest, Bratislava and Vienna.
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
            Time spent
          </p>
          <p className="text-primary mt-1 text-sm">Mostly on board</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
            Perfect for
          </p>
          <p className="text-primary mt-1 text-sm">Romantic getaways</p>
        </div>
      </div>
    </Card>
  );
}
```

Note: `CityExperiencesPanel`'s own root div already sets `pointer-events-auto` internally (`components/panels/map/city-experiences-panel.tsx:41`) — it needs no change.

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors/warnings.

- [ ] **Step 4: Commit**

```bash
git add components/panels/itinerary/excursions-panel.tsx
git commit -m "feat(itinerary): pointer-events-none wrapper so the map underneath can't be clicked through empty space"
```

---

### Task 4: `ItineraryPanel` keeps both panels mounted

**Files:**
- Modify: `components/panels/itinerary/itinerary-panel.tsx` (full new content below)

**Interfaces:**
- Consumes: `PanelMapProps.interactive` from Task 2; `ExcursionsPanel` from Task 3 (signature unchanged); `useSetViewFromUser` from `@/lib/agent-ui/hooks` (existing, same hook `PanelMap` already uses — returns `(view: UiView) => void`); `cn` from `@/lib/shadcn/utils`.
- Produces: no exported signature change — `ItineraryPanel({ view }: { view: Extract<UiView, { type: 'itinerary' }> })` stays the same, so `itinerary-view.tsx` needs no change.

- [ ] **Step 1: Replace the file content**

Replace the entire file with:

```tsx
'use client';

import { useCallback, useState } from 'react';
import { ExcursionsPanel } from '@/components/panels/itinerary/excursions-panel';
import { type ItineraryTab, ItineraryTabs } from '@/components/panels/itinerary/itinerary-tabs';
import { PanelMap } from '@/components/panels/map/panel-map';
import { useSetViewFromUser } from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { cn } from '@/lib/shadcn/utils';

type ItineraryPanelProps = {
  view: Extract<UiView, { type: 'itinerary' }>;
};

export function ItineraryPanel({ view }: ItineraryPanelProps) {
  const [activeTab, setActiveTab] = useState<ItineraryTab>('overview');
  const setViewFromUser = useSetViewFromUser();
  const { itinerary, detailCityId } = view;

  // Switching to Excursions with a city detail open silently collapses it —
  // this is tab-switch cleanup, not a user action on the itinerary, so it
  // sends no agent intent (unlike CityDetailCard's own close button).
  const handleTabChange = useCallback(
    (tab: ItineraryTab) => {
      setActiveTab(tab);
      if (tab === 'excursions' && detailCityId) {
        setViewFromUser({ type: 'itinerary', itinerary });
      }
    },
    [detailCityId, itinerary, setViewFromUser]
  );

  return (
    <div className="absolute inset-0">
      <div className={cn('absolute inset-0', activeTab !== 'overview' && 'pointer-events-none')}>
        <PanelMap view={view} interactive={activeTab === 'overview'} />
      </div>
      <div
        className={cn(
          'absolute inset-0',
          activeTab !== 'excursions' && 'pointer-events-none opacity-0'
        )}
      >
        <ExcursionsPanel itinerary={itinerary} />
      </div>
      <div className="absolute top-6 left-6 z-20">
        <ItineraryTabs value={activeTab} onChange={handleTabChange} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors/warnings.

- [ ] **Step 4: Run the existing test suite**

Run: `pnpm test`
Expected: all 169 existing tests still pass (this plan touches no file under `lib/`).

- [ ] **Step 5: Commit**

```bash
git add components/panels/itinerary/itinerary-panel.tsx
git commit -m "feat(itinerary): keep map mounted behind Excursions instead of unmounting it"
```

- [ ] **Step 6: Manual verification (dev panel)**

Per `conventions/testing.md`, UI is verified visually, not via automated component tests. Run locally and check:

Run: `pnpm dev`

Then in the browser:
1. Open the dev panel, pick view `itinerary`, mock `danube_legends`, Apply.
2. Pan/zoom the map a bit in Overview, then expand a city (click its card) so the detail overlay is open.
3. Click "Excursions": the city detail overlay disappears, the map stays visible at the exact pan/zoom position from step 2 (no re-fit, no reload flash), but with no route line, no floating city cards, and no zoom/recenter buttons. The cruise hero card + aggregated experiences list appear on top.
4. Try to drag/scroll the map in the background: nothing happens (pan/zoom disabled).
5. Click "Overview": the city detail from step 2 is gone (closed silently), the map reappears fully interactive at the same pan/zoom position, with route/city-cards/controls back.

This step has no pass/fail command output to paste — confirm each point visually and note any mismatch before moving on.

---

## Plan Self-Review

- **Spec coverage:** map stays mounted/interactive gating (Task 1 + 2) ✓, `ExcursionsPanel` pointer-events for the overlay-over-map pattern (Task 3) ✓, both panels always mounted + silent city-detail collapse on tab switch (Task 4) ✓. No agent intent added for the auto-collapse, matching the spec's explicit decision.
- **No placeholders:** every step has complete, exact code.
- **Type consistency:** `interactive?: boolean` name/default (`true`) identical across `MapCanvasProps` (Task 1) and `PanelMapProps` (Task 2). `ItineraryPanel`'s exported signature is unchanged, so no downstream file (`itinerary-view.tsx`, `view-registry.ts`) needs touching.
