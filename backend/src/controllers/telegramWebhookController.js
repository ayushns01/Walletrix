/**
 * telegramWebhookController.js
 * Receives incoming Telegram updates via webhook and routes them to appropriate handlers.
 * This is the main "brain" of the bot.
 *
 * Conversation state (pending intent awaiting confirmation) is stored in-memory.
 * For production multi-instance setups, replace with Redis.
 */

import prisma from '../lib/prisma.js';
import { sendMessage, sendPlainMessage, verifyWebhookSecret, isCommand, extractCommand } from '../services/telegramService.js';
import { parseIntent } from '../services/geminiService.js';
import { executeTransfer, getBotWalletBalance } from '../services/telegramExecutionService.js';
import { applyLinkCode } from './telegramController.js';
import { HELP_MESSAGE, UNLINKED_MESSAGE, LINKED_MESSAGE } from '../config/prompts.js';
import logger from '../services/loggerService.js';

// ─────────────────────────────────────────────────────────────
//  In-memory conversation state
//  { [telegramId]: { pendingIntent, expiresAt } }
// ─────────────────────────────────────────────────────────────
const pendingIntents = new Map();

// Clear stale pending intents and rate-limit entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingIntents.entries()) {
    if (val.expiresAt < now) pendingIntents.delete(key);
  }
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > 120000) rateLimitMap.delete(key);
  }
}, 2 * 60 * 1000);

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Look up a Walletrix user by their Telegram ID.
 * Returns null if not found or not linked.
 */
async function getUserByTelegramId(telegramId) {
  return prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
}

/**
 * Rate limiting — simple in-memory per-user request counter.
 * Allows max 10 messages per minute.
 */
const rateLimitMap = new Map();
function checkRateLimit(telegramId) {
  const key = String(telegramId);
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, windowStart: now };

  if (now - entry.windowStart > 60000) {
    // Reset window
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }

  entry.count++;
  rateLimitMap.set(key, entry);
  return entry.count <= 10;
}

// ─────────────────────────────────────────────────────────────
//  Command handlers
// ─────────────────────────────────────────────────────────────

async function handleStart(chatId, telegramId, messageText) {
  try {
    const user = await getUserByTelegramId(telegramId);

    if (user) {
      const wallet = await prisma.telegramBotWallet.findUnique({ where: { userId: user.id } });
      return sendMessage(chatId,
        `✅ You're already linked!\n\nYour bot wallet: \`${wallet?.address || 'not set'}\`\n\nType /help to see what I can do.`
      );
    }

    const parts = messageText.trim().split(' ');
    if (parts.length >= 2) {
      const code = parts[1].toUpperCase();
      const result = await applyLinkCode(String(telegramId), code);
      if (result.success) {
        return sendMessage(chatId, LINKED_MESSAGE(result.address));
      } else {
        return sendPlainMessage(chatId, `❌ ${result.error}\n\nPlease generate a new code in the Walletrix app.`);
      }
    }

    return sendMessage(chatId,
      `👋 Welcome to *Walletrix Bot*!\n\nTo get started:\n1️⃣ Open the Walletrix app\n2️⃣ Go to Settings → *Link Telegram*\n3️⃣ Copy your 6-character code\n4️⃣ Send it here: \`/start YOUR_CODE\`\n\nOr just paste the code from the app here anytime.`
    );
  } catch (error) {
    logger.error('[TelegramBot] handleStart error', { telegramId, error: error.message });
    return sendPlainMessage(chatId, '❌ Something went wrong during setup. Please try again.');
  }
}

