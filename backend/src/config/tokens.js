/**
 * Token address registry per chain.
 * Add more tokens and chains as needed.
 * Addresses are checksummed ERC-20 contract addresses.
 */

export const TOKEN_REGISTRY = {
  // Native ETH transfers don't need a token address
  ETH: null,
  SOL: null,
  BTC: null,

  // ERC-20 tokens: { chainId: address }
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',       // Ethereum mainnet
    137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',    // Polygon
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',  // Arbitrum One
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',    // Optimism
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
    11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia
  },
  USDT: {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
  WETH: {
    1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    137: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    10: '0x4200000000000000000000000000000000000006',
    8453: '0x4200000000000000000000000000000000000006',
  },
  DAI: {
    1: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    137: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    42161: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
};

/**
 * EVM RPC endpoints per chainId.
 */
export const CHAIN_RPC = {
  1: process.env.ETHEREUM_MAINNET_RPC || 'https://eth.llamarpc.com',
  137: process.env.POLYGON_MAINNET_RPC || 'https://polygon-rpc.com',
  42161: process.env.ARBITRUM_ONE_RPC || 'https://arb1.arbitrum.io/rpc',
  10: process.env.OPTIMISM_MAINNET_RPC || 'https://mainnet.optimism.io',
  8453: process.env.BASE_MAINNET_RPC || 'https://mainnet.base.org',
  11155111: process.env.ETHEREUM_SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com',
};

/**
 * Chain name to chainId mapping (for natural language parsing).
 */
export const CHAIN_NAME_TO_ID = {
  ethereum: 1,
  eth: 1,
  polygon: 137,
  matic: 137,
  arbitrum: 42161,
  arb: 42161,
  optimism: 10,
  op: 10,
  base: 8453,
  sepolia: 11155111,
};

/**
 * Default chain for the bot (can be overridden by user intent).
 */
export const DEFAULT_CHAIN_ID = parseInt(process.env.BOT_DEFAULT_CHAIN_ID || '11155111'); // Sepolia for dev
