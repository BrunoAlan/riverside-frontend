'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { parchmentStyle } from '@/lib/map/parchment-style';

// Paper-grain texture for the parchment look. The seamless feTurbulence tile
// lives in public/map/grain.svg (edit it there to tune the grain). Applied as a
// repeating background on an overlay div with mix-blend-multiply.
const GRAIN_IMAGE = "url('/map/grain.svg')";

export function MapCanvas() {
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

    return () => {
      map.remove();
    };
  }, []);

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
