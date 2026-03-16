/**
 * telegramExecutionService.js
 *
 * EOA-based execution for Telegram bot commands.
 * Each user gets a dedicated bot EOA wallet generated at account linking time.
 * The bot uses this wallet to send transactions without touching the user's main keys.
 *
 * Future upgrade path: replace sendEoaTransaction() with buildUserOperation() + bundler
 * once Phase 3 (contract upgrade) is complete.
 */

import { ethers } from 'ethers';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import telegramConfig from '../config/telegram.js';
import { TOKEN_REGISTRY, CHAIN_RPC, CHAIN_NAME_TO_ID, DEFAULT_CHAIN_ID } from '../config/tokens.js';
import logger from './loggerService.js';

// ─────────────────────────────────────────────────────────────
//  Key encryption/decryption using SERVER_SIGNING_KEY
// ─────────────────────────────────────────────────────────────

/**
 * Derive a 32-byte AES key from the SERVER_SIGNING_KEY string.
 */
function deriveKey() {
  const raw = telegramConfig.SERVER_SIGNING_KEY;
  if (!raw) throw new Error('SERVER_SIGNING_KEY not configured');
  return crypto.createHash('sha256').update(raw).digest(); // 32 bytes for AES-256
}

/**
 * Encrypt a private key string with AES-256-GCM (authenticated encryption).
 * @param {string} privateKey  — hex private key (0x...)
 * @returns {string}           — "iv:authTag:ciphertext" (hex:hex:hex)
 */
export function encryptPrivateKey(privateKey) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted private key string.
 * Supports both new GCM format ("iv:authTag:ciphertext") and legacy CBC format ("iv:ciphertext").
 * @param {string} encryptedStr — from encryptPrivateKey()
 * @returns {string}             — original hex private key
 */
