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
import { parseIntent, generateFallbackReply } from '../services/geminiService.js';
import { executeTransfer, getBotWalletBalance } from '../services/telegramExecutionService.js';
import {
  loadConversationSession,
  saveConversationSession,
  clearConversationSession,
} from '../services/conversationSessionService.js';
import { applyLinkCode } from './telegramController.js';
import { HELP_MESSAGE, UNLINKED_MESSAGE, LINKED_MESSAGE } from '../config/prompts.js';
import logger from '../services/loggerService.js';

// ─────────────────────────────────────────────────────────────
//  In-memory conversation state
//  { [telegramId]: { pendingIntent, expiresAt } }
// ─────────────────────────────────────────────────────────────
const pendingIntents = new Map();
const transferDrafts = new Map();
const chatContexts = new Map();

// Clear stale pending intents and rate-limit entries every 2 minutes
setInterval(() => {
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
const ETH_ADDRESS_RE = /0x[0-9a-fA-F]{40}/;
const AMOUNT_RE = /(\d+(?:\.\d+)?)/;
const TOKEN_RE = /\b(ETH|USDC|USDT|DAI|WETH|BTC|MATIC|BNB|AVAX)\b/i;
const ENS_RE = /\b([a-z0-9-]+\.eth)\b/i;
const GREETING_RE = /^(hi|hello|hey|yo|hola|hii+)\b/i;
const CAPABILITIES_RE = /\b(what can you do|how can you help|help me|what do you do|commands?)\b/i;
const THANKS_RE = /\b(thanks|thank you|thx)\b/i;
const HOW_ARE_YOU_RE = /\b(how are you|how's it going|how r u)\b/i;
const WHO_ARE_YOU_RE = /\b(who are you|what are you)\b/i;
const TRANSFER_ACTION_RE = /\b(send|transfer|pay|wire|move|make a transaction|send it|ship it)\b/i;
const CONVERSATION_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

const SCENE_ALLOWED_STEPS = {
  idle: new Set(['ready']),
  onboarding: new Set(['start']),
  balance: new Set(['requested', 'fetching']),
  help: new Set(['shown']),
  conversation: new Set(['understanding', 'smalltalk', 'fallback']),
  transfer: new Set([
    'collecting_amount',
    'collecting_recipientAddress',
    'collecting_tokenSymbol',
    'confirm',
    'executing',
    'failed',
  ]),
};

const SCENE_ALLOWED_TRANSITIONS = {
  idle: new Set(['idle', 'onboarding', 'balance', 'help', 'conversation', 'transfer']),
  onboarding: new Set(['onboarding', 'idle', 'conversation']),
  balance: new Set(['balance', 'idle', 'conversation', 'help']),
  help: new Set(['help', 'idle', 'conversation', 'transfer', 'balance']),
  conversation: new Set(['conversation', 'idle', 'transfer', 'balance', 'help', 'onboarding']),
  transfer: new Set(['transfer', 'idle', 'conversation', 'help', 'balance']),
};

function normalizeTransferStep(currentStep) {
  if (currentStep === 'collecting_recipient') return 'collecting_recipientAddress';
  return currentStep;
}

function getDefaultStepForScene(scene) {
  const defaults = {
    idle: 'ready',
    onboarding: 'start',
    balance: 'requested',
    help: 'shown',
    conversation: 'understanding',
    transfer: 'collecting_amount',
  };
  return defaults[scene] || 'ready';
}

function isKnownScene(scene) {
  return Boolean(scene && SCENE_ALLOWED_STEPS[scene]);
}

function isAllowedSceneStep(scene, currentStep) {
  if (!isKnownScene(scene)) return false;
  const normalizedStep = scene === 'transfer' ? normalizeTransferStep(currentStep) : currentStep;
  return SCENE_ALLOWED_STEPS[scene].has(normalizedStep);
}

function canTransitionScene(fromScene, toScene) {
  if (!isKnownScene(toScene)) return false;
  if (!isKnownScene(fromScene)) return true;
  return SCENE_ALLOWED_TRANSITIONS[fromScene]?.has(toScene) || false;
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
  const amountMatch = AMOUNT_RE.exec(text);
  const tokenMatch = TOKEN_RE.exec(text);
  const addressMatch = ETH_ADDRESS_RE.exec(text);
  const ensMatch = ENS_RE.exec(text);

  return {
    amount: amountMatch ? parseFloat(amountMatch[1]) : null,
    tokenSymbol: tokenMatch ? tokenMatch[1].toUpperCase() : null,
    recipientAddress: addressMatch ? addressMatch[0] : (ensMatch ? ensMatch[1] : null),
  };
}

function getContext(telegramId) {
  return chatContexts.get(String(telegramId)) || null;
}

function getConversationHistory(telegramId) {
  const context = getContext(telegramId);
  return Array.isArray(context?.history) ? context.history : [];
}

function sanitizeSceneState(telegramId, { persist = true } = {}) {
  const key = String(telegramId);
  const context = getContext(key);
  if (!context) return;

  const hasDraft = transferDrafts.has(key);
  const hasPending = pendingIntents.has(key);
  const next = { ...context };
  let changed = false;

  if (!isKnownScene(next.scene)) {
    next.scene = 'conversation';
    next.currentStep = 'understanding';
    next.recoveryReason = 'unknown_scene';
    changed = true;
  }

  if (next.scene === 'transfer' && !hasDraft && !hasPending) {
    next.scene = 'idle';
    next.currentStep = 'ready';
    next.recoveryReason = 'orphan_transfer_scene';
    changed = true;
  }

  if (!isAllowedSceneStep(next.scene, next.currentStep)) {
    next.currentStep = getDefaultStepForScene(next.scene);
    next.recoveryReason = next.recoveryReason || 'invalid_scene_step';
    changed = true;
  }

  if (next.scene === 'transfer') {
    const normalizedStep = normalizeTransferStep(next.currentStep);
    if (normalizedStep !== next.currentStep) {
      next.currentStep = normalizedStep;
      changed = true;
    }
  }

  if (changed) {
    next.lastInteractionAt = Date.now();
    next.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    chatContexts.set(key, next);
    if (persist) {
      persistConversationState(key);
    }
  }
}

function isConversationStale(telegramId) {
  const context = getContext(telegramId);
  if (!context?.lastInteractionAt) return false;
  return (Date.now() - context.lastInteractionAt) > CONVERSATION_IDLE_TIMEOUT_MS;
}

function setScene(telegramId, scene, currentStep = 'idle', extra = {}) {
  const key = String(telegramId);
  const context = getContext(key) || {};
  const fromScene = context.scene;

  let nextScene = scene;
  let nextStep = scene === 'transfer' ? normalizeTransferStep(currentStep) : currentStep;

  if (!canTransitionScene(fromScene, nextScene)) {
    logger.warn('[TelegramBot] Invalid scene transition, recovering', {
      telegramId: key,
      fromScene: fromScene || 'none',
      requestedScene: nextScene,
      requestedStep: nextStep,
    });
    nextScene = 'conversation';
    nextStep = 'understanding';
    extra = { ...extra, recoveryReason: 'invalid_transition', recoveredFromScene: fromScene || null };
  }

  if (!isAllowedSceneStep(nextScene, nextStep)) {
    logger.warn('[TelegramBot] Invalid scene step, using default', {
      telegramId: key,
      scene: nextScene,
      requestedStep: nextStep,
    });
    nextStep = getDefaultStepForScene(nextScene);
  }

  updateContext(telegramId, {
    scene: nextScene,
    currentStep: nextStep,
    lastInteractionAt: Date.now(),
    ...extra,
  });
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
  if (chatContexts.has(key) || transferDrafts.has(key) || pendingIntents.has(key)) return;

  const session = await loadConversationSession(key);
  if (!session) return;

  if (session.chatContext) {
    chatContexts.set(key, session.chatContext);
  }
  if (session.transferDraft) {
    transferDrafts.set(key, session.transferDraft);
  }
  if (session.pendingIntent) {
    pendingIntents.set(key, session.pendingIntent);
  }
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

async function sendBotPlain(chatId, telegramId, text) {
  appendAssistantMessageHistory(telegramId, text);
  return sendPlainMessage(chatId, text);
}

async function sendBotMessage(chatId, telegramId, text) {
  appendAssistantMessageHistory(telegramId, text);
  return sendMessage(chatId, text);
}

async function resetConversationFlow(telegramId, reason = null) {
  setTransferDraft(telegramId, null);
  setPendingIntent(telegramId, null);
  setScene(telegramId, 'idle', 'ready', reason ? { resetReason: reason } : {});
}

function setTransferDraft(telegramId, draft) {
  const key = String(telegramId);
  if (draft) {
    transferDrafts.set(key, draft);
  } else {
    transferDrafts.delete(key);
  }
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
    return 'Who should receive it? You can send an address (0x...) or say "use previous recipient".';
  }
  if (missing[0] === 'tokenSymbol') {
    return 'Which token should I send? (ETH, USDC, USDT, DAI, WETH)';
  }
  return 'Please share the missing transaction details.';
}

function getSmallTalkResponse(text) {
  const trimmed = text.trim();
  if (GREETING_RE.test(trimmed)) {
    return 'Hey! I can help with your wallet actions. Try things like:\n• "check my balance"\n• "send 0.0001 ETH to 0x..."\n• "send ETH to previous recipient"';
  }

  if (CAPABILITIES_RE.test(trimmed)) {
    return 'I can help you:\n• Check bot wallet balance\n• Send ETH or supported tokens\n• Reuse your previous recipient address\n\nYou can talk naturally. Example: "I want to send 0.0001 ETH to previous recipient"';
  }

  if (HOW_ARE_YOU_RE.test(trimmed)) {
    return 'I am doing great and ready to help with your wallet. Tell me what you want to do, for example: "send 0.0001 ETH to previous recipient".';
  }

  if (WHO_ARE_YOU_RE.test(trimmed)) {
    return 'I am your Walletrix wallet assistant on Telegram. I can check balance and help you send ETH/tokens step by step.';
  }

  if (THANKS_RE.test(trimmed)) {
    return 'You are welcome. If you want, tell me what to do next and I will guide you step by step.';
  }

  return null;
}

function enterScene(telegramId, scene, currentStep, extra = {}) {
  const context = getContext(telegramId) || {};
  setScene(telegramId, scene, currentStep, {
    previousScene: context.scene || null,
    sceneEnteredAt: Date.now(),
    ...extra,
  });
}

function exitScene(telegramId, toScene = 'idle', toStep = 'ready', extra = {}) {
  const context = getContext(telegramId) || {};
  setScene(telegramId, toScene, toStep, {
    lastScene: context.scene || null,
    sceneExitedAt: Date.now(),
    ...extra,
  });
}

function buildStepSeededTransferDraft(context, currentStep) {
  const step = String(currentStep || '').replace('collecting_', '');
  const details = {
    tokenSymbol: context?.lastTokenSymbol || 'ETH',
    amount: context?.lastAmount || null,
    recipientAddress: context?.lastRecipientAddress || null,
    chain: null,
  };

  if (step === 'amount') details.amount = null;
  if (step === 'recipientAddress') details.recipientAddress = null;
  if (step === 'tokenSymbol') details.tokenSymbol = null;

  return {
    intent: {
      intent: 'transfer',
      details,
      confidence: 0.7,
    },
    expiresAt: Date.now() + 2 * 60 * 1000,
  };
}

async function routeByActiveScene(chatId, telegramId, user, text) {
  const context = getContext(telegramId) || {};
  const scene = isKnownScene(context.scene) ? context.scene : 'idle';
  const step = scene === 'transfer'
    ? normalizeTransferStep(context.currentStep || getDefaultStepForScene('transfer'))
    : (context.currentStep || getDefaultStepForScene(scene));

  if (scene !== 'transfer') {
    return null;
  }

  const pending = pendingIntents.get(String(telegramId));
  const draft = transferDrafts.get(String(telegramId));

  if (step === 'confirm' && !pending) {
    if (draft) {
      const missing = getMissingTransferFields(draft.intent?.details || {});
      if (missing.length === 0) {
        setTransferDraft(telegramId, null);
        setPendingIntent(telegramId, {
          intent: draft.intent,
          expiresAt: Date.now() + 2 * 60 * 1000,
        });
        enterScene(telegramId, 'transfer', 'confirm', { recoveryReason: 'rehydrated_confirm_from_draft' });

        const { amount, tokenSymbol, recipientAddress } = draft.intent.details;
        return sendBotMessage(chatId, telegramId,
          `📤 *Confirm Transaction*\n\nI'll send *${amount} ${tokenSymbol.toUpperCase()}* to:\n\`${recipientAddress}\`\n\nReply *yes* to confirm or *no* to cancel.\n\n⚠️ This will be sent from your bot wallet.`
        );
      }
    }

    exitScene(telegramId, 'conversation', 'understanding', { recoveryReason: 'confirm_without_pending' });
    return sendBotPlain(chatId, telegramId, 'I had an incomplete confirmation state, so I reset to normal chat. Tell me the transfer again and I will continue.');
  }

  if (typeof step === 'string' && step.startsWith('collecting_') && !draft) {
    const seededDraft = buildStepSeededTransferDraft(context, step);
    const missing = getMissingTransferFields(seededDraft.intent.details);
    setTransferDraft(telegramId, seededDraft);
    enterScene(telegramId, 'transfer', `collecting_${missing[0]}`, { recoveryReason: 'rehydrated_collecting_step' });
    return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(missing));
  }

  if (scene === 'transfer' && !pending && !draft && /^(yes|y|confirm|no|n|cancel)$/i.test(text.trim())) {
    exitScene(telegramId, 'conversation', 'understanding', { recoveryReason: 'confirmation_without_transfer_state' });
    return sendBotPlain(chatId, telegramId, 'There is no pending transfer right now. Tell me what you want to send and I will prepare it.');
  }

  if (!user) {
    exitScene(telegramId, 'onboarding', 'start', { recoveryReason: 'scene_requires_link' });
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
//  Command handlers
// ─────────────────────────────────────────────────────────────

async function handleStart(chatId, telegramId, messageText) {
  try {
    setScene(telegramId, 'onboarding', 'start');
    const user = await getUserByTelegramId(telegramId);

    if (user) {
      const wallet = await prisma.telegramBotWallet.findUnique({ where: { userId: user.id } });
      setScene(telegramId, 'idle', 'ready');
      return sendBotMessage(chatId, telegramId,
        `✅ You're already linked!\n\nYour bot wallet: \`${wallet?.address || 'not set'}\`\n\nType /help to see what I can do.`
      );
    }

    const parts = messageText.trim().split(' ');
    if (parts.length >= 2) {
      const code = parts[1].toUpperCase();
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

// ─────────────────────────────────────────────────────────────
//  Free text handler (Gemini intent parsing + confirmation)
// ─────────────────────────────────────────────────────────────

async function handleFreeText(chatId, telegramId, text) {
  try {
    await hydrateContext(telegramId);
    sanitizeSceneState(telegramId);
    if (isConversationStale(telegramId)) {
      await resetConversationFlow(telegramId, 'idle_timeout');
      return sendBotPlain(chatId, telegramId, 'I reset our previous draft after inactivity. Tell me what you want to do and I will continue from there.');
    }

    setScene(telegramId, 'conversation', 'understanding', { lastUserMessage: text.slice(0, 300) });
    const user = await getUserByTelegramId(telegramId);

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

    const sceneRoutedResponse = await routeByActiveScene(chatId, telegramId, user, text);
    if (sceneRoutedResponse) {
      return sceneRoutedResponse;
    }

    // Check for pending confirmation ("yes" / "no")
    const pending = pendingIntents.get(String(telegramId));
    if (pending) {
      const answer = text.trim().toLowerCase();
      if (answer === 'yes' || answer === 'y' || answer === 'confirm') {
        setPendingIntent(telegramId, null);
        setScene(telegramId, 'transfer', 'executing');
        await sendBotPlain(chatId, telegramId, '⏳ Executing transaction...');

        try {
          const result = await executeTransfer(pending.intent, user);
          updateContext(telegramId, {
            lastRecipientAddress: result.to,
            lastAmount: parseFloat(result.amount),
            lastTokenSymbol: result.token,
          });
          setScene(telegramId, 'idle', 'ready', { lastIntent: 'transfer' });
          return sendBotMessage(chatId, telegramId,
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
          setScene(telegramId, 'transfer', 'failed');
          return sendBotPlain(chatId, telegramId, reason);
        }
      }

      if (answer === 'no' || answer === 'n' || answer === 'cancel') {
        setPendingIntent(telegramId, null);
        setScene(telegramId, 'idle', 'ready');
        return sendBotPlain(chatId, telegramId, '❌ Transaction cancelled.');
      }

      return sendBotPlain(chatId, telegramId,
        '⏳ You have a pending transaction confirmation.\n\nReply with:\n• yes (to send)\n• no (to cancel)'
      );
    }

    // Check for in-progress conversational transfer draft
    const draft = transferDrafts.get(String(telegramId));
    if (draft) {
      const lowered = text.trim().toLowerCase();
      if (lowered === 'cancel' || lowered === 'stop' || lowered === 'nevermind') {
        setTransferDraft(telegramId, null);
        setScene(telegramId, 'idle', 'ready');
        return sendBotPlain(chatId, telegramId, '✅ Transfer draft cancelled.');
      }

      const extracted = extractTransferFields(text);
      if (extracted.amount && extracted.amount > 0) draft.intent.details.amount = extracted.amount;
      if (extracted.tokenSymbol) draft.intent.details.tokenSymbol = extracted.tokenSymbol;
      if (extracted.recipientAddress) draft.intent.details.recipientAddress = extracted.recipientAddress;

      const context = getContext(telegramId);
      if (!draft.intent.details.amount && detectPreviousAmountReference(text) && context?.lastAmount) {
        draft.intent.details.amount = context.lastAmount;
      }
      if (!draft.intent.details.tokenSymbol && detectPreviousTokenReference(text) && context?.lastTokenSymbol) {
        draft.intent.details.tokenSymbol = context.lastTokenSymbol;
      }

      if (!draft.intent.details.recipientAddress && detectPreviousRecipientReference(text)) {
        const lastRecipient = await resolvePreviousRecipientAddress(user.id, telegramId);
        if (lastRecipient) {
          draft.intent.details.recipientAddress = lastRecipient;
        } else {
          setTransferDraft(telegramId, { ...draft, expiresAt: Date.now() + 2 * 60 * 1000 });
          setScene(telegramId, 'transfer', 'collecting_recipientAddress');
          return sendBotPlain(chatId, telegramId, 'I could not find a previous recipient address. Please send a 0x... address.');
        }
      }

      if (!draft.intent.details.tokenSymbol) {
        draft.intent.details.tokenSymbol = 'ETH';
      }

      const missing = getMissingTransferFields(draft.intent.details);
      if (missing.length > 0) {
        setTransferDraft(telegramId, { ...draft, expiresAt: Date.now() + 2 * 60 * 1000 });
        setScene(telegramId, 'transfer', `collecting_${missing[0]}`);
        return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(missing));
      }

      setTransferDraft(telegramId, null);
      setPendingIntent(telegramId, {
        intent: draft.intent,
        expiresAt: Date.now() + 2 * 60 * 1000,
      });
      setScene(telegramId, 'transfer', 'confirm');

      const { amount, tokenSymbol, recipientAddress } = draft.intent.details;
      return sendBotMessage(chatId, telegramId,
        `📤 *Confirm Transaction*\n\nI'll send *${amount} ${tokenSymbol.toUpperCase()}* to:\n\`${recipientAddress}\`\n\nReply *yes* to confirm or *no* to cancel.\n\n⚠️ This will be sent from your bot wallet.`
      );
    }

    // Scene guardrails: if we are in a transfer collection step but draft was
    // cleared unexpectedly, keep the user in flow instead of falling back.
    const context = getContext(telegramId) || {};
    if (context.scene === 'transfer' && typeof context.currentStep === 'string' && context.currentStep.startsWith('collecting_')) {
      const step = context.currentStep.replace('collecting_', '');
      const extracted = extractTransferFields(text);

      if (step === 'amount' && !(extracted.amount && extracted.amount > 0) && !detectPreviousAmountReference(text)) {
        setTransferDraft(telegramId, {
          intent: {
            intent: 'transfer',
            details: { tokenSymbol: context?.lastTokenSymbol || 'ETH', amount: null, recipientAddress: null, chain: null },
            confidence: 0.7,
          },
          expiresAt: Date.now() + 2 * 60 * 1000,
        });
        return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(['amount']));
      }

      if (step === 'recipientAddress' && !extracted.recipientAddress && !detectPreviousRecipientReference(text)) {
        setTransferDraft(telegramId, {
          intent: {
            intent: 'transfer',
            details: { tokenSymbol: context?.lastTokenSymbol || 'ETH', amount: context?.lastAmount || null, recipientAddress: null, chain: null },
            confidence: 0.7,
          },
          expiresAt: Date.now() + 2 * 60 * 1000,
        });
        return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(['recipientAddress']));
      }

      if (step === 'tokenSymbol' && !extracted.tokenSymbol && !detectPreviousTokenReference(text)) {
        setTransferDraft(telegramId, {
          intent: {
            intent: 'transfer',
            details: { tokenSymbol: null, amount: context?.lastAmount || null, recipientAddress: context?.lastRecipientAddress || null, chain: null },
            confidence: 0.7,
          },
          expiresAt: Date.now() + 2 * 60 * 1000,
        });
        return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(['tokenSymbol']));
      }
    }

    // Friendly small-talk responses so the bot feels conversational.
    const smallTalkReply = getSmallTalkResponse(text);
    if (smallTalkReply) {
      setScene(telegramId, 'conversation', 'smalltalk');
      return sendBotPlain(chatId, telegramId, smallTalkReply);
    }

    // Parse intent
    await sendBotPlain(chatId, telegramId, '🤔 Analysing...');

    let intent;
    try {
      intent = await parseIntent(text);
    } catch (err) {
      logger.error('[TelegramBot] parseIntent threw', { telegramId, error: err.message });
      return sendBotPlain(chatId, telegramId, '❌ Failed to understand your message. Please try again.');
    }

    logger.info('[TelegramBot] Parsed intent', { telegramId, intent });

    if (intent.intent === 'unknown' || intent.confidence < 0.65) {
      const extracted = extractTransferFields(text);
      if (TRANSFER_ACTION_RE.test(text) || extracted.amount || extracted.recipientAddress || extracted.tokenSymbol) {
        const details = {
          tokenSymbol: extracted.tokenSymbol || 'ETH',
          amount: extracted.amount && extracted.amount > 0 ? extracted.amount : null,
          recipientAddress: extracted.recipientAddress || null,
          chain: null,
        };
        const missing = getMissingTransferFields(details);
        setTransferDraft(telegramId, {
          intent: {
            intent: 'transfer',
            details,
            confidence: 0.7,
          },
          expiresAt: Date.now() + 2 * 60 * 1000,
        });
        setScene(telegramId, 'transfer', `collecting_${missing[0]}`);
        return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(missing));
      }

      const fallbackReply = await generateFallbackReply(text, getConversationHistory(telegramId));
      if (fallbackReply) {
        setScene(telegramId, 'conversation', 'fallback');
        return sendBotPlain(chatId, telegramId, fallbackReply);
      }

      return sendBotPlain(chatId, telegramId,
        "🤷 I didn't understand that as a crypto command.\n\nTry:\n• \"Send 0.01 ETH to 0x123...\"\n• \"Check my balance\"\n\nType /help for all commands."
      );
    }

    if (intent.intent === 'balance') {
      setScene(telegramId, 'balance', 'requested');
      return handleBalance(chatId, telegramId);
    }

    if (intent.intent === 'transfer') {
      const details = {
        tokenSymbol: intent.details.tokenSymbol || 'ETH',
        amount: intent.details.amount || null,
        recipientAddress: intent.details.recipientAddress || null,
        chain: intent.details.chain || null,
      };

      const missing = getMissingTransferFields(details);
      if (missing.length > 0) {
        setTransferDraft(telegramId, {
          intent: {
            intent: 'transfer',
            details,
            confidence: intent.confidence,
          },
          expiresAt: Date.now() + 2 * 60 * 1000,
        });
        setScene(telegramId, 'transfer', `collecting_${missing[0]}`);

        return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(missing));
      }

      // Store pending intent with 2-minute TTL
      setPendingIntent(telegramId, {
        intent: {
          intent: 'transfer',
          details,
          confidence: intent.confidence,
        },
        expiresAt: Date.now() + 2 * 60 * 1000,
      });
      setScene(telegramId, 'transfer', 'confirm');

      return sendBotMessage(chatId, telegramId,
        `📤 *Confirm Transaction*\n\nI'll send *${details.amount} ${details.tokenSymbol.toUpperCase()}* to:\n\`${details.recipientAddress}\`\n\nReply *yes* to confirm or *no* to cancel.\n\n⚠️ This will be sent from your bot wallet.`
      );
    }

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

    // Track user turns for command and non-command paths.
    appendUserMessageHistory(telegramId, text);

    // Route to handler
    if (isCommand(text)) {
      const cmd = extractCommand(text);
      switch (cmd) {
        case 'start':   return handleStart(chatId, telegramId, text);
        case 'balance': return handleBalance(chatId, telegramId);
        case 'help':    return handleHelp(chatId, telegramId);
        case 'unlink':  return handleUnlink(chatId, telegramId);
        default:        return sendBotPlain(chatId, telegramId, `❓ Unknown command: /${cmd}\n\nType /help for available commands.`);
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
