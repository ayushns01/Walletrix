import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const catalogPath = new URL('../../contracts/config/sepoliaAutoSwapCatalog.json', import.meta.url);
const deploymentPath = new URL('../../contracts/deployments/sepolia-auto-swap.sepolia.json', import.meta.url);
const generatedManifestPath = new URL('../lib/generated/sepoliaAutoSwapManifest.json', import.meta.url);

test('generated Sepolia manifest preserves canonical token metadata and deployed addresses', () => {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));
  const manifest = JSON.parse(readFileSync(generatedManifestPath, 'utf8'));

  assert.equal(manifest.network, catalog.network);
  assert.equal(manifest.tokens.length, catalog.tokens.length);
  assert.deepEqual(
    manifest.tokens.map((token) => ({
      symbol: token.symbol,
      decimals: token.decimals,
      displayPriceUsd: token.displayPriceUsd,
      weiPerToken: token.weiPerToken,
      availabilityLabel: token.availabilityLabel,
      shortDescription: token.shortDescription,
    })),
    catalog.tokens.map((token) => ({
      symbol: token.symbol,
      decimals: token.decimals,
      displayPriceUsd: token.displayPriceUsd,
      weiPerToken: token.weiPerToken,
      availabilityLabel: token.availabilityLabel,
      shortDescription: token.shortDescription,
    }))
  );
  assert.ok(manifest.router?.address);
  assert.ok(manifest.tokens.every((token) => token.address));
  assert.equal(deployment.router.address, manifest.router.address);
});
