import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchQuery } from './retrieve.ts';

test('searchQuery strips question words and appends the city', () => {
  assert.equal(searchQuery("Cos'è la statua di Bellini?", 'it', 'Catania'), 'statua bellini Catania');
  assert.equal(searchQuery('What did the Fire destroy?', 'en', 'London'), 'fire destroy London');
});

test('searchQuery does not duplicate the city', () => {
  assert.equal(searchQuery('Dove si trova il Duomo di Catania', 'it', 'Catania'), 'trova duomo catania');
});

test('searchQuery keeps the question when it is all stop words', () => {
  assert.equal(searchQuery('Cosa?', 'it', 'Catania'), 'Cosa? Catania');
});
