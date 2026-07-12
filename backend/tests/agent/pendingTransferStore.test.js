import {
  createPendingTransferStore,
  PENDING_TRANSFER_TTL_MS,
} from '../../src/services/agent/pendingTransferStore.js';

// Mimic the REAL conversationSessionService: only these four columns persist.
// A naive free-form fake previously hid a bug where the staged transfer was
// written to a non-column key and silently dropped on the DB round-trip.
const SESSION_COLUMNS = ['chatContext', 'transferDraft', 'pendingIntent', 'expiresAt'];

function makeSessionFakes(initial = {}) {
  let state = {};
  for (const col of SESSION_COLUMNS) {
    if (initial[col] !== undefined) state[col] = initial[col];
  }
  return {
    loadConversationSession: jest.fn(async () => ({ ...state })),
    saveConversationSession: jest.fn(async (_id, next) => {
      const persisted = {};
      for (const col of SESSION_COLUMNS) persisted[col] = next?.[col] ?? null;
      state = persisted;
    }),
    getState: () => state,
  };
}

function makeAgentPending(overrides = {}) {
  return {
    kind: 'agentTransfer',
    amount: 1,
    token: 'ETH',
    recipientAddress: '0x' + 'c'.repeat(40),
    recipientLabel: null,
    chain: null,
    expiresAt: 5_000,
    ...overrides,
  };
}

describe('pendingTransferStore', () => {
  const ctx = { user: { id: 'u1' }, telegramId: '7' };

  it('stages the transfer in the pendingIntent column and survives the real session round-trip', async () => {
    const fakes = makeSessionFakes();
    const store = createPendingTransferStore({
      loadConversationSession: fakes.loadConversationSession,
      saveConversationSession: fakes.saveConversationSession,
      resolveSavedRecipientFromText: jest.fn(async () => ({ id: 'r1', name: 'Alice', address: '0x' + 'a'.repeat(40) })),
      isAddress: (a) => /^0x[0-9a-fA-F]{40}$/.test(a),
      now: () => 1_000,
    });

    const result = await store.prepare({ amount: 0.5, token: 'eth', recipient: 'Alice' }, ctx);

    expect(result.status).toBe('awaiting_confirmation');
    expect(result.summary).toMatch(/0\.5/);
    expect(result.summary).toMatch(/Alice/);
    const saved = fakes.getState().pendingIntent;
    expect(saved.kind).toBe('agentTransfer');
    expect(saved.recipientAddress).toBe('0x' + 'a'.repeat(40));
    expect(saved.amount).toBe(0.5);
    expect(saved.token).toBe('ETH');
    expect(saved.expiresAt).toBe(1_000 + PENDING_TRANSFER_TTL_MS);

    // The regression this guards: it must be retrievable after the round-trip.
    const taken = await store.takePending(ctx);
    expect(taken).toMatchObject({ amount: 0.5, recipientAddress: '0x' + 'a'.repeat(40) });
  });

  it('preserves an existing chatContext while staging', async () => {
    const fakes = makeSessionFakes({ chatContext: { foo: 'bar' } });
    const store = createPendingTransferStore({
      loadConversationSession: fakes.loadConversationSession,
      saveConversationSession: fakes.saveConversationSession,
      resolveSavedRecipientFromText: jest.fn(),
      isAddress: () => true,
      now: () => 1_000,
    });
    await store.prepare({ amount: 1, recipient: '0x' + 'b'.repeat(40) }, ctx);
    expect(fakes.getState().chatContext).toEqual({ foo: 'bar' });
    expect(fakes.getState().pendingIntent.kind).toBe('agentTransfer');
  });

  it('rejects a non-positive amount', async () => {
    const fakes = makeSessionFakes();
    const store = createPendingTransferStore({
      loadConversationSession: fakes.loadConversationSession,
      saveConversationSession: fakes.saveConversationSession,
      resolveSavedRecipientFromText: jest.fn(),
      isAddress: () => true,
      now: () => 0,
    });
    const result = await store.prepare({ amount: 0, recipient: '0x' + 'b'.repeat(40) }, ctx);
    expect(result.status).toBe('error');
    expect(result.error).toMatch(/amount/i);
  });

  it('rejects an unresolvable recipient', async () => {
    const fakes = makeSessionFakes();
    const store = createPendingTransferStore({
      loadConversationSession: fakes.loadConversationSession,
      saveConversationSession: fakes.saveConversationSession,
      resolveSavedRecipientFromText: jest.fn(async () => null),
      isAddress: () => false,
      now: () => 0,
    });
    const result = await store.prepare({ amount: 1, recipient: 'Nobody' }, ctx);
    expect(result.status).toBe('error');
    expect(result.error).toMatch(/recipient/i);
  });

  it('takePending returns and clears a fresh pending transfer', async () => {
    const fakes = makeSessionFakes({ pendingIntent: makeAgentPending({ amount: 1, expiresAt: 5_000 }) });
    const store = createPendingTransferStore({
      loadConversationSession: fakes.loadConversationSession,
      saveConversationSession: fakes.saveConversationSession,
      resolveSavedRecipientFromText: jest.fn(),
      isAddress: () => true,
      now: () => 1_000,
    });
    const taken = await store.takePending(ctx);
    expect(taken).toMatchObject({ amount: 1, recipientAddress: '0x' + 'c'.repeat(40) });
    expect(fakes.getState().pendingIntent).toBeNull();
  });

  it('takePending returns null when the pending transfer expired', async () => {
    const fakes = makeSessionFakes({ pendingIntent: makeAgentPending({ expiresAt: 500 }) });
    const store = createPendingTransferStore({
      loadConversationSession: fakes.loadConversationSession,
      saveConversationSession: fakes.saveConversationSession,
      resolveSavedRecipientFromText: jest.fn(),
      isAddress: () => true,
      now: () => 9_999,
    });
    const taken = await store.takePending(ctx);
    expect(taken).toBeNull();
    expect(fakes.getState().pendingIntent).toBeNull();
  });

  it('peekPending returns the pending transfer without clearing it', async () => {
    const fakes = makeSessionFakes({ pendingIntent: makeAgentPending({ expiresAt: 9_999 }) });
    const store = createPendingTransferStore({
      loadConversationSession: fakes.loadConversationSession,
      saveConversationSession: fakes.saveConversationSession,
      resolveSavedRecipientFromText: jest.fn(),
      isAddress: () => true,
      now: () => 1_000,
    });
    const peeked = await store.peekPending(ctx);
    expect(peeked).toMatchObject({ amount: 1 });
    expect(fakes.getState().pendingIntent).not.toBeNull();
    expect(fakes.saveConversationSession).not.toHaveBeenCalled();
  });

  it('ignores a non-agent pendingIntent left by the legacy path', async () => {
    const fakes = makeSessionFakes({ pendingIntent: { intent: 'transfer', amount: 5 } });
    const store = createPendingTransferStore({
      loadConversationSession: fakes.loadConversationSession,
      saveConversationSession: fakes.saveConversationSession,
      resolveSavedRecipientFromText: jest.fn(),
      isAddress: () => true,
      now: () => 1_000,
    });
    expect(await store.peekPending(ctx)).toBeNull();
    expect(await store.takePending(ctx)).toBeNull();
  });
});
