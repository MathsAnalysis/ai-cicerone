import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEST, TOURS, CHAT, CHIPS, VIDEOS } from '../data/tours.ts';

test('London exposes two active tours and keeps Westminster disabled', () => {
  assert.deepEqual(DEST.london.tours, ['rebuilding', 'icons', 'westminster']);
  assert.equal(TOURS.westminster.soon, true);
  const active = DEST.london.tours.filter((id) => !TOURS[id].soon);
  assert.deepEqual(active, ['rebuilding', 'icons']);
  for (const id of active) {
    assert.ok(!TOURS[id].soon);
    assert.ok(TOURS[id].stops.length > 0);
    assert.ok(TOURS[id].guides.some((g) => !g.soon));
  }
});

test('Westminster has all seven ordered stops including Trafalgar Square', () => {
  assert.equal(TOURS.westminster.name, 'Westminster: Parliament & the Abbey');
  assert.deepEqual(TOURS.westminster.stops.map((s) => s.t), [
    'Parliament Square & Big Ben', 'Westminster Abbey', 'Whitehall & Horse Guards',
    "St James's Park", 'Buckingham Palace', 'Piccadilly Circus', 'Trafalgar Square',
  ]);
  assert.equal(TOURS.westminster.textOnly, true);
  for (const s of TOURS.westminster.stops) {
    assert.ok(s.c[0] > 51.49 && s.c[0] < 51.52);
    assert.ok(s.c[1] > -0.15 && s.c[1] < -0.12);
    assert.ok(s.d.length > 80);
  }
  const guide = TOURS.westminster.guides[0];
  assert.ok(CHAT[guide.id]?.length);
  assert.ok(CHIPS[guide.id]?.length);
});

test('existing London tour retains its eight stops and video mode', () => {
  assert.equal(TOURS.rebuilding.stops.length, 8);
  assert.ok(!TOURS.rebuilding.textOnly);
});


test('London Icons restores the original stop order and corresponding films', () => {
  const tour = TOURS.icons;
  assert.ok(tour, 'London Icons must be available');
  assert.deepEqual(tour.stops.map((s) => s.t), ['Piccadilly Circus', 'Trafalgar Square', 'Buckingham Palace']);
  assert.deepEqual(VIDEOS.icons, ['Ldn-icons-01-piccadilly', 'Ldn-icons-02-trafalgar', 'Ldn-icons-03-buckingham']);
  assert.equal(tour.guides[0].id, 'wildeholmes');
  assert.ok(CHAT.wildeholmes?.length);
  assert.ok(CHIPS.wildeholmes?.length);
  assert.ok(!tour.textOnly && !tour.soon);
});
