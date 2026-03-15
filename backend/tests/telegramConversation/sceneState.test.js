import { createSceneStateHandlers } from '../../src/services/telegramConversation/sceneState.js';

function createHarness(initialContext = null) {
  const contexts = new Map();
  const drafts = new Map();
  const pending = new Map();

  if (initialContext) {
    contexts.set('123', initialContext);
  }

  const deps = {
    logger: { warn: jest.fn() },
    getContext: jest.fn((telegramId) => contexts.get(String(telegramId)) || null),
    updateContext: jest.fn((telegramId, patch) => {
      const key = String(telegramId);
      const next = {
        ...(contexts.get(key) || {}),
        ...patch,
      };
      contexts.set(key, next);
    }),
    setContextRaw: jest.fn((telegramId, nextContext) => {
      contexts.set(String(telegramId), nextContext);
    }),
    hasTransferDraft: jest.fn((telegramId) => drafts.has(String(telegramId))),
    hasPendingIntent: jest.fn((telegramId) => pending.has(String(telegramId))),
    getTransferDraft: jest.fn((telegramId) => drafts.get(String(telegramId)) || null),
    getPendingIntent: jest.fn((telegramId) => pending.get(String(telegramId)) || null),
    setTransferDraft: jest.fn((telegramId, draft) => {
      const key = String(telegramId);
      if (draft) drafts.set(key, draft);
      else drafts.delete(key);
    }),
    setPendingIntent: jest.fn((telegramId, nextPending) => {
      const key = String(telegramId);
      if (nextPending) pending.set(key, nextPending);
      else pending.delete(key);
    }),
    sendBotPlain: jest.fn(async () => ({ ok: true })),
    sendBotMessage: jest.fn(async () => ({ ok: true })),
    getMissingTransferFields: jest.fn((details) => {
      const missing = [];
      if (!details.amount) missing.push('amount');
      if (!details.recipientAddress) missing.push('recipientAddress');
      if (!details.tokenSymbol) missing.push('tokenSymbol');
      return missing;
    }),
    buildMissingFieldPrompt: jest.fn((missing) => `missing: ${missing[0]}`),
  };

  return {
    contexts,
    drafts,
    pending,
    deps,
    handlers: createSceneStateHandlers(deps),
  };
}

describe('sceneState', () => {
  it('keeps recoverable collecting scenes intact during sanitization', () => {
    const { contexts, handlers } = createHarness({
      scene: 'transfer',
      currentStep: 'collecting_recipientAddress',
      draftDetails: {
        amount: 0.15,
        tokenSymbol: 'ETH',
        recipientAddress: null,
        chain: null,
      },
    });

    handlers.sanitizeSceneState('123');

    expect(contexts.get('123')).toMatchObject({
      scene: 'transfer',
      currentStep: 'collecting_recipientAddress',
    });
  });

  it('rehydrates a missing draft from persisted draft details without consuming the turn', async () => {
    const { drafts, deps, handlers } = createHarness({
      scene: 'transfer',
      currentStep: 'collecting_recipientAddress',
      draftDetails: {
        amount: 0.15,
        tokenSymbol: 'ETH',
        recipientAddress: null,
        chain: null,
      },
    });

    const response = await handlers.routeByActiveScene(
      10,
      '123',
      { id: 'u1' },
      '0x1111111111111111111111111111111111111111'
    );

    expect(response).toBeNull();
    expect(deps.sendBotPlain).not.toHaveBeenCalled();
    expect(drafts.get('123')).toMatchObject({
      intent: {
        intent: 'transfer',
        details: {
          amount: 0.15,
          tokenSymbol: 'ETH',
          recipientAddress: null,
          chain: null,
        },
      },
    });
  });
});
