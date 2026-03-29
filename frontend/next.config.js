const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
} = require('next/constants');

module.exports = (phase) => {
  const isDevelopmentServer = phase === PHASE_DEVELOPMENT_SERVER;
  const isProductionPhase =
    phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER;

  return {
    reactStrictMode: true,
    distDir: isDevelopmentServer ? '.next/dev' : isProductionPhase ? '.next/prod' : '.next/prod',
    env: {
      API_URL: process.env.API_URL || 'http://localhost:3001',
    },
  };
};
