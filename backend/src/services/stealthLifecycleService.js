import { ethers } from 'ethers';
import prisma from '../lib/prisma.js';
import logger from './loggerService.js';
import ethereumService from './ethereumService.js';
import { sendPlainMessage } from './telegramService.js';
import { loadConversationSession, saveConversationSession } from './conversationSessionService.js';
import stealthAddressService from './stealthAddressService.js';
import {
  decryptSecret,
  findStealthIssueForUser,
  formatStealthNetworkLabel,
  listStealthIssuesForUser,
  toEthereumServiceNetwork,
  updateStealthIssue,
} from './stealthWalletService.js';

const DEFAULT_STEALTH_MONITOR_POLL_MS = Number.parseInt(process.env.STEALTH_MONITOR_POLL_MS || '60000', 10);
const STEALTH_MONITOR_ENABLED = process.env.STEALTH_MONITOR_ENABLED !== 'false';
let stealthMonitorHandle = null;

function toBigIntSafe(value) {
  try {
    return BigInt(value || '0');
  } catch (_error) {
    return 0n;
  }
}

function formatWeiAsEth(value) {
  return ethers.formatEther(toBigIntSafe(value));
}

function getProviderForIssue(issue) {
  return ethereumService.getProvider(toEthereumServiceNetwork(issue.network));
}

async function recordStealthActivity(userId, action, details, prismaClient = prisma) {
  if (!prismaClient?.activityLog?.create) return null;

  try {
    return await prismaClient.activityLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  } catch (error) {
    logger.warn('[StealthLifecycle] Failed to record activity', {
      userId,
      action,
      error: error.message,
    });
    return null;
  }
}

function serializeStealthIssue(issue) {
  if (!issue) return null;
  return {
    id: issue.id,
    stealthAddress: issue.stealthAddress,
    destinationAddress: issue.destinationAddress,
    walletLabel: issue.walletLabel || issue.profile?.walletLabel || 'My Wallet',
    walletType: issue.walletType || issue.profile?.walletType || 'ACCOUNT_WALLET',
    kindLabel: issue.kindLabel || (issue.profile?.walletType === 'TELEGRAM_BOT_WALLET' ? 'Telegram bot wallet' : 'Account wallet'),
    network: issue.network,
    networkLabel: formatStealthNetworkLabel(issue.network),
    status: issue.status,
    createdAt: issue.createdAt,
    usedAt: issue.usedAt,
    expiresAt: issue.expiresAt,
    lastCheckedAt: issue.lastCheckedAt || null,
    lastObservedBalanceWei: issue.lastObservedBalanceWei || '0',
    lastObservedBalanceEth: formatWeiAsEth(issue.lastObservedBalanceWei || '0'),
    claimedAt: issue.claimedAt || null,
    claimTxHash: issue.claimTxHash || null,
  };
}

export async function buildStealthClaimPreview(issue) {
  const provider = getProviderForIssue(issue);
  const balanceWei = await provider.getBalance(issue.stealthAddress);
  const feeData = await provider.getFeeData();
  const gasLimit = await provider.estimateGas({
    from: issue.stealthAddress,
    to: issue.destinationAddress,
    value: balanceWei > 0n ? 1n : 0n,
  }).catch(() => 21000n);
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || feeData.gasPrice || 0n;
  const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || maxPriorityFeePerGas;
  const estimatedFeeWei = gasLimit * maxFeePerGas;
  const claimableWei = balanceWei > estimatedFeeWei ? balanceWei - estimatedFeeWei : 0n;

  return {
    issueId: issue.id,
    stealthAddress: issue.stealthAddress,
    destinationAddress: issue.destinationAddress,
    walletLabel: issue.walletLabel || issue.profile?.walletLabel || 'My Wallet',
    network: issue.network,
    networkLabel: formatStealthNetworkLabel(issue.network),
    status: issue.status,
    balanceWei: balanceWei.toString(),
    balanceEth: ethers.formatEther(balanceWei),
    gasLimit: gasLimit.toString(),
    maxFeePerGasWei: maxFeePerGas.toString(),
    maxPriorityFeePerGasWei: maxPriorityFeePerGas.toString(),
    estimatedFeeWei: estimatedFeeWei.toString(),
    estimatedFeeEth: ethers.formatEther(estimatedFeeWei),
    claimableWei: claimableWei.toString(),
    claimableEth: ethers.formatEther(claimableWei),
    canClaim: issue.status !== 'CLAIMED' && claimableWei > 0n,
  };
}

async function deriveStealthWallet(issue) {
  if (!issue?.profile) {
    throw new Error('Stealth profile not found for this issued address');
  }

  const scanPrivateKey = decryptSecret(issue.profile.encryptedScanPrivateKey);
  const spendPrivateKey = decryptSecret(issue.profile.encryptedSpendPrivateKey);
  const stealthPrivateKey = stealthAddressService.deriveStealthPrivateKey(
    scanPrivateKey,
    spendPrivateKey,
    issue.ephemeralPublicKey
  );

  return new ethers.Wallet(stealthPrivateKey, getProviderForIssue(issue));
}

