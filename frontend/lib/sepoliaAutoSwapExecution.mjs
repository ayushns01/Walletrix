import { parseUnits } from 'ethers';

import { calculateRequiredWei } from './sepoliaAutoSwap.mjs';

export function calculateEstimatedGasCostWei({ gasLimit, gasPriceWei }) {
  return BigInt(gasLimit) * BigInt(gasPriceWei);
}

export function buildSepoliaAutoSwapExecutionPlan({
  manifest,
  token,
  amount,
  recipientAddress,
}) {
  const routerAddress = manifest?.router?.address;
  if (!routerAddress) {
    throw new Error('Sepolia auto-swap router address is unavailable');
  }

  const tokenAddress = token?.address;
  if (!tokenAddress) {
    throw new Error('Sepolia auto-swap token address is unavailable');
  }

  const amountBaseUnits = parseUnits(String(amount), token.decimals).toString();
  const requiredWei = calculateRequiredWei({
    amountBaseUnits,
    decimals: token.decimals,
    weiPerToken: token.weiPerToken,
  }).toString();

  return {
    routerAddress,
    tokenAddress,
    recipientAddress,
    amountBaseUnits,
    requiredWei,
  };
}
