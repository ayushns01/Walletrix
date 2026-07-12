import { buildWalletMcpServer, listRegisteredToolNames } from '../../src/mcp/walletMcpServer.js';

describe('walletMcpServer', () => {
  it('registers exactly the read/prepare tools (no execute tool)', () => {
    const handlers = {
      get_balance: jest.fn(),
      list_recipients: jest.fn(),
      prepare_transfer: jest.fn(),
      get_tx_status: jest.fn(),
    };
    const server = buildWalletMcpServer({ handlers, resolveContext: jest.fn() });
    const names = listRegisteredToolNames(server).sort();
    expect(names).toEqual(['get_balance', 'get_tx_status', 'list_recipients', 'prepare_transfer']);
  });

  it('never registers an execute/spend tool', () => {
    const handlers = {
      get_balance: jest.fn(),
      list_recipients: jest.fn(),
      prepare_transfer: jest.fn(),
      get_tx_status: jest.fn(),
    };
    const server = buildWalletMcpServer({ handlers, resolveContext: jest.fn() });
    const names = listRegisteredToolNames(server);
    expect(names.some((n) => /execute|send_now|sign|broadcast/i.test(n))).toBe(false);
  });

  it('invokes the underlying handler with resolved context and wraps result', async () => {
    const handlers = { get_balance: jest.fn(async () => ({ ethBalance: '2.0' })) };
    const resolveContext = jest.fn(async () => ({ user: { id: 'u9' }, telegramId: '9' }));
    const server = buildWalletMcpServer({ handlers, resolveContext });

    const result = await server.__invokeForTest('get_balance', { telegram_id: '9' });

    expect(resolveContext).toHaveBeenCalledWith({ telegram_id: '9' });
    expect(handlers.get_balance).toHaveBeenCalledWith({}, { user: { id: 'u9' }, telegramId: '9' });
    expect(result.structuredContent).toEqual({ ethBalance: '2.0' });
    expect(result.content[0].type).toBe('text');
  });

  it('strips telegram_id from toolArgs before calling handler', async () => {
    const handlers = { prepare_transfer: jest.fn(async () => ({ status: 'awaiting_confirmation' })) };
    const resolveContext = jest.fn(async () => ({ user: { id: 'u1' }, telegramId: '1' }));
    const server = buildWalletMcpServer({ handlers, resolveContext });

    await server.__invokeForTest('prepare_transfer', { telegram_id: '1', amount: 0.5, recipient: 'Alice' });

    expect(handlers.prepare_transfer).toHaveBeenCalledWith(
      { amount: 0.5, recipient: 'Alice' },
      { user: { id: 'u1' }, telegramId: '1' }
    );
  });
});
