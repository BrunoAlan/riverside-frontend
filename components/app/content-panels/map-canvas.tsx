'use client';

import { useEffect, useRef } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CityCard } from '@/components/app/content-panels/city-card';
import { type City, cities } from '@/lib/map/cities';
import { parchmentStyle } from '@/lib/map/parchment-style';

// Paper-grain texture for the parchment look. The seamless feTurbulence tile
// lives in public/map/grain.svg (edit it there to tune the grain). Applied as a
// repeating background on an overlay div with mix-blend-multiply.
const GRAIN_IMAGE = "url('/map/grain.svg')";

type MapCanvasProps = {
  onCityExpand?: (city: City) => void;
};

export function MapCanvas({ onCityExpand }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: parchmentStyle,
      center: [17.5, 48.0],
      zoom: 6.8,
      attributionControl: { compact: true },
    });

    const markers: maplibregl.Marker[] = [];
    const roots: Root[] = [];

    for (const city of cities) {
      const el = document.createElement('div');
      const root = createRoot(el);
      root.render(<CityCard city={city} onExpand={onCityExpand} />);
      roots.push(root);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([city.lon, city.lat])
        .addTo(map);
      markers.push(marker);
    }

    return () => {
      markers.forEach((marker) => marker.remove());
      roots.forEach((root) => root.unmount());
      map.remove();
    };
  }, [onCityExpand]);

  return (
    <div className="bg-beige-200 relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
        style={{ backgroundImage: GRAIN_IMAGE, backgroundRepeat: 'repeat' }}
      />
    </div>
  );
}
