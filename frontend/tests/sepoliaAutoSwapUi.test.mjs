import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDashboardRows,
  buildSendModalTokenPickerOptions,
  buildTransferReviewStepData,
  buildSepoliaAutoSwapPreflightModel,
} from '../lib/sepoliaAutoSwapViewModels.mjs';

const sepoliaManifest = {
  network: 'ethereum-sepolia',
  ethUsdReference: '2000.00',
  tokens: [
    {
      name: 'Walletrix USD',
      symbol: 'WUSD',
      decimals: 18,
      displayPriceUsd: '1.00',
      weiPerToken: '500000000000000',
      availabilityLabel: 'Sendable from Sepolia ETH',
      shortDescription: 'Stable-value demo dollar token for ETH-backed sends.',
    },
    {
      name: 'Walletrix LINK',
      symbol: 'WLINK',
      decimals: 18,
      displayPriceUsd: '0.80',
      weiPerToken: '400000000000000',
      availabilityLabel: 'Sendable from Sepolia ETH',
      shortDescription: 'Low-cost utility token demo sourced directly from ETH.',
    },
  ],
};

const mainnetManifest = {
  network: 'ethereum-mainnet',
  ethUsdReference: '2000.00',
  tokens: [
    {
      name: 'Walletrix USD',
      symbol: 'WUSD',
      decimals: 18,
      displayPriceUsd: '1.00',
      weiPerToken: '500000000000000',
      availabilityLabel: 'Mainnet-backed transfer',
      shortDescription: 'Mainnet baseline row used to keep Sepolia behavior distinct.',
    },
  ],
};

test('buildDashboardRows returns Sepolia token rows with pricing, labels, descriptions, and no balance', () => {
  const rows = buildDashboardRows({
    network: 'ethereum-sepolia',
    manifest: sepoliaManifest,
  });

  assert.deepEqual(
    rows.map(({ symbol, displayPriceUsd, availabilityLabel, shortDescription, balance }) => ({
      symbol,
      displayPriceUsd,
      availabilityLabel,
      shortDescription,
      balance,
    })),
    [
      {
        symbol: 'WUSD',
        displayPriceUsd: '1.00',
        availabilityLabel: 'Sendable from Sepolia ETH',
        shortDescription: 'Stable-value demo dollar token for ETH-backed sends.',
        balance: null,
      },
      {
        symbol: 'WLINK',
        displayPriceUsd: '0.80',
        availabilityLabel: 'Sendable from Sepolia ETH',
        shortDescription: 'Low-cost utility token demo sourced directly from ETH.',
        balance: null,
      },
    ]
  );
});

test('buildDashboardRows keeps non-Sepolia rows distinguishable from Sepolia rows', () => {
  const sepoliaRows = buildDashboardRows({
    network: 'ethereum-sepolia',
    manifest: sepoliaManifest,
  });

  const mainnetRows = buildDashboardRows({
    network: 'ethereum-mainnet',
    manifest: mainnetManifest,
  });

  assert.notDeepEqual(mainnetRows, sepoliaRows);
  assert.equal(mainnetRows[0].balance, '0');
  assert.equal(mainnetRows[0].availabilityLabel, 'Mainnet-backed transfer');
});

test('buildSendModalTokenPickerOptions returns Sepolia token picker choices', () => {
  const options = buildSendModalTokenPickerOptions({
    network: 'ethereum-sepolia',
    manifest: sepoliaManifest,
  });

  assert.deepEqual(
    options.map(({ symbol, label, displayPriceUsd, availabilityLabel }) => ({
      symbol,
      label,
      displayPriceUsd,
      availabilityLabel,
    })),
    [
      {
        symbol: 'WUSD',
        label: 'Walletrix USD',
        displayPriceUsd: '1.00',
        availabilityLabel: 'Sendable from Sepolia ETH',
      },
      {
        symbol: 'WLINK',
        label: 'Walletrix LINK',
        displayPriceUsd: '0.80',
        availabilityLabel: 'Sendable from Sepolia ETH',
      },
    ]
  );
});

test('buildTransferReviewStepData includes recipient, supportive copy, fixed pricing, conversion, sourcing ETH, gas, and total outflow', () => {
  const review = buildTransferReviewStepData({
    network: 'ethereum-sepolia',
    recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
    amountBaseUnits: '2000000000000000000',
    token: sepoliaManifest.tokens[0],
    estimatedGasWei: '210000000000000',
  });

  assert.equal(review.recipientAddress, '0x1234567890abcdef1234567890abcdef12345678');
  assert.match(review.supportiveCopy, /Walletrix got you/);
  assert.equal(review.demoTokenPriceUsd, '1.00');
  assert.equal(review.conversionRateEthPerToken, '0.0005');
  assert.equal(review.tokenSourceAsset, 'ETH');
  assert.equal(review.estimatedGasWei, '210000000000000');
  assert.equal(review.totalEthOutflowWei, '1210000000000000');
});

test('buildSepoliaAutoSwapPreflightModel marks insufficient ETH before sending', () => {
  const preflight = buildSepoliaAutoSwapPreflightModel({
    availableEthWei: '100000000000000',
    requiredTokenSourcingWei: '200000000000000',
    estimatedGasWei: '50000000000000',
  });

  assert.equal(preflight.canProceed, false);
  assert.equal(preflight.reason, 'insufficient-eth');
  assert.equal(preflight.availableEthWei, '100000000000000');
  assert.equal(preflight.totalRequiredEthWei, '250000000000000');
});

test('buildSepoliaAutoSwapPreflightModel marks gas estimation unavailable', () => {
  const preflight = buildSepoliaAutoSwapPreflightModel({
    availableEthWei: '1000000000000000',
    requiredTokenSourcingWei: '200000000000000',
    estimatedGasWei: null,
  });

  assert.equal(preflight.canProceed, false);
  assert.equal(preflight.reason, 'gas-estimation-unavailable');
  assert.equal(preflight.estimatedGasWei, null);
});
