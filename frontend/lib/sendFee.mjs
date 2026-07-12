export function resolveNetworkFee(gasPrice) {
  if (gasPrice == null) {
    return '0';
  }

  if (typeof gasPrice === 'object') {
    return gasPrice.standard || gasPrice.maxFee || '0';
  }

  return gasPrice;
}
