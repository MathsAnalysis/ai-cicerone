import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMessages } from './messages.ts';

const u = (content: string) => ({ role: 'user', content });
const a = (content: string) => ({ role: 'assistant', content });

test('accepts alternating turns ending with the user', () => {
  assert.equal(parseMessages([u('ciao'), a('salve'), u('come stai')])?.length, 3);
});

test('rejects empty, malformed, repeated roles and non-user ends', () => {
  assert.equal(parseMessages([]), null);
  assert.equal(parseMessages('x'), null);
  assert.equal(parseMessages([u('a'), u('b')]), null);
  assert.equal(parseMessages([a('a')]), null);
  assert.equal(parseMessages([u('a'), a('b')]), null);
  assert.equal(parseMessages([{ role: 'system', content: 'x' }]), null);
});

test('rejects oversized messages and too many turns', () => {
  assert.equal(parseMessages([u('x'.repeat(1501))]), null);
  const many = Array.from({ length: 13 }, (_, i) => (i % 2 ? a('r') : u('q')));
  assert.equal(parseMessages(many), null);
});

test('drops the oldest turns when the history is too long', () => {
  const big = 'x'.repeat(1400);
  const out = parseMessages([u(big), a(big), u(big), a(big), u(big)])!;
  assert.equal(out[0].role, 'user');
  assert.equal(out[out.length - 1].role, 'user');
  assert.ok(out.length < 5);
  assert.ok(out.reduce((n, m) => n + m.content.length, 0) <= 5000);
});
