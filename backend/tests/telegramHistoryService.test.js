var mockActivityLogDelegate = {
  create: jest.fn(),
  findMany: jest.fn(),
};

jest.mock('../src/lib/prisma.js', () => ({
  __esModule: true,
  default: {
    get activityLog() {
      return mockActivityLogDelegate;
    },
    set activityLog(value) {
      mockActivityLogDelegate = value;
    },
  },
}));

import {
  buildLastTransferMessage,
  buildRecentTransfersMessage,
  getLastTelegramTransfer,
  getRecentTelegramTransfers,
  isLastTransferIntent,
  isRecentTransfersIntent,
  recordTelegramTransferEvent,
} from '../src/services/telegramHistoryService.js';

describe('telegramHistoryService', () => {
  beforeEach(() => {
    mockActivityLogDelegate = {
      create: jest.fn(),
      findMany: jest.fn(),
    };
  });

  it('records confirmed transfer activity', async () => {
    mockActivityLogDelegate.create.mockResolvedValue({ id: 'activity-1' });

    const result = await recordTelegramTransferEvent('user-1', {
      status: 'confirmed',
      txHash: '0xabc',
      amount: '0.2',
      tokenSymbol: 'ETH',
      toAddress: '0x1111111111111111111111111111111111111111',
    });

    expect(result).toBe(true);
    expect(mockActivityLogDelegate.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        action: 'TELEGRAM_TRANSFER_CONFIRMED',
        details: expect.objectContaining({
          status: 'confirmed',
          txHash: '0xabc',
          amount: '0.2',
          tokenSymbol: 'ETH',
        }),
      },
    });
  });

  it('loads recent and last transfers from activity logs', async () => {
    mockActivityLogDelegate.findMany.mockResolvedValue([
      {
        id: 'activity-2',
        action: 'TELEGRAM_TRANSFER_CONFIRMED',
        details: {
          status: 'confirmed',
          txHash: '0xdef',
          amount: '1.2',
          tokenSymbol: 'USDC',
          toAddress: '0x2222222222222222222222222222222222222222',
          recipientLabel: 'Alice',
        },
        createdAt: new Date('2026-03-15T09:00:00.000Z'),
      },
    ]);

    const recent = await getRecentTelegramTransfers('user-1', { limit: 5 });
    const last = await getLastTelegramTransfer('user-1');

    expect(recent).toHaveLength(1);
    expect(last).toEqual(expect.objectContaining({
      txHash: '0xdef',
      recipientLabel: 'Alice',
    }));
    expect(mockActivityLogDelegate.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        action: { in: ['TELEGRAM_TRANSFER_CONFIRMED', 'TELEGRAM_TRANSFER_FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  });

  it('formats empty and populated history messages', () => {
    expect(buildRecentTransfersMessage([])).toContain('No recent transfers');
    expect(buildLastTransferMessage(null)).toContain('No transfer history');

    const recentMessage = buildRecentTransfersMessage([
      {
        status: 'confirmed',
        amount: '0.5',
        tokenSymbol: 'ETH',
        toAddress: '0x1111111111111111111111111111111111111111',
        recipientLabel: 'Alice',
        createdAt: new Date('2026-03-15T09:00:00.000Z'),
      },
    ]);
    expect(recentMessage).toContain('Recent Transfers');
    expect(recentMessage).toContain('0.5 ETH');

    const lastMessage = buildLastTransferMessage({
      status: 'failed',
      amount: '2',
      tokenSymbol: 'USDC',
      toAddress: '0x2222222222222222222222222222222222222222',
      recipientLabel: null,
      createdAt: new Date('2026-03-15T09:00:00.000Z'),
      errorMessage: 'insufficient funds',
    });
    expect(lastMessage).toContain('Last Transfer');
    expect(lastMessage).toContain('Failed');
    expect(lastMessage).toContain('insufficient funds');
  });

  it('detects recent and last transfer intents', () => {
    expect(isRecentTransfersIntent('/recent')).toBe(true);
    expect(isRecentTransfersIntent('show my recent transfers')).toBe(true);
    expect(isLastTransferIntent('/last')).toBe(true);
    expect(isLastTransferIntent('what was my last transfer')).toBe(true);
    expect(isRecentTransfersIntent('tell me a joke')).toBe(false);
  });
});
