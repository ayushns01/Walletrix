import prisma from '../lib/prisma.js';
import telegramConfig from '../config/telegram.js';
import logger from './loggerService.js';
import { sendPlainMessage } from './telegramService.js';
import { getBotWalletBalance } from './telegramExecutionService.js';

const balanceSnapshots = new Map();
let notificationMonitorHandle = null;

const CHAIN_LABELS = {
  1: 'Ethereum Mainnet',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
  11155111: 'Sepolia',
};

function formatChainLabel(chainId) {
  return CHAIN_LABELS[Number(chainId)] || `Chain ${chainId}`;
}

function formatEthAmount(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return '0';
  if (parsed >= 1) return parsed.toFixed(4);
  if (parsed >= 0.01) return parsed.toFixed(5);
  return parsed.toFixed(6);
}

export function buildTransferSubmittedMessage({ amount, token, to, txHash }) {
  return `🚀 Transfer submitted.\n\nAmount: ${amount} ${token}\nTo: ${to}\nHash: ${txHash}\n\nI will confirm again once it lands on-chain.`;
}

export function buildTransferConfirmedMessage({ amount, token, to, txHash }) {
  return `✅ Transfer confirmed.\n\nAmount: ${amount} ${token}\nTo: ${to}\nHash: ${txHash}`;
}

export function buildWalletFundedMessage({ deltaEth, newBalanceEth, address, chainId }) {
  return `💸 Bot wallet funded.\n\nReceived about ${formatEthAmount(deltaEth)} ETH on ${formatChainLabel(chainId)}.\nNew balance: ${formatEthAmount(newBalanceEth)} ETH\nAddress: ${address}`;
}

export function buildLowBalanceMessage({ balanceEth, thresholdEth, address, chainId }) {
  return `⚠️ Low gas balance.\n\nYour bot wallet is at ${formatEthAmount(balanceEth)} ETH on ${formatChainLabel(chainId)}.\nTop it up above ${formatEthAmount(thresholdEth)} ETH to keep transfers working.\nAddress: ${address}`;
}

export function evaluateWalletBalanceNotifications(previousSnapshot, currentSnapshot, options = {}) {
  const thresholdEth = Number.isFinite(options.thresholdEth)
    ? options.thresholdEth
    : telegramConfig.TELEGRAM_LOW_BALANCE_THRESHOLD_ETH;
  const fundedMinDeltaEth = Number.isFinite(options.fundedMinDeltaEth)
    ? options.fundedMinDeltaEth
    : telegramConfig.TELEGRAM_FUNDED_MIN_DELTA_ETH;

  if (!previousSnapshot) {
    return {
      notifyFunded: false,
      notifyLowBalance: false,
      nextLowBalanceActive: currentSnapshot.balanceEth <= thresholdEth,
      deltaEth: 0,
    };
  }

  const deltaEth = currentSnapshot.balanceEth - previousSnapshot.balanceEth;
  const notifyFunded = deltaEth >= fundedMinDeltaEth;
  const crossedIntoLowBalance = currentSnapshot.balanceEth <= thresholdEth && !previousSnapshot.lowBalanceActive;

  return {
    notifyFunded,
    notifyLowBalance: crossedIntoLowBalance,
    nextLowBalanceActive: currentSnapshot.balanceEth <= thresholdEth,
    deltaEth,
  };
}

export function resetTelegramNotificationMonitorState() {
  balanceSnapshots.clear();
  if (notificationMonitorHandle) {
    clearInterval(notificationMonitorHandle);
    notificationMonitorHandle = null;
  }
}

async function loadLinkedTelegramWallets(prismaClient = prisma) {
  return prismaClient.telegramBotWallet.findMany({
    include: {
      user: {
        select: {
          id: true,
          telegramId: true,
        },
      },
    },
  });
}

async function recordNotificationActivity(userId, action, details, prismaClient = prisma) {
  try {
    await prismaClient.activityLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  } catch (error) {
    logger.warn('[TelegramNotifications] Failed to record activity', {
      userId,
      action,
      error: error.message,
    });
  }
}

