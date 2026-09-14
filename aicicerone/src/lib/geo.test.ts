import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkArrival, dist, fmtDist, nearest, type Fix, type LatLng } from './geo.ts';

// Fontana dell'Amenano e La Pescheria (Catania): ~31 m, il caso più stretto del catalogo.
const AMENANO: LatLng = [37.5019, 15.0876];
const PESCHERIA: LatLng = [37.50166, 15.0874];
const STOPS = [{ c: AMENANO }, { c: PESCHERIA }];
const at = (p: LatLng, acc = 10): Fix => ({ lat: p[0], lng: p[1], acc });

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

test('arrival needs two consecutive fixes', () => {
  const first = checkArrival(null, at(AMENANO), STOPS, new Set());
  assert.equal(first.arrived, null);
  const second = checkArrival(first.next, at(AMENANO), STOPS, new Set());
  assert.equal(second.arrived, 0);
});

test('standing at an already-met stop never triggers the neighbour 31 m away', () => {
  const r = checkArrival(null, at(AMENANO), STOPS, new Set([0]));
  assert.equal(r.arrived, null);
  assert.equal(r.next, null);
});

test('walking to the neighbour triggers it once it is the nearest', () => {
  let state = checkArrival(null, at(PESCHERIA), STOPS, new Set([0]));
  state = checkArrival(state.next, at(PESCHERIA), STOPS, new Set([0]));
  assert.equal(state.arrived, 1);
});

test('inaccurate fixes are ignored', () => {
  const r = checkArrival({ n: 0, count: 1 }, at(AMENANO, 90), STOPS, new Set());
  assert.equal(r.arrived, null);
  assert.equal(r.next, null);
});

test('per-stop radius overrides the default', () => {
  const near: Fix = { lat: AMENANO[0] + 0.00025, lng: AMENANO[1], acc: 10 }; // ~28 m nord
  const wide = checkArrival({ n: 0, count: 1 }, near, [{ c: AMENANO, r: 60 }], new Set());
  const tight = checkArrival({ n: 0, count: 1 }, near, [{ c: AMENANO, r: 20 }], new Set());
  assert.equal(wide.arrived, 0);
  assert.equal(tight.arrived, null);
});
