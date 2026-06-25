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
};

export function MapCanvas({
  cities: cityList = cities,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  focusCity,
  onCityExpand,
  showRoute,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  // The recenter control's click handler is bound once at map creation, so it
  // reads the latest framing fn through this ref instead of a stale closure.
  const frameItineraryRef = useRef<((animate: boolean) => void) | null>(null);
  // The recenter control element, hidden in detail mode (see effect below).
  const recenterControlRef = useRef<HTMLElement | null>(null);

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
      {map && showRoute && !focusCity && <RouteLayer map={map} cities={cityList} />}
      {map && !focusCity && (
        <CityCardLayer map={map} cities={cityList} onCityExpand={onCityExpand} />
      )}
    </div>
  );
}
