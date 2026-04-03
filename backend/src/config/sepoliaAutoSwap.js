export const SEPOLIA_AUTO_SWAP_CHAIN_ID = 11155111;

export const SEPOLIA_AUTO_SWAP_ROUTER_ABI = [
  'function swapAndSend(address token, address recipient, uint256 amountBaseUnits) payable',
];

export const SEPOLIA_AUTO_SWAP_MANIFEST = {
  network: 'ethereum-sepolia',
  ethUsdReference: '2000.00',
  router: {
    address: '0xb6E9F1fd914cDd70Eb4b312b3625d83864BE18dB',
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
      address: '0xEc41f85Ce6b09f4F28662C1D35C71A9Af42C8925',
    },
    {
      name: 'Walletrix DAI',
      symbol: 'WDAI',
      decimals: 18,
      displayPriceUsd: '1.00',
      weiPerToken: '500000000000000',
      availabilityLabel: 'Sendable from Sepolia ETH',
      shortDescription: 'Stable-value demo DAI lane for frictionless token sends.',
      address: '0xe1e5E7d66E034d4BF7c843b337EaF67c7b783A90',
    },
    {
      name: 'Walletrix LINK',
      symbol: 'WLINK',
      decimals: 18,
      displayPriceUsd: '0.80',
      weiPerToken: '400000000000000',
      availabilityLabel: 'Sendable from Sepolia ETH',
      shortDescription: 'Low-cost utility token demo sourced directly from ETH.',
      address: '0x93A0E7729ab96A139fa790EBC140F619fed48249',
    },
    {
      name: 'Walletrix WBTC',
      symbol: 'WWBTC',
      decimals: 18,
      displayPriceUsd: '25.00',
      weiPerToken: '12500000000000000',
      availabilityLabel: 'Sendable from Sepolia ETH',
      shortDescription: 'High-value demo asset showing larger ETH-backed token sends.',
      address: '0x3C9200cAE2347D3183a1EDDe44A1E771dE62685a',
    },
    {
      name: 'Walletrix Gold',
      symbol: 'WGLD',
      decimals: 18,
      displayPriceUsd: '2.50',
      weiPerToken: '1250000000000000',
      availabilityLabel: 'Sendable from Sepolia ETH',
      shortDescription: 'Branded Walletrix demo asset for polished Sepolia showcases.',
      address: '0xE084C96E945cc5cFCB99d43dF7581D7DD0b80a74',
    },
  ],
};

export function getSupportedSepoliaAutoSwapSymbols() {
  return SEPOLIA_AUTO_SWAP_MANIFEST.tokens.map((token) => token.symbol);
}
