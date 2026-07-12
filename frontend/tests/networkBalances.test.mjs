import test from 'node:test';
import assert from 'node:assert/strict';

import { setBalanceForSelectedNetwork } from '../lib/networkBalances.mjs';

test('setBalanceForSelectedNetwork updates ethereum balance for sepolia views', () => {
  const next = setBalanceForSelectedNetwork({
    balances: { ethereum: '0.928412', bitcoin: '0', solana: '0' },
    selectedNetwork: 'ethereum-sepolia',
    nextBalance: '0.927904388114949341',
  });

  assert.equal(next.ethereum, '0.927904388114949341');
  assert.equal(next.bitcoin, '0');
});

test('setBalanceForSelectedNetwork updates polygon-native balances independently', () => {
  const next = setBalanceForSelectedNetwork({
    balances: { ethereum: '1', polygon: '2.5', bitcoin: '0' },
    selectedNetwork: 'polygon-mainnet',
    nextBalance: '2.25',
  });

  assert.equal(next.polygon, '2.25');
  assert.equal(next.ethereum, '1');
});
