import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextConfig = require('../next.config.js');

const PHASE_DEVELOPMENT_SERVER = 'phase-development-server';
const PHASE_PRODUCTION_BUILD = 'phase-production-build';
const PHASE_PRODUCTION_SERVER = 'phase-production-server';

function resolveConfig(phase) {
  return typeof nextConfig === 'function' ? nextConfig(phase) : nextConfig;
}

test('development and production builds use separate Next dist directories', () => {
  const developmentConfig = resolveConfig(PHASE_DEVELOPMENT_SERVER);
  const productionBuildConfig = resolveConfig(PHASE_PRODUCTION_BUILD);
  const productionServerConfig = resolveConfig(PHASE_PRODUCTION_SERVER);

  assert.equal(developmentConfig.distDir, '.next/dev');
  assert.equal(productionBuildConfig.distDir, '.next/prod');
  assert.equal(productionServerConfig.distDir, '.next/prod');
});
