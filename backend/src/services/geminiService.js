/**
 * geminiService.js
 * Uses Google Gemini to parse natural language commands into structured intents.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import telegramConfig from '../config/telegram.js';
import { INTENT_SYSTEM_PROMPT } from '../config/prompts.js';
import logger from './loggerService.js';

let genAI = null;
let model = null;

function getModel() {
  if (!model) {
    if (!telegramConfig.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    genAI = new GoogleGenerativeAI(telegramConfig.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: INTENT_SYSTEM_PROMPT,
    });
  }
  return model;
}

/**
 * Parse a user's natural language message into a structured TransactionIntent.
 *
 * @param {string} userMessage
 * @returns {Promise<{
 *   intent: 'transfer' | 'balance' | 'unknown',
 *   details: { tokenSymbol: string, amount: number|null, recipientAddress: string|null, chain: string|null },
 *   confidence: number
 * }>}
 */
export async function parseIntent(userMessage) {
  try {
    const mdl = getModel();
    const result = await mdl.generateContent(userMessage);
    const rawText = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps in ```json ... ```
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    const parsed = JSON.parse(jsonText);

    // Validate structure
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
    logger.error('[Gemini] parseIntent failed', { message: userMessage, error: error.message });
    return {
      intent: 'unknown',
      details: { tokenSymbol: 'ETH', amount: null, recipientAddress: null, chain: null },
      confidence: 0,
    };
  }
}
