import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEST, TOURS, CHAT, CHIPS } from '../data/tours.ts';

test('London exposes both working tours', () => {
  assert.deepEqual(DEST.london.tours, ['rebuilding', 'westminster']);
  for (const id of DEST.london.tours) {
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
