const MAINNET_TOKEN_CATALOG = [
  {
    symbol: 'USDT',
    name: 'Tether USD',
    icon: 'U',
    priceKey: 'usdt',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    icon: 'U',
    priceKey: 'usdc',
  },
  {
    symbol: 'DAI',
    name: 'Dai',
    icon: 'D',
    priceKey: 'dai',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    icon: 'Ξ',
    priceKey: 'ethereum',
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    icon: 'L',
    priceKey: 'link',
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    icon: 'U',
    priceKey: 'uni',
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    icon: 'W',
    priceKey: 'wbtc',
  },
  {
    symbol: 'MATIC',
    name: 'Polygon',
    icon: 'M',
    priceKey: 'matic',
  },
];

const PRICE_KEY_BY_COIN_ID = {
  ethereum: 'ethereum',
  tether: 'usdt',
  'usd-coin': 'usdc',
  dai: 'dai',
  chainlink: 'link',
  uniswap: 'uni',
  'wrapped-bitcoin': 'wbtc',
  'matic-network': 'matic',
};

function buildPriceData(prices, priceKey) {
  const currentPrice = prices?.[priceKey]?.current_price;
  if (currentPrice === null || currentPrice === undefined) {
    return null;
  }

  return {
    current_price: Number(currentPrice),
  };
}

export function buildMainnetHoldingsRows({ balances = {}, prices = {}, tokens = [] }) {
  const ownedTokenRows = [];
  const ownedSymbols = new Set();

  const ethBalance = String(balances?.ethereum || '0');
  ownedTokenRows.push({
    name: 'Ethereum',
    symbol: 'ETH',
    balance: ethBalance,
    priceData: buildPriceData(prices, 'ethereum'),
    icon: 'Ξ',
    isOwned: true,
  });
  ownedSymbols.add('ETH');

  tokens
    .filter((token) => Number.parseFloat(token?.balance || '0') > 0)
    .forEach((token) => {
      const symbol = String(token.symbol || '').toUpperCase();
      ownedSymbols.add(symbol);

      const catalogMatch = MAINNET_TOKEN_CATALOG.find((entry) => entry.symbol === symbol);
      ownedTokenRows.push({
        name: token.name,
        symbol,
        balance: String(token.balance),
        priceData: buildPriceData(prices, catalogMatch?.priceKey) ?? { current_price: Number(token.priceUsd || 0) },
        icon: token.symbol?.[0] || catalogMatch?.icon || '•',
        isOwned: true,
      });
    });

  const watchlistRows = MAINNET_TOKEN_CATALOG
    .filter((token) => !ownedSymbols.has(token.symbol))
    .map((token) => ({
      name: token.name,
      symbol: token.symbol,
      balance: '0',
      priceData: buildPriceData(prices, token.priceKey),
      icon: token.icon,
      isOwned: false,
    }));

  return [...ownedTokenRows, ...watchlistRows];
}

export function mapCoinGeckoPriceEntries(pricesResponse = []) {
  return pricesResponse.reduce((accumulator, coin) => {
    const key = PRICE_KEY_BY_COIN_ID[coin.coin];
    if (!key) {
      return accumulator;
    }

    return {
      ...accumulator,
      [key]: {
        current_price: coin.price,
        market_cap: coin.marketCap,
        price_change_percentage_24h: coin.change24h,
      },
    };
  }, {});
}
