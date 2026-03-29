import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMainnetHoldingsRows, mapCoinGeckoPriceEntries } from '../lib/mainnetHoldings.mjs';

test('buildMainnetHoldingsRows keeps owned assets first and appends zero-balance watchlist tokens with live prices', () => {
  const rows = buildMainnetHoldingsRows({
    balances: {
      ethereum: '1.25',
    },
    prices: {
      ethereum: { current_price: 3200 },
      usdt: { current_price: 1 },
      usdc: { current_price: 1 },
      dai: { current_price: 1.01 },
      link: { current_price: 18.5 },
      uni: { current_price: 11.2 },
      wbtc: { current_price: 68000 },
      matic: { current_price: 0.82 },
    },
    tokens: [
      {
        symbol: 'LINK',
        name: 'Chainlink',
        balance: '4.5',
        address: '0xlink',
      },
    ],
  });

  assert.deepEqual(
    rows.slice(0, 3).map((row) => [row.symbol, row.isOwned, row.balance]),
    [
      ['ETH', true, '1.25'],
      ['LINK', true, '4.5'],
      ['USDT', false, '0'],
    ]
  );

  assert.equal(rows.find((row) => row.symbol === 'USDC')?.priceData?.current_price, 1);
  assert.equal(rows.find((row) => row.symbol === 'WBTC')?.priceData?.current_price, 68000);
  assert.equal(rows.find((row) => row.symbol === 'ETH')?.priceData?.current_price, 3200);
});

test('buildMainnetHoldingsRows does not duplicate tokens already owned', () => {
  const rows = buildMainnetHoldingsRows({
    balances: {
      ethereum: '0.5',
    },
    prices: {
      ethereum: { current_price: 3200 },
      usdt: { current_price: 1 },
      usdc: { current_price: 1 },
      dai: { current_price: 1 },
      link: { current_price: 18.5 },
      uni: { current_price: 11.2 },
      wbtc: { current_price: 68000 },
      matic: { current_price: 0.82 },
    },
    tokens: [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        balance: '120',
        address: '0xusdc',
      },
    ],
  });

  assert.equal(rows.filter((row) => row.symbol === 'USDC').length, 1);
  assert.equal(rows.find((row) => row.symbol === 'USDC')?.isOwned, true);
  assert.equal(rows.find((row) => row.symbol === 'USDC')?.balance, '120');
});

test('mapCoinGeckoPriceEntries keeps curated mainnet token prices accessible by symbol key', () => {
  const priceMap = mapCoinGeckoPriceEntries([
    { coin: 'ethereum', price: 3200, marketCap: 100, change24h: 2.2 },
    { coin: 'usd-coin', price: 1, marketCap: 50, change24h: 0.1 },
    { coin: 'chainlink', price: 18.5, marketCap: 20, change24h: -0.5 },
  ]);

  assert.equal(priceMap.ethereum.current_price, 3200);
  assert.equal(priceMap.usdc.current_price, 1);
  assert.equal(priceMap.link.current_price, 18.5);
});
