import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import telegramConfig from '../config/telegram.js';
import logger from './loggerService.js';
import stealthAddressService from './stealthAddressService.js';

const TELEGRAM_BOT_WALLET_REF = '__telegram_bot__';
const EVM_NETWORKS = new Set(['ETHEREUM', 'SEPOLIA', 'GOERLI', 'HOLESKY', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BASE', 'BSC', 'AVALANCHE']);
const STEALTH_NETWORK_OPTIONS = Object.freeze([
  { network: 'SEPOLIA', label: 'Sepolia', kindLabel: 'Ethereum testnet' },
  { network: 'ETHEREUM', label: 'Ethereum Mainnet', kindLabel: 'Ethereum mainnet' },
]);

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

function hasStealthProfileCreateDelegate() {
  return !!(prisma.stealthWalletProfile && typeof prisma.stealthWalletProfile.create === 'function');
}

function hasStealthIssueCreateDelegate() {
  return !!(prisma.stealthAddressIssue && typeof prisma.stealthAddressIssue.create === 'function');
}

function hasStealthIssueReadDelegate() {
  return !!(prisma.stealthAddressIssue && typeof prisma.stealthAddressIssue.findMany === 'function');
}

function hasStealthIssueUpdateDelegate() {
  return !!(prisma.stealthAddressIssue && typeof prisma.stealthAddressIssue.update === 'function');
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

function buildProfileKey(userId, walletType, walletRef, network) {
  return `${String(userId)}:${String(walletType)}:${String(walletRef)}:${String(network)}`;
}

function allowInMemoryStealthFallback() {
  if (typeof process.env.ALLOW_IN_MEMORY_STEALTH_FALLBACK === 'string') {
    return process.env.ALLOW_IN_MEMORY_STEALTH_FALLBACK === 'true';
  }
  return process.env.NODE_ENV === 'test';
}

function deriveEncryptionKey() {
  const raw = telegramConfig.SERVER_SIGNING_KEY || (process.env.NODE_ENV === 'test' ? 'test-stealth-signing-key' : '');
  if (!raw) {
    throw new Error('SERVER_SIGNING_KEY not configured for stealth key encryption');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptSecret(value) {
  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(String(value), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSecret(encryptedValue) {
  const parts = String(encryptedValue || '').split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted stealth secret format');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = deriveEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function listSelectableStealthNetworks() {
  return STEALTH_NETWORK_OPTIONS.map((option, index) => ({
    ...option,
    selectionToken: String(index + 1),
    displayText: `${index + 1}. ${option.label}`,
  }));
}

export function normalizeStealthNetwork(value, fallback = 'SEPOLIA') {
  const normalized = normalizeText(value);
  if (!normalized) return fallback;

  const aliases = {
    '1': 'SEPOLIA',
    '2': 'ETHEREUM',
    sepolia: 'SEPOLIA',
    ethereum: 'ETHEREUM',
    eth: 'ETHEREUM',
    'ethereum mainnet': 'ETHEREUM',
    mainnet: 'ETHEREUM',
  };

  return aliases[normalized] || fallback;
}

export function resolveSelectableStealthNetwork(options, input) {
  const normalizedInput = normalizeText(input);
  if (!normalizedInput) return null;

  const digitMatch = normalizedInput.match(/^(\d{1,2})\b/);
  if (digitMatch) {
    const numericIndex = Number.parseInt(digitMatch[1], 10) - 1;
    if (numericIndex >= 0 && numericIndex < options.length) {
      return options[numericIndex];
    }
  }

  return options.find((option) => {
    const networkName = normalizeText(option.network);
    const label = normalizeText(option.label);
    const displayText = normalizeText(option.displayText);
    return normalizedInput === networkName
      || normalizedInput === label
      || normalizedInput === displayText
      || normalizedInput.includes(networkName)
      || normalizedInput.includes(label);
  }) || null;
}

export function formatStealthNetworkLabel(network) {
  return listSelectableStealthNetworks().find((option) => option.network === String(network || '').toUpperCase())?.label || 'Ethereum';
}

export function toEthereumServiceNetwork(network) {
  return String(network || '').toUpperCase() === 'SEPOLIA' ? 'sepolia' : 'mainnet';
}

function resolveWalletKindLabel(walletType) {
  return walletType === 'TELEGRAM_BOT_WALLET' ? 'Telegram bot wallet' : 'Account wallet';
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
      kindLabel: resolveWalletKindLabel('ACCOUNT_WALLET'),
    }));

  if (botWallet?.address) {
    options.push({
      walletType: 'TELEGRAM_BOT_WALLET',
      walletRef: TELEGRAM_BOT_WALLET_REF,
      label: 'Telegram Bot Wallet',
      address: botWallet.address,
      shortAddress: truncateAddress(botWallet.address),
      kindLabel: resolveWalletKindLabel('TELEGRAM_BOT_WALLET'),
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

export async function resolveStealthDestinationAddress(userId, option) {
  if (option?.address) {
    return option.address;
  }

  const options = await listSelectableStealthWallets(userId);
  return options.find((candidate) => (
    candidate.walletType === option.walletType
    && candidate.walletRef === option.walletRef
  ))?.address || '';
}

async function loadPersistedProfile(userId, option, network) {
  if (!hasStealthProfileDelegate()) return null;

  try {
    return await prisma.stealthWalletProfile.findUnique({
      where: {
        userId_walletType_walletRef_network: {
          userId,
          walletType: option.walletType,
          walletRef: option.walletRef,
          network,
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
      network,
      error: error.message,
    });
    throw error;
  }
}

async function createPersistedProfile(userId, option, generatedKeys, network) {
  if (!hasStealthProfileCreateDelegate()) return null;

  try {
    return await prisma.stealthWalletProfile.create({
      data: {
        userId,
        walletType: option.walletType,
        walletRef: option.walletRef,
        walletLabel: option.label,
        network,
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
      network,
      error: error.message,
    });
    throw error;
  }
}

export async function getOrCreateStealthProfile(userId, option, network = 'SEPOLIA') {
  const resolvedNetwork = normalizeStealthNetwork(network, 'SEPOLIA');
  const memoryKey = buildProfileKey(userId, option.walletType, option.walletRef, resolvedNetwork);
  const allowMemoryFallback = allowInMemoryStealthFallback();

  const persisted = await loadPersistedProfile(userId, option, resolvedNetwork);
  if (persisted) {
    return persisted;
  }

  const existingMemoryProfile = allowMemoryFallback ? memoryProfiles.get(memoryKey) : null;
  if (existingMemoryProfile) {
    return existingMemoryProfile;
  }

  const generatedKeys = stealthAddressService.generateStealthKeys();
  const createdProfile = await createPersistedProfile(userId, option, generatedKeys, resolvedNetwork);
  if (createdProfile) {
    return createdProfile;
  }

  if (!allowMemoryFallback) {
    throw new Error('Stealth address persistence is unavailable');
  }

  const memoryProfile = {
    id: `stealth-profile-${crypto.randomUUID()}`,
    userId,
    walletType: option.walletType,
    walletRef: option.walletRef,
    walletLabel: option.label,
    network: resolvedNetwork,
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

function buildMemoryIssueRecord(userId, profile, option, generatedAddress, destinationAddress) {
  return {
    id: `stealth-issue-${crypto.randomUUID()}`,
    userId,
    profileId: profile.id,
    stealthAddress: generatedAddress.stealthAddress,
    ephemeralPublicKey: generatedAddress.ephemeralPublicKey,
    network: profile.network,
    destinationAddress,
    status: 'ACTIVE',
    createdAt: new Date(),
    usedAt: null,
    expiresAt: null,
    lastCheckedAt: null,
    lastObservedBalanceWei: '0',
    claimedAt: null,
    claimTxHash: null,
    profile,
    walletLabel: option.label,
    walletType: option.walletType,
    kindLabel: option.kindLabel || resolveWalletKindLabel(option.walletType),
  };
}

async function persistIssuedAddress(profile, generatedAddress, destinationAddress) {
  if (!hasStealthIssueCreateDelegate()) return null;

  try {
    return await prisma.stealthAddressIssue.create({
      data: {
        profileId: profile.id,
        stealthAddress: generatedAddress.stealthAddress,
        ephemeralPublicKey: generatedAddress.ephemeralPublicKey,
        network: profile.network,
        destinationAddress,
        status: 'ACTIVE',
        lastObservedBalanceWei: '0',
      },
      include: {
        profile: true,
      },
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      return null;
    }

    logger.error('[StealthWallet] Failed to persist issued stealth address', {
      profileId: profile.id,
      network: profile.network,
      error: error.message,
    });
    throw error;
  }
}

function decoratePersistedIssueRecord(issue) {
  if (!issue) return null;
  const profile = issue.profile || null;
  const walletType = profile?.walletType || issue.walletType || 'ACCOUNT_WALLET';
  return {
    ...issue,
    profile,
    walletLabel: profile?.walletLabel || issue.walletLabel || 'My Wallet',
    walletType,
    kindLabel: resolveWalletKindLabel(walletType),
  };
}

async function hydrateLegacyIssueDestination(issue) {
  if (!issue || issue.destinationAddress) {
    return issue;
  }

  const profile = issue.profile || null;
  if (!profile?.userId || !profile?.walletType || !profile?.walletRef) {
    return issue;
  }

  const destinationAddress = await resolveStealthDestinationAddress(profile.userId, {
    walletType: profile.walletType,
    walletRef: profile.walletRef,
    label: profile.walletLabel || issue.walletLabel || 'My Wallet',
    address: issue.destinationAddress || '',
  });

  if (!destinationAddress) {
    return issue;
  }

  return {
    ...issue,
    destinationAddress,
  };
}

export async function issueStealthReceiveAddress(userId, option, network = 'SEPOLIA') {
  const allowMemoryFallback = allowInMemoryStealthFallback();
  const profile = await getOrCreateStealthProfile(userId, option, network);
  const destinationAddress = await resolveStealthDestinationAddress(userId, option);
  if (!destinationAddress) {
    throw new Error('Could not resolve destination address for stealth wallet');
  }

  const generatedAddress = stealthAddressService.generateStealthAddress(profile.stealthMetaAddress);
  const issuedRecord = await persistIssuedAddress(profile, generatedAddress, destinationAddress);
  if (!issuedRecord && !allowMemoryFallback) {
    throw new Error('Stealth address persistence is unavailable');
  }
  const issue = issuedRecord
    ? decoratePersistedIssueRecord(issuedRecord)
    : buildMemoryIssueRecord(userId, profile, option, generatedAddress, destinationAddress);

  if (!issuedRecord) {
    memoryIssues.set(issue.id, issue);
  }

  return {
    issueId: issue.id,
    walletLabel: issue.walletLabel,
    walletType: issue.walletType,
    kindLabel: issue.kindLabel,
    network: issue.network,
    networkLabel: formatStealthNetworkLabel(issue.network),
    destinationAddress: issue.destinationAddress,
    stealthAddress: issue.stealthAddress,
    stealthMetaAddress: profile.stealthMetaAddress,
    ephemeralPublicKey: issue.ephemeralPublicKey,
    status: issue.status,
  };
}

export async function findStealthIssueForUser(userId, issueId) {
  if (hasStealthIssueReadDelegate()) {
    try {
      const issue = await prisma.stealthAddressIssue.findFirst({
        where: {
          id: issueId,
          profile: {
            userId,
          },
        },
        include: {
          profile: {
            include: {
              user: {
                select: {
                  id: true,
                  telegramId: true,
                },
              },
            },
          },
        },
      });
      if (issue) {
        return hydrateLegacyIssueDestination(decoratePersistedIssueRecord(issue));
      }
    } catch (error) {
      if (!isTableMissingError(error)) {
        logger.error('[StealthWallet] Failed to load stealth issue', {
          issueId,
          userId,
          error: error.message,
        });
        throw error;
      }
    }
  }

  if (!allowInMemoryStealthFallback()) {
    return null;
  }

  const issue = memoryIssues.get(String(issueId));
  if (!issue || String(issue.userId) !== String(userId)) {
    return null;
  }
  return issue;
}

export async function listStealthIssuesForUser(userId, { statuses = [] } = {}) {
  const normalizedStatuses = Array.isArray(statuses) ? statuses.filter(Boolean) : [];

  if (hasStealthIssueReadDelegate()) {
    try {
      const issues = await prisma.stealthAddressIssue.findMany({
        where: {
          profile: { userId },
          ...(normalizedStatuses.length ? { status: { in: normalizedStatuses } } : {}),
        },
        include: {
          profile: {
            include: {
              user: {
                select: {
                  id: true,
                  telegramId: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return Promise.all(issues.map(async (issue) => hydrateLegacyIssueDestination(decoratePersistedIssueRecord(issue))));
    } catch (error) {
      if (!isTableMissingError(error)) {
        logger.error('[StealthWallet] Failed to list stealth issues', {
          userId,
          error: error.message,
        });
        throw error;
      }
    }
  }

  if (!allowInMemoryStealthFallback()) {
    return [];
  }

  return [...memoryIssues.values()]
    .filter((issue) => String(issue.userId) === String(userId))
    .filter((issue) => normalizedStatuses.length === 0 || normalizedStatuses.includes(issue.status))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export async function updateStealthIssue(issueId, data) {
  if (hasStealthIssueUpdateDelegate()) {
    try {
      const updated = await prisma.stealthAddressIssue.update({
        where: { id: issueId },
        data,
        include: {
          profile: true,
        },
      });
      return decoratePersistedIssueRecord(updated);
    } catch (error) {
      if (!isTableMissingError(error)) {
        logger.error('[StealthWallet] Failed to update stealth issue', {
          issueId,
          error: error.message,
        });
        throw error;
      }
    }
  }

  if (!allowInMemoryStealthFallback()) {
    return null;
  }

  const existing = memoryIssues.get(String(issueId));
  if (!existing) return null;
  const updated = {
    ...existing,
    ...data,
  };
  memoryIssues.set(String(issueId), updated);
  return updated;
}

export default {
  TELEGRAM_BOT_WALLET_REF,
  listSelectableStealthWallets,
  resolveSelectableStealthWallet,
  listSelectableStealthNetworks,
  resolveSelectableStealthNetwork,
  normalizeStealthNetwork,
  formatStealthNetworkLabel,
  toEthereumServiceNetwork,
  encryptSecret,
  decryptSecret,
  getOrCreateStealthProfile,
  issueStealthReceiveAddress,
  resolveStealthDestinationAddress,
  findStealthIssueForUser,
  listStealthIssuesForUser,
  updateStealthIssue,
};
