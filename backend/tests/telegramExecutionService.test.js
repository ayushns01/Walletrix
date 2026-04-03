jest.mock('../src/services/loggerService.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../src/lib/prisma.js', () => ({
  __esModule: true,
  default: {
    telegramBotWallet: {
      findUnique: jest.fn(),
    },
  },
}));

import {
  resolveTransferExecutionStrategy,
} from '../src/services/telegramExecutionService.js';
import {
  buildSepoliaAutoSwapExecutionPlan,
  getSupportedSepoliaAutoSwapSymbols,
} from '../src/services/sepoliaAutoSwapService.js';

describe('telegramExecutionService Sepolia demo-token routing', () => {
  it.each(['WUSD', 'WDAI', 'WLINK', 'WWBTC', 'WGLD'])(
    'routes %s through Sepolia auto-swap strategy',
    (tokenSymbol) => {
      expect(resolveTransferExecutionStrategy({
        tokenSymbol,
        chainId: 11155111,
      })).toBe('sepolia_auto_swap');
    }
  );

  it('builds execution plans for the full supported demo-token catalog', () => {
    const symbols = getSupportedSepoliaAutoSwapSymbols();

    expect(symbols).toEqual(['WUSD', 'WDAI', 'WLINK', 'WWBTC', 'WGLD']);

    for (const tokenSymbol of symbols) {
      const plan = buildSepoliaAutoSwapExecutionPlan({
        tokenSymbol,
        amount: 1,
        recipientAddress: '0x1111111111111111111111111111111111111111',
      });

      expect(plan.routerAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(plan.tokenAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(plan.recipientAddress).toBe('0x1111111111111111111111111111111111111111');
      expect(BigInt(plan.amountBaseUnits)).toBeGreaterThan(0n);
      expect(BigInt(plan.requiredWei)).toBeGreaterThan(0n);
    }
  });
});
