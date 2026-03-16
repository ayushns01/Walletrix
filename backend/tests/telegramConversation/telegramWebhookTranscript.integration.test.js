const mockState = {
  usersByTelegramId: new Map(),
  sessionsByTelegramId: new Map(),
  lastRecipientByUserId: new Map(),
  savedRecipientsByUserId: new Map(),
  activityLogsByUserId: new Map(),
};

function mockGetSavedRecipients(userId) {
  const key = String(userId);
  if (!mockState.savedRecipientsByUserId.has(key)) {
    mockState.savedRecipientsByUserId.set(key, []);
  }
  return mockState.savedRecipientsByUserId.get(key);
}

function mockGetActivityLogs(userId) {
  const key = String(userId);
  if (!mockState.activityLogsByUserId.has(key)) {
    mockState.activityLogsByUserId.set(key, []);
  }
  return mockState.activityLogsByUserId.get(key);
}

function mockEnsureLinkedUser(telegramId) {
  const key = String(telegramId);
  const existing = mockState.usersByTelegramId.get(key);
  if (existing) return existing;

  const user = {
    id: `user-${key}`,
    telegramId: key,
    telegramLinkedAt: new Date(),
  };
  mockState.usersByTelegramId.set(key, user);
  return user;
}

jest.mock('../../src/lib/prisma.js', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(async ({ where }) => {
        const telegramId = String(where.telegramId);
        return mockState.usersByTelegramId.get(telegramId) || null;
      }),
      update: jest.fn(async ({ where, data }) => {
        for (const [telegramId, user] of mockState.usersByTelegramId.entries()) {
          if (user.id === where.id) {
            const updated = { ...user, ...data };
            if (!updated.telegramId) {
              mockState.usersByTelegramId.delete(telegramId);
            } else {
              mockState.usersByTelegramId.set(String(updated.telegramId), updated);
            }
            return updated;
          }
        }
        return null;
      }),
    },
    telegramBotWallet: {
      findUnique: jest.fn(async ({ where }) => ({
        address: `0xbot${String(where.userId).padStart(36, '0').slice(-40)}`,
      })),
    },
    transaction: {
      findFirst: jest.fn(async ({ where }) => {
        const userId = where.wallet.userId;
        const toAddress = mockState.lastRecipientByUserId.get(userId) || null;
        if (!toAddress) return null;
        return { toAddress, timestamp: new Date() };
      }),
    },
    activityLog: {
      create: jest.fn(async ({ data }) => {
        const logs = mockGetActivityLogs(data.userId);
        const created = {
          id: `activity-${logs.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        logs.unshift(created);
        return created;
      }),
      findMany: jest.fn(async ({ where, take }) => {
        const logs = [...mockGetActivityLogs(where.userId)];
        const filtered = Array.isArray(where?.action?.in)
          ? logs.filter((log) => where.action.in.includes(log.action))
          : logs;
        return filtered
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
          .slice(0, take || filtered.length);
      }),
    },
    savedRecipient: {
      findFirst: jest.fn(async ({ where }) => {
        const recipients = mockGetSavedRecipients(where.userId);
        return recipients.find((recipient) => recipient.id === where.id) || null;
      }),
      findUnique: jest.fn(async ({ where }) => {
        const { userId, normalizedName } = where.userId_normalizedName;
        return mockGetSavedRecipients(userId).find((recipient) => recipient.normalizedName === normalizedName) || null;
      }),
      findMany: jest.fn(async ({ where }) => {
        const recipients = [...mockGetSavedRecipients(where.userId)];
        if (where?.normalizedName?.in) {
          return recipients.filter((recipient) => where.normalizedName.in.includes(recipient.normalizedName));
        }
        return recipients.sort((left, right) => (
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
          || left.name.localeCompare(right.name)
        ));
      }),
      update: jest.fn(async ({ where, data }) => {
        for (const [userId, recipients] of mockState.savedRecipientsByUserId.entries()) {
          const existingIndex = recipients.findIndex((recipient) => recipient.id === where.id);
          if (existingIndex === -1) continue;

          recipients[existingIndex] = {
            ...recipients[existingIndex],
            ...data,
            updatedAt: data.updatedAt || new Date(),
          };
          mockState.savedRecipientsByUserId.set(userId, recipients);
          return recipients[existingIndex];
        }

        return null;
      }),
      upsert: jest.fn(async ({ where, update, create }) => {
        const { userId, normalizedName } = where.userId_normalizedName;
        const recipients = mockGetSavedRecipients(userId);
        const existingIndex = recipients.findIndex((recipient) => recipient.normalizedName === normalizedName);

        if (existingIndex >= 0) {
          recipients[existingIndex] = {
            ...recipients[existingIndex],
            ...update,
            updatedAt: new Date(),
          };
          return recipients[existingIndex];
        }

        const createdRecipient = {
          id: `recipient-${recipients.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create,
        };
        recipients.push(createdRecipient);
        return createdRecipient;
      }),
      deleteMany: jest.fn(async ({ where }) => {
        const recipients = mockGetSavedRecipients(where.userId);
        const nextRecipients = recipients.filter((recipient) => {
          if (where.id) {
            return recipient.id !== where.id;
          }
          if (where.normalizedName) {
            return recipient.normalizedName !== where.normalizedName;
          }
          return true;
        });
        mockState.savedRecipientsByUserId.set(String(where.userId), nextRecipients);
        return { count: recipients.length - nextRecipients.length };
      }),
    },
  },
}));

