/**
 * geminiService.js
 * Parses natural language commands into structured intents.
 * Uses regex-based parsing first (fast, no quota), then tries Gemini AI as enhancement.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import telegramConfig from '../config/telegram.js';
import {
  INTENT_CLASSIFIER_SYSTEM_PROMPT,
  TRANSFER_SLOT_EXTRACTION_SYSTEM_PROMPT,
  CONVERSATIONAL_REPLY_SYSTEM_PROMPT,
} from '../config/prompts.js';
import logger from './loggerService.js';

let genAI = null;
const modelCache = new Map();
let geminiQuotaExceeded = false;

const MODEL_NAME = 'gemini-2.5-flash';

function getClient() {
  if (!telegramConfig.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(telegramConfig.GEMINI_API_KEY);
  }
  return genAI;
}

function getModel(kind) {
  if (!modelCache.has(kind)) {
    const client = getClient();
    const systemPrompts = {
      intent: INTENT_CLASSIFIER_SYSTEM_PROMPT,
      transfer_slots: TRANSFER_SLOT_EXTRACTION_SYSTEM_PROMPT,
      conversation: CONVERSATIONAL_REPLY_SYSTEM_PROMPT,
    };
    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompts[kind] || '',
    });
    modelCache.set(kind, model);
  }
  return modelCache.get(kind);
}

// ─── Regex-based intent parser ───────────────────────────────────────────────

const ETH_ADDRESS_RE = /0x[0-9a-fA-F]{40}/;
const AMOUNT_RE = /(\d+(?:\.\d+)?)/;
const TOKEN_RE = /\b(ETH|USDC|USDT|DAI|WETH|BTC|MATIC|BNB|AVAX)\b/i;
const ENS_RE = /\b([a-z0-9-]+\.eth)\b/i;
const TRANSFER_ACTION_RE = /\b(send|transfer|pay|wire|move|ship)\b/i;

function clampConfidence(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function isQuotaError(error) {
  return error?.status === 429 || error?.response?.status === 429;
}

function parseJsonResponse(rawText) {
  if (!rawText) return null;
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function buildUnknownIntent() {
  return {
    intent: 'unknown',
    details: { tokenSymbol: 'ETH', amount: null, recipientAddress: null, chain: null },
    confidence: 0,
  };
}

function buildConversationHistoryBlock(conversationHistory = [], userMessage = '') {
  const history = Array.isArray(conversationHistory) ? conversationHistory.slice(-8) : [];
  const normalizedUserMessage = String(userMessage || '').trim();
  const lastEntry = history[history.length - 1];

  if (
    normalizedUserMessage
    && lastEntry?.role === 'user'
    && String(lastEntry.text || '').trim() === normalizedUserMessage
  ) {
    history.pop();
  }

  if (history.length === 0) {
    return 'No recent history';
  }

  return history.map((entry) => `${entry.role}: ${entry.text}`).join('\n');
}

function extractTransferFieldsWithRegex(message) {
  const amountMatch = AMOUNT_RE.exec(message);
  const tokenMatch = TOKEN_RE.exec(message);
  const addressMatch = ETH_ADDRESS_RE.exec(message);
  const ensMatch = ENS_RE.exec(message);

  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
  const tokenSymbol = tokenMatch ? tokenMatch[1].toUpperCase() : null;
  const recipientAddress = addressMatch ? addressMatch[0] : (ensMatch ? ensMatch[1] : null);

  return {
    tokenSymbol,
    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
    recipientAddress,
    chain: null,
  };
}

/**
 * Attempt to parse the message using regex patterns.
 * Returns null if the message doesn't match a known pattern.
 */
