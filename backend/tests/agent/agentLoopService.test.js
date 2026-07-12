jest.mock('../../src/services/loggerService.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/config/telegram.js', () => ({
  __esModule: true,
  default: { GEMINI_API_KEY: 'test-key' },
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(),
  SchemaType: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
  },
}));

import { runAgentTurn } from '../../src/services/agent/agentLoopService.js';

// A fake Gemini chat: scripted to call one tool, then return final text.
function makeScriptedChat(script) {
  let i = 0;
  return {
    sent: [],
    async sendMessage(payload) {
      this.sent.push(payload);
      const step = script[i++];
      return {
        response: {
          functionCalls: () => step.functionCalls || undefined,
          text: () => step.text || '',
        },
      };
    },
  };
}

const ctx = { user: { id: 'u1' }, telegramId: '7' };

describe('runAgentTurn', () => {
  it('dispatches a tool call, feeds the result back, and returns the final text', async () => {
    const chat = makeScriptedChat([
      { functionCalls: [{ name: 'get_balance', args: {} }] },
      { text: 'You have 1.25 ETH.' },
    ]);
    const handlers = { get_balance: jest.fn(async () => ({ ethBalance: '1.25' })) };

    const out = await runAgentTurn({
      text: 'what is my balance',
      ctx,
      startChat: () => chat,
      handlers,
    });

    expect(handlers.get_balance).toHaveBeenCalled();
    // Second sendMessage carries the functionResponse back to the model.
    expect(chat.sent[1][0].functionResponse.name).toBe('get_balance');
    expect(out.text).toBe('You have 1.25 ETH.');
  });

  it('surfaces a prepare_transfer summary immediately (awaiting confirmation)', async () => {
    const chat = makeScriptedChat([
      { functionCalls: [{ name: 'prepare_transfer', args: { amount: 0.5, recipient: 'Alice' } }] },
      { text: 'Reply YES to confirm.' },
    ]);
    const handlers = {
      prepare_transfer: jest.fn(async () => ({ status: 'awaiting_confirmation', summary: 'Send 0.5 ETH to Alice. Reply YES.' })),
    };
    const out = await runAgentTurn({ text: 'send 0.5 to alice', ctx, startChat: () => chat, handlers });
    expect(out.text).toMatch(/0\.5 ETH to Alice/);
  });

  it('returns the model text directly when no tool is called', async () => {
    const chat = makeScriptedChat([{ text: 'Hi! I can check balances and send crypto.' }]);
    const out = await runAgentTurn({ text: 'hello', ctx, startChat: () => chat, handlers: {} });
    expect(out.text).toMatch(/check balances/);
  });

  it('stops after the max tool-iteration cap to avoid loops', async () => {
    // Model keeps asking for the same tool forever.
    const chat = {
      async sendMessage() {
        return { response: { functionCalls: () => [{ name: 'get_balance', args: {} }], text: () => '' } };
      },
    };
    const handlers = { get_balance: jest.fn(async () => ({ ethBalance: '1' })) };
    const out = await runAgentTurn({ text: 'x', ctx, startChat: () => chat, handlers, maxIterations: 3 });
    expect(handlers.get_balance.mock.calls.length).toBe(3);
    expect(out.text).toMatch(/could not complete|try again/i);
  });

  it('returns an error response for an unknown tool name without throwing', async () => {
    const chat = makeScriptedChat([
      { functionCalls: [{ name: 'nonexistent_tool', args: {} }] },
      { text: 'I could not do that.' },
    ]);
    const out = await runAgentTurn({
      text: 'do something weird',
      ctx,
      startChat: () => chat,
      handlers: {},
    });
    // The error is fed back to the model as a functionResponse, not thrown.
    expect(chat.sent[1][0].functionResponse.name).toBe('nonexistent_tool');
    expect(chat.sent[1][0].functionResponse.response.error).toMatch(/Unknown tool/i);
    expect(out.text).toBe('I could not do that.');
  });

  it('catches a handler that throws and feeds the error back to the model', async () => {
    const chat = makeScriptedChat([
      { functionCalls: [{ name: 'get_balance', args: {} }] },
      { text: 'Something went wrong.' },
    ]);
    const handlers = {
      get_balance: jest.fn(async () => { throw new Error('RPC timeout'); }),
    };
    const out = await runAgentTurn({
      text: 'balance?',
      ctx,
      startChat: () => chat,
      handlers,
    });
    expect(chat.sent[1][0].functionResponse.response.error).toBe('RPC timeout');
    expect(out.text).toBe('Something went wrong.');
  });
});
