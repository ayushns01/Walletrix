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
import {
  parseIntent,
  extractTransferSlots,
  generateConversationalReply,
} from '../services/geminiService.js';
import { executeTransfer, getBotWalletBalance } from '../services/telegramExecutionService.js';
import {
  loadConversationSession,
  saveConversationSession,
  clearConversationSession,
} from '../services/conversationSessionService.js';
import {
  decideConversationAction,
  extractHeuristicTransferFields,
  shouldAttemptTransferSlotExtraction,
} from '../services/telegramConversation/orchestrator.js';
import { createTransferConversationHandlers } from '../services/telegramConversation/transferHandlers.js';
import { createSceneStateHandlers } from '../services/telegramConversation/sceneState.js';
import {
  isListSavedRecipientsIntent,
  isSavedRecipientSaveIntent,
  listSavedRecipients,
  parseSavedRecipientDeleteRequest,
  parseSavedRecipientSaveRequest,
  removeSavedRecipientByName,
  resolveSavedRecipientFromText,
  extractSavedRecipientAliasCandidate,
  saveSavedRecipient,
  touchSavedRecipientById,
} from '../services/savedRecipientService.js';
import {
  buildLastTransferMessage,
  buildRecentTransfersMessage,
  getLastTelegramTransfer,
  getRecentTelegramTransfers,
  isLastTransferIntent,
  isRecentTransfersIntent,
  recordTelegramTransferEvent,
} from '../services/telegramHistoryService.js';
import {
  buildTransferStatusMessage,
  extractTxHashFromText,
  isTransferStatusIntent,
  lookupTelegramTransferStatus,
} from '../services/telegramTxStatusService.js';
import {
  issueStealthReceiveAddress,
  listSelectableStealthWallets,
  resolveSelectableStealthWallet,
} from '../services/stealthWalletService.js';
import { applyLinkCode } from './telegramController.js';
import telegramConfig from '../config/telegram.js';
import { HELP_MESSAGE, UNLINKED_MESSAGE, LINKED_MESSAGE } from '../config/prompts.js';
import logger from '../services/loggerService.js';

// ─────────────────────────────────────────────────────────────
//  In-memory conversation state
//  { [telegramId]: { pendingIntent, expiresAt } }
// ─────────────────────────────────────────────────────────────
const pendingIntents = new Map();
const transferDrafts = new Map();
const chatContexts = new Map();

// Clear stale pending intents and rate-limit entries every 2 minutes.
const conversationCleanupTicker = setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingIntents.entries()) {
    if (val.expiresAt < now) pendingIntents.delete(key);
  }
  for (const [key, val] of transferDrafts.entries()) {
    if (val.expiresAt < now) transferDrafts.delete(key);
  }
  for (const [key, val] of chatContexts.entries()) {
    if (val.expiresAt < now) chatContexts.delete(key);
    else sanitizeSceneState(key, { persist: false });
  }
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > 120000) rateLimitMap.delete(key);
  }
}, 2 * 60 * 1000);

