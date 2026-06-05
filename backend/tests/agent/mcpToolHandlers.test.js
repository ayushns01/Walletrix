import { createMcpToolHandlers } from '../../src/services/agent/mcpToolHandlers.js';

const ctx = { user: { id: 'u1' }, telegramId: '7' };

describe('createMcpToolHandlers', () => {
  it('calls the MCP client tool with telegram_id injected and unwraps structuredContent', async () => {
    const client = {
      callTool: jest.fn(async () => ({ structuredContent: { ethBalance: '3.0' } })),
    };
    const handlers = createMcpToolHandlers({ client });

    const out = await handlers.get_balance({}, ctx);

    expect(client.callTool).toHaveBeenCalledWith({
      name: 'get_balance',
      arguments: { telegram_id: '7' },
    });
    expect(out).toEqual({ ethBalance: '3.0' });
  });

  it('forwards prepare_transfer args alongside telegram_id', async () => {
    const client = {
      callTool: jest.fn(async () => ({ structuredContent: { status: 'awaiting_confirmation' } })),
    };
    const handlers = createMcpToolHandlers({ client });

    await handlers.prepare_transfer({ amount: 0.5, recipient: 'Alice' }, ctx);

    expect(client.callTool).toHaveBeenCalledWith({
      name: 'prepare_transfer',
      arguments: { telegram_id: '7', amount: 0.5, recipient: 'Alice' },
    });
  });

  it('falls back to raw result when structuredContent is absent', async () => {
    const client = {
      callTool: jest.fn(async () => ({ content: [{ type: 'text', text: '{"ethBalance":"1.0"}' }] })),
    };
    const handlers = createMcpToolHandlers({ client });
    const out = await handlers.get_balance({}, ctx);
    expect(out).toEqual({ content: [{ type: 'text', text: '{"ethBalance":"1.0"}' }] });
  });

  it('creates a handler for every tool in AGENT_TOOL_NAMES', () => {
    const client = { callTool: jest.fn() };
    const handlers = createMcpToolHandlers({ client });
    const names = Object.keys(handlers).sort();
    expect(names).toEqual(
      [
        'delete_recipient',
        'get_balance',
        'get_last_transfer',
        'get_recent_transfers',
        'get_tx_status',
        'list_recipients',
        'prepare_transfer',
        'save_recipient',
      ].sort()
    );
  });
});
