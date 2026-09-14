import { useEffect, useRef, useState } from 'preact/hooks';
import type { Map as MlMap, Marker as MlMarker, GeoJSONSource } from 'maplibre-gl';
// MapLibre cerca il worker accanto al proprio modulo (`./maplibre-gl-worker.mjs`), che dopo il bundling
// non esiste: lo facciamo impacchettare a Vite e passiamo l'URL con setWorkerUrl.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { GEO, dist, type Fix, type LatLng } from '../../lib/geo';
import { leg, loadRoute } from '../../lib/route';
import type { StopItem } from '../../lib/stops';

type Props = {
  routeKey: string;
  center: LatLng;
  stops: StopItem[];
  current: number;
  done: ReadonlySet<number>;
  pos: Fix | null;
  follow: boolean; // GPS reale attivo (non simulazione): la vista segue utente + tappa
  onPick: (n: number) => void;
};

type ML = typeof import('maplibre-gl');

// MapLibre GL (open source, senza token) su tile vettoriali OpenFreeMap (OpenStreetMap, gratuite,
// senza registrazione né limiti). Stile "liberty": strade, nomi, punti d'interesse ed edifici a colori.
const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const lngLat = (c: LatLng): [number, number] => [c[1], c[0]];
const line = (pts: LatLng[], props: Record<string, unknown> = {}) => ({ type: 'Feature' as const, properties: props, geometry: { type: 'LineString' as const, coordinates: pts.map(lngLat) } });
const empty = () => ({ type: 'FeatureCollection' as const, features: [] as ReturnType<typeof line>[] });

// Poligono approssimato del cerchio di precisione (raggio in metri).
function circle(p: Fix, n = 48) {
  const dLat = p.acc / 111_320;
  const dLng = p.acc / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI;
    ring.push([p.lng + dLng * Math.cos(a), p.lat + dLat * Math.sin(a)]);
  }
  return { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [ring] } }] };
}

