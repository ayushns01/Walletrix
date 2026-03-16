import {
  buildTransferExecutionFailureReason,
  createTransferConversationHandlers,
} from '../../src/services/telegramConversation/transferHandlers.js';

function createDeps() {
  return {
    executeTransfer: jest.fn(),
    logger: { error: jest.fn() },
    sendBotPlain: jest.fn().mockResolvedValue({ ok: true }),
    sendBotMessage: jest.fn().mockResolvedValue({ ok: true }),
    setPendingIntent: jest.fn(),
    setTransferDraft: jest.fn(),
    setScene: jest.fn(),
    updateContext: jest.fn(),
    getContext: jest.fn().mockReturnValue({}),
    resolvePreviousRecipientAddress: jest.fn(),
    detectPreviousAmountReference: jest.fn().mockReturnValue(false),
    detectPreviousTokenReference: jest.fn().mockReturnValue(false),
    detectPreviousRecipientReference: jest.fn().mockReturnValue(false),
    resolveSavedRecipientFromText: jest.fn().mockResolvedValue(null),
    extractSavedRecipientAliasCandidate: jest.fn().mockReturnValue(null),
    extractTransferFields: jest.fn().mockReturnValue({ amount: null, tokenSymbol: null, recipientAddress: null }),
    getMissingTransferFields: jest.fn((details) => {
      const missing = [];
      if (!details.amount) missing.push('amount');
      if (!details.recipientAddress) missing.push('recipientAddress');
      if (!details.tokenSymbol) missing.push('tokenSymbol');
      return missing;
    }),
    buildMissingFieldPrompt: jest.fn((missing) => `missing: ${missing[0]}`),
    getPrimaryQuickReplyMarkup: jest.fn(() => ({ keyboard: 'primary' })),
    getAmountCollectionQuickReplyMarkup: jest.fn(() => ({ keyboard: 'amount' })),
    getRecipientCollectionQuickReplyMarkup: jest.fn(() => ({ keyboard: 'recipient' })),
    getTokenCollectionQuickReplyMarkup: jest.fn(() => ({ keyboard: 'token' })),
    getConfirmQuickReplyMarkup: jest.fn(() => ({ keyboard: 'confirm' })),
    getRecipientQuickReplyNames: jest.fn().mockResolvedValue(['Alice', 'Bob']),
    touchSavedRecipientById: jest.fn().mockResolvedValue(null),
    recordTelegramTransferEvent: jest.fn().mockResolvedValue(true),
  };
}

