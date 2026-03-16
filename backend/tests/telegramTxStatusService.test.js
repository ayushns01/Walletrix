var mockEthereumService = {
  getTransaction: jest.fn(),
};

var mockLastTransfer = null;
var mockRecentTransfers = [];

jest.mock('../src/services/ethereumService.js', () => ({
  __esModule: true,
  default: {
    getTransaction: (...args) => mockEthereumService.getTransaction(...args),
  },
}));

jest.mock('../src/services/telegramHistoryService.js', () => ({
  __esModule: true,
  getLastTelegramTransfer: jest.fn(async () => mockLastTransfer),
  getRecentTelegramTransfers: jest.fn(async () => mockRecentTransfers),
}));

import {
  buildTransferStatusMessage,
  extractTxHashFromText,
  isTransferStatusIntent,
  lookupTelegramTransferStatus,
} from '../src/services/telegramTxStatusService.js';

describe('telegramTxStatusService', () => {
  beforeEach(() => {
    mockLastTransfer = null;
    mockRecentTransfers = [];
    mockEthereumService.getTransaction.mockReset();
  });

  it('detects tx status intent and extracts a tx hash', () => {
    const txHash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    expect(isTransferStatusIntent('/status')).toBe(true);
    expect(isTransferStatusIntent('status of my last transfer')).toBe(true);
    expect(isTransferStatusIntent(`check tx status for ${txHash}`)).toBe(true);
    expect(extractTxHashFromText(`please check ${txHash}`)).toBe(txHash);
    expect(isTransferStatusIntent('tell me a joke')).toBe(false);
  });

  it('loads the latest transfer status from the stored tx hash', async () => {
    mockLastTransfer = {
      txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      amount: '0.4',
      tokenSymbol: 'ETH',
      toAddress: '0x1111111111111111111111111111111111111111',
      recipientLabel: 'Alice',
      chainId: 11155111,
      createdAt: new Date('2026-03-15T09:00:00.000Z'),
    };
    mockEthereumService.getTransaction.mockResolvedValue({
      success: true,
      transaction: {
        hash: mockLastTransfer.txHash,
        to: mockLastTransfer.toAddress,
        value: '0.4',
        status: 'success',
        confirmations: 2,
      },
    });

    const result = await lookupTelegramTransferStatus('user-1');
    const message = buildTransferStatusMessage(result);

    expect(mockEthereumService.getTransaction).toHaveBeenCalledWith(mockLastTransfer.txHash, 'sepolia');
    expect(message).toContain('Transaction Status');
    expect(message).toContain('Confirmed');
    expect(message).toContain('Alice');
    expect(message).toContain('0.4 ETH');
  });

  it('explains when the latest transfer has no broadcast hash', async () => {
    mockLastTransfer = {
      txHash: null,
      amount: '1',
      tokenSymbol: 'USDC',
      toAddress: '0x2222222222222222222222222222222222222222',
      createdAt: new Date('2026-03-15T09:00:00.000Z'),
    };

    const result = await lookupTelegramTransferStatus('user-1');
    const message = buildTransferStatusMessage(result);

    expect(mockEthereumService.getTransaction).not.toHaveBeenCalled();
    expect(message).toContain('does not have an on-chain hash');
  });

  it('probes configured networks for an explicit tx hash', async () => {
    const txHash = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    mockRecentTransfers = [];
    mockEthereumService.getTransaction.mockImplementation(async (_hash, network) => {
      if (network === 'mainnet') {
        return {
          success: true,
          transaction: {
            hash: txHash,
            to: '0x3333333333333333333333333333333333333333',
            value: '0.01',
            status: 'pending',
            confirmations: 0,
          },
        };
      }

      return { success: false, error: 'Transaction not found' };
    });

    const result = await lookupTelegramTransferStatus('user-1', { txHash });
    const message = buildTransferStatusMessage(result);

    expect(message).toContain('Pending');
    expect(message).toContain('Ethereum Mainnet');
    expect(message).toContain(txHash);
  });
});