export function decryptPrivateKey(encryptedStr) {
  const key = deriveKey();
  const parts = encryptedStr.split(':');

  if (parts.length === 3) {
    // GCM format: iv:authTag:ciphertext
    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Legacy CBC format: iv:ciphertext (for existing wallets)
  const [ivHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ─────────────────────────────────────────────────────────────
//  Bot Wallet management
// ─────────────────────────────────────────────────────────────

/**
 * Generate and persist a fresh EOA bot wallet for a user.
 * Called once during Telegram account linking.
 *
 * @param {string} userId — Walletrix DB user id
 * @returns {{ address: string }}
 */
export async function createBotWallet(userId) {
  // Check if one already exists
  const existing = await prisma.telegramBotWallet.findUnique({ where: { userId } });
  if (existing) return { address: existing.address };

  const wallet = ethers.Wallet.createRandom();
  const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey);

  await prisma.telegramBotWallet.create({
    data: {
      userId,
      address: wallet.address,
      encryptedPrivateKey,
    },
  });

  logger.info('[TelegramBot] Bot wallet created', { userId, address: wallet.address });
  return { address: wallet.address };
}

/**
 * Get the ethers Wallet instance for a user's bot EOA.
 * @param {string} userId
 * @param {ethers.Provider} provider
 * @returns {ethers.Wallet}
 */
async function getBotWallet(userId, provider) {
  const record = await prisma.telegramBotWallet.findUnique({ where: { userId } });
  if (!record) throw new Error('Bot wallet not found. Please re-link your account.');
  const privateKey = decryptPrivateKey(record.encryptedPrivateKey);
  return new ethers.Wallet(privateKey, provider);
}

// ─────────────────────────────────────────────────────────────
//  EOA Transaction execution
// ─────────────────────────────────────────────────────────────

/**
 * Resolve ENS names to 0x addresses.
 * Falls back gracefully if no ENS name found.
 */
async function resolveAddress(addressOrEns, provider) {
  if (!addressOrEns) throw new Error('Recipient address is required');
  if (addressOrEns.endsWith('.eth')) {
    const resolved = await provider.resolveName(addressOrEns);
    if (!resolved) throw new Error(`ENS name not found: ${addressOrEns}`);
    return resolved;
  }
  return addressOrEns;
}

/**
 * Get the ERC-20 token address for a symbol on a given chainId.
 */
function getTokenAddress(tokenSymbol, chainId) {
  const upper = tokenSymbol.toUpperCase();
  if (upper === 'ETH' || upper === 'MATIC') return null; // native transfer
  const tokenMap = TOKEN_REGISTRY[upper];
  if (!tokenMap) throw new Error(`Token ${upper} not supported. Supported: ETH, USDC, USDT, WETH, DAI`);
  const addr = tokenMap[chainId];
  if (!addr) throw new Error(`Token ${upper} not available on chain ${chainId}`);
  return addr;
}

/**
 * Resolve chain name to chainId.
 */
function resolveChainId(chainName) {
  if (!chainName) return DEFAULT_CHAIN_ID;
  const id = CHAIN_NAME_TO_ID[chainName.toLowerCase()];
  if (!id) return DEFAULT_CHAIN_ID;
  return id;
}

/**
 * Get an ethers provider for a chain.
 */
function getProvider(chainId) {
  const rpc = CHAIN_RPC[chainId];
  if (!rpc) throw new Error(`No RPC configured for chainId ${chainId}`);
  return new ethers.JsonRpcProvider(rpc);
}

/**
 * Main execution function called after user confirms intent in Telegram.
 *
 * @param {object} intent         — Parsed TransactionIntent from geminiService
 * @param {object} user           — Prisma User record (must have id)
 * @param {object} [options]
 * @param {(payload: { txHash: string, from: string, to: string, amount: string, token: string, chainId: number }) => Promise<void>|void} [options.onBroadcast]
 * @returns {{ txHash: string, from: string, to: string, amount: string, token: string }}
 */
export async function executeTransfer(intent, user, options = {}) {
  const { tokenSymbol, amount, recipientAddress, chain } = intent.details;

  if (!amount || amount <= 0) throw new Error('Invalid amount');
  if (!recipientAddress) throw new Error('Recipient address is required');

  const chainId = resolveChainId(chain);
  const provider = getProvider(chainId);
  const botWallet = await getBotWallet(user.id, provider);
  const toAddress = await resolveAddress(recipientAddress, provider);

  logger.info('[TelegramBot] Executing EOA transfer', {
    from: botWallet.address,
    to: toAddress,
    amount,
    tokenSymbol,
    chainId,
  });

  let tx;
  const tokenAddress = getTokenAddress(tokenSymbol, chainId);

  if (!tokenAddress) {
    // Native ETH transfer
    tx = await botWallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount.toString()),
    });
  } else {
    // ERC-20 transfer
    const erc20 = new ethers.Contract(
      tokenAddress,
      ['function transfer(address to, uint256 amount) returns (bool)',
       'function decimals() view returns (uint8)'],
      botWallet
    );
    const decimals = await erc20.decimals();
    const parsed = ethers.parseUnits(amount.toString(), decimals);
    tx = await erc20.transfer(toAddress, parsed);
  }

  logger.info('[TelegramBot] Transaction broadcast', { txHash: tx.hash });

  if (typeof options.onBroadcast === 'function') {
    await options.onBroadcast({
      txHash: tx.hash,
      from: botWallet.address,
      to: toAddress,
      amount: amount.toString(),
      token: tokenSymbol.toUpperCase(),
      chainId,
    });
  }

  // Wait for 1 confirmation
  await tx.wait(1);

  logger.info('[TelegramBot] Transaction confirmed', { txHash: tx.hash });

  return {
    txHash: tx.hash,
    from: botWallet.address,
    to: toAddress,
    amount: amount.toString(),
    token: tokenSymbol.toUpperCase(),
    chainId,
  };
}

/**
 * Get the balance of the user's bot wallet (native + optional token).
 * @param {string} userId
 * @param {number} [chainId]
 * @returns {{ address: string, ethBalance: string }}
 */
export async function getBotWalletBalance(userId, chainId = DEFAULT_CHAIN_ID) {
  const record = await prisma.telegramBotWallet.findUnique({ where: { userId } });
  if (!record) throw new Error('Bot wallet not found');

  const provider = getProvider(chainId);
  const raw = await provider.getBalance(record.address);
  const ethBalance = ethers.formatEther(raw);

  return {
    address: record.address,
    ethBalance,
    chainId,
  };
}
