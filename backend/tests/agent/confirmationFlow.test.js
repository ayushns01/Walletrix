import { isAffirmative, isNegative, createConfirmationFlow } from '../../src/services/agent/confirmationFlow.js';

describe('affirmation parsing', () => {
  it.each(['yes', 'Y', 'confirm', 'send it', 'go', 'ok', 'yep'])('treats "%s" as affirmative', (t) => {
    expect(isAffirmative(t)).toBe(true);
  });
  it.each(['no', 'cancel', 'stop', 'wait'])('treats "%s" as negative', (t) => {
    expect(isNegative(t)).toBe(true);
  });
  it('does not treat a transfer request as a bare affirmation', () => {
    expect(isAffirmative('send 0.5 eth to alice')).toBe(false);
  });
});

describe('createConfirmationFlow', () => {
  const ctx = { user: { id: 'u1' }, telegramId: '7' };
  const pending = { amount: 0.5, token: 'ETH', recipientAddress: '0x' + 'a'.repeat(40), chain: null };

  it('executes the pending transfer on YES and returns a success reply', async () => {
    const takePending = jest.fn(async () => pending);
    const executeTransfer = jest.fn(async () => ({ txHash: '0xhash', to: pending.recipientAddress, amount: '0.5', token: 'ETH' }));
    const flow = createConfirmationFlow({ takePending, executeTransfer });

    const reply = await flow.handle('yes', ctx);

    expect(takePending).toHaveBeenCalledWith(ctx);
    expect(executeTransfer).toHaveBeenCalledWith(
      { details: { tokenSymbol: 'ETH', amount: 0.5, recipientAddress: pending.recipientAddress, chain: null } },
      ctx.user
    );
    expect(reply.handled).toBe(true);
    expect(reply.text).toMatch(/0xhash/);
  });

  it('does nothing when the message is not affirmative/negative', async () => {
    const flow = createConfirmationFlow({ takePending: jest.fn(), executeTransfer: jest.fn() });
    const reply = await flow.handle('what is my balance', ctx);
    expect(reply.handled).toBe(false);
  });

  it('cancels on NO without executing', async () => {
    const clearPending = jest.fn();
    const flow = createConfirmationFlow({ takePending: jest.fn(), executeTransfer: jest.fn(), clearPending });
    const reply = await flow.handle('cancel', ctx);
    expect(reply.handled).toBe(true);
    expect(reply.text).toMatch(/cancel/i);
    expect(clearPending).toHaveBeenCalledWith(ctx);
  });

  it('reports gracefully when YES arrives but nothing is pending (expired)', async () => {
    const flow = createConfirmationFlow({ takePending: jest.fn(async () => null), executeTransfer: jest.fn() });
    const reply = await flow.handle('yes', ctx);
    expect(reply.handled).toBe(true);
    expect(reply.text).toMatch(/nothing|expired/i);
  });
});
