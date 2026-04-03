jest.mock('../src/services/loggerService.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { parseIntent } from '../src/services/geminiService.js';

describe('geminiService regex parsing', () => {
  it.each([
    ['WUSD', '0.5'],
    ['WDAI', '1.25'],
    ['WLINK', '2'],
    ['WWBTC', '0.01'],
    ['WGLD', '3'],
  ])('preserves demo token %s in transfer parsing', async (tokenSymbol, amount) => {
    const result = await parseIntent(
      `send ${amount} ${tokenSymbol.toLowerCase()} to 0x1111111111111111111111111111111111111111`
    );

    expect(result.intent).toBe('transfer');
    expect(result.details.tokenSymbol).toBe(tokenSymbol);
    expect(result.details.amount).toBe(Number(amount));
    expect(result.details.recipientAddress).toBe('0x1111111111111111111111111111111111111111');
  });
});
