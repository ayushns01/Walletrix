#!/usr/bin/env node

/**
 * Walletrix Environment Setup Script
 * Helps users configure their environment variables interactively
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

console.log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║           WALLETRIX ENVIRONMENT SETUP                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

async function setupBackend() {
  console.log(`${colors.bright}Setting up Backend Environment...${colors.reset}\n`);
  
  const backendEnvPath = path.join(__dirname, 'backend', '.env');
  const backendExamplePath = path.join(__dirname, 'backend', '.env.example');
  
  // Check if .env already exists
  if (fs.existsSync(backendEnvPath)) {
    console.log(`${colors.yellow}⚠️  Backend .env file already exists!${colors.reset}`);
    const overwrite = await question('Do you want to overwrite it? (yes/no): ');
    if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
      console.log('Skipping backend setup.\n');
      return;
    }
  }
  
  // Copy from example
  if (fs.existsSync(backendExamplePath)) {
    fs.copyFileSync(backendExamplePath, backendEnvPath);
    console.log(`${colors.green}✅ Created backend/.env from .env.example${colors.reset}\n`);
  }
  
  // Ask for critical values
  console.log(`${colors.bright}Configure Critical Settings:${colors.reset}\n`);
  
  const apiPort = await question('API Port [3001]: ') || '3001';
  const nodeEnv = await question('Environment (development/production) [development]: ') || 'development';
  
  console.log('\n💡 For database, using default PostgreSQL configuration.');
  console.log('   Database: walletrix');
  console.log('   User: walletrix_user');
  console.log('   Password: walletrix_password_2024\n');
  
  const useCustomDb = await question('Use custom database connection? (yes/no) [no]: ');
  let dbUrl = 'postgresql://walletrix_user:walletrix_password_2024@localhost:5432/walletrix?schema=public';
  
  if (useCustomDb.toLowerCase() === 'yes' || useCustomDb.toLowerCase() === 'y') {
    const dbHost = await question('Database host [localhost]: ') || 'localhost';
    const dbPort = await question('Database port [5432]: ') || '5432';
    const dbName = await question('Database name [walletrix]: ') || 'walletrix';
    const dbUser = await question('Database user [postgres]: ') || 'postgres';
    const dbPass = await question('Database password: ');
    dbUrl = `postgresql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}?schema=public`;
  }
  
  // Generate secure JWT secret
  const jwtSecret = await generateSecureSecret(64);
  console.log(`\n${colors.green}✅ Generated secure JWT secret${colors.reset}`);
  
  // Ask about API keys
  console.log(`\n${colors.bright}Optional API Keys (press Enter to skip):${colors.reset}\n`);
  console.log('💡 Get free API keys from:');
  console.log('   - Etherscan: https://etherscan.io/apis');
  console.log('   - CoinGecko: https://www.coingecko.com/en/api');
  console.log('   - Alchemy/Infura: For better RPC performance\n');
  
  const etherscanKey = await question('Etherscan API Key: ');
  const coingeckoKey = await question('CoinGecko API Key: ');
  const alchemyKey = await question('Alchemy API Key: ');
  
  // Update .env file
  let envContent = fs.readFileSync(backendEnvPath, 'utf8');
  envContent = envContent.replace(/API_PORT=.*/,  `API_PORT=${apiPort}`);
  envContent = envContent.replace(/NODE_ENV=.*/, `NODE_ENV=${nodeEnv}`);
  envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${dbUrl}"`);
  envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${jwtSecret}`);
  
  if (etherscanKey) {
    envContent = envContent.replace(/ETHERSCAN_API_KEY=.*/, `ETHERSCAN_API_KEY=${etherscanKey}`);
  }
  if (coingeckoKey) {
    envContent = envContent.replace(/COINGECKO_API_KEY=.*/, `COINGECKO_API_KEY=${coingeckoKey}`);
  }
  if (alchemyKey) {
    envContent = envContent.replace(/ALCHEMY_API_KEY=.*/, `ALCHEMY_API_KEY=${alchemyKey}`);
    // Update RPC endpoints to use Alchemy
    envContent = envContent.replace(/\/v2\/[^"\s]*/g, `/v2/${alchemyKey}`);
  }
  
  fs.writeFileSync(backendEnvPath, envContent);
  console.log(`\n${colors.green}✅ Backend environment configured!${colors.reset}\n`);
}

async function setupFrontend() {
  console.log(`${colors.bright}Setting up Frontend Environment...${colors.reset}\n`);
  
  const frontendEnvPath = path.join(__dirname, 'frontend', '.env.local');
  
  if (fs.existsSync(frontendEnvPath)) {
    console.log(`${colors.yellow}⚠️  Frontend .env.local file already exists!${colors.reset}`);
    const overwrite = await question('Do you want to overwrite it? (yes/no): ');
    if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
      console.log('Skipping frontend setup.\n');
      return;
    }
  }
  
  const apiUrl = await question('Backend API URL [http://localhost:3001/api/v1]: ') || 'http://localhost:3001/api/v1';
  
  const envContent = `# Walletrix Frontend Environment Configuration
NEXT_PUBLIC_API_URL=${apiUrl}
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_DEFAULT_NETWORK=ethereum-mainnet
NEXT_PUBLIC_ENABLE_DATABASE_WALLETS=true
NEXT_PUBLIC_ENABLE_MULTI_WALLET=true
`;
  
  fs.writeFileSync(frontendEnvPath, envContent);
  console.log(`${colors.green}✅ Frontend environment configured!${colors.reset}\n`);
}

async function generateSecureSecret(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let secret = '';
  const crypto = await import('crypto');
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    secret += chars[randomBytes[i] % chars.length];
  }
  
  return secret;
}

async function main() {
  try {
    await setupBackend();
    await setupFrontend();
    
    console.log(`${colors.bright}${colors.green}
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║           ✅ SETUP COMPLETE!                               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}\n`);
    
    console.log(`${colors.bright}Next Steps:${colors.reset}\n`);
    console.log('1. Review the generated .env files');
    console.log('2. Set up your PostgreSQL database');
    console.log('3. Run database migrations: cd backend && npx prisma migrate dev');
    console.log('4. Start the backend: cd backend && npm start');
    console.log('5. Start the frontend: cd frontend && npm run dev');
    console.log('\n💡 For production, remember to change all secrets and API keys!\n');
    
  } catch (error) {
    console.error(`${colors.red}❌ Setup failed:${colors.reset}`, error.message);
  } finally {
    rl.close();
  }
}

main();
