import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveNetworkFee } from '../lib/sendFee.mjs';

test('resolveNetworkFee returns 0 for null values', () => {
  assert.equal(resolveNetworkFee(null), '0');
});

test('resolveNetworkFee prefers standard fee from objects', () => {
  assert.equal(resolveNetworkFee({ standard: '18', maxFee: '24' }), '18');
});

test('resolveNetworkFee falls back to maxFee for objects', () => {
  assert.equal(resolveNetworkFee({ maxFee: '24' }), '24');
});

test('resolveNetworkFee passes through primitive values', () => {
  assert.equal(resolveNetworkFee('12'), '12');
  assert.equal(resolveNetworkFee(7), 7);
});