export async function pollTelegramWalletNotifications({
  prismaClient = prisma,
  sendPlainMessageImpl = sendPlainMessage,
  getBotWalletBalanceImpl = getBotWalletBalance,
  log = logger,
} = {}) {
  const wallets = await loadLinkedTelegramWallets(prismaClient);

  for (const walletRecord of wallets) {
    const user = walletRecord.user;
    if (!user?.telegramId) continue;

    try {
      const balanceResult = await getBotWalletBalanceImpl(user.id);
      const balanceEth = Number.parseFloat(balanceResult.ethBalance || '0');
      if (!Number.isFinite(balanceEth)) continue;

      const snapshot = {
        balanceEth,
        chainId: balanceResult.chainId,
        address: balanceResult.address,
      };
      const previous = balanceSnapshots.get(user.id) || null;
      const evaluation = evaluateWalletBalanceNotifications(previous, snapshot);

      if (evaluation.notifyFunded) {
        await sendPlainMessageImpl(
          user.telegramId,
          buildWalletFundedMessage({
            deltaEth: evaluation.deltaEth,
            newBalanceEth: balanceEth,
            address: balanceResult.address,
            chainId: balanceResult.chainId,
          })
        );
        await recordNotificationActivity(user.id, 'TELEGRAM_BOT_WALLET_FUNDED_NOTIFIED', {
          deltaEth: evaluation.deltaEth,
          balanceEth,
          address: balanceResult.address,
          chainId: balanceResult.chainId,
        }, prismaClient);
      }

      if (evaluation.notifyLowBalance) {
        await sendPlainMessageImpl(
          user.telegramId,
          buildLowBalanceMessage({
            balanceEth,
            thresholdEth: telegramConfig.TELEGRAM_LOW_BALANCE_THRESHOLD_ETH,
            address: balanceResult.address,
            chainId: balanceResult.chainId,
          })
        );
        await recordNotificationActivity(user.id, 'TELEGRAM_BOT_LOW_BALANCE_NOTIFIED', {
          balanceEth,
          thresholdEth: telegramConfig.TELEGRAM_LOW_BALANCE_THRESHOLD_ETH,
          address: balanceResult.address,
          chainId: balanceResult.chainId,
        }, prismaClient);
      }

      balanceSnapshots.set(user.id, {
        ...snapshot,
        lowBalanceActive: evaluation.nextLowBalanceActive,
      });
    } catch (error) {
      log.warn('[TelegramNotifications] Wallet poll failed', {
        userId: user.id,
        telegramId: user.telegramId,
        error: error.message,
      });
    }
  }
}

export function startTelegramNotificationMonitor({
  prismaClient = prisma,
  sendPlainMessageImpl = sendPlainMessage,
  getBotWalletBalanceImpl = getBotWalletBalance,
  log = logger,
} = {}) {
  if (!telegramConfig.BOT_TOKEN || !telegramConfig.TELEGRAM_NOTIFICATION_MONITOR_ENABLED) {
    return null;
  }

  if (notificationMonitorHandle) {
    return notificationMonitorHandle;
  }

  pollTelegramWalletNotifications({
    prismaClient,
    sendPlainMessageImpl,
    getBotWalletBalanceImpl,
    log,
  }).catch((error) => {
    log.warn('[TelegramNotifications] Initial poll failed', { error: error.message });
  });

  notificationMonitorHandle = setInterval(() => {
    pollTelegramWalletNotifications({
      prismaClient,
      sendPlainMessageImpl,
      getBotWalletBalanceImpl,
      log,
    }).catch((error) => {
      log.warn('[TelegramNotifications] Poll failed', { error: error.message });
    });
  }, telegramConfig.TELEGRAM_NOTIFICATION_POLL_MS);

  if (typeof notificationMonitorHandle.unref === 'function') {
    notificationMonitorHandle.unref();
  }

  log.info('[TelegramNotifications] Monitor started', {
    intervalMs: telegramConfig.TELEGRAM_NOTIFICATION_POLL_MS,
    lowBalanceThresholdEth: telegramConfig.TELEGRAM_LOW_BALANCE_THRESHOLD_ETH,
    fundedMinDeltaEth: telegramConfig.TELEGRAM_FUNDED_MIN_DELTA_ETH,
  });

  return notificationMonitorHandle;
}
