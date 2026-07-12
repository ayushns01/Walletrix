const SEPOLIA_NETWORK_ID = 'ethereum-sepolia';

export function isSepoliaAutoSwapNetwork(selectedNetwork) {
  return String(selectedNetwork || '') === SEPOLIA_NETWORK_ID;
}

export function calculateRequiredWei({ amountBaseUnits, decimals, weiPerToken }) {
  const units = BigInt(amountBaseUnits);
  const perTokenWei = BigInt(weiPerToken);
  const base = 10n ** BigInt(decimals);

  return (units * perTokenWei + base - 1n) / base;
}

export function calculateEstimatedTotalWei({ requiredWei, estimatedGasWei }) {
  return BigInt(requiredWei) + BigInt(estimatedGasWei);
}

export function canAffordSepoliaAutoSwap({ availableEthWei, requiredWei, estimatedGasWei }) {
  return BigInt(availableEthWei) >= calculateEstimatedTotalWei({ requiredWei, estimatedGasWei });
}

export function getSupportedSepoliaTokens(manifest) {
  return manifest.tokens.map((token) => ({
    ...token,
    showBalance: false,
  }));
}