function buildStealthFundedMessage(issue, balanceWei) {
  return [
    '🕶️ Funds detected on a stealth address.',
    '',
    `Wallet: ${issue.walletLabel || issue.profile?.walletLabel || 'My Wallet'}`,
    `Network: ${formatStealthNetworkLabel(issue.network)}`,
    `Balance: ${ethers.formatEther(balanceWei)} ETH`,
    `Stealth address: ${issue.stealthAddress}`,
    '',
    'Would you like to claim it now?',
    'Reply with "Claim now" to preview the sweep, or "Later" to keep it pending.',
  ].join('\n');
}

function buildStealthClaimPromptReplyMarkup() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: 'Claim now' }, { text: 'Later' }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
      input_field_placeholder: 'Claim now or Later',
    },
  };
}

async function seedStealthClaimPrompt(issue) {
  const telegramId = issue.profile?.user?.telegramId;
  if (!telegramId) return;
  const existingSession = await loadConversationSession(String(telegramId)).catch(() => null);
  const promptExpiryMs = Date.now() + 10 * 60 * 1000;
  const existingExpiryMs = existingSession?.expiresAt
    ? new Date(existingSession.expiresAt).getTime()
    : null;

  await saveConversationSession(String(telegramId), {
    chatContext: {
      userId: issue.profile?.userId || null,
      scene: 'stealth',
      currentStep: 'claim_prompt',
      pendingStealthClaim: {
        issueId: issue.id,
      },
      lastIntent: 'stealth_claim',
      lastInteractionAt: Date.now(),
      expiresAt: promptExpiryMs,
    },
    transferDraft: existingSession?.transferDraft || null,
    pendingIntent: existingSession?.pendingIntent || null,
    expiresAt: new Date(Math.max(promptExpiryMs, existingExpiryMs || 0)),
  });
}

async function refreshStealthIssueRecord(issue, { notifyOnTransition = false, prismaClient = prisma, sendPlainMessageImpl = sendPlainMessage } = {}) {
  const provider = getProviderForIssue(issue);
  const balanceWei = await provider.getBalance(issue.stealthAddress);
  const nextData = {
    lastCheckedAt: new Date(),
    lastObservedBalanceWei: balanceWei.toString(),
  };
  const transitionedToFunded = issue.status === 'ACTIVE' && balanceWei > 0n;

  if (transitionedToFunded) {
    nextData.status = 'FUNDED';
    nextData.usedAt = issue.usedAt || new Date();
  }

  const updatedIssue = await updateStealthIssue(issue.id, nextData);
  const effectiveIssue = updatedIssue || { ...issue, ...nextData };

  if (transitionedToFunded && issue.profile?.userId) {
    await recordStealthActivity(issue.profile.userId, 'STEALTH_ADDRESS_FUNDED', {
      issueId: issue.id,
      stealthAddress: issue.stealthAddress,
      destinationAddress: issue.destinationAddress,
      network: issue.network,
      balanceWei: balanceWei.toString(),
    }, prismaClient);
  }

  if (transitionedToFunded && notifyOnTransition && issue.profile?.user?.telegramId) {
    await seedStealthClaimPrompt(issue);
    await sendPlainMessageImpl(
      issue.profile.user.telegramId,
      buildStealthFundedMessage(issue, balanceWei),
      buildStealthClaimPromptReplyMarkup()
    );
    await recordStealthActivity(issue.profile.userId, 'STEALTH_ADDRESS_FUNDED_NOTIFIED', {
      issueId: issue.id,
      stealthAddress: issue.stealthAddress,
      network: issue.network,
      balanceWei: balanceWei.toString(),
    }, prismaClient);
  }

  return serializeStealthIssue(effectiveIssue);
}

export async function listStealthIssuesForAuthenticatedUser(userId, options = {}) {
  const issues = await listStealthIssuesForUser(userId, options);
  return issues.map(serializeStealthIssue);
}

export async function refreshStealthIssueForUser(userId, issueId) {
  const issue = await findStealthIssueForUser(userId, issueId);
  if (!issue) {
    const error = new Error('Stealth issue not found');
    error.statusCode = 404;
    throw error;
  }

  return refreshStealthIssueRecord(issue);
}

export async function getStealthClaimPreviewForUser(userId, issueId) {
  const issue = await findStealthIssueForUser(userId, issueId);
  if (!issue) {
    const error = new Error('Stealth issue not found');
    error.statusCode = 404;
    throw error;
  }

  const refreshed = await refreshStealthIssueRecord(issue);
  const freshIssue = await findStealthIssueForUser(userId, issueId);
  const preview = await buildStealthClaimPreview(freshIssue || issue);
  return {
    issue: refreshed,
    preview,
  };
}

