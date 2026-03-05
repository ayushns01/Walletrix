/**
 * telegramService.js
 * Low-level wrapper around the Telegram Bot API.
 * Uses axios (already a project dependency) to send HTTP requests.
 */

import axios from 'axios';
import telegramConfig from '../config/telegram.js';
import logger from './loggerService.js';

const tgApi = (method) =>
  `https://api.telegram.org/bot${telegramConfig.BOT_TOKEN}/${method}`;

/**
 * Send a plain text or Markdown message to a Telegram chat.
 * @param {string|number} chatId
 * @param {string} text
 * @param {object} [extra] - Additional Telegram sendMessage params
 */
export async function sendMessage(chatId, text, extra = {}) {
  if (!telegramConfig.BOT_TOKEN) {
    logger.warn('[Telegram] BOT_TOKEN not set, skipping sendMessage');
    return null;
  }
  try {
    const response = await axios.post(tgApi('sendMessage'), {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...extra,
    });
    return response.data;
  } catch (error) {
    logger.error('[Telegram] sendMessage failed', {
      chatId,
      error: error.response?.data || error.message,
    });
    return null;
  }
}

/**
 * Verify the webhook secret header sent by Telegram.
 * @param {string} headerValue - Value of X-Telegram-Bot-Api-Secret-Token header
 * @returns {boolean}
 */
export function verifyWebhookSecret(headerValue) {
  if (!telegramConfig.WEBHOOK_SECRET) return true; // no secret configured, allow all
  return headerValue === telegramConfig.WEBHOOK_SECRET;
}

/**
 * Utility: check if a text is a bot command (starts with /).
 */
export function isCommand(text) {
  return typeof text === 'string' && text.startsWith('/');
}

/**
 * Utility: extract command name from "/start" → "start"
 */
export function extractCommand(text) {
  if (!isCommand(text)) return null;
  return text.split(' ')[0].slice(1).split('@')[0].toLowerCase();
}
