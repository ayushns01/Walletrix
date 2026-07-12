import { getSupportedSepoliaAutoSwapSymbols } from './sepoliaAutoSwap.js';

const BASE_TRANSFER_TOKENS = ['ETH', 'USDC', 'USDT', 'DAI', 'WETH', 'BTC', 'MATIC', 'BNB', 'AVAX'];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const RECOGNIZED_TRANSFER_TOKENS = [
  ...BASE_TRANSFER_TOKENS,
  ...getSupportedSepoliaAutoSwapSymbols(),
];

export const TRANSFER_TOKEN_PATTERN = RECOGNIZED_TRANSFER_TOKENS
  .map((token) => escapeRegExp(token))
  .join('|');

export const TRANSFER_TOKEN_RE = new RegExp(`\\b(${TRANSFER_TOKEN_PATTERN})\\b`, 'i');
export const BARE_TRANSFER_TOKEN_RE = new RegExp(`^(${TRANSFER_TOKEN_PATTERN})$`, 'i');
export const TRANSFER_TOKEN_PROMPT_LIST = RECOGNIZED_TRANSFER_TOKENS.join(', ');
