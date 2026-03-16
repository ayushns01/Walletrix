jest.mock('../src/lib/prisma.js', () => ({
  __esModule: true,
  default: {
    telegramBotWallet: {
      findMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../src/services/loggerService.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../src/services/telegramService.js', () => ({
  __esModule: true,
  sendPlainMessage: jest.fn(),
}));

jest.mock('../src/services/telegramExecutionService.js', () => ({
  __esModule: true,
  getBotWalletBalance: jest.fn(),
}));

import {
  buildLowBalanceMessage,
  buildTransferConfirmedMessage,
  buildTransferSubmittedMessage,
  buildWalletFundedMessage,
  evaluateWalletBalanceNotifications,
  pollTelegramWalletNotifications,
  resetTelegramNotificationMonitorState,
} from '../src/services/telegramNotificationService.js';

describe('telegramNotificationService', () => {
  beforeEach(() => {
    resetTelegramNotificationMonitorState();
  });

  it('formats transfer and wallet notification messages', () => {
    expect(buildTransferSubmittedMessage({
      amount: '0.2',
      token: 'ETH',
      to: '0xabc',
      txHash: '0xtx',
    })).toContain('Transfer submitted');

    expect(buildTransferConfirmedMessage({
      amount: '0.2',
      token: 'ETH',
      to: '0xabc',
      txHash: '0xtx',
    })).toContain('Transfer confirmed');

    expect(buildWalletFundedMessage({
      deltaEth: 0.1,
      newBalanceEth: 0.5,
      address: '0xabc',
      chainId: 11155111,
    })).toContain('Bot wallet funded');

    expect(buildLowBalanceMessage({
      balanceEth: 0.001,
      thresholdEth: 0.002,
      address: '0xabc',
      chainId: 11155111,
    })).toContain('Low gas balance');
  });

  it('evaluates funded and low-balance transitions', () => {
    expect(evaluateWalletBalanceNotifications(null, { balanceEth: 0.5 }, {
      thresholdEth: 0.002,
      fundedMinDeltaEth: 0.0001,
    })).toEqual(expect.objectContaining({
      notifyFunded: false,
      notifyLowBalance: false,
      nextLowBalanceActive: false,
    }));

    expect(evaluateWalletBalanceNotifications(
      { balanceEth: 0, lowBalanceActive: false },
      { balanceEth: 0.05 },
      { thresholdEth: 0.002, fundedMinDeltaEth: 0.0001 }
    )).toEqual(expect.objectContaining({
      notifyFunded: true,
      notifyLowBalance: false,
    }));

    expect(evaluateWalletBalanceNotifications(
      { balanceEth: 0.01, lowBalanceActive: false },
      { balanceEth: 0.001 },
      { thresholdEth: 0.002, fundedMinDeltaEth: 0.0001 }
    )).toEqual(expect.objectContaining({
      notifyFunded: false,
      notifyLowBalance: true,
      nextLowBalanceActive: true,
    }));
  });

  it('polls linked bot wallets and sends funded/low-balance alerts without spamming on bootstrap', async () => {
    const prismaClient = {
      telegramBotWallet: {
        findMany: jest.fn().mockResolvedValue([
          {
            user: {
              id: 'user-1',
              telegramId: 'tg-1',
            },
          },
        ]),
      },
      activityLog: {
        create: jest.fn().mockResolvedValue({ id: 'activity-1' }),
      },
    };
    const sendPlainMessageImpl = jest.fn().mockResolvedValue({ ok: true });
    const balances = [
      { address: '0xabc', ethBalance: '0.0000', chainId: 11155111 },
      { address: '0xabc', ethBalance: '0.0500', chainId: 11155111 },
      { address: '0xabc', ethBalance: '0.0010', chainId: 11155111 },
    ];
    const getBotWalletBalanceImpl = jest.fn(async () => balances.shift());

    await pollTelegramWalletNotifications({
      prismaClient,
      sendPlainMessageImpl,
      getBotWalletBalanceImpl,
      log: { warn: jest.fn(), info: jest.fn() },
    });
    expect(sendPlainMessageImpl).not.toHaveBeenCalled();

    await pollTelegramWalletNotifications({
      prismaClient,
      sendPlainMessageImpl,
      getBotWalletBalanceImpl,
      log: { warn: jest.fn(), info: jest.fn() },
    });
    expect(sendPlainMessageImpl).toHaveBeenCalledWith(
      'tg-1',
      expect.stringContaining('Bot wallet funded')
    );

    await pollTelegramWalletNotifications({
      prismaClient,
      sendPlainMessageImpl,
      getBotWalletBalanceImpl,
      log: { warn: jest.fn(), info: jest.fn() },
    });
    expect(sendPlainMessageImpl).toHaveBeenCalledWith(
      'tg-1',
      expect.stringContaining('Low gas balance')
    );
    expect(prismaClient.activityLog.create).toHaveBeenCalledTimes(2);
  });
});