jest.mock('../../src/services/telegramService.js', () => ({
  __esModule: true,
  sendMessage: jest.fn(async () => ({ ok: true })),
  sendPlainMessage: jest.fn(async () => ({ ok: true })),
  verifyWebhookSecret: jest.fn(() => true),
  isCommand: jest.fn((text) => String(text || '').startsWith('/')),
  extractCommand: jest.fn((text) => String(text || '').replace(/^\//, '').split(/\s+/)[0].toLowerCase()),
}));

jest.mock('../../src/services/geminiService.js', () => ({
  __esModule: true,
  parseIntent: jest.fn(async (text) => {
    const msg = String(text || '').toLowerCase();
    const addressMatch = String(text || '').match(/0x[0-9a-fA-F]{40}/);
    const amountMatch = String(text || '').match(/(\d+(?:\.\d+)?)/);

    if (msg.includes('balance') || msg.includes('how much do i have')) {
      return {
        intent: 'balance',
        confidence: 0.95,
        details: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
      };
    }

    if (msg.includes('i want to send eth')) {
      return {
        intent: 'transfer',
        confidence: 0.9,
        details: { tokenSymbol: 'ETH', amount: null, recipientAddress: null, chain: null },
      };
    }

    if (msg.includes('send') || msg.includes('transfer') || msg.includes('pay')) {
      return {
        intent: 'transfer',
        confidence: 0.9,
        details: {
          tokenSymbol: /\b(usdc|usdt|dai|weth)\b/i.test(msg) ? String(text).match(/\b(usdc|usdt|dai|weth)\b/i)[1].toUpperCase() : 'ETH',
          amount: amountMatch ? Number(amountMatch[1]) : null,
          recipientAddress: addressMatch ? addressMatch[0] : null,
          chain: null,
        },
      };
    }

    return {
      intent: 'unknown',
      confidence: 0.2,
      details: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
    };
  }),
  extractTransferSlots: jest.fn(async () => null),
  generateConversationalReply: jest.fn(async (text) => `assistant:${text}`),
}));

jest.mock('../../src/services/telegramExecutionService.js', () => ({
  __esModule: true,
  executeTransfer: jest.fn(async (intent, _user, options = {}) => {
    if (typeof options.onBroadcast === 'function') {
      await options.onBroadcast({
        to: intent.details.recipientAddress,
        from: '0xbot',
        amount: String(intent.details.amount),
        token: intent.details.tokenSymbol || 'ETH',
        txHash: '0xtxhash',
        chainId: 11155111,
      });
    }

    return {
      to: intent.details.recipientAddress,
      amount: String(intent.details.amount),
      token: intent.details.tokenSymbol || 'ETH',
      txHash: '0xtxhash',
      chainId: 11155111,
    };
  }),
  getBotWalletBalance: jest.fn(async () => ({
    address: '0x1111111111111111111111111111111111111111',
    ethBalance: '1.2345',
    chainId: 11155111,
  })),
}));

jest.mock('../../src/services/ethereumService.js', () => ({
  __esModule: true,
  default: {
    getTransaction: jest.fn(async (txHash, network) => {
      if (txHash === '0xtxhash' && network === 'sepolia') {
        return {
          success: true,
          transaction: {
            hash: txHash,
            to: '0x1111111111111111111111111111111111111111',
            value: '0.4',
            status: 'success',
            confirmations: 2,
          },
        };
      }

      if (txHash === '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' && network === 'mainnet') {
        return {
          success: true,
          transaction: {
            hash: txHash,
            to: '0x4444444444444444444444444444444444444444',
            value: '0.02',
            status: 'pending',
            confirmations: 0,
          },
        };
      }

      return {
        success: false,
        error: 'Transaction not found',
      };
    }),
  },
}));

jest.mock('../../src/services/conversationSessionService.js', () => ({
  __esModule: true,
  loadConversationSession: jest.fn(async (telegramId) => mockState.sessionsByTelegramId.get(String(telegramId)) || null),
  saveConversationSession: jest.fn(async (telegramId, state) => {
    mockState.sessionsByTelegramId.set(String(telegramId), {
      chatContext: state.chatContext || null,
      transferDraft: state.transferDraft || null,
      pendingIntent: state.pendingIntent || null,
      expiresAt: state.expiresAt || null,
    });
    return true;
  }),
  clearConversationSession: jest.fn(async (telegramId) => {
    mockState.sessionsByTelegramId.delete(String(telegramId));
    return true;
  }),
}));

jest.mock('../../src/controllers/telegramController.js', () => ({
  __esModule: true,
  applyLinkCode: jest.fn(async (telegramId) => {
    const user = mockEnsureLinkedUser(telegramId);
    return {
      success: true,
      address: `0x${String(telegramId).padStart(40, '0').slice(-40)}`,
      userId: user.id,
    };
  }),
}));

jest.mock('../../src/services/loggerService.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { handleWebhook } from '../../src/controllers/telegramWebhookController.js';
import { sendMessage, sendPlainMessage } from '../../src/services/telegramService.js';
import { applyLinkCode } from '../../src/controllers/telegramController.js';

function createRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

async function sendIncomingText(text, { chatId = 1, telegramId = 1001 } = {}) {
  const req = {
    headers: { 'x-telegram-bot-api-secret-token': 'valid-secret' },
    body: {
      message: {
        chat: { id: chatId },
        from: { id: telegramId },
        text,
      },
    },
  };
  const res = createRes();
  await handleWebhook(req, res);
  return res;
}

describe('telegramWebhookController transcript integration', () => {
  const outgoing = [];

  beforeEach(() => {
    mockState.usersByTelegramId.clear();
    mockState.sessionsByTelegramId.clear();
    mockState.lastRecipientByUserId.clear();
    mockState.savedRecipientsByUserId.clear();
    mockState.activityLogsByUserId.clear();
    outgoing.length = 0;

    jest.clearAllMocks();

    sendMessage.mockImplementation(async (_chatId, text) => {
      outgoing.push(String(text));
      return { ok: true };
    });

    sendPlainMessage.mockImplementation(async (_chatId, text) => {
      outgoing.push(String(text));
      return { ok: true };
    });
  });

  it('handles linking and then allows balance check in natural chat', async () => {
    const telegramId = 1101;

    await sendIncomingText('/start ABC123', { telegramId, chatId: 501 });
    expect(applyLinkCode).toHaveBeenCalledWith(String(telegramId), 'ABC123');
    expect(outgoing.some((msg) => msg.includes('linked'))).toBe(true);

    outgoing.length = 0;
    await sendIncomingText('i want to see my balance', { telegramId, chatId: 501 });

    expect(outgoing.some((msg) => msg.includes('Bot Wallet Balance'))).toBe(true);
  });

  it('shows buttons only on a greeting turn', async () => {
    const telegramId = 1102;
    mockEnsureLinkedUser(telegramId);

    await sendIncomingText('hi', { telegramId, chatId: 501 });
    const greetingCall = sendPlainMessage.mock.calls.at(-1);
    expect(greetingCall[2]).toEqual(expect.objectContaining({
      reply_markup: expect.objectContaining({
        keyboard: expect.any(Array),
      }),
    }));

    await sendIncomingText('show my address list', { telegramId, chatId: 501 });
    const followUpCall = sendMessage.mock.calls.at(-1);
    expect(followUpCall[2]).toEqual(expect.objectContaining({
      reply_markup: expect.objectContaining({
        remove_keyboard: true,
      }),
    }));
  });

  it('supports multi-turn send with correction mid-draft and confirm', async () => {
    const telegramId = 1202;
    mockEnsureLinkedUser(telegramId);

    await sendIncomingText('i want to send eth', { telegramId, chatId: 502 });
    expect(outgoing[outgoing.length - 1]).toContain('How much would you like to send');

    await sendIncomingText('0.5', { telegramId, chatId: 502 });
    expect(outgoing[outgoing.length - 1]).toContain('Who should receive it');

    await sendIncomingText('actually make it 0.2', { telegramId, chatId: 502 });
    expect(outgoing[outgoing.length - 1]).toContain('Who should receive it');

    await sendIncomingText('0x1111111111111111111111111111111111111111', { telegramId, chatId: 502 });
    expect(outgoing[outgoing.length - 1]).toContain("I'll send *0.2 ETH*");

    await sendIncomingText('yes', { telegramId, chatId: 502 });
    expect(outgoing.some((msg) => msg.includes('Transfer submitted'))).toBe(true);
    expect(outgoing.some((msg) => msg.includes('Transfer confirmed'))).toBe(true);
    expect(mockGetActivityLogs(`user-${telegramId}`)[0]?.action).toBe('TELEGRAM_TRANSFER_CONFIRMED');
  });

  it('shows recent and last transfer history after sending', async () => {
    const telegramId = 1203;
    mockEnsureLinkedUser(telegramId);

    await sendIncomingText('send 0.4 eth to 0x1111111111111111111111111111111111111111', { telegramId, chatId: 503 });
    expect(outgoing[outgoing.length - 1]).toContain("I'll send *0.4 ETH*");

    await sendIncomingText('yes', { telegramId, chatId: 503 });
    expect(outgoing.some((msg) => msg.includes('Transfer confirmed'))).toBe(true);

    outgoing.length = 0;
    await sendIncomingText('show my recent transfers', { telegramId, chatId: 503 });
    expect(outgoing[outgoing.length - 1]).toContain('Recent Transfers');
    expect(outgoing[outgoing.length - 1]).toContain('0.4 ETH');

    outgoing.length = 0;
    await sendIncomingText('/last', { telegramId, chatId: 503 });
    expect(outgoing[outgoing.length - 1]).toContain('Last Transfer');
    expect(outgoing[outgoing.length - 1]).toContain('Confirmed');
  });

  it('shows tx status for the latest transfer and an explicit hash', async () => {
    const telegramId = 1204;
    mockEnsureLinkedUser(telegramId);

    await sendIncomingText('send 0.4 eth to 0x1111111111111111111111111111111111111111', { telegramId, chatId: 504 });
    await sendIncomingText('yes', { telegramId, chatId: 504 });

    outgoing.length = 0;
    await sendIncomingText('/status', { telegramId, chatId: 504 });
    expect(outgoing[outgoing.length - 1]).toContain('Transaction Status');
    expect(outgoing[outgoing.length - 1]).toContain('Confirmed');
    expect(outgoing[outgoing.length - 1]).toContain('0xtxhash');

    outgoing.length = 0;
    await sendIncomingText('status of 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', { telegramId, chatId: 504 });
    expect(outgoing[outgoing.length - 1]).toContain('Pending');
    expect(outgoing[outgoing.length - 1]).toContain('Ethereum Mainnet');
  });

  it('handles natural address-list phrasing for save, list, send, and delete', async () => {
    const telegramId = 1222;
    const user = mockEnsureLinkedUser(telegramId);

    await sendIncomingText(
      'I want you to save this address as 0x5555555555555555555555555555555555555555 Contact 1 if I need it in future',
      { telegramId, chatId: 522 }
    );
    expect(outgoing[outgoing.length - 1]).toContain('Saved *Contact 1*');

    await sendIncomingText('show me my address list', { telegramId, chatId: 522 });
    expect(outgoing[outgoing.length - 1]).toContain('Address List');
    expect(outgoing[outgoing.length - 1]).toContain('Contact 1');

    await sendIncomingText('send 0.3 eth to Contact 1', { telegramId, chatId: 522 });
    expect(outgoing[outgoing.length - 1]).toContain("I'll send *0.3 ETH*");
    expect(outgoing[outgoing.length - 1]).toContain('*Contact 1*');

    await sendIncomingText('Delete the contact1', { telegramId, chatId: 522 });
    expect(outgoing[outgoing.length - 1]).toContain('Removed *Contact 1* from your address list');

    await sendIncomingText('show me my address list', { telegramId, chatId: 522 });
    expect(outgoing[outgoing.length - 1]).toContain('Your address list is empty');

    const recipients = mockGetSavedRecipients(user.id);
    expect(recipients).toHaveLength(0);
  });

  it('accepts an address-list name as the recipient during draft collection', async () => {
    const telegramId = 1233;
    const user = mockEnsureLinkedUser(telegramId);
    mockGetSavedRecipients(user.id).push({
      id: 'recipient-1',
      userId: user.id,
      name: 'Alice',
      normalizedName: 'alice',
      address: '0x6666666666666666666666666666666666666666',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await sendIncomingText('i want to send eth', { telegramId, chatId: 523 });
    expect(outgoing[outgoing.length - 1]).toContain('How much would you like to send');

    await sendIncomingText('0.2', { telegramId, chatId: 523 });
    expect(outgoing[outgoing.length - 1]).toContain('Who should receive it');

    await sendIncomingText('Alice', { telegramId, chatId: 523 });
    expect(outgoing[outgoing.length - 1]).toContain('*Alice*');
    expect(outgoing[outgoing.length - 1]).toContain('0x6666666666666666666666666666666666666666');
  });

  it('accepts a digit-based address-list name as a bare recipient reply', async () => {
    const telegramId = 1234;
    const user = mockEnsureLinkedUser(telegramId);
    mockGetSavedRecipients(user.id).push({
      id: 'recipient-2',
      userId: user.id,
      name: 'Contact 1',
      normalizedName: 'contact 1',
      address: '0x7777777777777777777777777777777777777777',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await sendIncomingText('i want to send eth', { telegramId, chatId: 524 });
    expect(outgoing[outgoing.length - 1]).toContain('How much would you like to send');

    await sendIncomingText('0.2', { telegramId, chatId: 524 });
    expect(outgoing[outgoing.length - 1]).toContain('Who should receive it');

    await sendIncomingText('Contact 1', { telegramId, chatId: 524 });
    expect(outgoing[outgoing.length - 1]).toContain('*Contact 1*');
    expect(outgoing[outgoing.length - 1]).toContain('0x7777777777777777777777777777777777777777');
  });

  it('supports confirm and cancel decisions for pending transfer', async () => {
    const telegramId = 1303;
    mockEnsureLinkedUser(telegramId);

    await sendIncomingText('send 0.01 eth to 0x1111111111111111111111111111111111111111', { telegramId, chatId: 503 });
    expect(outgoing[outgoing.length - 1]).toContain('Confirm Transaction');

    await sendIncomingText('no', { telegramId, chatId: 503 });
    expect(outgoing[outgoing.length - 1]).toContain('Transaction cancelled');
  });

  it('lets the user edit amount, token, and recipient from the confirm step', async () => {
    const telegramId = 1304;
    const user = mockEnsureLinkedUser(telegramId);
    mockGetSavedRecipients(user.id).push({
      id: 'recipient-3',
      userId: user.id,
      name: 'Alice',
      normalizedName: 'alice',
      address: '0x8888888888888888888888888888888888888888',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await sendIncomingText('send 0.5 eth to 0x1111111111111111111111111111111111111111', { telegramId, chatId: 505 });
    expect(outgoing[outgoing.length - 1]).toContain("I'll send *0.5 ETH*");

    await sendIncomingText('change amount to 0.2', { telegramId, chatId: 505 });
    expect(outgoing[outgoing.length - 1]).toContain("I'll send *0.2 ETH*");

    await sendIncomingText('use USDC instead', { telegramId, chatId: 505 });
    expect(outgoing[outgoing.length - 1]).toContain("I'll send *0.2 USDC*");

    await sendIncomingText('change recipient to Alice', { telegramId, chatId: 505 });
    expect(outgoing[outgoing.length - 1]).toContain('*Alice*');
    expect(outgoing[outgoing.length - 1]).toContain('0x8888888888888888888888888888888888888888');

    await sendIncomingText('yes', { telegramId, chatId: 505 });
    expect(outgoing.some((msg) => msg.includes('Transfer confirmed'))).toBe(true);
    expect(mockGetActivityLogs(`user-${telegramId}`)[0]?.details).toEqual(expect.objectContaining({
      amount: '0.2',
      tokenSymbol: 'USDC',
      recipientLabel: 'Alice',
      toAddress: '0x8888888888888888888888888888888888888888',
    }));
  });

  it('restores draft flow from persisted session state (restart recovery path)', async () => {
    const telegramId = 1404;
    mockEnsureLinkedUser(telegramId);
    mockState.sessionsByTelegramId.set(String(telegramId), {
      chatContext: {
        scene: 'transfer',
        currentStep: 'collecting_recipientAddress',
        lastAmount: 0.15,
        lastTokenSymbol: 'ETH',
        lastInteractionAt: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
      transferDraft: {
        intent: {
          intent: 'transfer',
          details: {
            amount: 0.15,
            tokenSymbol: 'ETH',
            recipientAddress: null,
            chain: null,
          },
          confidence: 0.8,
        },
        expiresAt: Date.now() + 60 * 1000,
      },
      pendingIntent: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await sendIncomingText('0x2222222222222222222222222222222222222222', { telegramId, chatId: 504 });
    expect(outgoing[outgoing.length - 1]).toContain("I'll send *0.15 ETH*");
  });

  it('restores collecting flow from chat context only and uses the current user turn', async () => {
    const telegramId = 1454;
    mockEnsureLinkedUser(telegramId);
    mockState.sessionsByTelegramId.set(String(telegramId), {
      chatContext: {
        scene: 'transfer',
        currentStep: 'collecting_recipientAddress',
        draftDetails: {
          amount: 0.25,
          tokenSymbol: 'USDC',
          recipientAddress: null,
          chain: null,
        },
        lastInteractionAt: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
      transferDraft: null,
      pendingIntent: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await sendIncomingText('0x3333333333333333333333333333333333333333', { telegramId, chatId: 504 });
    expect(outgoing[outgoing.length - 1]).toContain("I'll send *0.25 USDC*");
  });

  it('honors an immediate confirmation reply after restart in confirm scene', async () => {
    const telegramId = 1484;
    mockEnsureLinkedUser(telegramId);
    mockState.sessionsByTelegramId.set(String(telegramId), {
      chatContext: {
        scene: 'transfer',
        currentStep: 'confirm',
        lastInteractionAt: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
      transferDraft: {
        intent: {
          intent: 'transfer',
          details: {
            amount: 0.4,
            tokenSymbol: 'ETH',
            recipientAddress: '0x4444444444444444444444444444444444444444',
            chain: null,
          },
          confidence: 0.9,
        },
        expiresAt: Date.now() + 60 * 1000,
      },
      pendingIntent: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await sendIncomingText('yes', { telegramId, chatId: 507 });
    expect(outgoing[outgoing.length - 1]).toContain('Transfer confirmed');
    expect(outgoing.some((msg) => msg.includes('Confirm Transaction'))).toBe(false);
  });

  it('resets stale in-session flow after inactivity timeout', async () => {
    const telegramId = 1505;
    mockEnsureLinkedUser(telegramId);
    mockState.sessionsByTelegramId.set(String(telegramId), {
      chatContext: {
        scene: 'transfer',
        currentStep: 'collecting_amount',
        lastInteractionAt: Date.now() - (11 * 60 * 1000),
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
      transferDraft: {
        intent: {
          intent: 'transfer',
          details: {
            amount: null,
            tokenSymbol: 'ETH',
            recipientAddress: null,
            chain: null,
          },
          confidence: 0.7,
        },
        expiresAt: Date.now() + 60 * 1000,
      },
      pendingIntent: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await sendIncomingText('continue', { telegramId, chatId: 505 });
    expect(outgoing[outgoing.length - 1]).toContain('earlier transfer expired');

    const saved = mockState.sessionsByTelegramId.get(String(telegramId));
    expect(saved?.transferDraft).toBeNull();
    expect(saved?.pendingIntent).toBeNull();
  });

  it('does not show a stale reset message for a casual greeting', async () => {
    const telegramId = 1515;
    mockEnsureLinkedUser(telegramId);
    mockState.sessionsByTelegramId.set(String(telegramId), {
      chatContext: {
        scene: 'transfer',
        currentStep: 'collecting_amount',
        lastInteractionAt: Date.now() - (11 * 60 * 1000),
        expiresAt: Date.now() + 60 * 60 * 1000,
      },
      transferDraft: {
        intent: {
          intent: 'transfer',
          details: {
            amount: null,
            tokenSymbol: 'ETH',
            recipientAddress: null,
            chain: null,
          },
          confidence: 0.7,
        },
        expiresAt: Date.now() + 60 * 1000,
      },
      pendingIntent: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await sendIncomingText('Hi', { telegramId, chatId: 515 });
    expect(outgoing[outgoing.length - 1]).toBe('Hey. Want to check balance, send crypto, or open your address list?');
  });

  it('uses fallback conversational response for non-wallet chat', async () => {
    const telegramId = 1606;
    mockEnsureLinkedUser(telegramId);

    await sendIncomingText('tell me a joke', { telegramId, chatId: 506 });
    expect(outgoing[outgoing.length - 1]).toBe('assistant:tell me a joke');
  });
});
