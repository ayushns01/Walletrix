import prisma from '../lib/prisma.js';
import logger from './loggerService.js';

const fallbackContextStore = new Map();
const warnedPersistenceStatuses = new Set();
const conversationSessionPersistenceStatus = {
  status: 'unknown',
  backingStore: 'unknown',
  checkedAt: null,
  message: 'Conversation session persistence not checked yet.',
};

let healthCheckPromise = null;

function hasConversationSessionDelegate() {
  return !!(prisma.conversationSession && typeof prisma.conversationSession.findUnique === 'function');
}

function isTableMissingError(error) {
  const code = error?.code;
  return code === 'P2021' || code === 'P2022';
}

function parseExpiryTime(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function isExpiredState(state) {
  const expiresAt = parseExpiryTime(state?.expiresAt);
  return expiresAt !== null && expiresAt < Date.now();
}

function buildSessionExpiry(state) {
  const expiryCandidates = [
    parseExpiryTime(state?.chatContext?.expiresAt),
    parseExpiryTime(state?.transferDraft?.expiresAt),
    parseExpiryTime(state?.pendingIntent?.expiresAt),
  ].filter((value) => value !== null);

  if (expiryCandidates.length === 0) return null;
  return new Date(Math.max(...expiryCandidates));
}

function sanitizeConversationSessionState(session) {
  if (!session) return null;

  const sanitized = {
    chatContext: isExpiredState(session.chatContext) ? null : (session.chatContext || null),
    transferDraft: isExpiredState(session.transferDraft) ? null : (session.transferDraft || null),
    pendingIntent: isExpiredState(session.pendingIntent) ? null : (session.pendingIntent || null),
    expiresAt: null,
  };

  sanitized.expiresAt = buildSessionExpiry(sanitized);
  return sanitized;
}

function didSanitizeSessionStateChange(original, sanitized) {
  return (
    (original?.chatContext || null) !== (sanitized?.chatContext || null)
    || (original?.transferDraft || null) !== (sanitized?.transferDraft || null)
    || (original?.pendingIntent || null) !== (sanitized?.pendingIntent || null)
    || parseExpiryTime(original?.expiresAt) !== parseExpiryTime(sanitized?.expiresAt)
  );
}

function setPersistenceStatus(status, backingStore, message) {
  conversationSessionPersistenceStatus.status = status;
  conversationSessionPersistenceStatus.backingStore = backingStore;
  conversationSessionPersistenceStatus.message = message;
  conversationSessionPersistenceStatus.checkedAt = new Date().toISOString();
}

function markPersistenceHealthy(message = 'Conversation session persistence is backed by the database.') {
  setPersistenceStatus('ok', 'database', message);
}

function markPersistenceFallback(status, message, extra = {}) {
  setPersistenceStatus(status, 'memory', message);

  if (warnedPersistenceStatuses.has(status)) return;
  warnedPersistenceStatuses.add(status);

  logger.warn('[ConversationSession] Persistence fallback active', {
    status,
    statusMessage: message,
    ...extra,
  });
}

async function persistSanitizedConversationSession(telegramId, session) {
  if (!hasConversationSessionDelegate()) return;

  try {
    await prisma.conversationSession.upsert({
      where: { telegramId },
      update: {
        chatContext: session?.chatContext || null,
        transferDraft: session?.transferDraft || null,
        pendingIntent: session?.pendingIntent || null,
        expiresAt: session?.expiresAt || null,
      },
      create: {
        telegramId,
        chatContext: session?.chatContext || null,
        transferDraft: session?.transferDraft || null,
        pendingIntent: session?.pendingIntent || null,
        expiresAt: session?.expiresAt || null,
      },
    });
  } catch (error) {
    if (isTableMissingError(error)) {
      markPersistenceFallback(
        'fallback_table_missing',
        'ConversationSession table is missing. Telegram conversation persistence is running in memory fallback mode.',
        { telegramId }
      );
      return;
    }

    logger.error('[ConversationSession] persistSanitizedConversationSession failed', {
      telegramId,
      error: error.message,
    });
  }
}

export function getConversationSessionPersistenceStatus() {
  return { ...conversationSessionPersistenceStatus };
}

export async function ensureConversationSessionPersistenceHealth({ force = false } = {}) {
  if (!force && conversationSessionPersistenceStatus.status !== 'unknown') {
    return getConversationSessionPersistenceStatus();
  }

  if (healthCheckPromise) {
    return healthCheckPromise;
  }

  healthCheckPromise = (async () => {
    if (!hasConversationSessionDelegate()) {
      markPersistenceFallback(
        'fallback_delegate_missing',
        'ConversationSession Prisma delegate is not available. Telegram conversation persistence is not DB-backed.'
      );
      return getConversationSessionPersistenceStatus();
    }

    try {
      await prisma.conversationSession.findFirst({
        select: { id: true },
      });
      markPersistenceHealthy();
    } catch (error) {
      if (isTableMissingError(error)) {
        markPersistenceFallback(
          'fallback_table_missing',
          'ConversationSession table is missing. Apply the Prisma migration to enable restart-safe Telegram persistence.'
        );
      } else {
        markPersistenceFallback(
          'fallback_database_error',
          'ConversationSession persistence check failed. Telegram conversation state may fall back to memory.',
          { error: error.message }
        );
      }
    }

    return getConversationSessionPersistenceStatus();
  })();

  try {
    return await healthCheckPromise;
  } finally {
    healthCheckPromise = null;
  }
}

if (process.env.NODE_ENV !== 'test') {
  queueMicrotask(() => {
    ensureConversationSessionPersistenceHealth().catch((error) => {
      logger.warn('[ConversationSession] Persistence health check failed unexpectedly', {
        error: error.message,
      });
    });
  });
}

export async function loadChatContext(telegramId) {
  const key = String(telegramId);

  if (!hasConversationSessionDelegate()) {
    markPersistenceFallback(
      'fallback_delegate_missing',
      'ConversationSession Prisma delegate is not available. Telegram conversation persistence is not DB-backed.'
    );
    return fallbackContextStore.get(key) || null;
  }

  try {
    const session = await prisma.conversationSession.findUnique({
      where: { telegramId: key },
      select: { chatContext: true, expiresAt: true },
    });

    if (!session?.chatContext) {
      markPersistenceHealthy();
      return null;
    }

    if (isExpiredState(session.chatContext)) {
      markPersistenceHealthy();
      return null;
    }

    markPersistenceHealthy();
    return session.chatContext;
  } catch (error) {
    if (isTableMissingError(error)) {
      markPersistenceFallback(
        'fallback_table_missing',
        'ConversationSession table is missing. Telegram conversation persistence is running in memory fallback mode.',
        { telegramId: key }
      );
      return fallbackContextStore.get(key) || null;
    }

    markPersistenceFallback(
      'fallback_database_error',
      'ConversationSession loadChatContext failed. Telegram conversation persistence is using memory fallback.',
      { telegramId: key, error: error.message }
    );
    logger.error('[ConversationSession] loadChatContext failed', { telegramId: key, error: error.message });
    return fallbackContextStore.get(key) || null;
  }
}

export async function loadConversationSession(telegramId) {
  const key = String(telegramId);

  if (!hasConversationSessionDelegate()) {
    markPersistenceFallback(
      'fallback_delegate_missing',
      'ConversationSession Prisma delegate is not available. Telegram conversation persistence is not DB-backed.'
    );
    const chatContext = fallbackContextStore.get(key) || null;
    return chatContext ? { chatContext, transferDraft: null, pendingIntent: null, expiresAt: null } : null;
  }

  try {
    const session = await prisma.conversationSession.findUnique({
      where: { telegramId: key },
      select: {
        chatContext: true,
        transferDraft: true,
        pendingIntent: true,
        expiresAt: true,
      },
    });

    if (!session) {
      markPersistenceHealthy();
      return null;
    }

    const sanitizedSession = sanitizeConversationSessionState(session);
    if (!sanitizedSession?.chatContext && !sanitizedSession?.transferDraft && !sanitizedSession?.pendingIntent) {
      markPersistenceHealthy();
      if (didSanitizeSessionStateChange(session, sanitizedSession)) {
        await persistSanitizedConversationSession(key, sanitizedSession);
      }
      return null;
    }

    if (didSanitizeSessionStateChange(session, sanitizedSession)) {
      await persistSanitizedConversationSession(key, sanitizedSession);
    }

    markPersistenceHealthy();
    return sanitizedSession;
  } catch (error) {
    if (isTableMissingError(error)) {
      markPersistenceFallback(
        'fallback_table_missing',
        'ConversationSession table is missing. Telegram conversation persistence is running in memory fallback mode.',
        { telegramId: key }
      );
      const chatContext = fallbackContextStore.get(key) || null;
      return chatContext ? { chatContext, transferDraft: null, pendingIntent: null, expiresAt: null } : null;
    }

    markPersistenceFallback(
      'fallback_database_error',
      'ConversationSession loadConversationSession failed. Telegram conversation persistence is using memory fallback.',
      { telegramId: key, error: error.message }
    );
    logger.error('[ConversationSession] loadConversationSession failed', { telegramId: key, error: error.message });
    const chatContext = fallbackContextStore.get(key) || null;
    return chatContext ? { chatContext, transferDraft: null, pendingIntent: null, expiresAt: null } : null;
  }
}

export async function saveChatContext(telegramId, chatContext, expiresAt = null) {
  const key = String(telegramId);
  if (chatContext) {
    fallbackContextStore.set(key, chatContext);
  } else {
    fallbackContextStore.delete(key);
  }

  if (!hasConversationSessionDelegate()) {
    markPersistenceFallback(
      'fallback_delegate_missing',
      'ConversationSession Prisma delegate is not available. Telegram conversation persistence is not DB-backed.'
    );
    return;
  }

  try {
    await prisma.conversationSession.upsert({
      where: { telegramId: key },
      update: {
        chatContext,
        expiresAt,
      },
      create: {
        telegramId: key,
        chatContext,
        expiresAt,
      },
    });
    markPersistenceHealthy();
  } catch (error) {
    if (isTableMissingError(error)) {
      markPersistenceFallback(
        'fallback_table_missing',
        'ConversationSession table is missing. Telegram conversation persistence is running in memory fallback mode.',
        { telegramId: key }
      );
      return;
    }

    markPersistenceFallback(
      'fallback_database_error',
      'ConversationSession saveChatContext failed. Telegram conversation persistence is using memory fallback.',
      { telegramId: key, error: error.message }
    );
    logger.error('[ConversationSession] saveChatContext failed', { telegramId: key, error: error.message });
  }
}

export async function saveConversationSession(telegramId, state) {
  const key = String(telegramId);
  if (state?.chatContext) {
    fallbackContextStore.set(key, state.chatContext);
  } else {
    fallbackContextStore.delete(key);
  }

  if (!hasConversationSessionDelegate()) {
    markPersistenceFallback(
      'fallback_delegate_missing',
      'ConversationSession Prisma delegate is not available. Telegram conversation persistence is not DB-backed.'
    );
    return;
  }

  try {
    await prisma.conversationSession.upsert({
      where: { telegramId: key },
      update: {
        chatContext: state?.chatContext || null,
        transferDraft: state?.transferDraft || null,
        pendingIntent: state?.pendingIntent || null,
        expiresAt: state?.expiresAt || null,
      },
      create: {
        telegramId: key,
        chatContext: state?.chatContext || null,
        transferDraft: state?.transferDraft || null,
        pendingIntent: state?.pendingIntent || null,
        expiresAt: state?.expiresAt || null,
      },
    });
    markPersistenceHealthy();
  } catch (error) {
    if (isTableMissingError(error)) {
      markPersistenceFallback(
        'fallback_table_missing',
        'ConversationSession table is missing. Telegram conversation persistence is running in memory fallback mode.',
        { telegramId: key }
      );
      return;
    }

    markPersistenceFallback(
      'fallback_database_error',
      'ConversationSession saveConversationSession failed. Telegram conversation persistence is using memory fallback.',
      { telegramId: key, error: error.message }
    );
    logger.error('[ConversationSession] saveConversationSession failed', { telegramId: key, error: error.message });
  }
}

export async function clearChatContext(telegramId) {
  const key = String(telegramId);
  fallbackContextStore.delete(key);

  if (!hasConversationSessionDelegate()) {
    markPersistenceFallback(
      'fallback_delegate_missing',
      'ConversationSession Prisma delegate is not available. Telegram conversation persistence is not DB-backed.'
    );
    return;
  }

  try {
    await prisma.conversationSession.updateMany({
      where: { telegramId: key },
      data: {
        chatContext: null,
      },
    });
    markPersistenceHealthy();
  } catch (error) {
    if (isTableMissingError(error)) {
      markPersistenceFallback(
        'fallback_table_missing',
        'ConversationSession table is missing. Telegram conversation persistence is running in memory fallback mode.',
        { telegramId: key }
      );
      return;
    }

    markPersistenceFallback(
      'fallback_database_error',
      'ConversationSession clearChatContext failed. Telegram conversation persistence is using memory fallback.',
      { telegramId: key, error: error.message }
    );
    logger.error('[ConversationSession] clearChatContext failed', { telegramId: key, error: error.message });
  }
}

export async function clearConversationSession(telegramId) {
  const key = String(telegramId);
  fallbackContextStore.delete(key);

  if (!hasConversationSessionDelegate()) {
    markPersistenceFallback(
      'fallback_delegate_missing',
      'ConversationSession Prisma delegate is not available. Telegram conversation persistence is not DB-backed.'
    );
    return;
  }

  try {
    await prisma.conversationSession.deleteMany({
      where: { telegramId: key },
    });
    markPersistenceHealthy();
  } catch (error) {
    if (isTableMissingError(error)) {
      markPersistenceFallback(
        'fallback_table_missing',
        'ConversationSession table is missing. Telegram conversation persistence is running in memory fallback mode.',
        { telegramId: key }
      );
      return;
    }

    markPersistenceFallback(
      'fallback_database_error',
      'ConversationSession clearConversationSession failed. Telegram conversation persistence is using memory fallback.',
      { telegramId: key, error: error.message }
    );
    logger.error('[ConversationSession] clearConversationSession failed', { telegramId: key, error: error.message });
  }
}
