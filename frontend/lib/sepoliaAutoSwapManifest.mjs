import builtInManifest from './generated/sepoliaAutoSwapManifest.json' with { type: 'json' };

function normalizeToken(token, index) {
  if (!token || typeof token !== 'object') {
    throw new Error(`Sepolia auto-swap token at index ${index} is invalid`);
  }

  const requiredKeys = [
    'name',
    'symbol',
    'decimals',
    'displayPriceUsd',
    'weiPerToken',
    'availabilityLabel',
    'shortDescription',
  ];

  for (const key of requiredKeys) {
    if (token[key] === undefined || token[key] === null || token[key] === '') {
      throw new Error(`Sepolia auto-swap token ${token.symbol || `#${index + 1}`} is missing ${key}`);
    }
  }

  return {
    name: String(token.name),
    symbol: String(token.symbol),
    decimals: Number(token.decimals),
    displayPriceUsd: String(token.displayPriceUsd),
    weiPerToken: String(token.weiPerToken),
    availabilityLabel: String(token.availabilityLabel),
    shortDescription: String(token.shortDescription),
    initialMintWholeTokens: token.initialMintWholeTokens !== undefined
      ? String(token.initialMintWholeTokens)
      : null,
    seededRouterInventoryWholeTokens: token.seededRouterInventoryWholeTokens !== undefined
      ? String(token.seededRouterInventoryWholeTokens)
      : null,
    address: token.address ? String(token.address) : null,
  };
}

export function normalizeSepoliaAutoSwapManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Sepolia auto-swap manifest is invalid');
  }

  if (String(manifest.network) !== 'ethereum-sepolia') {
    throw new Error('Sepolia auto-swap manifest must target ethereum-sepolia');
  }

  if (!Array.isArray(manifest.tokens) || manifest.tokens.length === 0) {
    throw new Error('Sepolia auto-swap manifest must define at least one token');
  }

  return {
    network: 'ethereum-sepolia',
    ethUsdReference: String(manifest.ethUsdReference || ''),
    router: {
      address: manifest.router?.address ? String(manifest.router.address) : null,
    },
    tokens: manifest.tokens.map(normalizeToken),
  };
}

export function getBuiltInSepoliaAutoSwapManifest() {
  return normalizeSepoliaAutoSwapManifest(builtInManifest);
}
