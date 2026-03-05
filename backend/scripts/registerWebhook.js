#!/usr/bin/env node
/**
 * registerWebhook.js
 * Registers the Telegram webhook URL with BotFather's Telegram API.
 *
 * Usage:
 *   BACKEND_URL=https://your-backend.railway.app node backend/scripts/registerWebhook.js
 *
 * Or with ngrok for local dev:
 *   BACKEND_URL=https://abc123.ngrok.io node backend/scripts/registerWebhook.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BACKEND_URL = process.env.BACKEND_URL || process.argv[2];

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set in .env');
  process.exit(1);
}

if (!BACKEND_URL) {
  console.error('❌ BACKEND_URL not provided. Set it in .env or pass as argument:');
  console.error('   node scripts/registerWebhook.js https://your-backend.com');
  process.exit(1);
}

const webhookUrl = `${BACKEND_URL.replace(/\/$/, '')}/api/v1/telegram/webhook`;

console.log(`\n🔗 Registering webhook: ${webhookUrl}\n`);

const response = await fetch(
  `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET || '',
      allowed_updates: ['message'],
      drop_pending_updates: true,
    }),
  }
);

const result = await response.json();

if (result.ok) {
  console.log('✅ Webhook registered successfully!');
  console.log(`   URL: ${webhookUrl}`);
} else {
  console.error('❌ Failed to register webhook:', result.description);
  process.exit(1);
}

// Verify current webhook info
const infoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
const info = await infoResponse.json();
if (info.ok) {
  console.log('\n📋 Current webhook info:');
  console.log(`   URL: ${info.result.url}`);
  console.log(`   Pending updates: ${info.result.pending_update_count}`);
  console.log(`   Last error: ${info.result.last_error_message || 'none'}`);
}
