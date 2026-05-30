// Mock all external service imports so the composition-root module loads without
// pulling in prisma, loggerService (import.meta), etc.
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
  default: { GEMINI_API_KEY: '' },
  telegramConfig: { GEMINI_API_KEY: '' },
}));

jest.mock('../../src/services/conversationSessionService.js', () => ({
  loadConversationSession: jest.fn(async () => ({})),
  saveConversationSession: jest.fn(async () => {}),
  clearConversationSession: jest.fn(async () => {}),
}));

jest.mock('../../src/services/savedRecipientService.js', () => ({
  listSavedRecipients: jest.fn(async () => []),
  resolveSavedRecipientFromText: jest.fn(async () => null),
}));

jest.mock('../../src/services/telegramTxStatusService.js', () => ({
  lookupTelegramTransferStatus: jest.fn(async () => ({ found: false })),
  buildTransferStatusMessage: jest.fn(() => ''),
}));

jest.mock('../../src/services/telegramExecutionService.js', () => ({
  executeTransfer: jest.fn(async () => ({})),
  getBotWalletBalance: jest.fn(async () => ({})),
}));

jest.mock('../../src/config/tokens.js', () => ({
  DEFAULT_CHAIN_ID: 11155111,
}));

jest.mock('ethers', () => ({
  ethers: { isAddress: jest.fn(() => false) },
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

import { createAgentMessageHandler } from '../../src/services/agent/index.js';

const ctx = { user: { id: 'u1' }, telegramId: '7' };

describe('createAgentMessageHandler', () => {
  it('routes a YES through the confirmation flow before the model', async () => {
    const confirmationFlow = { handle: jest.fn(async () => ({ handled: true, text: '✅ Sent' })) };
    const runAgentTurn = jest.fn();
    const handle = createAgentMessageHandler({ confirmationFlow, runAgentTurn, handlers: {} });

    const out = await handle('yes', ctx);

    expect(confirmationFlow.handle).toHaveBeenCalledWith('yes', ctx);
    expect(runAgentTurn).not.toHaveBeenCalled();
    expect(out.text).toBe('✅ Sent');
  });

  it('falls through to the agent loop for a normal message', async () => {
    const confirmationFlow = { handle: jest.fn(async () => ({ handled: false })) };
    const runAgentTurn = jest.fn(async () => ({ text: 'Your balance is 1 ETH.' }));
    const handle = createAgentMessageHandler({ confirmationFlow, runAgentTurn, handlers: { get_balance: jest.fn() } });

    const out = await handle('balance?', ctx);

    expect(runAgentTurn).toHaveBeenCalled();
    expect(out.text).toBe('Your balance is 1 ETH.');
  });
});