export async function claimStealthIssueForUser(userId, issueId) {
  const issue = await findStealthIssueForUser(userId, issueId);
  if (!issue) {
    const error = new Error('Stealth issue not found');
    error.statusCode = 404;
    throw error;
  }

  if (issue.status === 'CLAIMED') {
    const error = new Error('This stealth address has already been claimed');
    error.statusCode = 400;
    throw error;
  }

  const previewBundle = await getStealthClaimPreviewForUser(userId, issueId);
  const latestIssue = await findStealthIssueForUser(userId, issueId);
  const preview = previewBundle.preview;

  if (toBigIntSafe(preview.balanceWei) === 0n) {
    const error = new Error('No funds detected on this stealth address yet');
    error.statusCode = 400;
    throw error;
  }

  if (!preview.canClaim) {
    const error = new Error('The stealth address has funds, but not enough ETH to cover sweep gas');
    error.statusCode = 400;
    throw error;
  }

  const wallet = await deriveStealthWallet(latestIssue || issue);
  const tx = await wallet.sendTransaction({
    to: issue.destinationAddress,
    value: toBigIntSafe(preview.claimableWei),
    gasLimit: toBigIntSafe(preview.gasLimit),
    maxFeePerGas: toBigIntSafe(preview.maxFeePerGasWei),
    maxPriorityFeePerGas: toBigIntSafe(preview.maxPriorityFeePerGasWei),
  });

  try {
    await tx.wait(1);
  } catch (error) {
    await recordStealthActivity(userId, 'STEALTH_CLAIM_FAILED', {
      issueId,
      stealthAddress: issue.stealthAddress,
      destinationAddress: issue.destinationAddress,
      network: issue.network,
      error: error.message,
    });
    throw error;
  }

  const updated = await updateStealthIssue(issue.id, {
    status: 'CLAIMED',
    claimedAt: new Date(),
    claimTxHash: tx.hash,
    lastCheckedAt: new Date(),
    lastObservedBalanceWei: '0',
  });

  await recordStealthActivity(userId, 'STEALTH_CLAIM_CONFIRMED', {
    issueId,
    stealthAddress: issue.stealthAddress,
    destinationAddress: issue.destinationAddress,
    network: issue.network,
    txHash: tx.hash,
    claimedWei: preview.claimableWei,
    estimatedFeeWei: preview.estimatedFeeWei,
  });

  return {
    issue: serializeStealthIssue(updated || issue),
    preview,
    txHash: tx.hash,
  };
}

async function loadMonitorableIssues(prismaClient = prisma) {
  if (!prismaClient?.stealthAddressIssue?.findMany) {
    return [];
  }

  try {
    return await prismaClient.stealthAddressIssue.findMany({
      where: {
        status: { in: ['ACTIVE', 'FUNDED'] },
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
  } catch (error) {
    logger.warn('[StealthLifecycle] Failed to load monitorable issues', { error: error.message });
    return [];
  }
}

export async function pollStealthIssueMonitor({
  prismaClient = prisma,
  sendPlainMessageImpl = sendPlainMessage,
  log = logger,
} = {}) {
  const issues = await loadMonitorableIssues(prismaClient);

  for (const issue of issues) {
    try {
      await refreshStealthIssueRecord(issue, {
        notifyOnTransition: true,
        prismaClient,
        sendPlainMessageImpl,
      });
    } catch (error) {
      log.warn('[StealthLifecycle] Refresh failed', {
        issueId: issue.id,
        error: error.message,
      });
    }
  }
}

export function startStealthIssueMonitor({
  prismaClient = prisma,
  sendPlainMessageImpl = sendPlainMessage,
  log = logger,
} = {}) {
  if (!STEALTH_MONITOR_ENABLED) {
    return null;
  }

  if (stealthMonitorHandle) {
    return stealthMonitorHandle;
  }

  pollStealthIssueMonitor({
    prismaClient,
    sendPlainMessageImpl,
    log,
  }).catch((error) => {
    log.warn('[StealthLifecycle] Initial monitor poll failed', { error: error.message });
  });

  stealthMonitorHandle = setInterval(() => {
    pollStealthIssueMonitor({
      prismaClient,
      sendPlainMessageImpl,
      log,
    }).catch((error) => {
      log.warn('[StealthLifecycle] Monitor poll failed', { error: error.message });
    });
  }, Number.isFinite(DEFAULT_STEALTH_MONITOR_POLL_MS) && DEFAULT_STEALTH_MONITOR_POLL_MS >= 30000
    ? DEFAULT_STEALTH_MONITOR_POLL_MS
    : 60000);

  if (typeof stealthMonitorHandle.unref === 'function') {
    stealthMonitorHandle.unref();
  }

  log.info('[StealthLifecycle] Monitor started', {
    intervalMs: DEFAULT_STEALTH_MONITOR_POLL_MS,
  });

  return stealthMonitorHandle;
}

export default {
  buildStealthClaimPreview,
  listStealthIssuesForAuthenticatedUser,
  refreshStealthIssueForUser,
  getStealthClaimPreviewForUser,
  claimStealthIssueForUser,
  pollStealthIssueMonitor,
  startStealthIssueMonitor,
};