describe('transferHandlers', () => {
  it('maps execution errors to user-safe messages', () => {
    expect(buildTransferExecutionFailureReason('insufficient funds for intrinsic transaction cost')).toContain('Insufficient funds');
    expect(buildTransferExecutionFailureReason('invalid address')).toContain('Invalid recipient address');
    expect(buildTransferExecutionFailureReason('network RPC unavailable')).toContain('Network error');
  });

  it('handles pending confirmation success path', async () => {
    const deps = createDeps();
    deps.executeTransfer.mockResolvedValue({
      to: '0x1111111111111111111111111111111111111111',
      amount: '0.2',
      token: 'ETH',
      txHash: '0xabc',
    });
    const handlers = createTransferConversationHandlers(deps);

    const response = await handlers.handlePendingConfirmation({
      chatId: 10,
      telegramId: '123',
      text: 'yes',
      pending: { intent: { details: {} } },
      user: { id: 'u1' },
    });

    expect(response).toEqual({ ok: true });
    expect(deps.setPendingIntent).toHaveBeenCalledWith('123', null);
    expect(deps.setScene).toHaveBeenCalledWith('123', 'transfer', 'executing');
    expect(deps.setScene).toHaveBeenCalledWith('123', 'idle', 'ready', { lastIntent: 'transfer' });
    expect(deps.sendBotPlain).toHaveBeenCalledWith(10, '123', '⏳ Executing transaction...');
    expect(deps.sendBotMessage).toHaveBeenCalledTimes(1);
    expect(deps.recordTelegramTransferEvent).toHaveBeenCalledWith('u1', expect.objectContaining({
      status: 'confirmed',
      txHash: '0xabc',
    }));
  });

  it('handles pending confirmation cancel path', async () => {
    const deps = createDeps();
    const handlers = createTransferConversationHandlers(deps);

    const response = await handlers.handlePendingConfirmation({
      chatId: 10,
      telegramId: '123',
      text: 'no',
      pending: { intent: { details: {} } },
      user: { id: 'u1' },
    });

    expect(response).toEqual({ ok: true });
    expect(deps.setPendingIntent).toHaveBeenCalledWith('123', null);
    expect(deps.setScene).toHaveBeenCalledWith('123', 'idle', 'ready');
    expect(deps.sendBotPlain).toHaveBeenCalledWith(10, '123', '❌ Transaction cancelled.');
  });

  it('handles pending confirmation failure path', async () => {
    const deps = createDeps();
    deps.executeTransfer.mockRejectedValue(new Error('invalid address'));
    const handlers = createTransferConversationHandlers(deps);

    const response = await handlers.handlePendingConfirmation({
      chatId: 10,
      telegramId: '123',
      text: 'confirm',
      pending: { intent: { details: {} } },
      user: { id: 'u1' },
    });

    expect(response).toEqual({ ok: true });
    expect(deps.setScene).toHaveBeenCalledWith('123', 'transfer', 'failed');
    expect(deps.sendBotPlain).toHaveBeenLastCalledWith(10, '123', '❌ Invalid recipient address. Please double-check and try again.');
    expect(deps.recordTelegramTransferEvent).toHaveBeenCalledWith('u1', expect.objectContaining({
      status: 'failed',
      errorMessage: 'invalid address',
    }));
  });

  it('keeps pending confirmation open on unrelated answer', async () => {
    const deps = createDeps();
    const handlers = createTransferConversationHandlers(deps);

    const response = await handlers.handlePendingConfirmation({
      chatId: 10,
      telegramId: '123',
      text: 'maybe',
      pending: { intent: { details: {} } },
      user: { id: 'u1' },
    });

    expect(response).toEqual({ ok: true });
    expect(deps.sendBotPlain).toHaveBeenCalledWith(
      10,
      '123',
      '⏳ You have a pending transaction confirmation.\n\nReply with:\n• yes (to send)\n• no (to cancel)'
    );
  });

  it('creates a pending confirmation when prepare_transfer has all details', async () => {
    const deps = createDeps();
    const handlers = createTransferConversationHandlers(deps);

    const response = await handlers.handlePreparedTransferAction({
      chatId: 10,
      telegramId: '123',
      intentConfidence: 0.9,
      action: {
        type: 'prepare_transfer',
        details: {
          tokenSymbol: 'USDC',
          amount: 2,
          recipientAddress: '0x1111111111111111111111111111111111111111',
          chain: null,
        },
        missing: [],
      },
    });

    expect(response).toEqual({ ok: true });
    expect(deps.setPendingIntent).toHaveBeenCalledTimes(1);
    expect(deps.setScene).toHaveBeenCalledWith('123', 'transfer', 'confirm');
    expect(deps.sendBotMessage).toHaveBeenCalledTimes(1);
    expect(deps.setTransferDraft).not.toHaveBeenCalled();
  });

  it('keeps collecting when prepare_transfer is missing fields', async () => {
    const deps = createDeps();
    const handlers = createTransferConversationHandlers(deps);

    const response = await handlers.handlePreparedTransferAction({
      chatId: 10,
      telegramId: '123',
      intentConfidence: 0.6,
      action: {
        type: 'prepare_transfer',
        details: {
          tokenSymbol: 'ETH',
          amount: null,
          recipientAddress: null,
          chain: null,
        },
        missing: ['amount', 'recipientAddress'],
      },
    });

    expect(response).toEqual({ ok: true });
    expect(deps.setTransferDraft).toHaveBeenCalledTimes(1);
    expect(deps.setScene).toHaveBeenCalledWith('123', 'transfer', 'collecting_amount');
    expect(deps.sendBotPlain).toHaveBeenCalledWith(10, '123', 'missing: amount');
    expect(deps.setPendingIntent).not.toHaveBeenCalled();
  });

  it('collects draft and confirms when previous recipient is resolved', async () => {
    const deps = createDeps();
    deps.detectPreviousRecipientReference.mockReturnValue(true);
    deps.resolvePreviousRecipientAddress.mockResolvedValue('0x1111111111111111111111111111111111111111');
    deps.extractTransferFields.mockReturnValue({
      amount: 0.5,
      tokenSymbol: 'USDC',
      recipientAddress: null,
    });
    deps.getContext.mockReturnValue({});
    const handlers = createTransferConversationHandlers(deps);

    const draft = {
      intent: {
        intent: 'transfer',
        details: { amount: null, tokenSymbol: null, recipientAddress: null, chain: null },
      },
      expiresAt: Date.now() + 1000,
    };

    const response = await handlers.handleTransferDraftCollection({
      chatId: 10,
      telegramId: '123',
      text: 'use previous recipient',
      draft,
      user: { id: 'u1' },
    });

    expect(response).toEqual({ ok: true });
    expect(deps.setPendingIntent).toHaveBeenCalledTimes(1);
    expect(deps.setScene).toHaveBeenCalledWith('123', 'transfer', 'confirm');
    expect(deps.sendBotMessage).toHaveBeenCalledTimes(1);
  });

  it('resolves a saved contact while collecting the recipient step', async () => {
    const deps = createDeps();
    deps.getContext.mockReturnValue({ currentStep: 'collecting_recipientAddress' });
    deps.resolveSavedRecipientFromText.mockResolvedValue({
      id: 'recipient-1',
      name: 'Alice',
      address: '0x1111111111111111111111111111111111111111',
    });
    const handlers = createTransferConversationHandlers(deps);
    const draft = {
      intent: {
        intent: 'transfer',
        details: { amount: 0.5, tokenSymbol: 'ETH', recipientAddress: null, chain: null },
      },
      expiresAt: Date.now() + 1000,
    };

    const response = await handlers.handleTransferDraftCollection({
      chatId: 10,
      telegramId: '123',
      text: 'Alice',
      draft,
      user: { id: 'u1' },
    });

    expect(response).toEqual({ ok: true });
    expect(deps.resolveSavedRecipientFromText).toHaveBeenCalledWith('u1', 'Alice', { allowBareName: true });
    expect(deps.touchSavedRecipientById).toHaveBeenCalledWith('u1', 'recipient-1');
    expect(deps.sendBotMessage).toHaveBeenCalledWith(
      10,
      '123',
      expect.stringContaining('*Alice*')
    );
  });

  it('tells the user when a saved contact name is not found during recipient collection', async () => {
    const deps = createDeps();
    deps.getContext.mockReturnValue({ currentStep: 'collecting_recipientAddress' });
    deps.extractSavedRecipientAliasCandidate.mockReturnValue('Alice');
    const handlers = createTransferConversationHandlers(deps);
    const draft = {
      intent: {
        intent: 'transfer',
        details: { amount: 0.5, tokenSymbol: 'ETH', recipientAddress: null, chain: null },
      },
      expiresAt: Date.now() + 1000,
    };

    const response = await handlers.handleTransferDraftCollection({
      chatId: 10,
      telegramId: '123',
      text: 'Alice',
      draft,
      user: { id: 'u1' },
    });

    expect(response).toEqual({ ok: true });
    expect(deps.sendBotPlain).toHaveBeenCalledWith(
      10,
      '123',
      'I could not find "Alice" in your address list. Send a wallet address, or save it first with "save 0x... as Alice".'
    );
  });

  it('asks again when previous recipient cannot be resolved', async () => {
    const deps = createDeps();
    deps.detectPreviousRecipientReference.mockReturnValue(true);
    deps.resolvePreviousRecipientAddress.mockResolvedValue(null);
    deps.extractTransferFields.mockReturnValue({
      amount: 0.5,
      tokenSymbol: 'USDC',
      recipientAddress: null,
    });
    const handlers = createTransferConversationHandlers(deps);
    const draft = {
      intent: {
        intent: 'transfer',
        details: { amount: 0.5, tokenSymbol: 'USDC', recipientAddress: null, chain: null },
      },
      expiresAt: Date.now() + 1000,
    };

    const response = await handlers.handleTransferDraftCollection({
      chatId: 10,
      telegramId: '123',
      text: 'same as previous',
      draft,
      user: { id: 'u1' },
    });

    expect(response).toEqual({ ok: true });
    expect(deps.setScene).toHaveBeenCalledWith('123', 'transfer', 'collecting_recipientAddress');
    expect(deps.sendBotPlain).toHaveBeenCalledWith(
      10,
      '123',
      'I could not find a previous recipient address. Please send a 0x... address.'
    );
  });

  it('applies collection guardrail prompts when amount step has invalid input', async () => {
    const deps = createDeps();
    deps.getContext.mockReturnValue({
      scene: 'transfer',
      currentStep: 'collecting_amount',
      lastTokenSymbol: 'ETH',
    });
    deps.extractTransferFields.mockReturnValue({
      amount: null,
      tokenSymbol: null,
      recipientAddress: null,
    });
    const handlers = createTransferConversationHandlers(deps);

    const response = await handlers.handleTransferCollectionGuardrails({
      chatId: 10,
      telegramId: '123',
      text: 'hmm',
    });

    expect(response).toEqual({ ok: true });
    expect(deps.setTransferDraft).toHaveBeenCalledTimes(1);
    expect(deps.sendBotPlain).toHaveBeenCalledWith(10, '123', 'missing: amount');
  });
});
