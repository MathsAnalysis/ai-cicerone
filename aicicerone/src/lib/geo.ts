export type LatLng = [number, number];
export type Fix = { lat: number; lng: number; acc: number };
export type Arrival = { n: number; count: number } | null;

export const GEO = {
  radius: 50,
  hits: 3,
  accRatio: 1.2,
  arrivalMaxAcc: 30,
  maxAcc: 200,
  maxAge: 15000,
  minMove: 2,
  walk: 2,
  far: 1000,
  simWait: 15000,
  simDelay: 7000,
  reroute: 80,
} as const;

export function dist(a: LatLng, b: LatLng): number {
  const R = 6371e3;
  const x = ((b[0] - a[0]) * Math.PI) / 180;
  const y = ((b[1] - a[1]) * Math.PI) / 180 * Math.cos((a[0] * Math.PI) / 180);
  return R * Math.sqrt(x * x + y * y);
}

export function fmtDist(m: number, lang: string): string {
  if (m < 1000) return `${Math.max(5, Math.round(m / 5) * 5)} m`;
  return `${(m / 1000).toLocaleString(lang, { maximumFractionDigits: 1 })} km`;
}

export function nearest(fix: Fix, stops: readonly { c: LatLng }[]): { n: number; d: number } {
  let n = -1;
  let d = Infinity;
  for (let i = 0; i < stops.length; i++) {
    const di = dist([fix.lat, fix.lng], stops[i].c);
    if (di < d) { d = di; n = i; }
  }
  return { n, d };
}

export function smooth(prev: Fix | null, fix: Fix, dt: number): Fix {
  if (!prev) return fix;
  const drift = GEO.walk * Math.max(0, dt);
  const v = prev.acc * prev.acc + drift * drift;
  const k = v / (v + fix.acc * fix.acc);
  return { lat: prev.lat + k * (fix.lat - prev.lat), lng: prev.lng + k * (fix.lng - prev.lng), acc: fix.acc };
}

export function arrivalRadius(stops: readonly { c: LatLng; r?: number }[], current: number): number {
  const stop = stops[current];
  if (!stop) return 0;
  let radius = Math.min(GEO.radius, stop.r ?? GEO.radius);
  for (let i = 0; i < stops.length; i++) {
    if (i === current) continue;
    const distance = dist(stop.c, stops[i].c);
    // Reserve a gap between neighbouring areas; never grow after a stop is visited.
    if (distance < 2 * GEO.radius) radius = Math.min(radius, distance * 0.45);
  }
  return radius;
}

export function checkArrival(
  prev: Arrival,
  fix: Fix,
  stops: readonly { c: LatLng; r?: number }[],
  skip: ReadonlySet<number>,
  current: number,
): { next: Arrival; arrived: number | null } {
  if (![fix.lat, fix.lng, fix.acc].every(Number.isFinite) || fix.acc <= 0 || Math.abs(fix.lat) > 90 || Math.abs(fix.lng) > 180) return { next: null, arrived: null };
  const { n, d } = nearest(fix, stops);
  if (n < 0 || n !== current) return { next: null, arrived: null };
  if (prev?.n !== current) prev = null;
  const r = arrivalRadius(stops, n);
  if (fix.acc > Math.min(GEO.arrivalMaxAcc, r * GEO.accRatio)) return { next: null, arrived: null };
  if (skip.has(n) || d > r) return { next: null, arrived: null };
  const count = prev && prev.n === n ? prev.count + 1 : 1;
  if (count >= GEO.hits) return { next: null, arrived: n };
  return { next: { n, count }, arrived: null };
}
