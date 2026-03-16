import ethereumService from './ethereumService.js';
import { getLastTelegramTransfer, getRecentTelegramTransfers } from './telegramHistoryService.js';

const TX_HASH_RE = /\b0x[a-fA-F0-9]{64}\b/;

const CHAIN_ID_TO_NETWORK = {
  1: 'mainnet',
  10: 'optimism-mainnet',
  137: 'polygon-mainnet',
  8453: 'base-mainnet',
  42161: 'arbitrum-one',
  11155111: 'sepolia',
};

const CHAIN_ID_TO_LABEL = {
  1: 'Ethereum Mainnet',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
  11155111: 'Sepolia',
};

const STATUS_PROBE_CHAIN_IDS = [11155111, 1, 137, 42161, 10, 8453];

function formatShortTimestamp(value) {
  const date = new Date(value);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatChainLabel(chainId) {
  return CHAIN_ID_TO_LABEL[Number(chainId)] || (chainId ? `Chain ${chainId}` : 'Unknown network');
}

function formatStatusLabel(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'success' || normalized === 'confirmed') return 'Confirmed';
  if (normalized === 'failed') return 'Failed';
  if (normalized === 'pending') return 'Pending';
  return 'Unknown';
}

function getStatusCommandHint() {
  return 'Try `/status` for your last transfer, or `/status 0x...` for a specific hash.';
}

async function lookupOnChain(txHash, chainId) {
  const network = CHAIN_ID_TO_NETWORK[Number(chainId)];
  if (!network) {
    return { found: false, chainId, error: 'Unsupported network' };
  }

  const result = await ethereumService.getTransaction(txHash, network);
  if (!result?.success) {
    return {
      found: false,
      chainId,
      network,
      error: result?.error || 'Transaction not found',
    };
  }

  return {
    found: true,
    chainId,
    network,
    transaction: result.transaction,
  };
}

async function probeTransactionAcrossChains(txHash) {
  let lastError = null;

  for (const chainId of STATUS_PROBE_CHAIN_IDS) {
    const result = await lookupOnChain(txHash, chainId);
    if (result.found) return result;

    const error = String(result.error || '');
    if (error && !/transaction not found/i.test(error)) {
      lastError = result;
    }
  }

  return lastError || { found: false, error: 'Transaction not found' };
}

export function extractTxHashFromText(text) {
  const match = String(text || '').match(TX_HASH_RE);
  return match ? match[0] : null;
}

export function isTransferStatusIntent(text) {
  const message = String(text || '').trim().toLowerCase();
  if (!message) return false;
  if (/^\/status\b/.test(message)) return true;
  if (/^0x[a-f0-9]{64}$/i.test(message)) return true;

  const hasStatusWord = /\b(status|track|tracking|confirmations?|confirmed|pending|failed|receipt)\b/.test(message);
  const hasTransferWord = /\b(tx|txn|transaction|transfer|hash)\b/.test(message);
  const hasExplicitHash = Boolean(extractTxHashFromText(message));

  return hasStatusWord && (hasTransferWord || hasExplicitHash);
}

export async function lookupTelegramTransferStatus(userId, { txHash = null } = {}) {
  const explicitHash = txHash || null;
  const recentTransfers = await getRecentTelegramTransfers(userId, { limit: 10 });

  const sourceLog = explicitHash
    ? recentTransfers.find((entry) => String(entry.txHash || '').toLowerCase() === explicitHash.toLowerCase()) || null
    : await getLastTelegramTransfer(userId);

  if (!sourceLog && !explicitHash) {
    return { kind: 'empty' };
  }

  const targetHash = explicitHash || sourceLog?.txHash || null;
  if (!targetHash) {
    return {
      kind: 'no_hash',
      sourceLog,
    };
  }

  let chainLookup;
  if (sourceLog?.chainId) {
    chainLookup = await lookupOnChain(targetHash, sourceLog.chainId);
  } else {
    chainLookup = await probeTransactionAcrossChains(targetHash);
  }

  if (!chainLookup.found) {
    const error = String(chainLookup.error || '');
    if (error && !/transaction not found/i.test(error)) {
      return {
        kind: 'lookup_error',
        txHash: targetHash,
        sourceLog,
        error,
      };
    }

    return {
      kind: 'not_found',
      txHash: targetHash,
      sourceLog,
    };
  }

  return {
    kind: 'ok',
    txHash: targetHash,
    sourceLog,
    chainId: chainLookup.chainId,
    chainLabel: formatChainLabel(chainLookup.chainId),
    transaction: chainLookup.transaction,
  };
}

export function buildTransferStatusMessage(result) {
  if (!result || result.kind === 'empty') {
    return `No Telegram transfer with a transaction hash yet.\n\n${getStatusCommandHint()}`;
  }

  if (result.kind === 'no_hash') {
    return `Your latest transfer does not have an on-chain hash to check.\n\nIt likely failed before broadcast.\n\n${getStatusCommandHint()}`;
  }

  if (result.kind === 'lookup_error') {
    return `❌ I could not check that transaction right now.\n\nNetwork error: ${result.error}`;
  }

  if (result.kind === 'not_found') {
    return `I could not find that transaction hash on the configured networks.\n\nHash: \`${result.txHash}\`\n\nDouble-check the hash and try again.`;
  }

  const { transaction, sourceLog, txHash, chainLabel } = result;
  const statusLabel = formatStatusLabel(transaction?.status);
  const confirmations = Number(transaction?.confirmations || 0);
  const nativeValue = parseFloat(String(transaction?.value || '0'));
  const amountLine = sourceLog?.amount && sourceLog?.tokenSymbol
    ? `\nAmount: *${sourceLog.amount} ${String(sourceLog.tokenSymbol).toUpperCase()}*`
    : (nativeValue > 0
        ? `\nValue: *${transaction.value} ETH*`
        : '');
  const destinationLine = sourceLog?.toAddress || transaction?.to
    ? `\nTo: ${sourceLog?.recipientLabel ? `*${sourceLog.recipientLabel}*` : `\`${sourceLog?.toAddress || transaction?.to}\``}`
    : '';
  const sentAtLine = sourceLog?.createdAt
    ? `\nSent: ${formatShortTimestamp(sourceLog.createdAt)}`
    : '';
  const confirmationsLine = transaction?.status === 'pending'
    ? '\nConfirmations: *0*'
    : `\nConfirmations: *${confirmations}*`;

  return `🧾 *Transaction Status*\n\nStatus: *${statusLabel}*\nNetwork: ${chainLabel}\nHash: \`${txHash}\`${amountLine}${destinationLine}${confirmationsLine}${sentAtLine}`;
}
