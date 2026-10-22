import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOURS } from '../data/tours.ts';
import { arrivalRadius, checkArrival, dist, fmtDist, nearest, smooth, type Arrival, type Fix, type LatLng } from './geo.ts';

const AMENANO: LatLng = [37.5019, 15.0876];
const PESCHERIA: LatLng = [37.50166, 15.0874];
const STOPS = [{ c: AMENANO }, { c: PESCHERIA }];
const at = (p: LatLng, acc = 10): Fix => ({ lat: p[0], lng: p[1], acc });

const CLOSE = [{ c: [0, 0] as LatLng }, { c: [0, 0.00018] as LatLng }]; // ≈20 m

test('isolated stops retain 50 metres, including formerly larger radii', () => {
  assert.equal(arrivalRadius([{ c: AMENANO, r: 150 }], 0), 50);
  assert.equal(arrivalRadius([{ c: AMENANO, r: 20 }], 0), 20);
});

test('stops 20 metres apart have separate arrival areas of about 9 metres', () => {
  const a = arrivalRadius(CLOSE, 0), b = arrivalRadius(CLOSE, 1);
  assert.ok(a > 8 && a < 10);
  assert.ok(b > 8 && b < 10);
  assert.ok(a + b < dist(CLOSE[0].c, CLOSE[1].c));
  const midpoint: Fix = { lat: 0, lng: 0.00009, acc: 3 };
  assert.equal(checkArrival({ n: 0, count: 2 }, midpoint, CLOSE, new Set(), 0).arrived, null);
  assert.equal(checkArrival({ n: 1, count: 2 }, midpoint, CLOSE, new Set(), 1).arrived, null);
  assert.equal(checkArrival({ n: 0, count: 2 }, at(CLOSE[0].c, 3), CLOSE, new Set(), 0).arrived, 0);
  assert.equal(checkArrival({ n: 1, count: 2 }, at(CLOSE[1].c, 3), CLOSE, new Set([0]), 1).arrived, 1);
});

test('nonconsecutive stops constrain the radius too', () => {
  const stops = [CLOSE[0], { c: [1, 1] as LatLng }, CLOSE[1]];
  assert.ok(arrivalRadius(stops, 0) < 10);
  assert.equal(arrivalRadius(stops, 1), 50);
});

test('coincident stops do not automatically trigger ambiguous arrivals', () => {
  const stops = [CLOSE[0], CLOSE[0]];
  assert.equal(arrivalRadius(stops, 0), 0);
  assert.equal(checkArrival({ n: 0, count: 2 }, at(CLOSE[0].c, 1), stops, new Set(), 0).arrived, null);
});

test('arrival areas do not overlap in any configured tour, including optional stops', () => {
  for (const [id, tour] of Object.entries(TOURS)) {
    const stops = [...tour.stops, ...(tour.optional ? [tour.optional] : [])];
    for (let i = 0; i < stops.length; i++) {
      for (let j = i + 1; j < stops.length; j++) {
        const sum = arrivalRadius(stops, i) + arrivalRadius(stops, j);
        assert.ok(sum <= dist(stops[i].c, stops[j].c), `${id}: ${stops[i].t} / ${stops[j].t}`);
      }
    }
  }
});

test('dist: Piazza Duomo → Castello Ursino ≈ 640 m', () => {
  const d = dist([37.5024, 15.0874], [37.4972, 15.0844]);
  assert.ok(d > 600 && d < 680, `got ${d}`);
});

test('fmtDist: metri arrotondati a 5, km con una cifra', () => {
  assert.equal(fmtDist(123, 'it'), '125 m');
  assert.equal(fmtDist(1240, 'it'), '1,2 km');
  assert.equal(fmtDist(1240, 'en'), '1.2 km');
});

test('nearest picks the closest stop', () => {
  assert.equal(nearest(at(PESCHERIA), STOPS).n, 1);
});

const walk = (p: Fix, times: number, skip = new Set<number>(), current = 0) => {
  let state: { next: Arrival; arrived: number | null } = { next: null, arrived: null };
  for (let i = 0; i < times; i++) state = checkArrival(state.next, p, STOPS, skip, current);
  return state;
};

test('arrival needs three consecutive fixes', () => {
  assert.equal(walk(at(AMENANO), 2).arrived, null);
  assert.equal(walk(at(AMENANO), 3).arrived, 0);
});

test('a fix outside the radius resets the count', () => {
  const far: Fix = { lat: AMENANO[0] + 0.01, lng: AMENANO[1], acc: 10 };
  const two = walk(at(AMENANO), 2);
  const reset = checkArrival(two.next, far, STOPS, new Set(), 0);
  assert.equal(reset.next, null);
  assert.equal(checkArrival(reset.next, at(AMENANO), STOPS, new Set(), 0).arrived, null);
});

