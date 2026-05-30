import { createToolHandlers } from '../../src/services/agent/toolHandlers.js';

function makeDeps(overrides = {}) {
  return {
    getBotWalletBalance: jest.fn(async () => ({ address: '0xBot', ethBalance: '1.25', chainId: 11155111 })),
    listSavedRecipients: jest.fn(async () => [
      { name: 'Alice', address: '0xAlice000000000000000000000000000000000000' },
    ]),
    lookupTelegramTransferStatus: jest.fn(async () => ({ found: true })),
    buildTransferStatusMessage: jest.fn(() => 'Status: confirmed'),
    preparePendingTransfer: jest.fn(),
    defaultChainId: 11155111,
    ...overrides,
  };
}

const ctx = { user: { id: 'user-1' }, telegramId: '42' };

describe('read-only tool handlers', () => {
  it('get_balance returns the bot wallet balance', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    const out = await handlers.get_balance({}, ctx);
    expect(deps.getBotWalletBalance).toHaveBeenCalledWith('user-1', 11155111);
    expect(out).toEqual({ address: '0xBot', ethBalance: '1.25', chainId: 11155111 });
  });

  it('list_recipients returns name+address pairs only', async () => {
    const handlers = createToolHandlers(makeDeps());
    const out = await handlers.list_recipients({}, ctx);
    expect(out).toEqual({ recipients: [{ name: 'Alice', address: '0xAlice000000000000000000000000000000000000' }] });
  });

  it('get_tx_status passes a provided hash through and returns a message', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    const out = await handlers.get_tx_status({ tx_hash: '0xdead' }, ctx);
    expect(deps.lookupTelegramTransferStatus).toHaveBeenCalledWith('user-1', { txHash: '0xdead' });
    expect(out).toEqual({ message: 'Status: confirmed' });
  });

  it('get_tx_status with no hash looks up the latest', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    await handlers.get_tx_status({}, ctx);
    expect(deps.lookupTelegramTransferStatus).toHaveBeenCalledWith('user-1', { txHash: null });
  });

  it('prepare_transfer delegates to preparePendingTransfer with correct args', async () => {
    const deps = makeDeps({
      preparePendingTransfer: jest.fn(async () => ({ status: 'awaiting_confirmation', summary: 'Send 1 ETH' })),
    });
    const handlers = createToolHandlers(deps);
    const out = await handlers.prepare_transfer({ amount: 1, recipient: 'Alice' }, ctx);
    expect(deps.preparePendingTransfer).toHaveBeenCalledWith({ amount: 1, recipient: 'Alice' }, ctx);
    expect(out).toEqual({ status: 'awaiting_confirmation', summary: 'Send 1 ETH' });
  });
});