if (typeof conversationCleanupTicker.unref === 'function') {
  conversationCleanupTicker.unref();
}

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
const GREETING_RE = /^(hi|hello|hey|yo|hola|hii+)\b/i;
const CAPABILITIES_RE = /\b(what can you do|how can you help|help me|what do you do|commands?)\b/i;
const THANKS_RE = /\b(thanks|thank you|thx)\b/i;
const HOW_ARE_YOU_RE = /\b(how are you|how's it going|how r u)\b/i;
const WHO_ARE_YOU_RE = /\b(who are you|what are you)\b/i;
const STEALTH_RE = /\b(stealth|private receive|private receiving|hidden receive)\b/i;
const CONVERSATION_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const CONVERSATIONAL_V2_ENABLED = telegramConfig.TELEGRAM_CONVERSATIONAL_V2;

function buildReplyKeyboard(rows, { placeholder = 'Message Walletrix', oneTime = false } = {}) {
  const keyboard = rows
    .map((row) => row.filter(Boolean).map((text) => ({ text })))
    .filter((row) => row.length > 0);

  if (keyboard.length === 0) return {};

  return {
    reply_markup: {
      keyboard,
      resize_keyboard: true,
      one_time_keyboard: oneTime,
      input_field_placeholder: placeholder,
    },
  };
}

function getRemoveKeyboardReplyMarkup() {
  return {
    reply_markup: {
      remove_keyboard: true,
    },
  };
}

function getPrimaryQuickReplyMarkup() {
  return buildReplyKeyboard(
    [
      ['Check balance', 'Send crypto'],
      ['Address list', 'Recent transfers'],
      ['Tx status', 'Help'],
    ],
    { placeholder: 'Check balance, send crypto, or manage your address list' }
  );
}

if (process.env.NODE_ENV !== 'test') {
  logger.info('[TelegramBot] Conversational mode', {
    conversationalV2Enabled: CONVERSATIONAL_V2_ENABLED,
    analysingDelayMs: telegramConfig.TELEGRAM_ANALYSING_DELAY_MS,
  });
}

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

function detectPreviousRecipientReference(text) {
  const msg = text.toLowerCase();
  return (
    /\b(previous|last|same)\b.*\b(transaction|tx|recipient|address)\b/.test(msg) ||
    /\bthe one i sent\b/.test(msg) ||
    /\bsame address\b/.test(msg) ||
    /\buse previous recipient\b/.test(msg) ||
    /\bsend it there\b/.test(msg)
  );
}

function detectPreviousAmountReference(text) {
  const msg = text.toLowerCase();
  return /\b(same|previous|last)\b.*\b(amount|value)\b/.test(msg);
}

function detectPreviousTokenReference(text) {
  const msg = text.toLowerCase();
  return /\b(same|previous|last)\b.*\b(token|coin)\b/.test(msg);
}

function extractTransferFields(text) {
  return extractHeuristicTransferFields(text);
}

function getContext(telegramId) {
  return chatContexts.get(String(telegramId)) || null;
}

function getConversationHistory(telegramId) {
  const context = getContext(telegramId);
  return Array.isArray(context?.history) ? context.history : [];
}

function isCasualConversationTurn(text) {
  const trimmed = String(text || '').trim();
  return (
    GREETING_RE.test(trimmed)
    || CAPABILITIES_RE.test(trimmed)
    || THANKS_RE.test(trimmed)
    || HOW_ARE_YOU_RE.test(trimmed)
    || WHO_ARE_YOU_RE.test(trimmed)
  );
}

function isFreshWalletTask(text) {
  const normalized = String(text || '').trim().toLowerCase();
  return (
    /\b(send|transfer|pay|balance|contacts?|addresses?|help|save|add|delete|remove|show|list|recent|history|last|transactions?|status|track|hash|stealth)\b/.test(normalized)
    || isListSavedRecipientsIntent(normalized)
    || isSavedRecipientSaveIntent(normalized)
    || isRecentTransfersIntent(normalized)
    || isLastTransferIntent(normalized)
    || isTransferStatusIntent(normalized)
  );
}

function isConversationStale(telegramId) {
  const context = getContext(telegramId);
  if (!context?.lastInteractionAt) return false;
  return (Date.now() - context.lastInteractionAt) > CONVERSATION_IDLE_TIMEOUT_MS;
}

function getConversationStateForPersistence(telegramId) {
  const key = String(telegramId);
  const chatContext = chatContexts.get(key) || null;
  const transferDraft = transferDrafts.get(key) || null;
  const pendingIntent = pendingIntents.get(key) || null;

  const expiresAtCandidates = [
    chatContext?.expiresAt || null,
    transferDraft?.expiresAt || null,
    pendingIntent?.expiresAt || null,
  ].filter(Boolean);

  const maxExpiry = expiresAtCandidates.length > 0
    ? new Date(Math.max(...expiresAtCandidates))
    : null;

  return {
    chatContext,
    transferDraft,
    pendingIntent,
    expiresAt: maxExpiry,
  };
}

function persistConversationState(telegramId) {
  const key = String(telegramId);
  const state = getConversationStateForPersistence(key);

  saveConversationSession(key, state).catch((error) => {
    logger.error('[TelegramBot] Failed to persist conversation state', { telegramId: key, error: error.message });
  });
}

async function hydrateContext(telegramId) {
  const key = String(telegramId);
  const existingContext = chatContexts.get(key) || null;
  const hasScenefulContext = Boolean(
    existingContext && (
      existingContext.scene
      || existingContext.currentStep
      || existingContext.lastInteractionAt
      || existingContext.lastRecipientAddress
      || existingContext.lastAmount
      || existingContext.lastTokenSymbol
    )
  );

  if (hasScenefulContext || transferDrafts.has(key) || pendingIntents.has(key)) return false;

  const session = await loadConversationSession(key);
  if (!session) return false;

  if (session.chatContext) {
    const mergedContext = {
      ...session.chatContext,
      history: Array.isArray(existingContext?.history)
        ? existingContext.history
        : (Array.isArray(session.chatContext.history) ? session.chatContext.history : []),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    chatContexts.set(key, mergedContext);
  }
  if (session.transferDraft) {
    transferDrafts.set(key, session.transferDraft);
  }
  if (session.pendingIntent) {
    pendingIntents.set(key, session.pendingIntent);
  }

  logger.info('[TelegramBot] Conversation session hydrated', {
    telegramId: key,
    hasChatContext: Boolean(session.chatContext),
    hasTransferDraft: Boolean(session.transferDraft),
    hasPendingIntent: Boolean(session.pendingIntent),
  });

  return true;
}

function updateContext(telegramId, patch) {
  const existing = getContext(telegramId) || {};
  const key = String(telegramId);
  const merged = {
    ...existing,
    ...patch,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  chatContexts.set(key, merged);
  persistConversationState(key);
}

function syncDraftDetailsContext(telegramId, draft) {
  const key = String(telegramId);
  const existing = getContext(key);
  if (!existing && !draft) return;

  const nextContext = {
    ...(existing || {}),
    draftDetails: draft?.intent?.details
      ? {
          tokenSymbol: draft.intent.details.tokenSymbol || null,
          amount: draft.intent.details.amount ?? null,
          recipientAddress: draft.intent.details.recipientAddress || null,
          chain: draft.intent.details.chain || null,
        }
      : null,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  chatContexts.set(key, nextContext);
}

function appendUserMessageHistory(telegramId, text) {
  const context = getContext(telegramId) || {};
  const history = Array.isArray(context.history) ? context.history : [];
  const normalized = String(text || '').trim();
  if (!normalized) return;

  const nextHistory = [
    ...history,
    {
      role: 'user',
      text: normalized.slice(0, 300),
      ts: Date.now(),
    },
  ].slice(-12);

  updateContext(telegramId, { history: nextHistory });
}

function appendAssistantMessageHistory(telegramId, text) {
  const context = getContext(telegramId) || {};
  const history = Array.isArray(context.history) ? context.history : [];
  const normalized = String(text || '').trim();
  if (!normalized) return;

  const nextHistory = [
    ...history,
    {
      role: 'assistant',
      text: normalized.slice(0, 500),
      ts: Date.now(),
    },
  ].slice(-16);

  updateContext(telegramId, { history: nextHistory });
}

function getConversationRuntimeState(telegramId) {
  const key = String(telegramId);
  const context = getContext(key) || {};
  return {
    scene: context.scene || null,
    currentStep: context.currentStep || null,
    hasDraft: transferDrafts.has(key),
    hasPending: pendingIntents.has(key),
  };
}

function logConversationDecision({
  telegramId,
  intent,
  confidence,
  action,
  slotExtractionAttempted,
  slotExtractionUsed,
}) {
  const state = getConversationRuntimeState(telegramId);
  logger.info('[TelegramBot] Conversation decision', {
    telegramId: String(telegramId),
    scene: state.scene,
    currentStep: state.currentStep,
    hasDraft: state.hasDraft,
    hasPending: state.hasPending,
    intent,
    confidence,
    actionType: action?.type || null,
    actionReason: action?.reason || null,
    missingCount: Array.isArray(action?.missing) ? action.missing.length : 0,
    slotExtractionAttempted,
    slotExtractionUsed,
    conversationalV2Enabled: CONVERSATIONAL_V2_ENABLED,
  });
}

async function parseIntentWithAdaptiveIndicator(chatId, text) {
  const delayMs = telegramConfig.TELEGRAM_ANALYSING_DELAY_MS;
  let indicatorTimer = null;
  let indicatorSent = false;

  if (delayMs >= 0) {
    indicatorTimer = setTimeout(() => {
      indicatorSent = true;
      sendPlainMessage(chatId, '🤔 Analysing...').catch((error) => {
        logger.warn('[TelegramBot] Failed to send analysing indicator', {
          chatId,
          error: error.message,
        });
      });
    }, delayMs);
  }

  try {
    return await parseIntent(text);
  } finally {
    if (indicatorTimer) {
      clearTimeout(indicatorTimer);
    }
    logger.debug?.('[TelegramBot] Parsing indicator state', {
      chatId,
      indicatorSent,
      delayMs,
    });
  }
}

async function sendBotPlain(chatId, telegramId, text, extra = getRemoveKeyboardReplyMarkup()) {
  appendAssistantMessageHistory(telegramId, text);
  return sendPlainMessage(chatId, text, extra);
}

async function sendBotMessage(chatId, telegramId, text, extra = getRemoveKeyboardReplyMarkup()) {
  appendAssistantMessageHistory(telegramId, text);
  return sendMessage(chatId, text, extra);
}

async function resetConversationFlow(telegramId, reason = null) {
  setTransferDraft(telegramId, null);
  setPendingIntent(telegramId, null);
  updateContext(telegramId, { stealthWalletOptions: null });
  setScene(telegramId, 'idle', 'ready', reason ? { resetReason: reason } : {});
}

function setTransferDraft(telegramId, draft) {
  const key = String(telegramId);
  if (draft) {
    transferDrafts.set(key, draft);
  } else {
    transferDrafts.delete(key);
  }
  syncDraftDetailsContext(key, draft);
  persistConversationState(key);
}

function setPendingIntent(telegramId, pending) {
  const key = String(telegramId);
  if (pending) {
    pendingIntents.set(key, pending);
  } else {
    pendingIntents.delete(key);
  }
  persistConversationState(key);
}

function setContextRaw(telegramId, nextContext, { persist = true } = {}) {
  const key = String(telegramId);
  chatContexts.set(key, nextContext);
  if (persist) {
    persistConversationState(key);
  }
}

const sceneStateHandlers = createSceneStateHandlers({
  logger,
  getContext,
  updateContext,
  setContextRaw,
  hasTransferDraft: (telegramId) => transferDrafts.has(String(telegramId)),
  hasPendingIntent: (telegramId) => pendingIntents.has(String(telegramId)),
  getTransferDraft: (telegramId) => transferDrafts.get(String(telegramId)),
  getPendingIntent: (telegramId) => pendingIntents.get(String(telegramId)),
  setTransferDraft,
  setPendingIntent,
  sendBotPlain,
  sendBotMessage,
  getMissingTransferFields,
  buildMissingFieldPrompt,
});

const {
  sanitizeSceneState,
  setScene,
  enterScene,
  exitScene,
  routeByActiveScene,
} = sceneStateHandlers;

async function clearConversationState(telegramId) {
  const key = String(telegramId);
  pendingIntents.delete(key);
  transferDrafts.delete(key);
  chatContexts.delete(key);
  await clearConversationSession(key);
}

async function getLastRecipientAddressForUser(userId) {
  const lastTx = await prisma.transaction.findFirst({
    where: {
      wallet: {
        userId,
      },
      toAddress: {
        not: null,
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  return lastTx?.toAddress || null;
}

async function resolvePreviousRecipientAddress(userId, telegramId) {
  const context = getContext(telegramId);
  if (context?.lastRecipientAddress) return context.lastRecipientAddress;
  return getLastRecipientAddressForUser(userId);
}

function getMissingTransferFields(intentDetails) {
  const missing = [];
  if (!intentDetails.amount) missing.push('amount');
  if (!intentDetails.recipientAddress) missing.push('recipientAddress');
  if (!intentDetails.tokenSymbol) missing.push('tokenSymbol');
  return missing;
}

function buildMissingFieldPrompt(missing) {
  if (missing[0] === 'amount') {
    return 'Got it. How much would you like to send? (for example: 0.0001)';
  }
  if (missing[0] === 'recipientAddress') {
    return 'Who should receive it? You can send an address, an ENS name, a name from your address list like "Alice", or say "use previous recipient".';
  }
  if (missing[0] === 'tokenSymbol') {
    return 'Which token should I send? (ETH, USDC, USDT, DAI, WETH)';
  }
  return 'Please share the missing transaction details.';
}

function buildSavedRecipientsListMessage(recipients) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return 'Your address list is empty.\n\nSave one with "save 0x... as Alice".';
  }

  const lines = recipients.slice(0, 12).map((recipient) => `• *${recipient.name}* — \`${recipient.address}\``);
  const suffix = recipients.length > 12
    ? `\n\nShowing 12 of ${recipients.length} saved addresses.`
    : '';

  return `👥 *Address List*\n\n${lines.join('\n')}${suffix}`;
}

function getSmallTalkResponse(text) {
  const trimmed = text.trim();
  if (GREETING_RE.test(trimmed)) {
    return 'Hey. Want to check balance, send crypto, or open your address list?';
  }

  if (CAPABILITIES_RE.test(trimmed)) {
    return 'I can check balance, send crypto, and use your address list.\nTry: "send 0.01 ETH to Alice".';
  }

  if (HOW_ARE_YOU_RE.test(trimmed)) {
    return 'Doing well. What do you need?';
  }

  if (WHO_ARE_YOU_RE.test(trimmed)) {
    return 'I am your Walletrix bot. I can check balance, send crypto, and manage your address list.';
  }

  if (THANKS_RE.test(trimmed)) {
    return 'Anytime. What next?';
  }

  return null;
}

function isStealthAddressIntent(text) {
  const normalized = String(text || '').trim().toLowerCase();
  return (
    STEALTH_RE.test(normalized)
    && /\b(address|receive|funds|money|payment|payments)\b/.test(normalized)
  );
}

function buildStealthWalletSelectionMessage(options) {
  const optionLines = options.map((option) => `*${option.selectionToken}.* ${option.label} — \`${option.shortAddress}\``);

  return [
    '🕶️ *Stealth Receive*',
    '',
    'Choose which wallet this private receive address should be linked to:',
    '',
    optionLines.join('\n'),
    '',
    'Reply with the number or wallet name. Send *cancel* to stop.',
  ].join('\n');
}

function getStealthWalletReplyMarkup(options) {
  const rows = [];
  for (let index = 0; index < options.length; index += 2) {
    const left = options[index];
    const right = options[index + 1];
    rows.push([
      left ? `${left.selectionToken}. ${left.label}` : null,
      right ? `${right.selectionToken}. ${right.label}` : null,
    ]);
  }
  rows.push(['Cancel']);
  return buildReplyKeyboard(rows, {
    placeholder: 'Choose a wallet for your stealth receive address',
    oneTime: true,
  });
}

function buildStealthAddressReadyMessage(result) {
  return [
    '🕶️ *Stealth Address Ready*',
    '',
    `Wallet: *${result.walletLabel}*`,
    `Type: ${result.kindLabel}`,
    'Network: Ethereum-compatible',
    '',
    'One-time private receive address:',
    `\`${result.stealthAddress}\``,
    '',
    'Share this address to receive funds privately.',
    'Ask again anytime to generate another one.',
  ].join('\n');
}

async function handleStealthStart(chatId, telegramId, user) {
  const options = await listSelectableStealthWallets(user.id);

  if (!options.length) {
    setScene(telegramId, 'idle', 'ready', { lastIntent: 'stealth_receive' });
    return sendBotPlain(chatId, telegramId, 'I could not find any wallets for this account yet. Create or import a wallet first, then try again.');
  }

  updateContext(telegramId, {
    stealthWalletOptions: options.map((option) => ({
      selectionToken: option.selectionToken,
      walletType: option.walletType,
      walletRef: option.walletRef,
      label: option.label,
      address: option.address,
      shortAddress: option.shortAddress,
      kindLabel: option.kindLabel,
      displayText: option.displayText,
    })),
    lastIntent: 'stealth_receive',
  });
  setScene(telegramId, 'stealth', 'select_wallet');

  return sendBotMessage(
    chatId,
    telegramId,
    buildStealthWalletSelectionMessage(options),
    getStealthWalletReplyMarkup(options)
  );
}

async function handleStealthWalletSelection(chatId, telegramId, user, text) {
  const context = getContext(telegramId) || {};
  const options = Array.isArray(context.stealthWalletOptions) ? context.stealthWalletOptions : [];

  if (/^cancel$/i.test(String(text || '').trim())) {
    updateContext(telegramId, { stealthWalletOptions: null, lastIntent: 'stealth_receive' });
    setScene(telegramId, 'idle', 'ready');
    return sendBotPlain(chatId, telegramId, 'Stealth address request cancelled.');
  }

  if (!options.length) {
    setScene(telegramId, 'idle', 'ready', { lastIntent: 'stealth_receive' });
    return sendBotPlain(chatId, telegramId, 'That stealth selection expired. Ask for a stealth address again and I will restart it.');
  }

  const selection = resolveSelectableStealthWallet(options, text);
  if (!selection) {
    return sendBotPlain(
      chatId,
      telegramId,
      'I did not recognize that wallet choice.\n\nReply with the wallet number, the wallet name, or send cancel.',
      getStealthWalletReplyMarkup(options)
    );
  }

  const issuedAddress = await issueStealthReceiveAddress(user.id, selection);
  updateContext(telegramId, {
    stealthWalletOptions: null,
    lastStealthAddress: issuedAddress.stealthAddress,
    lastStealthWalletLabel: issuedAddress.walletLabel,
    lastIntent: 'stealth_receive',
  });
  setScene(telegramId, 'idle', 'ready', { lastIntent: 'stealth_receive' });

  return sendBotMessage(chatId, telegramId, buildStealthAddressReadyMessage(issuedAddress));
}

// ─────────────────────────────────────────────────────────────
//  Command handlers
// ─────────────────────────────────────────────────────────────

function extractStartLinkCode(messageText) {
  const message = String(messageText || '').trim();
  if (!message) return null;

  const compactMatch = message.match(/^\/start([a-z0-9]{6})$/i);
  if (compactMatch?.[1]) {
    return compactMatch[1].toUpperCase();
  }

  const commandMatch = message.match(/^\/start(?:@\w+)?([\s\S]*)$/i);
  if (!commandMatch) return null;

  const rest = String(commandMatch[1] || '').trim();
  if (!rest) return null;

  const codeMatch = rest.match(/\b([a-z0-9]{6})\b/i);
  return codeMatch?.[1] ? codeMatch[1].toUpperCase() : null;
}

async function handleStart(chatId, telegramId, messageText) {
  try {
    setScene(telegramId, 'onboarding', 'start');
    const user = await getUserByTelegramId(telegramId);

    if (user) {
      const wallet = await prisma.telegramBotWallet.findUnique({ where: { userId: user.id } });
      setScene(telegramId, 'idle', 'ready');
      return sendBotMessage(chatId, telegramId,
        `✅ You're already linked.\n\nBot wallet: \`${wallet?.address || 'not set'}\`\n\nWhat do you want to do next?`
      );
    }

    const code = extractStartLinkCode(messageText);
    if (code) {
      const result = await applyLinkCode(String(telegramId), code);
      if (result.success) {
        setScene(telegramId, 'idle', 'ready');
        return sendBotMessage(chatId, telegramId, LINKED_MESSAGE(result.address));
      } else {
        return sendBotPlain(chatId, telegramId, `❌ ${result.error}\n\nPlease generate a new code in the Walletrix app.`);
      }
    }

    return sendBotMessage(chatId, telegramId,
      `👋 Welcome to *Walletrix Bot*!\n\nTo get started:\n1️⃣ Open the Walletrix app\n2️⃣ Go to Settings → *Link Telegram*\n3️⃣ Copy your 6-character code\n4️⃣ Send it here: \`/start YOUR_CODE\`\n\nOr just paste the code from the app here anytime.`
    );
  } catch (error) {
    logger.error('[TelegramBot] handleStart error', { telegramId, error: error.message });
    return sendBotPlain(chatId, telegramId, '❌ Something went wrong during setup. Please try again.');
  }
}

async function handleBalance(chatId, telegramId) {
  try {
    setScene(telegramId, 'balance', 'fetching');
    const user = await getUserByTelegramId(telegramId);
    if (!user) return sendBotPlain(chatId, telegramId, UNLINKED_MESSAGE);

    const { address, ethBalance, chainId } = await getBotWalletBalance(user.id);
    const chainNames = {
      1: 'Ethereum Mainnet', 137: 'Polygon', 42161: 'Arbitrum',
      10: 'Optimism', 8453: 'Base', 11155111: 'Sepolia (Testnet)',
    };
    setScene(telegramId, 'idle', 'ready', { lastIntent: 'balance' });
    return sendBotMessage(chatId, telegramId,
      `💼 *Bot Wallet Balance*\n\nAddress: \`${address}\`\nNetwork: ${chainNames[chainId] || chainId}\nBalance: *${parseFloat(ethBalance).toFixed(6)} ETH*\n\n_Fund this address to enable transactions._`
    );
  } catch (error) {
    logger.error('[TelegramBot] Balance check failed', { telegramId, error: error.message });
    const msg = error.message || '';
    if (msg.includes('wallet not found')) {
      return sendBotPlain(chatId, telegramId, '❌ Bot wallet not found. Try unlinking and relinking your account with /unlink.');
    }
    if (msg.includes('could not detect') || msg.includes('network') || msg.includes('RPC')) {
      return sendBotPlain(chatId, telegramId, '❌ Could not reach the network. The RPC may be down — please try again in a moment.');
    }
    return sendBotPlain(chatId, telegramId, '❌ Failed to fetch balance. Please try again.');
  }
}

async function handleHelp(chatId, telegramId) {
  setScene(telegramId, 'help', 'shown');
  return sendBotMessage(chatId, telegramId, HELP_MESSAGE);
}

async function handleContacts(chatId, telegramId) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) return sendBotPlain(chatId, telegramId, UNLINKED_MESSAGE);

  const recipients = await listSavedRecipients(user.id);
  setScene(telegramId, 'idle', 'ready', { lastIntent: 'contacts' });
  return sendBotMessage(chatId, telegramId, buildSavedRecipientsListMessage(recipients));
}

async function handleRecentTransfers(chatId, telegramId) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) return sendBotPlain(chatId, telegramId, UNLINKED_MESSAGE);

  const transfers = await getRecentTelegramTransfers(user.id, { limit: 5 });
  setScene(telegramId, 'idle', 'ready', { lastIntent: 'recent_transfers' });
  return sendBotMessage(chatId, telegramId, buildRecentTransfersMessage(transfers));
}

async function handleLastTransfer(chatId, telegramId) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) return sendBotPlain(chatId, telegramId, UNLINKED_MESSAGE);

  const lastTransfer = await getLastTelegramTransfer(user.id);
  setScene(telegramId, 'idle', 'ready', { lastIntent: 'last_transfer' });
  return sendBotMessage(chatId, telegramId, buildLastTransferMessage(lastTransfer));
}