export default function TourMap({ routeKey, center, stops, current, done, pos, follow, onPick }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const ml = useRef<ML | null>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef<MlMarker[]>([]);
  const me = useRef<MlMarker | null>(null);
  const navFrom = useRef<{ n: number; at: LatLng } | null>(null);
  const [ready, setReady] = useState(0);
  const [legs, setLegs] = useState<LatLng[][] | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    let alive = true;
    (async () => {
      const mod = await import('maplibre-gl');
      const lib = ((mod as { default?: ML }).default ?? mod) as ML;
      if (!alive || !el.current) return;
      ml.current = lib;
      lib.setWorkerUrl(workerUrl);
      const m = new lib.Map({ container: el.current, style: STYLE, center: lngLat(center), zoom: 14.5, attributionControl: { compact: true } });
      m.addControl(new lib.NavigationControl({ showCompass: false }), 'bottom-right');
      m.on('error', (e) => console.warn('maplibre:', e.error?.message ?? e));
      if (import.meta.env.DEV) (window as unknown as { __map?: MlMap }).__map = m;
      m.on('load', () => {
        m.addSource('legs', { type: 'geojson', data: empty() });
        m.addLayer({ id: 'legs-casing', type: 'line', source: 'legs', paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.85 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addLayer({ id: 'legs-todo', type: 'line', source: 'legs', paint: { 'line-color': '#6B7580', 'line-width': 3, 'line-dasharray': [1, 2.2], 'line-opacity': 0.9 }, layout: { 'line-cap': 'round' } });
        m.addLayer({ id: 'legs-done', type: 'line', source: 'legs', filter: ['==', ['get', 'done'], true], paint: { 'line-color': '#2C5F8A', 'line-width': 4, 'line-opacity': 0.95 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addSource('nav', { type: 'geojson', data: empty() });
        m.addLayer({ id: 'nav-casing', type: 'line', source: 'nav', paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addLayer({ id: 'nav-line', type: 'line', source: 'nav', paint: { 'line-color': '#B85C38', 'line-width': 4.5, 'line-opacity': 0.95 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addSource('acc', { type: 'geojson', data: empty() });
        m.addLayer({ id: 'acc-fill', type: 'fill', source: 'acc', paint: { 'fill-color': '#2C5F8A', 'fill-opacity': 0.08 } });
        m.addLayer({ id: 'acc-line', type: 'line', source: 'acc', paint: { 'line-color': '#2C5F8A', 'line-width': 1, 'line-opacity': 0.35 } });
        if (alive) setReady(1);
      });
      map.current = m;
    })();
    return () => {
      alive = false;
      markers.current.forEach((k) => k.remove());
      markers.current = [];
      me.current = null;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLegs(null);
    loadRoute(routeKey, stops.map((s) => s.c)).then((l) => { if (alive) setLegs(l); });
    return () => { alive = false; };
  }, [routeKey]);

  // Tratte, marcatori e inquadratura.
  useEffect(() => {
    const lib = ml.current; const m = map.current;
    if (!lib || !m || !ready) return;
    const shown = legs ?? stops.slice(1).map((s, i) => [stops[i].c, s.c]);
    (m.getSource('legs') as GeoJSONSource).setData({ type: 'FeatureCollection', features: shown.map((pts, i) => line(pts, { done: i < current })) });
    markers.current.forEach((k) => k.remove());
    markers.current = stops.map((s, n) => {
      const cur = n === current;
      const node = document.createElement('div');
      node.className = `mk${cur ? ' cur' : ''}${done.has(n) && !cur ? ' done' : ''}${s.isOpt ? ' opt' : ''}`;
      const b = document.createElement('b');
      b.textContent = s.num;
      node.appendChild(b);
      if (cur) {
        const label = document.createElement('span');
        label.className = 'mklabel';
        label.textContent = s.t;
        node.appendChild(label);
      }
      node.addEventListener('click', () => pick.current(n));
      return new lib.Marker({ element: node, anchor: 'center' }).setLngLat(lngLat(s.c)).addTo(m);
    });
    if (follow && pos) m.fitBounds(new lib.LngLatBounds(lngLat([pos.lat, pos.lng]), lngLat([pos.lat, pos.lng])).extend(lngLat(stops[current].c)), { padding: 40, maxZoom: 17, duration: 600 });
    else m.easeTo({ center: lngLat(stops[current].c), zoom: current === 0 ? 14.5 : 16, duration: 600 });
    const t = setTimeout(() => map.current?.resize(), 120);
    return () => clearTimeout(t);
  }, [ready, legs, stops, current, done, follow]);

  // Posizione dell'utente: punto blu + cerchio di precisione.
  useEffect(() => {
    const lib = ml.current; const m = map.current;
    if (!lib || !m || !ready) return;
    const acc = m.getSource('acc') as GeoJSONSource;
    if (!pos) {
      me.current?.remove(); me.current = null;
      acc.setData(empty());
      (m.getSource('nav') as GeoJSONSource).setData(empty());
      navFrom.current = null;
      return;
    }
    const ll = lngLat([pos.lat, pos.lng]);
    acc.setData(circle(pos));
    if (!me.current) {
      const node = document.createElement('div');
      node.className = 'me-dot';
      me.current = new lib.Marker({ element: node, anchor: 'center' }).setLngLat(ll).addTo(m);
      if (follow) m.fitBounds(new lib.LngLatBounds(ll, ll).extend(lngLat(stops[current].c)), { padding: 40, maxZoom: 17, duration: 600 });
    } else {
      me.current.setLngLat(ll);
      if (follow && !m.getBounds().contains(ll)) m.panTo(ll);
    }
  }, [ready, pos]);

  // Percorso a piedi dalla posizione attuale alla tappa: ricalcolato se l'utente si sposta di GEO.reroute
  // o cambia tappa. ponytail: una richiesta al router pubblico ogni ~80 m; in produzione router proprio.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const nav = m.getSource('nav') as GeoJSONSource;
    if (!follow || !pos) { nav.setData(empty()); navFrom.current = null; return; }
    const from = navFrom.current;
    const at: LatLng = [pos.lat, pos.lng];
    if (from && from.n === current && dist(at, from.at) < GEO.reroute) return;
    navFrom.current = { n: current, at };
    let alive = true;
    leg(at, stops[current].c).then((pts) => {
      if (!alive || !map.current || navFrom.current?.n !== current) return;
      (map.current.getSource('nav') as GeoJSONSource).setData({ type: 'FeatureCollection', features: [line(pts)] });
    });
    return () => { alive = false; };
  }, [ready, pos, current, follow]);

  return <div ref={el} class="z-0 mt-3 min-h-[210px] flex-1 bg-beige" aria-label="Map" />;
}
