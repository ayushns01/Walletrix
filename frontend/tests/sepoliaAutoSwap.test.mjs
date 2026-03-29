import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isSepoliaAutoSwapNetwork,
  calculateRequiredWei,
  calculateEstimatedTotalWei,
  canAffordSepoliaAutoSwap,
  getSupportedSepoliaTokens,
} from '../lib/sepoliaAutoSwap.mjs';
import {
  getBuiltInSepoliaAutoSwapManifest,
  normalizeSepoliaAutoSwapManifest,
} from '../lib/sepoliaAutoSwapManifest.mjs';

const manifestFixture = {
  network: 'ethereum-sepolia',
  ethUsdReference: '2000.00',
  router: { address: null },
  tokens: [
    {
      name: 'Walletrix USD',
      symbol: 'WUSD',
      decimals: 18,
      displayPriceUsd: '1.00',
      weiPerToken: '500000000000000',
      availabilityLabel: 'Sendable from Sepolia ETH',
      shortDescription: 'Stable-value demo dollar token for ETH-backed sends.',
      address: null,
      initialMintWholeTokens: '100000',
      seededRouterInventoryWholeTokens: '100000',
    },
    {
      name: 'Walletrix LINK',
      symbol: 'WLINK',
      decimals: 18,
      displayPriceUsd: '0.80',
      weiPerToken: '400000000000000',
      availabilityLabel: 'Sendable from Sepolia ETH',
      shortDescription: 'Low-cost utility token demo sourced directly from ETH.',
      address: null,
      initialMintWholeTokens: '50000',
      seededRouterInventoryWholeTokens: '50000',
    },
  ],
};

test('isSepoliaAutoSwapNetwork only enables the feature on ethereum-sepolia', () => {
  assert.equal(isSepoliaAutoSwapNetwork('ethereum-sepolia'), true);
  assert.equal(isSepoliaAutoSwapNetwork('ethereum-mainnet'), false);
  assert.equal(isSepoliaAutoSwapNetwork('polygon-mainnet'), false);
});

test('calculateRequiredWei rounds up using weiPerToken and token decimals', () => {
  const amountBaseUnits = '1500000000000000001';
  const requiredWei = calculateRequiredWei({
    amountBaseUnits,
    decimals: 18,
    weiPerToken: '500000000000000',
  });

  assert.equal(requiredWei.toString(), '750000000000001');
});

test('calculateEstimatedTotalWei adds sourcing cost and gas', () => {
  const totalWei = calculateEstimatedTotalWei({
    requiredWei: '750000000000000',
    estimatedGasWei: '210000000000000',
  });

  assert.equal(totalWei.toString(), '960000000000000');
});

test('canAffordSepoliaAutoSwap requires enough ETH for sourcing and gas', () => {
  assert.equal(
    canAffordSepoliaAutoSwap({
      availableEthWei: '960000000000000',
      requiredWei: '750000000000000',
      estimatedGasWei: '210000000000000',
    }),
    true
  );

  assert.equal(
    canAffordSepoliaAutoSwap({
      availableEthWei: '959999999999999',
      requiredWei: '750000000000000',
      estimatedGasWei: '210000000000000',
    }),
    false
  );
});

test('normalizeSepoliaAutoSwapManifest preserves the canonical token metadata', () => {
  const manifest = normalizeSepoliaAutoSwapManifest(manifestFixture);

  assert.equal(manifest.network, 'ethereum-sepolia');
  assert.equal(manifest.tokens.length, 2);
  assert.equal(manifest.tokens[0].availabilityLabel, 'Sendable from Sepolia ETH');
  assert.equal(manifest.tokens[1].shortDescription, 'Low-cost utility token demo sourced directly from ETH.');
});

test('getSupportedSepoliaTokens returns normalized tokens with canonical prices and metadata', () => {
  const manifest = normalizeSepoliaAutoSwapManifest(manifestFixture);
  const tokens = getSupportedSepoliaTokens(manifest);

  assert.equal(tokens.length, 2);
  assert.equal(tokens[0].showBalance, false);
  assert.equal(tokens[0].displayPriceUsd, '1.00');
  assert.equal(tokens[1].symbol, 'WLINK');
});

test('getBuiltInSepoliaAutoSwapManifest loads the checked-in generated manifest snapshot', () => {
  const manifest = getBuiltInSepoliaAutoSwapManifest();

  assert.equal(manifest.network, 'ethereum-sepolia');
  assert.equal(manifest.tokens.length, 5);
  assert.equal(manifest.tokens[0].symbol, 'WUSD');
});
