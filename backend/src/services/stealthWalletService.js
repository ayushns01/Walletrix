import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import telegramConfig from '../config/telegram.js';
import logger from './loggerService.js';
import stealthAddressService from './stealthAddressService.js';

const TELEGRAM_BOT_WALLET_REF = '__telegram_bot__';
const EVM_NETWORKS = new Set(['ETHEREUM', 'SEPOLIA', 'GOERLI', 'HOLESKY', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BASE', 'BSC', 'AVALANCHE']);

const memoryProfiles = new Map();
const memoryIssues = new Map();

function hasWalletDelegate() {
  return !!(prisma.wallet && typeof prisma.wallet.findMany === 'function');
}

function hasBotWalletDelegate() {
  return !!(prisma.telegramBotWallet && typeof prisma.telegramBotWallet.findUnique === 'function');
}

function hasStealthProfileDelegate() {
  return !!(prisma.stealthWalletProfile && typeof prisma.stealthWalletProfile.findUnique === 'function');
}

function hasStealthIssueDelegate() {
  return !!(prisma.stealthAddressIssue && typeof prisma.stealthAddressIssue.create === 'function');
}

function isTableMissingError(error) {
  return error?.code === 'P2021' || error?.code === 'P2022';
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateAddress(address) {
  if (!address || address.length < 12) return address || 'n/a';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function buildProfileKey(userId, walletType, walletRef) {
  return `${String(userId)}:${String(walletType)}:${String(walletRef)}`;
}

function deriveEncryptionKey() {
  const raw = telegramConfig.SERVER_SIGNING_KEY || (process.env.NODE_ENV === 'test' ? 'test-stealth-signing-key' : '');
  if (!raw) {
    throw new Error('SERVER_SIGNING_KEY not configured for stealth key encryption');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

function encryptSecret(value) {
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(String(value), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function mapWalletRowsToSelectableOptions(walletRows, botWallet) {
  const grouped = new Map();

  for (const wallet of walletRows) {
    const groupId = wallet?.metadata?.groupId || wallet.id;
    const existing = grouped.get(groupId) || {
      walletRef: groupId,
      label: wallet.label || 'My Wallet',
      createdAt: wallet.createdAt || new Date(),
      primaryAddress: wallet.address || '',
      evmAddress: null,
    };

    if (!existing.primaryAddress && wallet.address) {
      existing.primaryAddress = wallet.address;
    }

    if (!existing.evmAddress && EVM_NETWORKS.has(String(wallet.network || '').toUpperCase())) {
      existing.evmAddress = wallet.address;
    }

    grouped.set(groupId, existing);
  }

  const options = [...grouped.values()]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map((entry) => ({
      walletType: 'ACCOUNT_WALLET',
      walletRef: entry.walletRef,
      label: entry.label,
      address: entry.evmAddress || entry.primaryAddress || '',
      shortAddress: truncateAddress(entry.evmAddress || entry.primaryAddress || ''),
      kindLabel: 'Account wallet',
    }));

  if (botWallet?.address) {
    options.push({
      walletType: 'TELEGRAM_BOT_WALLET',
      walletRef: TELEGRAM_BOT_WALLET_REF,
      label: 'Telegram Bot Wallet',
      address: botWallet.address,
      shortAddress: truncateAddress(botWallet.address),
      kindLabel: 'Telegram bot wallet',
    });
  }

  return options;
}

async function loadWalletRows(userId) {
  if (!hasWalletDelegate()) return [];

  try {
    return await prisma.wallet.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    logger.warn('[StealthWallet] Failed to load account wallets', {
      userId,
      error: error.message,
    });
    return [];
  }
}

async function loadBotWallet(userId) {
  if (!hasBotWalletDelegate()) return null;

  try {
    return await prisma.telegramBotWallet.findUnique({
      where: { userId },
    });
  } catch (error) {
    logger.warn('[StealthWallet] Failed to load Telegram bot wallet', {
      userId,
      error: error.message,
    });
    return null;
  }
}

function toSelectionToken(index) {
  return String(index + 1);
}

export async function listSelectableStealthWallets(userId) {
  const [walletRows, botWallet] = await Promise.all([
    loadWalletRows(userId),
    loadBotWallet(userId),
  ]);

  return mapWalletRowsToSelectableOptions(walletRows, botWallet).map((option, index) => ({
    ...option,
    selectionToken: toSelectionToken(index),
    displayText: `${toSelectionToken(index)}. ${option.label}`,
  }));
}

export function resolveSelectableStealthWallet(options, input) {
  const normalizedInput = normalizeText(input);
  if (!normalizedInput) return null;

  const digitMatch = normalizedInput.match(/^(\d{1,2})\b/);
  if (digitMatch) {
    const numericIndex = Number.parseInt(digitMatch[1], 10) - 1;
    if (numericIndex >= 0 && numericIndex < options.length) {
      return options[numericIndex];
    }
  }

  const exact = options.find((option) => normalizeText(option.label) === normalizedInput);
  if (exact) return exact;

  const prefixed = options.find((option) => normalizeText(option.displayText) === normalizedInput);
  if (prefixed) return prefixed;

  const partial = options.find((option) => normalizedInput.includes(normalizeText(option.label)));
  if (partial) return partial;

  if (/telegram bot|bot wallet|\bbot\b/.test(normalizedInput)) {
    return options.find((option) => option.walletType === 'TELEGRAM_BOT_WALLET') || null;
  }

  return null;
}

async function loadPersistedProfile(userId, option) {
  if (!hasStealthProfileDelegate()) return null;

  try {
    return await prisma.stealthWalletProfile.findUnique({
      where: {
        userId_walletType_walletRef: {
          userId,
          walletType: option.walletType,
          walletRef: option.walletRef,
        },
      },
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return null;
    }

    logger.error('[StealthWallet] Failed to load stealth profile', {
      userId,
      walletType: option.walletType,
      walletRef: option.walletRef,
      error: error.message,
    });
    throw error;
  }
}

async function createPersistedProfile(userId, option, generatedKeys) {
  if (!hasStealthProfileDelegate()) return null;

  try {
    return await prisma.stealthWalletProfile.create({
      data: {
        userId,
        walletType: option.walletType,
        walletRef: option.walletRef,
        walletLabel: option.label,
        network: 'ETHEREUM',
        scanPublicKey: generatedKeys.scanPublicKey,
        spendPublicKey: generatedKeys.spendPublicKey,
        encryptedScanPrivateKey: encryptSecret(generatedKeys.scanPrivateKey),
        encryptedSpendPrivateKey: encryptSecret(generatedKeys.spendPrivateKey),
        stealthMetaAddress: generatedKeys.stealthMetaAddress,
      },
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return null;
    }

    logger.error('[StealthWallet] Failed to create stealth profile', {
      userId,
      walletType: option.walletType,
      walletRef: option.walletRef,
      error: error.message,
    });
    throw error;
  }
}

export async function getOrCreateStealthProfile(userId, option) {
  const memoryKey = buildProfileKey(userId, option.walletType, option.walletRef);

  const persisted = await loadPersistedProfile(userId, option);
  if (persisted) {
    return persisted;
  }

  const existingMemoryProfile = memoryProfiles.get(memoryKey);
  if (existingMemoryProfile) {
    return existingMemoryProfile;
  }

  const generatedKeys = stealthAddressService.generateStealthKeys();
  const createdProfile = await createPersistedProfile(userId, option, generatedKeys);
  if (createdProfile) {
    return createdProfile;
  }

  const memoryProfile = {
    id: `stealth-profile-${crypto.randomUUID()}`,
    userId,
    walletType: option.walletType,
    walletRef: option.walletRef,
    walletLabel: option.label,
    network: 'ETHEREUM',
    scanPublicKey: generatedKeys.scanPublicKey,
    spendPublicKey: generatedKeys.spendPublicKey,
    encryptedScanPrivateKey: encryptSecret(generatedKeys.scanPrivateKey),
    encryptedSpendPrivateKey: encryptSecret(generatedKeys.spendPrivateKey),
    stealthMetaAddress: generatedKeys.stealthMetaAddress,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  memoryProfiles.set(memoryKey, memoryProfile);
  return memoryProfile;
}

async function persistIssuedAddress(profileId, generatedAddress) {
  if (!hasStealthIssueDelegate()) return null;

  try {
    return await prisma.stealthAddressIssue.create({
      data: {
        profileId,
        stealthAddress: generatedAddress.stealthAddress,
        ephemeralPublicKey: generatedAddress.ephemeralPublicKey,
        status: 'ACTIVE',
      },
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return null;
    }

    logger.error('[StealthWallet] Failed to persist issued stealth address', {
      profileId,
      error: error.message,
    });
    throw error;
  }
}

export async function issueStealthReceiveAddress(userId, option) {
  const profile = await getOrCreateStealthProfile(userId, option);
  const generatedAddress = stealthAddressService.generateStealthAddress(profile.stealthMetaAddress);
  const issuedRecord = await persistIssuedAddress(profile.id, generatedAddress);

  const memoryIssuedRecord = issuedRecord || {
    id: `stealth-issue-${crypto.randomUUID()}`,
    profileId: profile.id,
    stealthAddress: generatedAddress.stealthAddress,
    ephemeralPublicKey: generatedAddress.ephemeralPublicKey,
    status: 'ACTIVE',
    createdAt: new Date(),
  };

  if (!issuedRecord) {
    memoryIssues.set(memoryIssuedRecord.id, memoryIssuedRecord);
  }

  return {
    issueId: memoryIssuedRecord.id,
    walletLabel: option.label,
    walletType: option.walletType,
    kindLabel: option.kindLabel,
    stealthAddress: generatedAddress.stealthAddress,
    stealthMetaAddress: profile.stealthMetaAddress,
    ephemeralPublicKey: generatedAddress.ephemeralPublicKey,
  };
}

export default {
  listSelectableStealthWallets,
  resolveSelectableStealthWallet,
  getOrCreateStealthProfile,
  issueStealthReceiveAddress,
};