function parseIntentWithRegex(message) {
  const msg = message.trim().toLowerCase();

  // ── Balance intent ───────────────────────────────────────────────────────
  if (
    /\bbalance\b/.test(msg) ||
    /\bhow much\b/.test(msg) ||
    /\bmy wallet\b/.test(msg) ||
    /\bhow much do i have\b/.test(msg) ||
    /\bwhat do i have\b/.test(msg) ||
    /\bfunds\b/.test(msg) ||
    /\bportfolio\b/.test(msg)
  ) {
    return {
      intent: 'balance',
      details: { tokenSymbol: 'ETH', amount: null, recipientAddress: null, chain: null },
      confidence: 0.95,
    };
  }

  // ── Transfer intent ──────────────────────────────────────────────────────
  // Patterns: "send X ETH to 0x...", "transfer X ETH to 0x...", "pay 0x... X ETH"
  const hasSendKeyword = TRANSFER_ACTION_RE.test(msg);
  const extracted = extractTransferFieldsWithRegex(message);

  if (hasSendKeyword && extracted.recipientAddress && extracted.amount) {
    if (!Number.isNaN(extracted.amount) && extracted.amount > 0) {
      return {
        intent: 'transfer',
        details: {
          tokenSymbol: extracted.tokenSymbol || 'ETH',
          amount: extracted.amount,
          recipientAddress: extracted.recipientAddress,
          chain: null,
        },
        confidence: 0.97,
      };
    }
  }

  // Partial transfer requests should still map to transfer intent so the bot
  // can ask the user for missing fields conversationally.
  if (hasSendKeyword) {
    return {
      intent: 'transfer',
      details: {
        tokenSymbol: extracted.tokenSymbol || 'ETH',
        amount: extracted.amount,
        recipientAddress: extracted.recipientAddress,
        chain: null,
      },
      confidence: 0.8,
    };
  }

  return null; // no regex match — let Gemini try
}

// ─── Gemini AI parser ─────────────────────────────────────────────────────────

async function parseIntentWithGemini(userMessage) {
  if (geminiQuotaExceeded) {
    return null; // skip if we already know quota is gone
  }

  try {
    const mdl = getModel('intent');
    const result = await mdl.generateContent(userMessage);
    const parsed = parseJsonResponse(result.response.text());
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const intent = ['transfer', 'balance', 'unknown'].includes(parsed.intent)
      ? parsed.intent
      : 'unknown';

    const confidence = clampConfidence(parsed.confidence);

    return {
      intent,
      details: {
        tokenSymbol: parsed.details?.tokenSymbol || 'ETH',
        amount: typeof parsed.details?.amount === 'number' ? parsed.details.amount : null,
        recipientAddress: parsed.details?.recipientAddress || null,
        chain: parsed.details?.chain || null,
      },
      confidence,
    };
  } catch (error) {
    if (isQuotaError(error)) {
      geminiQuotaExceeded = true;
      logger.warn('[Gemini] Quota exceeded — switching to regex-only mode');
    } else {
      logger.error('[Gemini] parseIntent failed', { userMessage, errorDetail: error.message });
    }
    return null;
  }
}