async function handleTransferStatus(chatId, telegramId, text = '') {
  const user = await getUserByTelegramId(telegramId);
  if (!user) return sendBotPlain(chatId, telegramId, UNLINKED_MESSAGE);

  const txHash = extractTxHashFromText(text);
  const statusResult = await lookupTelegramTransferStatus(user.id, { txHash });
  setScene(telegramId, 'idle', 'ready', { lastIntent: 'tx_status' });
  return sendBotMessage(chatId, telegramId, buildTransferStatusMessage(statusResult));
}

async function handleUnlink(chatId, telegramId) {
  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user) return sendBotPlain(chatId, telegramId, '❌ No linked account found.');

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramId: null, telegramLinkedAt: null },
    });

    await clearConversationState(telegramId);

    return sendBotPlain(chatId, telegramId, '✅ Your Telegram account has been unlinked from Walletrix.\n\nUse /start to link again anytime.');
  } catch (error) {
    logger.error('[TelegramBot] handleUnlink error', { telegramId, error: error.message });
    return sendBotPlain(chatId, telegramId, '❌ Failed to unlink. Please try again.');
  }
}

const transferConversationHandlers = createTransferConversationHandlers({
  executeTransfer,
  logger,
  sendBotPlain,
  sendBotMessage,
  setPendingIntent,
  setTransferDraft,
  setScene,
  updateContext,
  getContext,
  resolvePreviousRecipientAddress,
  detectPreviousAmountReference,
  detectPreviousTokenReference,
  detectPreviousRecipientReference,
  resolveSavedRecipientFromText,
  extractSavedRecipientAliasCandidate,
  extractTransferFields,
  getMissingTransferFields,
  buildMissingFieldPrompt,
  touchSavedRecipientById,
  recordTelegramTransferEvent,
});

