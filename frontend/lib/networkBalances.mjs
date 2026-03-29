const NETWORK_TO_BALANCE_KEY = {
  ethereum: 'ethereum',
  polygon: 'polygon',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  bsc: 'bsc',
  avalanche: 'avalanche',
  base: 'base',
  bitcoin: 'bitcoin',
  solana: 'solana',
};

export function setBalanceForSelectedNetwork({ balances = {}, selectedNetwork, nextBalance }) {
  const [chain] = String(selectedNetwork || 'ethereum-mainnet').split('-');
  const balanceKey = NETWORK_TO_BALANCE_KEY[chain];

  if (!balanceKey) {
    return { ...balances };
  }

  return {
    ...balances,
    [balanceKey]: String(nextBalance),
  };
}
