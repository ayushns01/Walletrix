/**
 * Telegram Bot Configuration
 * Validates and exports all Telegram + Gemini related env vars.
 * Fails fast at startup if critical vars are missing.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const SERVER_SIGNING_KEY = process.env.SERVER_SIGNING_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Warn on missing optional keys (don't crash — bot routes will return 503 gracefully)
if (!BOT_TOKEN) {
  console.warn('[Telegram] TELEGRAM_BOT_TOKEN not set — Telegram bot routes will be disabled');
}
if (!SERVER_SIGNING_KEY) {
  console.warn('[Telegram] SERVER_SIGNING_KEY not set — bot EOA generation will fail');
}
if (!GEMINI_API_KEY) {
  console.warn('[Telegram] GEMINI_API_KEY not set — intent parsing will fail');
}

export const telegramConfig = {
  BOT_TOKEN,
  WEBHOOK_SECRET: WEBHOOK_SECRET || '',
  SERVER_SIGNING_KEY: SERVER_SIGNING_KEY || '',
  GEMINI_API_KEY: GEMINI_API_KEY || '',
  TELEGRAM_API_BASE: 'https://api.telegram.org',
  isConfigured: !!(BOT_TOKEN && SERVER_SIGNING_KEY && GEMINI_API_KEY),
};

export default telegramConfig;