test('standing at an already-met stop never triggers the neighbour 31 m away', () => {
  const r = checkArrival(null, at(AMENANO), STOPS, new Set([0]), 1);
  assert.equal(r.arrived, null);
  assert.equal(r.next, null);
});

test('walking to the neighbour triggers it once it is the nearest', () => {
  assert.equal(walk(at(PESCHERIA), 3, new Set([0]), 1).arrived, 1);
});

test('inaccurate fixes never trigger an arrival', () => {
  const r = checkArrival({ n: 0, count: 2 }, at(AMENANO, 90), STOPS, new Set(), 0);
  assert.equal(r.arrived, null);
});

test('per-stop radius overrides the default', () => {
  const near: Fix = { lat: AMENANO[0] + 0.00025, lng: AMENANO[1], acc: 10 };
  const wide = checkArrival({ n: 0, count: 2 }, near, [{ c: AMENANO, r: 60 }], new Set(), 0);
  const tight = checkArrival({ n: 0, count: 2 }, near, [{ c: AMENANO, r: 20 }], new Set(), 0);
  assert.equal(wide.arrived, 0);
  assert.equal(tight.arrived, null);
});

test('an imprecise fix breaks the consecutive arrival confirmations', () => {
  const prev = { n: 0, count: 2 };
  const r = checkArrival(prev, at(AMENANO, 70), [{ c: AMENANO }], new Set(), 0);
  assert.equal(r.arrived, null);
  assert.equal(r.next, null);
});

test('a large stop radius never accepts a GPS uncertainty of 100 metres', () => {
  const r = checkArrival({ n: 0, count: 2 }, at(AMENANO, 100), [{ c: AMENANO, r: 150 }], new Set(), 0);
  assert.equal(r.arrived, null);
  assert.equal(r.next, null);
});

test('an invalid GPS fix cannot confirm an arrival', () => {
  for (const fix of [at(AMENANO, NaN), at(AMENANO, 0), { lat: NaN, lng: AMENANO[1], acc: 5 }]) {
    const r = checkArrival({ n: 0, count: 2 }, fix, [{ c: AMENANO }], new Set(), 0);
    assert.equal(r.arrived, null);
    assert.equal(r.next, null);
  }
});

test('smooth: first fix passes through', () => {
  const f = at(AMENANO, 10);
  assert.deepEqual(smooth(null, f, 1), f);
});

test('smooth: a noisy fix barely moves an accurate position', () => {
  const noisy: Fix = { lat: AMENANO[0] + 0.001, lng: AMENANO[1], acc: 150 };
  const s = smooth(at(AMENANO, 8), noisy, 1);
  assert.ok(dist([s.lat, s.lng], AMENANO) < 5, `moved ${dist([s.lat, s.lng], AMENANO)}`);
});

test('smooth: an accurate fix wins over a poor position', () => {
  const good: Fix = { lat: AMENANO[0] + 0.001, lng: AMENANO[1], acc: 5 };
  const s = smooth(at(AMENANO, 120), good, 1);
  assert.ok(dist([s.lat, s.lng], [good.lat, good.lng]) < 5);
});

test('default radius: 45 m from the stop counts as arrived (field request: 50 m)', () => {
  const near: Fix = { lat: AMENANO[0] + 0.0004, lng: AMENANO[1], acc: 15 };
  const r = checkArrival({ n: 0, count: 2 }, near, [{ c: AMENANO }], new Set(), 0);
  assert.equal(r.arrived, 0);
});

test('GPS ignores a later stop even when it is the nearest', () => {
  const future = { c: [37.51, 15.09] as LatLng };
  const stops = [...STOPS, future];
  let state: Arrival = null;
  for (let i = 0; i < 5; i++) {
    const result = checkArrival(state, at(future.c), stops, new Set(), 0);
    assert.equal(result.arrived, null);
    assert.equal(result.next, null);
    state = result.next;
  }
});

test('GPS waits for the current stop even beside a neighbouring stop', () => {
  assert.equal(walk(at(PESCHERIA), 3, new Set(), 0).arrived, null);
  assert.equal(walk(at(PESCHERIA), 3, new Set(), 1).arrived, 1);
});

test('switching stops starts a new arrival count', () => {
  const result = checkArrival({ n: 0, count: 2 }, at(PESCHERIA), STOPS, new Set(), 1);
  assert.equal(result.arrived, null);
  assert.deepEqual(result.next, { n: 1, count: 1 });
});
