// lib/map/danube-path.ts

// The Danube's course over the itinerary reach (Wachau Valley → Vienna →
// Bratislava), ordered west-to-east as [lon, lat] pairs.
//
// Source: OpenStreetMap, ODbL. Extracted once via the Overpass API and embedded
// as static data — no runtime fetch. To regenerate, query the Danube river ways
// over the reach, stitch them into one west-to-east line, and simplify:
//
//   [out:json][timeout:120];
//   way["waterway"="river"]["name:en"="Danube"](48.05,15.30,48.45,17.20);
//   out geom;
//
// then stitch by shared endpoints, clip to lon 15.50–17.12, and run
// Douglas–Peucker at tolerance 0.0025°.
export const DANUBE_COORDINATES: [number, number][] = [
  [15.5594, 48.39135],
  [15.58707, 48.40099],
  [15.6271, 48.40338],
  [15.64779, 48.39784],
  [15.66888, 48.38144],
  [15.71099, 48.38826],
  [15.74363, 48.37196],
  [15.76408, 48.37308],
  [15.792, 48.38139],
  [15.85048, 48.3797],
  [15.87413, 48.37052],
  [15.89247, 48.3535],
  [15.94206, 48.33993],
  [15.99991, 48.34234],
  [16.02677, 48.33487],
  [16.1024, 48.33392],
  [16.16528, 48.3396],
  [16.21706, 48.35039],
  [16.28327, 48.35215],
  [16.32733, 48.33317],
  [16.34627, 48.29268],
  [16.38055, 48.25089],
  [16.41291, 48.22288],
  [16.48128, 48.17429],
  [16.54394, 48.143],
  [16.584, 48.13375],
  [16.65321, 48.12768],
  [16.68938, 48.11823],
  [16.73685, 48.12853],
  [16.79697, 48.11613],
  [16.86917, 48.12884],
  [16.908, 48.14642],
  [16.93606, 48.1495],
  [16.94331, 48.15254],
  [16.95863, 48.17026],
  [16.97032, 48.17333],
  [17.03268, 48.14019],
  [17.06657, 48.14356],
  [17.11915, 48.13822],
];
