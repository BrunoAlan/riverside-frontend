'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CityCardLayer } from '@/components/panels/map/city-card-layer';
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

// Camera padding (px) when auto-fitting to cities, so cards — which anchor
// centered and cascade up-left — and the top/bottom gradients don't clip.
const FIT_PADDING = { top: 130, bottom: 100, left: 150, right: 130 };
// Cap auto-fit zoom so two near-adjacent cities don't snap to extreme zoom.
const FIT_MAX_ZOOM = 9;
// Zoom level the camera flies to when focusing a single city in detail mode.
const DETAIL_ZOOM = 8.5;

type MapCanvasProps = {
  cities?: City[];
  center?: [number, number];
  zoom?: number;
  focusCity?: City;
  onCityExpand?: (city: City) => void;
};

export function MapCanvas({
  cities: cityList = cities,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  focusCity,
  onCityExpand,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);

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
      attributionControl: false,
    });

    mapInstance.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    mapInstance.on('load', () => setMap(mapInstance));

    return () => {
      setMap(null);
      mapInstance.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once on mount
  }, []);

  // Frame the cities: fit the camera to their bounds so cards spread out as
  // closely as the viewport allows instead of stacking. With fewer than two
  // cities there's nothing to fit, so fall back to the explicit center/zoom.
  useEffect(() => {
    if (!map) return;
    if (focusCity) {
      map.flyTo({ center: [focusCity.lon, focusCity.lat], zoom: DETAIL_ZOOM, duration: 800 });
      return;
    }
    if (cityList.length >= 2) {
      const bounds = cityBounds(cityList);
      if (bounds) {
        map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM, animate: false });
        return;
      }
    }
    map.jumpTo({ center, zoom });
  }, [map, cityList, center, zoom, focusCity]);

  return (
    <div className="bg-beige-200 relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
        style={{ backgroundImage: GRAIN_IMAGE, backgroundRepeat: 'repeat' }}
      />
      <div
        aria-hidden
        className="from-beige-200 pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent"
      />
      <div
        aria-hidden
        className="from-beige-200 pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent"
      />
      {map && !focusCity && (
        <CityCardLayer map={map} cities={cityList} onCityExpand={onCityExpand} />
      )}
    </div>
  );
}
