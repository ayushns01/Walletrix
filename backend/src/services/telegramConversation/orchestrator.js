/**
 * Deterministic conversation action router.
 * Keeps execution decisions out of LLM output by returning a strict action type.
 */

const ETH_ADDRESS_RE = /0x[0-9a-fA-F]{40}/;
const AMOUNT_RE = /(\d+(?:\.\d+)?)/;
const TOKEN_RE = /\b(ETH|USDC|USDT|DAI|WETH|BTC|MATIC|BNB|AVAX)\b/i;
const ENS_RE = /\b([a-z0-9-]+\.eth)\b/i;
const TRANSFER_ACTION_RE = /\b(send|transfer|pay|wire|move|ship)\b/i;
const COMPACT_TRANSFER_RE = /^\s*(?:(?:\d+(?:\.\d+)?\s+)?(?:eth|usdc|usdt|dai|weth|btc|matic|bnb|avax)?\s*(?:to\s+)?)?(?:0x[0-9a-fA-F]{40}|[a-z0-9-]+\.eth)\s*$/i;

export const DEFAULT_INTENT_CONFIDENCE_THRESHOLD = 0.65;

function normalizeAmount(amount) {
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? amount : null;
}

function normalizeToken(tokenSymbol) {
  if (!tokenSymbol || typeof tokenSymbol !== 'string') return null;
  return tokenSymbol.toUpperCase();
}

export function extractHeuristicTransferFields(text) {
  const amountMatch = AMOUNT_RE.exec(text);
  const tokenMatch = TOKEN_RE.exec(text);
  const addressMatch = ETH_ADDRESS_RE.exec(text);
  const ensMatch = ENS_RE.exec(text);

  return {
    tokenSymbol: normalizeToken(tokenMatch?.[1] || null),
    amount: normalizeAmount(amountMatch ? parseFloat(amountMatch[1]) : null),
    recipientAddress: addressMatch?.[0] || ensMatch?.[1] || null,
    chain: null,
  };
}

export function getMissingTransferFields(details) {
  const missing = [];
  if (!details?.amount) missing.push('amount');
  if (!details?.recipientAddress) missing.push('recipientAddress');
  if (!details?.tokenSymbol) missing.push('tokenSymbol');
  return missing;
}

function mergeTransferDetails(primary, fallback) {
  return {
    tokenSymbol: normalizeToken(primary?.tokenSymbol || fallback?.tokenSymbol || 'ETH'),
    amount: normalizeAmount(primary?.amount ?? fallback?.amount ?? null),
    recipientAddress: primary?.recipientAddress || fallback?.recipientAddress || null,
    chain: primary?.chain || fallback?.chain || null,
  };
}

function hasTransferSignal(text, extracted) {
  const normalized = String(text || '').toLowerCase();
  const hasAmount = Boolean(extracted?.amount);
  const hasRecipient = Boolean(extracted?.recipientAddress);
  const hasToken = Boolean(extracted?.tokenSymbol);

  if (TRANSFER_ACTION_RE.test(normalized)) return true;

  // Treat "0.1 ETH to 0x..." as transfer even without explicit send verb.
  if (hasAmount && hasRecipient && /\bto\b/.test(normalized)) return true;
  if (hasRecipient && hasToken && /\bto\b/.test(normalized)) return true;

  // Support compact Telegram syntax like "0.5 eth 0x..." or "usdc 0x..."
  // while still rejecting bare address sharing.
  if (hasRecipient && (hasAmount || hasToken) && COMPACT_TRANSFER_RE.test(normalized)) return true;

  return false;
}

export function shouldAttemptTransferSlotExtraction(text, extracted = null) {
  const fields = extracted || extractHeuristicTransferFields(text);
  return hasTransferSignal(text, fields);
}

/**
 * Returns a strict action object used by webhook controller.
 */
export function decideConversationAction({
  text,
  intent,
  confidence,
  details,
  extracted,
  threshold = DEFAULT_INTENT_CONFIDENCE_THRESHOLD,
}) {
  const mergedDetails = mergeTransferDetails(details, extracted);
  const intentName = intent || 'unknown';
  const safeConfidence = typeof confidence === 'number' ? confidence : 0;

  if (intentName === 'balance' && safeConfidence >= threshold) {
    return { type: 'request_balance' };
  }

  if (intentName === 'transfer' && safeConfidence >= threshold) {
    return {
      type: 'prepare_transfer',
      details: mergedDetails,
      missing: getMissingTransferFields(mergedDetails),
      reason: 'high_confidence_transfer',
    };
  }

  if (hasTransferSignal(text, extracted)) {
    return {
      type: 'prepare_transfer',
      details: mergedDetails,
      missing: getMissingTransferFields(mergedDetails),
      reason: 'heuristic_transfer_signal',
    };
  }

  return { type: 'fallback_chat' };
}
