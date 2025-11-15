/**
 * Database Seeding Script
 * Seeds the database with initial data for development
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Supported networks configuration
 */
const networks = [
  {
    name: 'Ethereum',
    symbol: 'ETH',
    type: 'EVM',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    isTestnet: false,
    isActive: true,
  },
  {
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    type: 'EVM',
    chainId: 11155111,
    rpcUrl: 'https://rpc.sepolia.org',
    explorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true,
    isActive: true,
  },
  {
    name: 'Polygon',
    symbol: 'MATIC',
    type: 'EVM',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    isTestnet: false,
    isActive: true,
  },
  {
    name: 'Arbitrum',
    symbol: 'ETH',
    type: 'EVM',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    isTestnet: false,
    isActive: true,
  },
  {
    name: 'Optimism',
    symbol: 'ETH',
    type: 'EVM',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    isTestnet: false,
    isActive: true,
  },
  {
    name: 'Base',
    symbol: 'ETH',
    type: 'EVM',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    isTestnet: false,
    isActive: true,
  },
  {
    name: 'BSC',
    symbol: 'BNB',
    type: 'EVM',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    isTestnet: false,
    isActive: true,
  },
  {
    name: 'Avalanche',
    symbol: 'AVAX',
    type: 'EVM',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    isTestnet: false,
    isActive: true,
  },
  {
    name: 'Bitcoin',
    symbol: 'BTC',
    type: 'UTXO',
    chainId: null,
    rpcUrl: null,
    explorerUrl: 'https://blockchair.com/bitcoin',
    isTestnet: false,
    isActive: true,
  },
  {
    name: 'Bitcoin Testnet',
    symbol: 'BTC',
    type: 'UTXO',
    chainId: null,
    rpcUrl: null,
    explorerUrl: 'https://blockchair.com/bitcoin/testnet',
    isTestnet: true,
    isActive: true,
  },
];

/**
 * Popular ERC-20 tokens
 */
const tokens = [
  {
    name: 'USD Coin',
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    network: 'Ethereum',
    isActive: true,
  },
  {
    name: 'Tether USD',
    symbol: 'USDT',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    network: 'Ethereum',
    isActive: true,
  },
  {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
    network: 'Ethereum',
    isActive: true,
  },
  {
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8,
    network: 'Ethereum',
    isActive: true,
  },
  {
    name: 'Chainlink',
    symbol: 'LINK',
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    decimals: 18,
    network: 'Ethereum',
    isActive: true,
  },
  {
    name: 'Uniswap',
    symbol: 'UNI',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    decimals: 18,
    network: 'Ethereum',
    isActive: true,
  },
];

/**
 * Test user for development
 */
async function seedTestUser() {
  const hashedPassword = await bcrypt.hash('testpassword123', 12);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@walletrix.com' },
    update: {},
    create: {
      email: 'test@walletrix.com',
      password: hashedPassword,
      isVerified: true,
    },
  });

  console.log('✅ Created test user:', testUser.email);
  return testUser;
}

/**
 * Seed networks
 */
async function seedNetworks() {
  console.log('🌐 Seeding networks...');
  
  for (const network of networks) {
    await prisma.network.upsert({
      where: { 
        name_chainId: {
          name: network.name,
          chainId: network.chainId,
        },
      },
      update: network,
      create: network,
    });
  }
  
  console.log(`✅ Seeded ${networks.length} networks`);
}

/**
 * Seed tokens
 */
async function seedTokens() {
  console.log('🪙 Seeding tokens...');
  
  for (const token of tokens) {
    await prisma.token.upsert({
      where: { 
        address_network: {
          address: token.address,
          network: token.network,
        },
      },
      update: token,
      create: token,
    });
  }
  
  console.log(`✅ Seeded ${tokens.length} tokens`);
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Clear existing data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️  Clearing existing seed data...');
      await prisma.transaction.deleteMany({});
      await prisma.wallet.deleteMany({});
      await prisma.token.deleteMany({});
      await prisma.network.deleteMany({});
      await prisma.user.deleteMany({
        where: { email: 'test@walletrix.com' },
      });
      console.log('✅ Cleared existing data\n');
    }

    // Seed data
    await seedNetworks();
    await seedTokens();
    
    // Only create test user in development
    if (process.env.NODE_ENV === 'development') {
      await seedTestUser();
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nTest credentials (development only):');
    console.log('  Email: test@walletrix.com');
    console.log('  Password: testpassword123\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
