import prisma from '../lib/prisma.js';

const TELEGRAM_TRANSFER_HISTORY_ACTIONS = [
  'TELEGRAM_TRANSFER_CONFIRMED',
  'TELEGRAM_TRANSFER_FAILED',
];

function normalizeTransferLog(log) {
  if (!log) return null;

  const details = log.details && typeof log.details === 'object' ? log.details : {};

  return {
    id: log.id,
    action: log.action,
    status: details.status || (log.action === 'TELEGRAM_TRANSFER_CONFIRMED' ? 'confirmed' : 'failed'),
    txHash: details.txHash || null,
    fromAddress: details.fromAddress || null,
    toAddress: details.toAddress || null,
    amount: details.amount ?? null,
    tokenSymbol: details.tokenSymbol || null,
    recipientLabel: details.recipientLabel || null,
    chainId: details.chainId ?? null,
    errorMessage: details.errorMessage || null,
    createdAt: log.createdAt,
  };
}

export async function recordTelegramTransferEvent(userId, details) {
  try {
    const status = String(details?.status || '').toLowerCase() === 'failed'
      ? 'failed'
      : 'confirmed';

    await prisma.activityLog.create({
      data: {
        userId,
        action: status === 'failed'
          ? 'TELEGRAM_TRANSFER_FAILED'
          : 'TELEGRAM_TRANSFER_CONFIRMED',
        details: {
          status,
          txHash: details?.txHash || null,
          fromAddress: details?.fromAddress || null,
          toAddress: details?.toAddress || null,
          amount: details?.amount ?? null,
          tokenSymbol: details?.tokenSymbol || null,
          recipientLabel: details?.recipientLabel || null,
          chainId: details?.chainId ?? null,
          errorMessage: details?.errorMessage || null,
        },
      },
    });

    return true;
  } catch (error) {
    return false;
  }
}

export async function getRecentTelegramTransfers(userId, { limit = 5 } = {}) {
  const logs = await prisma.activityLog.findMany({
    where: {
      userId,
      action: { in: TELEGRAM_TRANSFER_HISTORY_ACTIONS },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map(normalizeTransferLog);
}

export async function getLastTelegramTransfer(userId) {
  const logs = await getRecentTelegramTransfers(userId, { limit: 1 });
  return logs[0] || null;
}

function formatShortTimestamp(value) {
  const date = new Date(value);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTransferLine(entry) {
  const destination = entry.recipientLabel
    ? `*${entry.recipientLabel}*`
    : `\`${entry.toAddress}\``;

  if (entry.status === 'failed') {
    const attemptedAmount = entry.amount && entry.tokenSymbol
      ? `${entry.amount} ${String(entry.tokenSymbol).toUpperCase()}`
      : 'transfer';

    return `• Failed ${attemptedAmount} to ${destination} on ${formatShortTimestamp(entry.createdAt)}`;
  }

  return `• ${entry.amount} ${String(entry.tokenSymbol || '').toUpperCase()} to ${destination} on ${formatShortTimestamp(entry.createdAt)}`;
}

export function buildRecentTransfersMessage(transfers) {
  if (!Array.isArray(transfers) || transfers.length === 0) {
    return 'No recent transfers yet.\n\nOnce you send from Telegram, I will keep the latest transfers here.';
  }

  return `🧾 *Recent Transfers*\n\n${transfers.map(formatTransferLine).join('\n')}`;
}

export function buildLastTransferMessage(entry) {
  if (!entry) {
    return 'No transfer history yet.\n\nYour latest Telegram transfer will show up here after you send one.';
  }

  if (entry.status === 'failed') {
    return `🧾 *Last Transfer*\n\nStatus: *Failed*\nAttempted: *${entry.amount || '?'} ${String(entry.tokenSymbol || '').toUpperCase()}*\nTo: ${entry.recipientLabel ? `*${entry.recipientLabel}*` : `\`${entry.toAddress || 'unknown'}\``}\nWhen: ${formatShortTimestamp(entry.createdAt)}${entry.errorMessage ? `\nReason: ${entry.errorMessage}` : ''}`;
  }

  const txHashLine = entry.txHash ? `\nHash: \`${entry.txHash}\`` : '';
  return `🧾 *Last Transfer*\n\nStatus: *Confirmed*\nAmount: *${entry.amount} ${String(entry.tokenSymbol || '').toUpperCase()}*\nTo: ${entry.recipientLabel ? `*${entry.recipientLabel}*` : `\`${entry.toAddress}\``}\nWhen: ${formatShortTimestamp(entry.createdAt)}${txHashLine}`;
}

export function isRecentTransfersIntent(text) {
  const message = String(text || '').trim().toLowerCase();
  if (!message) return false;
  if (/^\/(?:recent|history|transfers)\b/.test(message)) return true;
  return /\b(recent|latest|show|see|view|my|transaction history|transfer history|history)\b/.test(message)
    && /\b(transactions|transfers|history)\b/.test(message);
}

export function isLastTransferIntent(text) {
  const message = String(text || '').trim().toLowerCase();
  if (!message) return false;
  if (/^\/last\b/.test(message)) return true;
  return /\b(last|latest|previous)\b/.test(message) && /\b(transfer|transaction|tx)\b/.test(message);
}
