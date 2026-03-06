/**
 * geminiService.js
 * Parses natural language commands into structured intents.
 * Uses regex-based parsing first (fast, no quota), then tries Gemini AI as enhancement.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import telegramConfig from '../config/telegram.js';
import { INTENT_SYSTEM_PROMPT } from '../config/prompts.js';
import logger from './loggerService.js';

let genAI = null;
let model = null;
let geminiQuotaExceeded = false;

function getModel() {
  if (!model) {
    if (!telegramConfig.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    genAI = new GoogleGenerativeAI(telegramConfig.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: INTENT_SYSTEM_PROMPT,
    });
  }
  return model;
}

// ─── Regex-based intent parser ───────────────────────────────────────────────

const ETH_ADDRESS_RE = /0x[0-9a-fA-F]{40}/;
const AMOUNT_RE = /(\d+(?:\.\d+)?)/;
const TOKEN_RE = /\b(ETH|USDC|USDT|DAI|WETH|BTC|MATIC|BNB|AVAX)\b/i;

/**
 * Attempt to parse the message using regex patterns.
 * Returns null if the message doesn't match a known pattern.
 */
function parseIntentWithRegex(message) {
  const msg = message.trim().toLowerCase();

  // ── Balance intent ───────────────────────────────────────────────────────
  if (/\bbalance\b/.test(msg) || /\bhow much\b/.test(msg) || /\bmy wallet\b/.test(msg)) {
    return {
      intent: 'balance',
      details: { tokenSymbol: 'ETH', amount: null, recipientAddress: null, chain: null },
      confidence: 0.95,
    };
  }

  // ── Transfer intent ──────────────────────────────────────────────────────
  // Patterns: "send X ETH to 0x...", "transfer X ETH to 0x...", "pay 0x... X ETH"
  const hasSendKeyword = /\b(send|transfer|pay|wire)\b/.test(msg);
  const addressMatch = ETH_ADDRESS_RE.exec(message); // keep original case for address
  const amountMatch = AMOUNT_RE.exec(msg);
  const tokenMatch = TOKEN_RE.exec(message);

  if (hasSendKeyword && addressMatch && amountMatch) {
    const tokenSymbol = tokenMatch ? tokenMatch[1].toUpperCase() : 'ETH';
    const amount = parseFloat(amountMatch[1]);
    const recipientAddress = addressMatch[0];

    if (!isNaN(amount) && amount > 0) {
      return {
        intent: 'transfer',
        details: {
          tokenSymbol,
          amount,
          recipientAddress,
          chain: null,
        },
        confidence: 0.97,
      };
    }
  }

  return null; // no regex match — let Gemini try
}

// ─── Gemini AI parser ─────────────────────────────────────────────────────────

async function parseIntentWithGemini(userMessage) {
  if (geminiQuotaExceeded) {
    return null; // skip if we already know quota is gone
  }

  try {
    const mdl = getModel();
    const result = await mdl.generateContent(userMessage);
    const rawText = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps in ```json ... ```
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonText);

    const intent = ['transfer', 'balance', 'unknown'].includes(parsed.intent)
      ? parsed.intent
      : 'unknown';

    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0;

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
    if (error.status === 429) {
      geminiQuotaExceeded = true;
      logger.warn('[Gemini] Quota exceeded — switching to regex-only mode');
    } else {
      logger.error('[Gemini] parseIntent failed', { message: userMessage, error: error.message });
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
  // 1. Try fast regex parsing first
  const regexResult = parseIntentWithRegex(userMessage);
  if (regexResult) {
    logger.info('[Intent] Parsed via regex', { intent: regexResult.intent, confidence: regexResult.confidence });
    return regexResult;
  }

  // 2. Fall back to Gemini for ambiguous messages
  const geminiResult = await parseIntentWithGemini(userMessage);
  if (geminiResult) {
    logger.info('[Intent] Parsed via Gemini', { intent: geminiResult.intent, confidence: geminiResult.confidence });
    return geminiResult;
  }

  // 3. Unknown intent
  logger.info('[Intent] Could not parse message', { message: userMessage });
  return {
    intent: 'unknown',
    details: { tokenSymbol: 'ETH', amount: null, recipientAddress: null, chain: null },
    confidence: 0,
  };
}
