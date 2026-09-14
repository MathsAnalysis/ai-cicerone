import type { FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Fix, LatLng } from '../../lib/geo';
import type { StopItem } from '../../lib/stops';

export type MapProps = {
  routeKey: string;
  center: LatLng;
  stops: StopItem[];
  current: number;
  done: ReadonlySet<number>;
  pos: Fix | null;
  follow: boolean; // GPS reale attivo (non simulazione): la vista segue utente + tappa
  onPick: (n: number) => void;
};

// Mappa vettoriale MapLibre + OpenFreeMap dove c'è WebGL2 (tutti i telefoni recenti); altrimenti
// mappa raster Leaflet. Entrambe caricate solo quando servono: le pagine statiche non le pagano.
function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

export default function TourMap(props: MapProps) {
  const [Impl, setImpl] = useState<FunctionComponent<MapProps> | null>(null);
  useEffect(() => {
    let alive = true;
    (hasWebGL2() ? import('./TourMapGL') : import('./TourMapRaster')).then((m) => { if (alive) setImpl(() => m.default); });
    return () => { alive = false; };
  }, []);
  return Impl ? <Impl {...props} /> : <div class="z-0 mt-3 min-h-[210px] flex-1 bg-beige" aria-label="Map" />;
}
