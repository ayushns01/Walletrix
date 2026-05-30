import {
  createPendingTransferStore,
  PENDING_TRANSFER_TTL_MS,
} from '../../src/services/agent/pendingTransferStore.js';

function makeSessionFakes(initial = {}) {
  let state = { ...initial };
  return {
    loadConversationSession: jest.fn(async () => state),
    saveConversationSession: jest.fn(async (_id, next) => { state = next; }),
    clearPendingOnly: () => state,
    getState: () => state,
  };
}

describe('pendingTransferStore', () => {
  const ctx = { user: { id: 'u1' }, telegramId: '7' };

  it('prepare resolves a saved recipient name to an address and stores it', async () => {
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
    const saved = fakes.getState().agentPendingTransfer;
    expect(saved.recipientAddress).toBe('0x' + 'a'.repeat(40));
    expect(saved.amount).toBe(0.5);
    expect(saved.token).toBe('ETH');
    expect(saved.expiresAt).toBe(1_000 + PENDING_TRANSFER_TTL_MS);
  });

  it('prepare rejects a non-positive amount', async () => {
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

  it('prepare rejects an unresolvable recipient', async () => {
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
    const pending = { amount: 1, token: 'ETH', recipientAddress: '0x' + 'c'.repeat(40), chain: null, expiresAt: 5_000 };
    const fakes = makeSessionFakes({ agentPendingTransfer: pending });
    const store = createPendingTransferStore({
      loadConversationSession: fakes.loadConversationSession,
      saveConversationSession: fakes.saveConversationSession,
      resolveSavedRecipientFromText: jest.fn(),
      isAddress: () => true,
      now: () => 1_000,
    });
    const taken = await store.takePending(ctx);
    expect(taken).toMatchObject({ amount: 1, recipientAddress: '0x' + 'c'.repeat(40) });
    expect(fakes.getState().agentPendingTransfer).toBeNull();
  });

  it('takePending returns null when the pending transfer expired', async () => {
    const pending = { amount: 1, token: 'ETH', recipientAddress: '0x' + 'c'.repeat(40), chain: null, expiresAt: 500 };
    const fakes = makeSessionFakes({ agentPendingTransfer: pending });
    const store = createPendingTransferStore({
      loadConversationSession: fakes.loadConversationSession,
      saveConversationSession: fakes.saveConversationSession,
      resolveSavedRecipientFromText: jest.fn(),
      isAddress: () => true,
      now: () => 9_999,
    });
    const taken = await store.takePending(ctx);
    expect(taken).toBeNull();
    expect(fakes.getState().agentPendingTransfer).toBeNull();
  });

  it('peekPending returns the pending transfer without clearing it', async () => {
    const pending = { amount: 1, token: 'ETH', recipientAddress: '0x' + 'd'.repeat(40), chain: null, expiresAt: 9_999 };
    const fakes = makeSessionFakes({ agentPendingTransfer: pending });
    const store = createPendingTransferStore({
      loadConversationSession: fakes.loadConversationSession,
      saveConversationSession: fakes.saveConversationSession,
      resolveSavedRecipientFromText: jest.fn(),
      isAddress: () => true,
      now: () => 1_000,
    });
    const peeked = await store.peekPending(ctx);
    expect(peeked).toMatchObject({ amount: 1, recipientAddress: '0x' + 'd'.repeat(40) });
    // Session must NOT have been cleared
    expect(fakes.getState().agentPendingTransfer).not.toBeNull();
    expect(fakes.saveConversationSession).not.toHaveBeenCalled();
  });
});