async function handleBalance(chatId, telegramId) {
  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user) return sendPlainMessage(chatId, UNLINKED_MESSAGE);

    const { address, ethBalance, chainId } = await getBotWalletBalance(user.id);
    const chainNames = {
      1: 'Ethereum Mainnet', 137: 'Polygon', 42161: 'Arbitrum',
      10: 'Optimism', 8453: 'Base', 11155111: 'Sepolia (Testnet)',
    };
    return sendMessage(chatId,
      `💼 *Bot Wallet Balance*\n\nAddress: \`${address}\`\nNetwork: ${chainNames[chainId] || chainId}\nBalance: *${parseFloat(ethBalance).toFixed(6)} ETH*\n\n_Fund this address to enable transactions._`
    );
  } catch (error) {
    logger.error('[TelegramBot] Balance check failed', { telegramId, error: error.message });
    const msg = error.message || '';
    if (msg.includes('wallet not found')) {
      return sendPlainMessage(chatId, '❌ Bot wallet not found. Try unlinking and relinking your account with /unlink.');
    }
    if (msg.includes('could not detect') || msg.includes('network') || msg.includes('RPC')) {
      return sendPlainMessage(chatId, '❌ Could not reach the network. The RPC may be down — please try again in a moment.');
    }
    return sendPlainMessage(chatId, '❌ Failed to fetch balance. Please try again.');
  }
}

async function handleHelp(chatId) {
  return sendMessage(chatId, HELP_MESSAGE);
}

async function handleUnlink(chatId, telegramId) {
  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user) return sendPlainMessage(chatId, '❌ No linked account found.');

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramId: null, telegramLinkedAt: null },
    });

    return sendPlainMessage(chatId, '✅ Your Telegram account has been unlinked from Walletrix.\n\nUse /start to link again anytime.');
  } catch (error) {
    logger.error('[TelegramBot] handleUnlink error', { telegramId, error: error.message });
    return sendPlainMessage(chatId, '❌ Failed to unlink. Please try again.');
  }
}

// ─────────────────────────────────────────────────────────────
//  Free text handler (Gemini intent parsing + confirmation)
// ─────────────────────────────────────────────────────────────

async function handleFreeText(chatId, telegramId, text) {
  try {
    const user = await getUserByTelegramId(telegramId);

    // Not linked — check if they pasted a link code
    if (!user) {
      const code = text.trim().toUpperCase();
      if (/^[A-Z0-9]{6}$/.test(code)) {
        try {
          const result = await applyLinkCode(String(telegramId), code);
          if (result.success) {
            return sendMessage(chatId, LINKED_MESSAGE(result.address));
          } else {
            return sendPlainMessage(chatId, `❌ ${result.error}\n\nGet a new code from the Walletrix app → Settings → Link Telegram.`);
          }
        } catch (err) {
          logger.error('[TelegramBot] applyLinkCode error', { telegramId, error: err.message });
          return sendPlainMessage(chatId, '❌ Failed to apply code. Please try again.');
        }
      }
      return sendPlainMessage(chatId, UNLINKED_MESSAGE);
    }

    // Check for pending confirmation ("yes" / "no")
    const pending = pendingIntents.get(String(telegramId));
    if (pending) {
      const answer = text.trim().toLowerCase();
      if (answer === 'yes' || answer === 'y' || answer === 'confirm') {
        pendingIntents.delete(String(telegramId));
        await sendPlainMessage(chatId, '⏳ Executing transaction...');

        try {
          const result = await executeTransfer(pending.intent, user);
          return sendMessage(chatId,
            `✅ *Transaction Sent!*\n\nAmount: ${result.amount} ${result.token}\nTo: \`${result.to}\`\nHash: \`${result.txHash}\``
          );
        } catch (error) {
          logger.error('[TelegramBot] executeTransfer failed', { telegramId, error: error.message });
          const msg = error.message || '';
          let reason;
          if (msg.includes('insufficient funds')) {
            reason = '❌ Insufficient funds.\n\nYour bot wallet does not have enough ETH to cover the amount + gas fees.\n\nCheck your balance with /balance and top up the wallet first.';
          } else if (msg.includes('Bot wallet not found')) {
            reason = '❌ Bot wallet not found. Try /unlink and re-link your account.';
          } else if (msg.includes('nonce')) {
            reason = '❌ Nonce conflict — please wait a moment and try again.';
          } else if (msg.includes('gas')) {
            reason = '❌ Gas estimation failed — the transaction parameters may be invalid.';
          } else if (msg.includes('network') || msg.includes('could not detect') || msg.includes('RPC')) {
            reason = '❌ Network error — could not reach the blockchain RPC. Please try again.';
          } else if (msg.includes('invalid address') || msg.includes('bad address')) {
            reason = '❌ Invalid recipient address. Please double-check and try again.';
          } else if (msg.includes('not supported') || msg.includes('not available')) {
            reason = `❌ ${msg.split('(')[0].trim()}`;
          } else {
            reason = `❌ Transaction failed: ${msg.split('(')[0].trim()}`;
          }
          return sendPlainMessage(chatId, reason);
        }
      } else {
        pendingIntents.delete(String(telegramId));
        return sendPlainMessage(chatId, '❌ Transaction cancelled.');
      }
    }

    // Parse intent
    await sendPlainMessage(chatId, '🤔 Analysing...');

    let intent;
    try {
      intent = await parseIntent(text);
    } catch (err) {
      logger.error('[TelegramBot] parseIntent threw', { telegramId, error: err.message });
      return sendPlainMessage(chatId, '❌ Failed to understand your message. Please try again.');
    }

    logger.info('[TelegramBot] Parsed intent', { telegramId, intent });

    if (intent.intent === 'unknown' || intent.confidence < 0.65) {
      return sendPlainMessage(chatId,
        "🤷 I didn't understand that as a crypto command.\n\nTry:\n• \"Send 0.01 ETH to 0x123...\"\n• \"Check my balance\"\n\nType /help for all commands."
      );
    }

    if (intent.intent === 'balance') {
      return handleBalance(chatId, telegramId);
    }

    if (intent.intent === 'transfer') {
      const { tokenSymbol, amount, recipientAddress } = intent.details;

      if (!amount || !recipientAddress) {
        return sendPlainMessage(chatId,
          '⚠️ I need more details. Please include:\n• Amount (e.g. 0.01)\n• Recipient address (0x...)\n• Token (e.g. ETH, USDC)\n\nExample: send 0.01 ETH to 0xABC...'
        );
      }

      // Store pending intent with 2-minute TTL
      pendingIntents.set(String(telegramId), {
        intent,
        expiresAt: Date.now() + 2 * 60 * 1000,
      });

      return sendMessage(chatId,
        `📤 *Confirm Transaction*\n\nI'll send *${amount} ${tokenSymbol.toUpperCase()}* to:\n\`${recipientAddress}\`\n\nReply *yes* to confirm or *no* to cancel.\n\n⚠️ This will be sent from your bot wallet.`
      );
    }

  } catch (error) {
    logger.error('[TelegramBot] handleFreeText unexpected error', { telegramId, error: error.message });
    return sendPlainMessage(chatId, '❌ Something went wrong. Please try again.');
  }
}