async function parseTransferSlotsWithGemini(userMessage, conversationHistory = []) {
  if (geminiQuotaExceeded) return null;

  try {
    const mdl = getModel('transfer_slots');
    const historyBlock = buildConversationHistoryBlock(conversationHistory, userMessage);

    const result = await mdl.generateContent(
      `Recent conversation:\n${historyBlock}\n\nUser message: "${userMessage}"`
    );
    const parsed = parseJsonResponse(result.response.text());
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      tokenSymbol: parsed.tokenSymbol ? String(parsed.tokenSymbol).toUpperCase() : null,
      amount: typeof parsed.amount === 'number' && parsed.amount > 0 ? parsed.amount : null,
      recipientAddress: parsed.recipientAddress || null,
      chain: parsed.chain || null,
      confidence: clampConfidence(parsed.confidence),
    };
  } catch (error) {
    if (isQuotaError(error)) {
      geminiQuotaExceeded = true;
      logger.warn('[Gemini] Quota exceeded during transfer slot extraction');
    } else {
      logger.error('[Gemini] transfer slot extraction failed', {
        userMessage,
        errorDetail: error.message,
      });
    }
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a user's natural language message into a structured TransactionIntent.
 * Tries regex first (instant, no quota), then Gemini AI for unmatched messages.
 *
 * @param {string} userMessage
 * @returns {Promise<{
 *   intent: 'transfer' | 'balance' | 'unknown',
 *   details: { tokenSymbol: string, amount: number|null, recipientAddress: string|null, chain: string|null },
 *   confidence: number
 * }>}
 */
export async function parseIntent(userMessage) {
  const classified = await classifyIntent(userMessage);
  if (classified.intent !== 'transfer') {
    return classified;
  }

  const regexFields = extractTransferFieldsWithRegex(userMessage);
  const details = {
    tokenSymbol: classified.details?.tokenSymbol || regexFields.tokenSymbol || 'ETH',
    amount: classified.details?.amount || regexFields.amount || null,
    recipientAddress: classified.details?.recipientAddress || regexFields.recipientAddress || null,
    chain: classified.details?.chain || null,
  };

  return {
    ...classified,
    details,
  };
}

/**
 * Classify the high-level user intent.
 * Regex first, Gemini second.
 */
export async function classifyIntent(userMessage) {
  const regexResult = parseIntentWithRegex(userMessage);
  if (regexResult) {
    logger.info('[Intent] Parsed via regex', { intent: regexResult.intent, confidence: regexResult.confidence });
    return regexResult;
  }

  const geminiResult = await parseIntentWithGemini(userMessage);
  if (geminiResult) {
    logger.info('[Intent] Parsed via Gemini', { intent: geminiResult.intent, confidence: geminiResult.confidence });
    return geminiResult;
  }

  logger.info('[Intent] Could not parse message', { message: userMessage });
  return buildUnknownIntent();
}

/**
 * Extract transfer slots (amount/token/recipient) from ambiguous messages.
 * Used when we already know user likely wants transfer but details are partial.
 */
export async function extractTransferSlots(userMessage, conversationHistory = []) {
  const regexFields = extractTransferFieldsWithRegex(userMessage);
  if (regexFields.amount || regexFields.tokenSymbol || regexFields.recipientAddress) {
    return {
      ...regexFields,
      tokenSymbol: regexFields.tokenSymbol || null,
      confidence: 0.82,
    };
  }

  const modelFields = await parseTransferSlotsWithGemini(userMessage, conversationHistory);
  if (modelFields) {
    return modelFields;
  }

  return {
    confidence: 0,
    tokenSymbol: null,
    amount: null,
    recipientAddress: null,
    chain: null,
  };
}

/**
 * Generate a conversational response for non-executable chat turns.
 */
export async function generateConversationalReply(userMessage, conversationHistory = []) {
  if (geminiQuotaExceeded) return null;

  try {
    const mdl = getModel('conversation');
    const historyBlock = buildConversationHistoryBlock(conversationHistory, userMessage);

    const prompt = `Recent conversation:\n${historyBlock}\n\nUser message: "${userMessage}"`;

    const result = await mdl.generateContent(prompt);
    const text = result.response.text().trim();
    if (!text) return null;

    const normalized = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    try {
      const maybeJson = JSON.parse(normalized);
      if (maybeJson && typeof maybeJson === 'object' && 'intent' in maybeJson) {
        return null;
      }
    } catch {
      // Not JSON — this is what we want.
    }

    return normalized.slice(0, 600);
  } catch (error) {
    if (isQuotaError(error)) {
      geminiQuotaExceeded = true;
      logger.warn('[Gemini] Quota exceeded during conversational reply');
    } else {
      logger.error('[Gemini] conversational reply failed', { userMessage, errorDetail: error.message });
    }
    return null;
  }
}

/**
 * Backward-compatible alias for existing callers.
 */
export async function generateFallbackReply(userMessage, conversationHistory = []) {
  return generateConversationalReply(userMessage, conversationHistory);
}
