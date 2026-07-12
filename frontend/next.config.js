const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} = require('next/constants');

module.exports = (phase) => {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;
  const isProductionPhase =
    phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER;

  // Vercel deployment builds expect the default '.next' output directory
  const distDir = process.env.VERCEL === '1'
    ? '.next'
    : (isDevelopmentServer ? '.next/dev' : '.next/prod');

  return {
    reactStrictMode: true,
    distDir,
    env: {
      API_URL: process.env.API_URL || 'http://localhost:3001',
    },
  };
};
