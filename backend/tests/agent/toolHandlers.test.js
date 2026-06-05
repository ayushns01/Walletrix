import { createToolHandlers } from '../../src/services/agent/toolHandlers.js';

const ALICE_ADDR = '0xAlice000000000000000000000000000000000000';
const BOB_ADDR   = '0xBob0000000000000000000000000000000000000';

function makeDeps(overrides = {}) {
  return {
    getBotWalletBalance: jest.fn(async () => ({ address: '0xBot', ethBalance: '1.25', chainId: 11155111 })),
    listSavedRecipients: jest.fn(async () => [
      { name: 'Alice', address: ALICE_ADDR },
    ]),
    lookupTelegramTransferStatus: jest.fn(async () => ({ found: true })),
    buildTransferStatusMessage: jest.fn(() => 'Status: confirmed'),
    preparePendingTransfer: jest.fn(),
    defaultChainId: 11155111,
    // history deps
    getRecentTelegramTransfers: jest.fn(async () => [
      { amount: '0.1', tokenSymbol: 'ETH', toAddress: ALICE_ADDR, createdAt: new Date('2025-01-01'), status: 'confirmed' },
    ]),
    getLastTelegramTransfer: jest.fn(async () => ({
      amount: '0.1', tokenSymbol: 'ETH', toAddress: ALICE_ADDR, createdAt: new Date('2025-01-01'), status: 'confirmed', txHash: '0xabc',
    })),
    buildRecentTransfersMessage: jest.fn(() => '🧾 Recent'),
    buildLastTransferMessage: jest.fn(() => '🧾 Last'),
    // address-book mutation deps
    saveSavedRecipient: jest.fn(async () => ({
      recipient: { name: 'Bob', address: BOB_ADDR },
      created: true,
    })),
    removeSavedRecipientByName: jest.fn(async () => ({ name: 'Alice', address: ALICE_ADDR })),
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

  // ── history tools ────────────────────────────────────────────────────────────

  it('get_recent_transfers returns formatted message + raw transfers array', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    const out = await handlers.get_recent_transfers({}, ctx);
    expect(deps.getRecentTelegramTransfers).toHaveBeenCalledWith('user-1', { limit: 5 });
    expect(out.message).toBe('🧾 Recent');
    expect(Array.isArray(out.transfers)).toBe(true);
  });

  it('get_recent_transfers respects a custom limit (capped at 10)', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    await handlers.get_recent_transfers({ limit: 50 }, ctx);
    expect(deps.getRecentTelegramTransfers).toHaveBeenCalledWith('user-1', { limit: 10 });
  });

  it('get_last_transfer returns formatted message + raw transfer entry', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    const out = await handlers.get_last_transfer({}, ctx);
    expect(deps.getLastTelegramTransfer).toHaveBeenCalledWith('user-1');
    expect(out.message).toBe('🧾 Last');
    expect(out.transfer).toBeDefined();
  });

  // ── address-book mutation tools ──────────────────────────────────────────────

  it('save_recipient creates a new entry and returns a confirmation message', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    const out = await handlers.save_recipient({ name: 'Bob', address: BOB_ADDR }, ctx);
    expect(deps.saveSavedRecipient).toHaveBeenCalledWith('user-1', { name: 'Bob', address: BOB_ADDR });
    expect(out.created).toBe(true);
    expect(out.message).toMatch(/Saved/);
    expect(out.recipient.name).toBe('Bob');
  });

  it('save_recipient shows "Updated" message when entry already existed', async () => {
    const deps = makeDeps({
      saveSavedRecipient: jest.fn(async () => ({
        recipient: { name: 'Bob', address: BOB_ADDR },
        created: false,
      })),
    });
    const handlers = createToolHandlers(deps);
    const out = await handlers.save_recipient({ name: 'Bob', address: BOB_ADDR }, ctx);
    expect(out.created).toBe(false);
    expect(out.message).toMatch(/Updated/);
  });

  it('delete_recipient removes an entry and confirms deletion', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    const out = await handlers.delete_recipient({ name: 'Alice' }, ctx);
    expect(deps.removeSavedRecipientByName).toHaveBeenCalledWith('user-1', 'Alice');
    expect(out.deleted).toBe(true);
    expect(out.message).toMatch(/Deleted/);
  });

  it('delete_recipient returns not-found message when name does not exist', async () => {
    const deps = makeDeps({
      removeSavedRecipientByName: jest.fn(async () => null),
    });
    const handlers = createToolHandlers(deps);
    const out = await handlers.delete_recipient({ name: 'Ghost' }, ctx);
    expect(out.deleted).toBe(false);
    expect(out.message).toMatch(/No saved recipient/);
  });
});
