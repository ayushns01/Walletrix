import {
  calculateEstimatedTotalWei,
  calculateRequiredWei,
  canAffordSepoliaAutoSwap,
  isSepoliaAutoSwapNetwork,
} from './sepoliaAutoSwap.mjs';

function formatWeiAsEthDecimal(weiValue) {
  const wei = BigInt(weiValue);
  const whole = wei / 1000000000000000000n;
  const fraction = wei % 1000000000000000000n;

  if (fraction === 0n) {
    return `${whole}.0`;
  }

  const padded = fraction.toString().padStart(18, '0').replace(/0+$/, '');
  return `${whole}.${padded}`;
}

export function buildDashboardRows({ network, manifest }) {
  if (!manifest?.tokens?.length) return [];

  if (isSepoliaAutoSwapNetwork(network)) {
    return manifest.tokens.map((token) => ({
      symbol: token.symbol,
      name: token.name,
      displayPriceUsd: token.displayPriceUsd,
      availabilityLabel: token.availabilityLabel,
      shortDescription: token.shortDescription,
      balance: null,
    }));
  }

  return manifest.tokens.map((token) => ({
    symbol: token.symbol,
    name: token.name,
    displayPriceUsd: token.displayPriceUsd,
    availabilityLabel: token.availabilityLabel,
    shortDescription: token.shortDescription,
    balance: '0',
  }));
}

export function buildSendModalTokenPickerOptions({ network, manifest }) {
  if (!isSepoliaAutoSwapNetwork(network) || !manifest?.tokens?.length) {
    return [];
  }

  return manifest.tokens.map((token) => ({
    symbol: token.symbol,
    label: token.name,
    displayPriceUsd: token.displayPriceUsd,
    availabilityLabel: token.availabilityLabel,
    shortDescription: token.shortDescription,
    token,
  }));
}

export function buildTransferReviewStepData({
  network,
  recipientAddress,
  amountBaseUnits,
  token,
  estimatedGasWei,
}) {
  if (!isSepoliaAutoSwapNetwork(network)) {
    throw new Error('Transfer review model is only available for ethereum-sepolia');
  }

  const requiredTokenSourcingWei = calculateRequiredWei({
    amountBaseUnits,
    decimals: token.decimals,
    weiPerToken: token.weiPerToken,
  });
  const totalEthOutflowWei = calculateEstimatedTotalWei({
    requiredWei: requiredTokenSourcingWei,
    estimatedGasWei,
  });

  return {
    recipientAddress,
    supportiveCopy: 'You do not need to worry about swaps. Walletrix got you.',
    demoTokenPriceUsd: token.displayPriceUsd,
    conversionRateEthPerToken: formatWeiAsEthDecimal(token.weiPerToken),
    tokenSourceAsset: 'ETH',
    requiredTokenSourcingWei: requiredTokenSourcingWei.toString(),
    estimatedGasWei: String(estimatedGasWei),
    totalEthOutflowWei: totalEthOutflowWei.toString(),
  };
}

export function buildSepoliaAutoSwapPreflightModel({
  availableEthWei,
  requiredTokenSourcingWei,
  estimatedGasWei,
}) {
  if (estimatedGasWei === null || estimatedGasWei === undefined) {
    return {
      canProceed: false,
      reason: 'gas-estimation-unavailable',
      availableEthWei: String(availableEthWei),
      estimatedGasWei: null,
      totalRequiredEthWei: null,
    };
  }

  const totalRequiredEthWei = calculateEstimatedTotalWei({
    requiredWei: requiredTokenSourcingWei,
    estimatedGasWei,
  });

  if (!canAffordSepoliaAutoSwap({
    availableEthWei,
    requiredWei: requiredTokenSourcingWei,
    estimatedGasWei,
  })) {
    return {
      canProceed: false,
      reason: 'insufficient-eth',
      availableEthWei: String(availableEthWei),
      estimatedGasWei: String(estimatedGasWei),
      totalRequiredEthWei: totalRequiredEthWei.toString(),
    };
  }

  return {
    canProceed: true,
    reason: 'ready',
    availableEthWei: String(availableEthWei),
    estimatedGasWei: String(estimatedGasWei),
    totalRequiredEthWei: totalRequiredEthWei.toString(),
  };
}
