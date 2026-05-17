'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CityCardLayer } from '@/components/app/content-panels/city-card-layer';
import { type City, cities } from '@/lib/map/cities';
import { parchmentStyle } from '@/lib/map/parchment-style';

// Paper-grain texture for the parchment look. The seamless feTurbulence tile
// lives in public/map/grain.svg (edit it there to tune the grain). Applied as a
// repeating background on an overlay div with mix-blend-multiply.
const GRAIN_IMAGE = "url('/map/grain.svg')";

// Module-level defaults so omitted props keep a stable reference across renders.
const DEFAULT_CENTER: [number, number] = [17.5, 48.0];
const DEFAULT_ZOOM = 6.8;

type MapCanvasProps = {
  cities?: City[];
  center?: [number, number];
  zoom?: number;
  onCityExpand?: (city: City) => void;
};

export function MapCanvas({
  cities: cityList = cities,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
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
      attributionControl: { compact: true },
    });

    mapInstance.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    mapInstance.on('load', () => setMap(mapInstance));

    return () => {
      setMap(null);
      mapInstance.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once on mount
  }, []);

  // Move the camera when center/zoom change, without recreating the map.
  useEffect(() => {
    map?.jumpTo({ center, zoom });
  }, [map, center, zoom]);

  return (
    <div className="bg-beige-200 relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
        style={{ backgroundImage: GRAIN_IMAGE, backgroundRepeat: 'repeat' }}
      />
      {map && <CityCardLayer map={map} cities={cityList} onCityExpand={onCityExpand} />}
    </div>
  );
}
