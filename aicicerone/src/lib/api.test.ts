import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acquire, clientIp, limited, sameOrigin, str } from './api.ts';

const req = (headers: Record<string, string>) => new Request('http://site.test/api/chat/', { method: 'POST', headers });

test('sameOrigin accepts the own host and rejects others', () => {
  assert.equal(sameOrigin(req({ origin: 'http://site.test' })), true);
  assert.equal(sameOrigin(req({ origin: 'http://evil.test' })), false);
  assert.equal(sameOrigin(req({})), false);
});

test('sameOrigin honours X-Forwarded-Host behind the proxy', () => {
  assert.equal(sameOrigin(req({ origin: 'http://tour.example', 'x-forwarded-host': 'tour.example' })), true);
});

test('clientIp takes the first forwarded address', () => {
  assert.equal(clientIp(req({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })), '1.2.3.4');
  assert.equal(clientIp(req({}), '9.9.9.9'), '9.9.9.9');
});

test('limited blocks after the limit', () => {
  const ip = `t-${Math.random()}`;
  assert.equal(limited('test', ip, 2), false);
  assert.equal(limited('test', ip, 2), false);
  assert.equal(limited('test', ip, 2), true);
});

test('acquire caps parallel work and release is idempotent', () => {
  const a = acquire('cap', 2)!;
  const b = acquire('cap', 2)!;
  assert.equal(acquire('cap', 2), null);
  a();
  a();
  assert.ok(acquire('cap', 2));
  b();
});

test('str trims and enforces bounds', () => {
  assert.equal(str('  ab ', 5), 'ab');
  assert.equal(str('abcdef', 5), null);
  assert.equal(str('', 5), null);
  assert.equal(str(3, 5), null);
});
