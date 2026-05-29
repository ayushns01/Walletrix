/**
 * telegramService.js
 * Low-level wrapper around the Telegram Bot API.
 * Uses axios (already a project dependency) to send HTTP requests.
 */

import axios from 'axios';
import https from 'node:https';
import { AsyncLocalStorage } from 'node:async_hooks';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import telegramConfig from '../config/telegram.js';
import logger from './loggerService.js';

const tgApi = (method) =>
  `https://api.telegram.org/bot${telegramConfig.BOT_TOKEN}/${method}`;

const execFileAsync = promisify(execFile);
const TELEGRAM_TIMEOUT_MS = Number(process.env.TELEGRAM_API_TIMEOUT_MS || 90000);
const webhookReplyStorage = new AsyncLocalStorage();

const telegramHttp = axios.create({
  timeout: TELEGRAM_TIMEOUT_MS,
  proxy: false,
  httpsAgent: new https.Agent({
    family: 4,
    keepAlive: false,
  }),
});

function buildTelegramError(error) {
  return {
    message: error.message,
    code: error.code,
    cause: error.cause?.message,
    response: error.response?.data,
  };
}

export async function captureWebhookReply(callback) {
  const store = { replies: [] };
  await webhookReplyStorage.run(store, callback);
  return store.replies[0] || null;
}

function captureFirstWebhookReply(method, payload) {
  const store = webhookReplyStorage.getStore();
  if (!store || store.replies.length > 0) return false;
  const webhookPayload = { method, ...payload };
  if (webhookPayload.reply_markup && typeof webhookPayload.reply_markup !== 'string') {
    webhookPayload.reply_markup = JSON.stringify(webhookPayload.reply_markup);
  }
  store.replies.push(webhookPayload);
  return true;
}

async function postTelegram(method, payload) {
  const url = tgApi(method);

  try {
    const response = await telegramHttp.post(url, payload);
    return response.data;
  } catch (error) {
    const shouldTryCurl = !error.response;
    if (!shouldTryCurl) throw error;

    logger.warn('[Telegram] axios request failed, retrying with curl', {
      method,
      error: buildTelegramError(error),
    });

    const { stdout } = await execFileAsync(
      'curl',
      [
        '-fsS',
        '--max-time',
        String(Math.ceil(TELEGRAM_TIMEOUT_MS / 1000)),
        '-X',
        'POST',
        url,
        '-H',
        'Content-Type: application/json',
        '--data',
        JSON.stringify(payload),
      ],
      {
        timeout: TELEGRAM_TIMEOUT_MS + 5000,
        maxBuffer: 1024 * 1024,
      }
    );

    return JSON.parse(stdout);
  }
}

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
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
    ...extra,
  };
  if (captureFirstWebhookReply('sendMessage', payload)) {
    return { ok: true, via: 'webhook_response' };
  }
  try {
    return await postTelegram('sendMessage', payload);
  } catch (error) {
    const errData = error.response?.data;
    // If Telegram rejected due to bad Markdown entities, retry as plain text
    if (errData?.error_code === 400 && errData?.description?.includes('parse entities')) {
      logger.warn('[Telegram] Markdown parse failed, retrying as plain text', { chatId });
      return sendPlainMessage(chatId, text, extra);
    }
    logger.error('[Telegram] sendMessage failed', { chatId, error: errData || buildTelegramError(error) });
    return null;
  }
}

/**
 * Send a plain text message (no Markdown) — safe for error strings that may
 * contain special characters like backticks, asterisks, brackets, etc.
 */
export async function sendPlainMessage(chatId, text, extra = {}) {
  if (!telegramConfig.BOT_TOKEN) return null;
  const payload = {
    chat_id: chatId,
    text,
    ...extra,
  };
  if (captureFirstWebhookReply('sendMessage', payload)) {
    return { ok: true, via: 'webhook_response' };
  }
  try {
    return await postTelegram('sendMessage', payload);
  } catch (error) {
    logger.error('[Telegram] sendPlainMessage failed', {
      chatId,
      error: error.response?.data || buildTelegramError(error),
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
  if (!telegramConfig.WEBHOOK_SECRET) return false; // no secret configured, reject by default
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
  return String(text)
    .trim()
    .split(/\s+/)[0]
    .slice(1)
    .split('@')[0]
    .toLowerCase();
}
