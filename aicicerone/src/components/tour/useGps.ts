import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Dict } from '../../i18n';
import { GEO, checkArrival, dist, fmtDist, nearest, smooth, type Arrival, type Fix } from '../../lib/geo';
import type { StopItem } from '../../lib/stops';

export type Gps = { on: boolean; sim: boolean; pos: Fix | null; err: string | null };

type Opts = {
  stops: StopItem[];
  current: number;
  skip: ReadonlySet<number>;
  playerOpen: boolean;
  lang: string;
  T: Dict;
  onArrive: (n: number, sim: boolean) => void;
  onSnack: (msg: string, ms?: number) => void;
};

const demo = (): boolean => new URLSearchParams(location.search).has('demo');

export function useGps(opts: Opts): { gps: Gps; toggle: () => void } {
  const [on, setOn] = useState(false);
  const [sim, setSim] = useState(false);
  const [pos, setPos] = useState<Fix | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const o = useRef(opts);
  o.current = opts;
  const live = useRef({ on: false, sim: false, pos: null as Fix | null, at: 0 });
  const shown = useRef<Fix | null>(null);
  const watch = useRef<number | null>(null);
  const simTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lock = useRef<WakeLockSentinel | null>(null);
  const arrival = useRef<Arrival>(null);
  const hit = useRef(new Set<number>());
  const farShown = useRef(false);
  const lastErr = useRef<string | null>(null);

  const armSim = useCallback(() => {
    if (simTimer.current) clearTimeout(simTimer.current);
    simTimer.current = setTimeout(() => {
      if (live.current.on && live.current.sim && !o.current.playerOpen) o.current.onArrive(o.current.current, true);
    }, GEO.simDelay);
  }, []);

  const clearErr = useCallback(() => {
    if (lastErr.current === null) return;
    lastErr.current = null;
    setErr(null);
  }, []);

  const unavailable = useCallback((msg: string) => {
    if (!demo()) {
      if (lastErr.current === msg) return;
      lastErr.current = msg;
      setErr(msg);
      o.current.onSnack(msg, 4200);
      return;
    }
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
      lock.current = null;
    }
  }, []);

  const onFix = useCallback((p: GeolocationPosition) => {
    const now = Date.now();
    if (now - p.timestamp > GEO.maxAge || p.coords.accuracy > GEO.maxAcc) return;
    const raw: Fix = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
    const prev = live.current.pos;
    const fix = smooth(prev, raw, (now - live.current.at) / 1000);
    live.current.pos = fix;
    live.current.at = now;
    const last = shown.current;
    if (!last || dist([last.lat, last.lng], [fix.lat, fix.lng]) >= GEO.minMove || Math.abs(last.acc - fix.acc) >= 5) {
      shown.current = fix;
      setPos(fix);
    }
    clearErr();
    const { d } = nearest(fix, o.current.stops);
    if (d > GEO.far) {
      if (demo()) { unavailable(`${fmtDist(d, o.current.lang)} ${o.current.T.gpsFar}`); return; }
      if (!farShown.current) {
        farShown.current = true;
        o.current.onSnack(`${fmtDist(d, o.current.lang)} ${o.current.T.gpsFar}`, 4200);
      }
    }
    if (!prev || live.current.sim) {
      if (simTimer.current) clearTimeout(simTimer.current);
      live.current.sim = false;
      setSim(false);
      o.current.onSnack(`${o.current.T.gpsFix} ±${Math.round(fix.acc)} m`);
    }
    const skip = new Set<number>([...o.current.skip, ...hit.current]);
    const r = checkArrival(arrival.current, fix, o.current.stops, skip);
    arrival.current = r.next;
    if (r.arrived != null) {
      hit.current.add(r.arrived);
      o.current.onArrive(r.arrived, false);
    }
  }, [clearErr, unavailable]);

  const onErr = useCallback((e: GeolocationPositionError) => {
    if (live.current.pos) return;
    unavailable(e.code === e.PERMISSION_DENIED ? o.current.T.gpsDenied : o.current.T.gpsSim);
  }, [unavailable]);

  const track = useCallback(() => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    watch.current = navigator.geolocation.watchPosition(onFix, onErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 });
  }, [onFix, onErr]);

  const stop = useCallback(() => {
    live.current = { on: false, sim: false, pos: null, at: 0 };
    shown.current = null;
    setOn(false); setSim(false); setPos(null); setErr(null);
    lastErr.current = null;
    if (simTimer.current) clearTimeout(simTimer.current);
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    arrival.current = null;
    hit.current.clear();
    lock.current?.release().catch(() => {});
    lock.current = null;
  }, []);

  const start = useCallback(() => {
    live.current = { on: true, sim: false, pos: null, at: 0 };
    shown.current = null;
    setOn(true); setSim(false); setPos(null); setErr(null);
    lastErr.current = null;
    farShown.current = false;
    hit.current.clear();
    arrival.current = null;
    if (!('geolocation' in navigator)) { unavailable(o.current.T.gpsSim); return; }
    if (!window.isSecureContext) { unavailable(o.current.T.gpsHttps); return; }
    o.current.onSnack(o.current.T.gpsSnack);
    void wake();
    simTimer.current = setTimeout(() => { if (!live.current.pos) unavailable(o.current.T.gpsSim); }, GEO.simWait);
    track();
  }, [track, unavailable, wake]);

  const toggle = useCallback(() => (live.current.on ? stop() : start()), [start, stop]);

  useEffect(() => {
    if (on && sim) armSim();
  }, [on, sim, opts.current, opts.playerOpen, armSim]);

  useEffect(() => {
    const onVis = () => {
      if (!live.current.on || document.visibilityState !== 'visible') return;
      void wake();
      if (watch.current != null && Date.now() - live.current.at > GEO.maxAge) track();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); stop(); };
  }, [stop, wake, track]);

  return { gps: { on, sim, pos, err }, toggle };
}
