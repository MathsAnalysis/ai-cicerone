import { useEffect, useRef, useState } from 'preact/hooks';
import type * as Leaflet from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GEO, dist, type Fix, type LatLng } from '../../lib/geo';
import { leg, loadRoute } from '../../lib/route';
import type { StopItem } from '../../lib/stops';
import type { MapProps } from './TourMap';

type L = typeof Leaflet;

// Fallback senza WebGL: Leaflet su tile raster Esri "World Street Map" (stradale a colori, gratuite, senza chiave).
// Il servizio arriva al livello 19: oltre, Leaflet ingrandisce quelle tile.
const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const ATTRIB = 'Esri, HERE, Garmin, © OpenStreetMap contributors';

export default function TourMapRaster({ routeKey, center, stops, current, done, pos, follow, onPick }: MapProps) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<L | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const me = useRef<Leaflet.CircleMarker | null>(null);
  const acc = useRef<Leaflet.Circle | null>(null);
  const nav = useRef<Leaflet.Polyline | null>(null);
  const navFrom = useRef<{ n: number; at: LatLng } | null>(null);
  const [ready, setReady] = useState(0);
  const [legs, setLegs] = useState<LatLng[][] | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    let alive = true;
    (async () => {
      const mod = await import('leaflet');
      const lf = ((mod as { default?: L }).default ?? mod) as L;
      if (!alive || !el.current) return;
      L.current = lf;
      const m = lf.map(el.current, { zoomControl: false, attributionControl: true }).setView(center, 15);
      lf.tileLayer(TILES, { maxNativeZoom: 19, maxZoom: 20, attribution: ATTRIB }).addTo(m);
      lf.control.zoom({ position: 'bottomright' }).addTo(m);
      layer.current = lf.layerGroup().addTo(m);
      map.current = m;
      setReady(1);
    })();
    return () => {
      alive = false;
      map.current?.remove();
      map.current = null;
      me.current = acc.current = nav.current = null;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLegs(null);
    loadRoute(routeKey, stops.map((s) => s.c)).then((l) => { if (alive) setLegs(l); });
    return () => { alive = false; };
  }, [routeKey]);

  useEffect(() => {
    const lf = L.current; const m = map.current; const g = layer.current;
    if (!lf || !m || !g) return;
    g.clearLayers();
    const shown = legs ?? stops.slice(1).map((s, i) => [stops[i].c, s.c]);
    shown.forEach((pts, i) => {
      lf.polyline(pts, { color: '#ffffff', weight: 7, opacity: 0.85 }).addTo(g);
      lf.polyline(pts, { color: '#6B7580', weight: 3, dashArray: '2 7', opacity: 0.9 }).addTo(g);
      if (i < current) lf.polyline(pts, { color: '#2C5F8A', weight: 4, opacity: 0.95 }).addTo(g);
    });
    stops.forEach((s, n) => {
      const cur = n === current;
      const cls = `mk${cur ? ' cur' : ''}${done.has(n) && !cur ? ' done' : ''}${s.isOpt ? ' opt' : ''}`;
      const html = `<div class="${cls}"><b>${s.num}</b>${cur ? `<span class="mklabel">${s.t}</span>` : ''}</div>`;
      const size = cur ? 38 : 26;
      lf.marker(s.c, { icon: lf.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] }), zIndexOffset: cur ? 1000 : 0 })
        .addTo(g)
        .on('click', () => pick.current(n));
    });
    if (follow && pos) m.fitBounds([[pos.lat, pos.lng], stops[current].c], { padding: [36, 36], maxZoom: 17 });
    else m.setView(stops[current].c, current === 0 ? 15 : 16, { animate: true });
    const t = setTimeout(() => map.current?.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [ready, legs, stops, current, done, follow]);

  useEffect(() => {
    const lf = L.current; const m = map.current;
    if (!lf || !m) return;
    if (!pos) {
      me.current?.remove(); acc.current?.remove(); nav.current?.remove();
      me.current = acc.current = nav.current = null;
      navFrom.current = null;
      return;
    }
    const ll: LatLng = [pos.lat, pos.lng];
    if (!me.current || !acc.current) {
      acc.current = lf.circle(ll, { radius: pos.acc, color: '#2C5F8A', weight: 1, opacity: 0.35, fillOpacity: 0.08, interactive: false }).addTo(m);
      me.current = lf.circleMarker(ll, { radius: 7, color: '#fff', weight: 2.5, fillColor: '#2C5F8A', fillOpacity: 1, interactive: false }).addTo(m);
      if (follow) m.fitBounds([ll, stops[current].c], { padding: [36, 36], maxZoom: 17 });
    } else {
      acc.current.setLatLng(ll).setRadius(pos.acc);
      me.current.setLatLng(ll);
      if (follow && !m.getBounds().contains(ll)) m.panTo(ll);
    }
  }, [ready, pos]);

  useEffect(() => {
    const lf = L.current; const m = map.current;
    if (!lf || !m) return;
    if (!follow || !pos) { nav.current?.remove(); nav.current = null; navFrom.current = null; return; }
    const from = navFrom.current;
    const at: LatLng = [pos.lat, pos.lng];
    if (from && from.n === current && dist(at, from.at) < GEO.reroute) return;
    navFrom.current = { n: current, at };
    let alive = true;
    leg(at, stops[current].c).then((pts) => {
      if (!alive || !map.current || navFrom.current?.n !== current) return;
      nav.current?.remove();
      nav.current = lf.polyline(pts, { color: '#B85C38', weight: 4.5, opacity: 0.95 }).addTo(map.current);
    });
    return () => { alive = false; };
  }, [ready, pos, current, follow]);

  return <div ref={el} class="z-0 mt-3 min-h-[210px] flex-1 bg-beige" aria-label="Map" />;
}
