'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { parchmentStyle } from '@/lib/map/parchment-style';

const GRAIN_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: parchmentStyle,
      center: [15.6, 48.15],
      zoom: 6.6,
      attributionControl: { compact: true },
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="bg-beige-200 relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply"
        style={{ backgroundImage: GRAIN_DATA_URI, backgroundRepeat: 'repeat' }}
      />
    </div>
  );
}
