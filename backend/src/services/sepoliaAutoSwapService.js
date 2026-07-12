import { ethers } from 'ethers';

import {
  SEPOLIA_AUTO_SWAP_MANIFEST,
  getSupportedSepoliaAutoSwapSymbols as listSepoliaAutoSwapSymbols,
} from '../config/sepoliaAutoSwap.js';

const TOKENS_BY_SYMBOL = Object.fromEntries(
  SEPOLIA_AUTO_SWAP_MANIFEST.tokens.map((token) => [token.symbol, token])
);

function normalizeTokenSymbol(tokenSymbol) {
  return String(tokenSymbol || '').trim().toUpperCase();
}

export function getSupportedSepoliaAutoSwapSymbols() {
  return listSepoliaAutoSwapSymbols();
}

export function getSepoliaAutoSwapToken(tokenSymbol) {
  return TOKENS_BY_SYMBOL[normalizeTokenSymbol(tokenSymbol)] || null;
}

export function isSepoliaAutoSwapTokenSymbol(tokenSymbol) {
  return Boolean(getSepoliaAutoSwapToken(tokenSymbol));
}

export function calculateRequiredWei({ amountBaseUnits, decimals, weiPerToken }) {
  const units = BigInt(amountBaseUnits);
  const perTokenWei = BigInt(weiPerToken);
  const base = 10n ** BigInt(decimals);

  return (units * perTokenWei + base - 1n) / base;
}

export function buildSepoliaAutoSwapExecutionPlan({
  tokenSymbol,
  amount,
  recipientAddress,
}) {
  const token = getSepoliaAutoSwapToken(tokenSymbol);
  if (!token) {
    throw new Error(`Sepolia auto-swap token ${String(tokenSymbol || '').toUpperCase()} is not supported`);
  }

  const routerAddress = SEPOLIA_AUTO_SWAP_MANIFEST.router.address;
  if (!routerAddress) {
    throw new Error('Sepolia auto-swap router address is unavailable');
  }

  const amountBaseUnits = ethers.parseUnits(String(amount), token.decimals).toString();
  const requiredWei = calculateRequiredWei({
    amountBaseUnits,
    decimals: token.decimals,
    weiPerToken: token.weiPerToken,
  }).toString();

  return {
    routerAddress,
    recipientAddress,
    tokenAddress: token.address,
    amountBaseUnits,
    requiredWei,
    token,
  };
}
