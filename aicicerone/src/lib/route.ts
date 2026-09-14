import type { LatLng } from './geo';

// Percorso pedonale reale via OSRM pubblico (nessuna chiave, nessuno SLA).
// ponytail: in produzione precalcolare i tratti tappa→tappa in build e spedirli come GeoJSON (NOTE §5).
const FOOT = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/';

export async function leg(a: LatLng, b: LatLng): Promise<LatLng[]> {
  try {
    const r = await fetch(`${FOOT}${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`);
    const j = await r.json();
    const coords: [number, number][] | undefined = j?.routes?.[0]?.geometry?.coordinates;
    if (coords?.length) return coords.map((c) => [c[1], c[0]]);
  } catch {
    // rete assente o router giù: linea retta
  }
  return [a, b];
}

const cache = new Map<string, Promise<LatLng[][]>>();

export function loadRoute(key: string, points: LatLng[]): Promise<LatLng[][]> {
  let p = cache.get(key);
  if (!p) {
    p = Promise.all(points.slice(1).map((pt, i) => leg(points[i], pt)));
    cache.set(key, p);
  }
  return p;
}
