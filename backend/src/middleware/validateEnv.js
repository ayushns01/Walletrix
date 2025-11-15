/**
 * Environment Validation Middleware
 * Validates required environment variables on startup
 */

const requiredEnvVars = {
  // Server
  API_PORT: 'Server port number',
  NODE_ENV: 'Node environment (development/production)',
  
  // Database
  DATABASE_URL: 'PostgreSQL database connection string',
  JWT_SECRET: 'JWT token secret key',
  
  // Core RPC endpoints
  ETHEREUM_MAINNET_RPC: 'Ethereum mainnet RPC endpoint',
};

const optionalEnvVars = {
  // Additional JWT
  JWT_ACCESS_SECRET: 'JWT access token secret (recommended)',
  JWT_REFRESH_SECRET: 'JWT refresh token secret (recommended)',
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 'Rate limit time window',
  RATE_LIMIT_MAX_REQUESTS: 'Maximum requests per window',
  
  // API keys
  ETHERSCAN_API_KEY: 'Etherscan API key for transaction history',
  COINGECKO_API_KEY: 'CoinGecko API key for price data',
  BLOCKCYPHER_API_KEY: 'BlockCypher API key for Bitcoin',
  
  // Additional networks
  ETHEREUM_SEPOLIA_RPC: 'Ethereum Sepolia testnet RPC',
  ETHEREUM_GOERLI_RPC: 'Ethereum Goerli testnet RPC',
  POLYGON_MAINNET_RPC: 'Polygon mainnet RPC',
  ARBITRUM_ONE_RPC: 'Arbitrum One mainnet RPC',
  OPTIMISM_MAINNET_RPC: 'Optimism mainnet RPC',
  BASE_MAINNET_RPC: 'Base mainnet RPC',
  BSC_MAINNET_RPC: 'BSC mainnet RPC',
  AVALANCHE_MAINNET_RPC: 'Avalanche mainnet RPC',
  
  // Caching
  REDIS_URL: 'Redis connection URL for caching',
  
  // Security
  ENCRYPTION_KEY: 'Encryption key for sensitive data',
  ALLOWED_ORIGINS: 'CORS allowed origins',
};

/**
 * Validate environment variables
 * @returns {Object} - { valid: boolean, missing: [], warnings: [] }
 */
export const validateEnvironment = () => {
  const missing = [];
  const warnings = [];
  const config = {};

  console.log('\n🔍 Validating Environment Configuration...\n');

  // Check required variables
  for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      missing.push({ key, description });
    } else {
      config[key] = process.env[key];
      console.log(`✅ ${key}: Configured`);
    }
  }

  // Check optional but recommended variables
  for (const [key, description] of Object.entries(optionalEnvVars)) {
    if (!process.env[key]) {
      warnings.push({ key, description });
    } else {
      config[key] = process.env[key];
    }
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  Optional Configuration Missing (Recommended):');
    warnings.forEach(({ key, description }) => {
      console.log(`   - ${key}: ${description}`);
    });
  }

  // Print errors
  if (missing.length > 0) {
    console.error('\n❌ Critical Environment Variables Missing:\n');
    missing.forEach(({ key, description }) => {
      console.error(`   - ${key}: ${description}`);
    });
    console.error('\n💡 Tip: Copy .env.example to .env and fill in the values\n');
    return { valid: false, missing, warnings, config };
  }

  // Validate specific formats
  const formatErrors = [];
  
  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    formatErrors.push('DATABASE_URL must start with postgresql://');
  }
  
  // Validate API_PORT is a number
  if (process.env.API_PORT && isNaN(parseInt(process.env.API_PORT))) {
    formatErrors.push('API_PORT must be a valid number');
  }
  
  // Validate NODE_ENV is valid
  const validEnvs = ['development', 'production', 'test'];
  if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
    formatErrors.push(`NODE_ENV must be one of: ${validEnvs.join(', ')}`);
  }
  
  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    formatErrors.push('JWT_SECRET should be at least 32 characters long');
  }

  if (formatErrors.length > 0) {
    console.error('\n❌ Environment Variable Format Errors:\n');
    formatErrors.forEach(error => {
      console.error(`   - ${error}`);
    });
    return { valid: false, missing: formatErrors, warnings, config };
  }

  console.log('\n✅ Environment Configuration Valid\n');
  return { valid: true, missing: [], warnings, config };
};

/**
 * Middleware to ensure environment is validated before starting server
 */
export const requireValidEnvironment = () => {
  const result = validateEnvironment();
  
  if (!result.valid) {
    console.error('❌ Server cannot start due to environment configuration errors');
    process.exit(1);
  }
  
  return result.config;
};

/**
 * Get environment-specific configuration
 */
export const getEnvConfig = () => {
  return {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    
    server: {
      port: parseInt(process.env.API_PORT) || 3001,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
    
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },
    
    hasEtherscanKey: !!process.env.ETHERSCAN_API_KEY,
    hasCoinGeckoKey: !!process.env.COINGECKO_API_KEY,
    hasBlockCypherKey: !!process.env.BLOCKCYPHER_API_KEY,
    hasRedis: !!process.env.REDIS_URL,
  };
};

export default {
  validateEnvironment,
  requireValidEnvironment,
  getEnvConfig,
};