// ─────────────────────────────────────────────────────────────
//  Free text handler (Gemini intent parsing + confirmation)
// ─────────────────────────────────────────────────────────────

async function handleFreeText(chatId, telegramId, text) {
  try {
    await hydrateContext(telegramId);
    sanitizeSceneState(telegramId);
    if (isConversationStale(telegramId)) {
      const activeScene = getContext(telegramId)?.scene;
      const hadActiveFlow = (
        transferDrafts.has(String(telegramId))
        || pendingIntents.has(String(telegramId))
        || activeScene === 'transfer'
        || activeScene === 'stealth'
      );
      await resetConversationFlow(telegramId, 'idle_timeout');
      if (hadActiveFlow && !isCasualConversationTurn(text) && !isFreshWalletTask(text)) {
        return sendBotPlain(chatId, telegramId, activeScene === 'stealth'
          ? 'That earlier stealth-address selection expired. Ask again and I will restart it.'
          : 'That earlier transfer expired. Start a new one when you are ready.');
      }
    }

    appendUserMessageHistory(telegramId, text);
    const user = await getUserByTelegramId(telegramId);
    const normalizedText = String(text || '').trim().toLowerCase();

    // Not linked — check if they pasted a link code
    if (!user) {
      const code = text.trim().toUpperCase();
      if (/^[A-Z0-9]{6}$/.test(code)) {
        try {
          const result = await applyLinkCode(String(telegramId), code);
          if (result.success) {
            setScene(telegramId, 'idle', 'ready');
            return sendBotMessage(chatId, telegramId, LINKED_MESSAGE(result.address));
          } else {
            return sendBotPlain(chatId, telegramId, `❌ ${result.error}\n\nGet a new code from the Walletrix app → Settings → Link Telegram.`);
          }
        } catch (err) {
          logger.error('[TelegramBot] applyLinkCode error', { telegramId, error: err.message });
          return sendBotPlain(chatId, telegramId, '❌ Failed to apply code. Please try again.');
        }
      }
      return sendBotPlain(chatId, telegramId, UNLINKED_MESSAGE);
    }

    updateContext(telegramId, { userId: user.id });

    if (getContext(telegramId)?.scene === 'stealth' && getContext(telegramId)?.currentStep === 'select_wallet') {
      return handleStealthWalletSelection(chatId, telegramId, user, text);
    }

    if (normalizedText === 'help') {
      return handleHelp(chatId, telegramId);
    }

    if (['balance', 'check balance', 'show balance'].includes(normalizedText)) {
      return handleBalance(chatId, telegramId);
    }

    if (['address list', 'show address list'].includes(normalizedText)) {
      return handleContacts(chatId, telegramId);
    }

    if (
      ['recent transfers', 'recent transactions', 'transfer history', 'transaction history'].includes(normalizedText)
      || isRecentTransfersIntent(text)
    ) {
      return handleRecentTransfers(chatId, telegramId);
    }

    if (
      ['last transfer', 'last transaction'].includes(normalizedText)
      || isLastTransferIntent(text)
    ) {
      return handleLastTransfer(chatId, telegramId);
    }

    if (
      ['tx status', 'transaction status', 'status'].includes(normalizedText)
      || isTransferStatusIntent(text)
    ) {
      return handleTransferStatus(chatId, telegramId, text);
    }

    if (normalizedText === 'stealth' || isStealthAddressIntent(text)) {
      return handleStealthStart(chatId, telegramId, user);
    }

    if (normalizedText === 'send crypto' || normalizedText === 'send') {
      setTransferDraft(telegramId, {
        intent: {
          intent: 'transfer',
          details: {
            tokenSymbol: null,
            amount: null,
            recipientAddress: null,
            recipientLabel: null,
            chain: null,
          },
          confidence: 0.8,
        },
        expiresAt: Date.now() + 2 * 60 * 1000,
      });
      setScene(telegramId, 'transfer', 'collecting_amount');
      return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(['amount']));
    }

    const saveRecipientRequest = parseSavedRecipientSaveRequest(text);
    if (saveRecipientRequest) {
      try {
        const result = await saveSavedRecipient(user.id, saveRecipientRequest);
        setScene(telegramId, 'idle', 'ready', { lastIntent: 'save_recipient' });
        return sendBotMessage(
          chatId,
          telegramId,
          result.created
            ? `✅ Saved *${result.recipient.name}*.\n\nYou can now say things like "send 0.01 ETH to ${result.recipient.name}".`
            : `✅ Updated *${result.recipient.name}*.\n\nNew address: \`${result.recipient.address}\``
        );
      } catch (error) {
        return sendBotPlain(chatId, telegramId, `❌ ${error.message}`);
      }
    }
    if (isSavedRecipientSaveIntent(text)) {
      return sendBotPlain(chatId, telegramId, 'Save an address like: "save 0x... as Alice".');
    }

    if (isListSavedRecipientsIntent(text)) {
      return handleContacts(chatId, telegramId);
    }

    const deleteRecipientRequest = parseSavedRecipientDeleteRequest(text);
    if (deleteRecipientRequest) {
      const removed = await removeSavedRecipientByName(user.id, deleteRecipientRequest.name);
      setScene(telegramId, 'idle', 'ready', { lastIntent: 'delete_recipient' });
      return sendBotMessage(
        chatId,
        telegramId,
        removed
          ? `🗑️ Removed *${removed.name}* from your address list.`
          : `I could not find "${deleteRecipientRequest.name}" in your address list.`
      );
    }

    if (CONVERSATIONAL_V2_ENABLED) {
      const sceneRoutedResponse = await routeByActiveScene(chatId, telegramId, user, text);
      if (sceneRoutedResponse) {
        return sceneRoutedResponse;
      }
    }

    const pending = pendingIntents.get(String(telegramId));
    const pendingResponse = await transferConversationHandlers.handlePendingConfirmation({
      chatId,
      telegramId,
      text,
      pending,
      user,
    });
    if (pendingResponse) {
      return pendingResponse;
    }

    const draft = transferDrafts.get(String(telegramId));
    const draftResponse = await transferConversationHandlers.handleTransferDraftCollection({
      chatId,
      telegramId,
      text,
      draft,
      user,
    });
    if (draftResponse) {
      return draftResponse;
    }

    const guardrailResponse = await transferConversationHandlers.handleTransferCollectionGuardrails({
      chatId,
      telegramId,
      text,
    });
    if (guardrailResponse) {
      return guardrailResponse;
    }

    if (normalizedText === 'cancel') {
      await resetConversationFlow(telegramId, 'manual_cancel');
      return sendBotPlain(chatId, telegramId, 'Nothing active right now. What do you want to do next?');
    }

    if (CONVERSATIONAL_V2_ENABLED) {
      setScene(telegramId, 'conversation', 'understanding', { lastUserMessage: text.slice(0, 300) });

      // Friendly small-talk responses so the bot feels conversational.
      const smallTalkReply = getSmallTalkResponse(text);
      if (smallTalkReply) {
        setScene(telegramId, 'conversation', 'smalltalk');
        const shouldShowKeyboard = GREETING_RE.test(String(text || '').trim());
        return sendBotPlain(
          chatId,
          telegramId,
          smallTalkReply,
          shouldShowKeyboard ? getPrimaryQuickReplyMarkup() : getRemoveKeyboardReplyMarkup()
        );
      }
    }

    // Parse intent
    let intent;
    try {
      intent = CONVERSATIONAL_V2_ENABLED
        ? await parseIntentWithAdaptiveIndicator(chatId, text)
        : await parseIntent(text);
    } catch (err) {
      logger.error('[TelegramBot] parseIntent threw', { telegramId, error: err.message });
      return sendBotPlain(chatId, telegramId, '❌ Failed to understand your message. Please try again.');
    }

    logger.info('[TelegramBot] Parsed intent', { telegramId, intent });

    const heuristicExtracted = extractTransferFields(text);
    let extracted = { ...heuristicExtracted };
    let slotExtractionAttempted = false;
    let slotExtractionUsed = false;
    let resolvedSavedRecipient = null;
    const shouldTryTransferSlotExtraction = shouldAttemptTransferSlotExtraction(text, heuristicExtracted);

    if (!intent.details?.recipientAddress && !heuristicExtracted.recipientAddress) {
      resolvedSavedRecipient = await resolveSavedRecipientFromText(user.id, text);
      if (resolvedSavedRecipient) {
        await touchSavedRecipientById(user.id, resolvedSavedRecipient.id);
        extracted.recipientAddress = resolvedSavedRecipient.address;
        intent = {
          ...intent,
          details: {
            ...intent.details,
            recipientAddress: resolvedSavedRecipient.address,
            recipientLabel: resolvedSavedRecipient.name,
          },
        };
      }
    }

    if (
      CONVERSATIONAL_V2_ENABLED
      && (intent.intent === 'unknown' || intent.confidence < 0.65)
      && shouldTryTransferSlotExtraction
    ) {
      slotExtractionAttempted = true;
      const modelExtracted = await extractTransferSlots(text, getConversationHistory(telegramId));
      if (modelExtracted && (modelExtracted.amount || modelExtracted.recipientAddress || modelExtracted.tokenSymbol)) {
        slotExtractionUsed = true;
        extracted = {
          tokenSymbol: modelExtracted.tokenSymbol || heuristicExtracted.tokenSymbol,
          amount: modelExtracted.amount || heuristicExtracted.amount,
          recipientAddress: modelExtracted.recipientAddress || extracted.recipientAddress || heuristicExtracted.recipientAddress,
          chain: modelExtracted.chain || heuristicExtracted.chain || null,
        };
      }
    }

    const action = decideConversationAction({
      text,
      intent: intent.intent,
      confidence: intent.confidence,
      details: intent.details,
      extracted,
    });

    logConversationDecision({
      telegramId,
      intent: intent.intent,
      confidence: intent.confidence,
      action,
      slotExtractionAttempted,
      slotExtractionUsed,
    });

    if (action.type === 'request_balance') {
      setScene(telegramId, 'balance', 'requested');
      return handleBalance(chatId, telegramId);
    }

    if (action.type === 'prepare_transfer') {
      if (resolvedSavedRecipient && !action.details.recipientLabel) {
        action.details.recipientLabel = resolvedSavedRecipient.name;
      }
      const preparedTransferResponse = await transferConversationHandlers.handlePreparedTransferAction({
        chatId,
        telegramId,
        action,
        intentConfidence: intent.confidence,
      });
      if (preparedTransferResponse) {
        return preparedTransferResponse;
      }
    }

    if (CONVERSATIONAL_V2_ENABLED) {
      const fallbackReply = await generateConversationalReply(text, getConversationHistory(telegramId));
      if (fallbackReply) {
        setScene(telegramId, 'conversation', 'fallback');
        return sendBotPlain(chatId, telegramId, fallbackReply);
      }
    }

    return sendBotPlain(chatId, telegramId,
      'I did not catch that.\n\nTry "balance", "send 0.01 ETH to Alice", or "/addresses".'
    );

  } catch (error) {
    logger.error('[TelegramBot] handleFreeText unexpected error', { telegramId, error: error.message });
    return sendBotPlain(chatId, telegramId, '❌ Something went wrong. Please try again.');
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
        case 'help':    return handleHelp(chatId, telegramId);
        case 'contacts':
        case 'addresses': return handleContacts(chatId, telegramId);
        case 'recent':
        case 'history':
        case 'transfers': return handleRecentTransfers(chatId, telegramId);
        case 'last': return handleLastTransfer(chatId, telegramId);
        case 'status': return handleTransferStatus(chatId, telegramId, text);
        case 'stealth': {
          const user = await getUserByTelegramId(telegramId);
          if (!user) return sendBotPlain(chatId, telegramId, UNLINKED_MESSAGE);
          return handleStealthStart(chatId, telegramId, user);
        }
        case 'unlink':  return handleUnlink(chatId, telegramId);
        default:        return sendBotPlain(chatId, telegramId, `Unknown command: /${cmd}\n\nUse /help, /balance, /addresses, /recent, /status, or /stealth.`);
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
