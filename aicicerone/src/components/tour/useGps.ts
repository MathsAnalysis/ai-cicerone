import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Dict } from '../../i18n';
import { GEO, checkArrival, fmtDist, nearest, type Arrival, type Fix } from '../../lib/geo';
import type { StopItem } from '../../lib/stops';

// Tracciamento in primo piano: watchPosition ad alta precisione + Wake Lock per tenere lo schermo
// acceso (in background il browser non riceve fix). Se non arriva un fix utile — permesso negato,
// niente segnale, HTTPS assente, utente a più di 1 km dal tour — parte la simulazione demo.
// ponytail: geofencing in background = app nativa/Capacitor (NOTE §6), fuori dalla portata del web.

export type Gps = { on: boolean; sim: boolean; pos: Fix | null };

type Opts = {
  stops: StopItem[];
  current: number;
  skip: ReadonlySet<number>;
  playerOpen: boolean;
  lang: string;
  T: Dict;
  onArrive: (n: number) => void;
  onSnack: (msg: string, ms?: number) => void;
};

export function useGps(opts: Opts): { gps: Gps; toggle: () => void } {
  const [on, setOn] = useState(false);
  const [sim, setSim] = useState(false);
  const [pos, setPos] = useState<Fix | null>(null);
  const o = useRef(opts);
  o.current = opts;
  const live = useRef({ on: false, sim: false, pos: null as Fix | null });
  const watch = useRef<number | null>(null);
  const simTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lock = useRef<WakeLockSentinel | null>(null);
  const arrival = useRef<Arrival>(null);
  const hit = useRef(new Set<number>());

  const armSim = useCallback(() => {
    if (simTimer.current) clearTimeout(simTimer.current);
    simTimer.current = setTimeout(() => {
      if (live.current.on && live.current.sim && !o.current.playerOpen) o.current.onArrive(o.current.current);
    }, GEO.simDelay);
  }, []);

  const simMode = useCallback((msg: string) => {
    if (live.current.sim) return;
    live.current.sim = true;
    setSim(true);
    o.current.onSnack(msg, 4200);
    armSim();
  }, [armSim]);

  const wake = useCallback(async () => {
    try {
      lock.current = await navigator.wakeLock?.request('screen');
    } catch {
      // schermo non bloccabile (batteria bassa, tab nascosta): il tracciamento prosegue comunque
    }
  }, []);

  const onFix = useCallback((p: GeolocationPosition) => {
    const fix: Fix = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
    const first = !live.current.pos;
    live.current.pos = fix;
    setPos(fix);
    if (first && !live.current.sim) {
      if (simTimer.current) clearTimeout(simTimer.current);
      o.current.onSnack(`${o.current.T.gpsFix} ±${Math.round(fix.acc)} m`);
    }
    const { d } = nearest(fix, o.current.stops);
    if (d > GEO.far) { simMode(`${fmtDist(d, o.current.lang)} ${o.current.T.gpsFar}`); return; }
    if (live.current.sim) return;
    const skip = new Set<number>([...o.current.skip, ...hit.current]);
    const r = checkArrival(arrival.current, fix, o.current.stops, skip);
    arrival.current = r.next;
    if (r.arrived != null) {
      hit.current.add(r.arrived);
      o.current.onArrive(r.arrived);
    }
  }, [simMode]);

  const onErr = useCallback((e: GeolocationPositionError) => {
    if (live.current.pos) return;
    simMode(e.code === e.PERMISSION_DENIED ? o.current.T.gpsDenied : o.current.T.gpsSim);
  }, [simMode]);

  const stop = useCallback(() => {
    live.current = { on: false, sim: false, pos: null };
    setOn(false); setSim(false); setPos(null);
    if (simTimer.current) clearTimeout(simTimer.current);
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    arrival.current = null;
    hit.current.clear();
    lock.current?.release().catch(() => {});
    lock.current = null;
  }, []);

  const start = useCallback(() => {
    live.current = { on: true, sim: false, pos: null };
    setOn(true); setSim(false); setPos(null);
    hit.current.clear();
    arrival.current = null;
    if (!('geolocation' in navigator)) { simMode(o.current.T.gpsSim); return; }
    if (!window.isSecureContext) { simMode(o.current.T.gpsHttps); return; }
    o.current.onSnack(o.current.T.gpsSnack);
    void wake();
    simTimer.current = setTimeout(() => { if (!live.current.pos) simMode(o.current.T.gpsSim); }, GEO.simDelay);
    watch.current = navigator.geolocation.watchPosition(onFix, onErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 });
  }, [onErr, onFix, simMode, wake]);

  const toggle = useCallback(() => (live.current.on ? stop() : start()), [start, stop]);

  // La simulazione demo incatena le tappe: si riarma a ogni cambio tappa e alla chiusura del player.
  useEffect(() => {
    if (on && sim) armSim();
  }, [on, sim, opts.current, opts.playerOpen, armSim]);

  useEffect(() => {
    const onVis = () => { if (live.current.on && document.visibilityState === 'visible') void wake(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); stop(); };
  }, [stop, wake]);

  return { gps: { on, sim, pos }, toggle };
}
