var mockConversationSessionDelegate = {
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  upsert: jest.fn(),
  updateMany: jest.fn(),
  deleteMany: jest.fn(),
};

jest.mock('../src/lib/prisma.js', () => ({
  __esModule: true,
  default: {
    get conversationSession() {
      return mockConversationSessionDelegate;
    },
    set conversationSession(value) {
      mockConversationSessionDelegate = value;
    },
  },
}));

jest.mock('../src/services/loggerService.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  ensureConversationSessionPersistenceHealth,
  getConversationSessionPersistenceStatus,
  loadConversationSession,
} from '../src/services/conversationSessionService.js';

describe('conversationSessionService', () => {
  beforeEach(() => {
    mockConversationSessionDelegate = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    };
    mockConversationSessionDelegate.findUnique.mockReset();
    mockConversationSessionDelegate.findFirst.mockReset();
    mockConversationSessionDelegate.upsert.mockReset();
    mockConversationSessionDelegate.updateMany.mockReset();
    mockConversationSessionDelegate.deleteMany.mockReset();
  });

  it('prunes expired draft and pending state while keeping active chat context', async () => {
    const now = Date.now();
    mockConversationSessionDelegate.findUnique.mockResolvedValue({
      chatContext: {
        scene: 'transfer',
        currentStep: 'collecting_amount',
        expiresAt: now + (60 * 60 * 1000),
      },
      transferDraft: {
        intent: { details: { amount: 0.1 } },
        expiresAt: now - 1000,
      },
      pendingIntent: {
        intent: { details: { amount: 0.1 } },
        expiresAt: now - 500,
      },
      expiresAt: new Date(now + (60 * 60 * 1000)),
    });
    mockConversationSessionDelegate.upsert.mockResolvedValue({});

    const session = await loadConversationSession('telegram-1');

    expect(session).toEqual({
      chatContext: {
        scene: 'transfer',
        currentStep: 'collecting_amount',
        expiresAt: now + (60 * 60 * 1000),
      },
      transferDraft: null,
      pendingIntent: null,
      expiresAt: new Date(now + (60 * 60 * 1000)),
    });
    expect(mockConversationSessionDelegate.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { telegramId: 'telegram-1' },
      update: expect.objectContaining({
        transferDraft: null,
        pendingIntent: null,
      }),
    }));
  });

  it('reports healthy persistence when the database table is available', async () => {
    mockConversationSessionDelegate.findFirst.mockResolvedValue(null);

    const status = await ensureConversationSessionPersistenceHealth({ force: true });

    expect(status.status).toBe('ok');
    expect(status.backingStore).toBe('database');
    expect(getConversationSessionPersistenceStatus().status).toBe('ok');
  });

  it('reports memory fallback when the ConversationSession table is missing', async () => {
    const tableMissingError = Object.assign(new Error('table missing'), { code: 'P2021' });
    mockConversationSessionDelegate.findFirst.mockRejectedValue(tableMissingError);

    const status = await ensureConversationSessionPersistenceHealth({ force: true });

    expect(status.status).toBe('fallback_table_missing');
    expect(status.backingStore).toBe('memory');
    expect(getConversationSessionPersistenceStatus().status).toBe('fallback_table_missing');
  });
});
