import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSepoliaAutoSwapExecutionPlan,
  calculateEstimatedGasCostWei,
} from '../lib/sepoliaAutoSwapExecution.mjs';

const manifest = {
  network: 'ethereum-sepolia',
  router: {
    address: '0x1111111111111111111111111111111111111111',
  },
  tokens: [
    {
      name: 'Walletrix USD',
      symbol: 'WUSD',
      decimals: 18,
      displayPriceUsd: '1.00',
      weiPerToken: '500000000000000',
      availabilityLabel: 'Sendable from Sepolia ETH',
      shortDescription: 'Stable-value demo dollar token for ETH-backed sends.',
      address: '0x2222222222222222222222222222222222222222',
    },
  ],
};

test('buildSepoliaAutoSwapExecutionPlan returns canonical router call inputs', () => {
  const plan = buildSepoliaAutoSwapExecutionPlan({
    manifest,
    token: manifest.tokens[0],
    amount: '2',
    recipientAddress: '0x3333333333333333333333333333333333333333',
  });

  assert.equal(plan.routerAddress, '0x1111111111111111111111111111111111111111');
  assert.equal(plan.tokenAddress, '0x2222222222222222222222222222222222222222');
  assert.equal(plan.recipientAddress, '0x3333333333333333333333333333333333333333');
  assert.equal(plan.amountBaseUnits, '2000000000000000000');
  assert.equal(plan.requiredWei, '1000000000000000');
});

test('buildSepoliaAutoSwapExecutionPlan rejects manifests without a router address', () => {
  assert.throws(() => buildSepoliaAutoSwapExecutionPlan({
    manifest: {
      ...manifest,
      router: {
        address: null,
      },
    },
    token: manifest.tokens[0],
    amount: '1',
    recipientAddress: '0x3333333333333333333333333333333333333333',
  }), /router address/i);
});

test('buildSepoliaAutoSwapExecutionPlan rejects tokens without a deployed address', () => {
  assert.throws(() => buildSepoliaAutoSwapExecutionPlan({
    manifest,
    token: {
      ...manifest.tokens[0],
      address: null,
    },
    amount: '1',
    recipientAddress: '0x3333333333333333333333333333333333333333',
  }), /token address/i);
});

test('calculateEstimatedGasCostWei multiplies gas limit by gas price', () => {
  const gasWei = calculateEstimatedGasCostWei({
    gasLimit: '125000',
    gasPriceWei: '3000000000',
  });

  assert.equal(gasWei.toString(), '375000000000000');
});