// ─────────────────────────────────────────────────────────────
//  Main webhook handler
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/telegram/webhook
 * Entry point for all incoming Telegram updates.
 */
export async function handleWebhook(req, res) {
  // Always respond 200 immediately — Telegram retries if we don't
  res.status(200).json({ ok: true });

  let chatId = null;

  try {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'] || '';
    if (!verifyWebhookSecret(secretHeader)) {
      logger.warn('[TelegramBot] Invalid webhook secret');
      return;
    }

    const update = req.body;
    const message = update?.message;

    if (!message || !message.text) return; // Ignore non-text updates

    chatId = message.chat.id;
    const telegramId = message.from.id;
    const text = message.text;

    logger.info('[TelegramBot] Incoming message', { chatId, telegramId, text: text.slice(0, 50) });

    // Rate limiting
    if (!checkRateLimit(telegramId)) {
      return sendPlainMessage(chatId, '⏱️ Slow down! You\'re sending too many messages. Please wait a minute.');
    }

    // Route to handler
    if (isCommand(text)) {
      const cmd = extractCommand(text);
      switch (cmd) {
        case 'start':   return handleStart(chatId, telegramId, text);
        case 'balance': return handleBalance(chatId, telegramId);
        case 'help':    return handleHelp(chatId);
        case 'unlink':  return handleUnlink(chatId, telegramId);
        default:        return sendPlainMessage(chatId, `❓ Unknown command: /${cmd}\n\nType /help for available commands.`);
      }
    } else {
      return handleFreeText(chatId, telegramId, text);
    }
  } catch (error) {
    logger.error('[TelegramBot] Unhandled webhook error', { error: error.message, stack: error.stack });
    // Best-effort: notify the user something went wrong
    if (chatId) {
      await sendPlainMessage(chatId, '❌ An unexpected error occurred. Please try again in a moment.');
    }
  }
}
