import prisma from '../lib/prisma.js';
import logger from './loggerService.js';

const fallbackContextStore = new Map();

function hasConversationSessionDelegate() {
  return !!(prisma.conversationSession && typeof prisma.conversationSession.findUnique === 'function');
}

function isTableMissingError(error) {
  const code = error?.code;
  return code === 'P2021' || code === 'P2022';
}

export async function loadChatContext(telegramId) {
  const key = String(telegramId);

  if (!hasConversationSessionDelegate()) {
    return fallbackContextStore.get(key) || null;
  }

  try {
    const session = await prisma.conversationSession.findUnique({
      where: { telegramId: key },
      select: { chatContext: true, expiresAt: true },
    });

    if (!session?.chatContext) {
      return null;
    }

    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      return null;
    }

    return session.chatContext;
  } catch (error) {
    if (isTableMissingError(error)) {
      logger.warn('[ConversationSession] table not available yet, using in-memory fallback');
      return fallbackContextStore.get(key) || null;
    }

    logger.error('[ConversationSession] loadChatContext failed', { telegramId: key, error: error.message });
    return fallbackContextStore.get(key) || null;
  }
}

export async function loadConversationSession(telegramId) {
  const key = String(telegramId);

  if (!hasConversationSessionDelegate()) {
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

    if (!session) return null;

    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      return null;
    }

    return session;
  } catch (error) {
    if (isTableMissingError(error)) {
      const chatContext = fallbackContextStore.get(key) || null;
      return chatContext ? { chatContext, transferDraft: null, pendingIntent: null, expiresAt: null } : null;
    }

    logger.error('[ConversationSession] loadConversationSession failed', { telegramId: key, error: error.message });
    const chatContext = fallbackContextStore.get(key) || null;
    return chatContext ? { chatContext, transferDraft: null, pendingIntent: null, expiresAt: null } : null;
  }
}

export async function saveChatContext(telegramId, chatContext, expiresAt = null) {
  const key = String(telegramId);
  fallbackContextStore.set(key, chatContext);

  if (!hasConversationSessionDelegate()) {
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
  } catch (error) {
    if (!isTableMissingError(error)) {
      logger.error('[ConversationSession] saveChatContext failed', { telegramId: key, error: error.message });
    }
  }
}

export async function saveConversationSession(telegramId, state) {
  const key = String(telegramId);
  if (state?.chatContext) {
    fallbackContextStore.set(key, state.chatContext);
  }

  if (!hasConversationSessionDelegate()) {
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
  } catch (error) {
    if (!isTableMissingError(error)) {
      logger.error('[ConversationSession] saveConversationSession failed', { telegramId: key, error: error.message });
    }
  }
}

export async function clearChatContext(telegramId) {
  const key = String(telegramId);
  fallbackContextStore.delete(key);

  if (!hasConversationSessionDelegate()) {
    return;
  }

  try {
    await prisma.conversationSession.updateMany({
      where: { telegramId: key },
      data: {
        chatContext: null,
      },
    });
  } catch (error) {
    if (!isTableMissingError(error)) {
      logger.error('[ConversationSession] clearChatContext failed', { telegramId: key, error: error.message });
    }
  }
}

export async function clearConversationSession(telegramId) {
  const key = String(telegramId);
  fallbackContextStore.delete(key);

  if (!hasConversationSessionDelegate()) {
    return;
  }

  try {
    await prisma.conversationSession.deleteMany({
      where: { telegramId: key },
    });
  } catch (error) {
    if (!isTableMissingError(error)) {
      logger.error('[ConversationSession] clearConversationSession failed', { telegramId: key, error: error.message });
    }
  }
}
