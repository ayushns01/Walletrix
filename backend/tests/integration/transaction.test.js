import databaseTransactionService from '../../src/services/databaseTransactionService.js';
import prisma from '../../src/lib/prisma.js';

describe('Enhanced Transaction History Service', () => {
  let walletId;
  let testTransactions = [];

  beforeAll(async () => {
    // Create a test wallet
    const wallet = await prisma.wallet.create({
      data: {
        address: '0x1234567890123456789012345678901234567890',
        network: 'ethereum',
        isHD: true,
        userId: 'test-user'
      }
    });
    walletId = wallet.id;

    // Create test transactions
    const transactionData = [
      {
        walletId,
        network: 'ethereum',
        txHash: '0xabc123',
        fromAddress: '0x1111111111111111111111111111111111111111',
        toAddress: '0x1234567890123456789012345678901234567890',
        amount: '1.5',
        tokenSymbol: 'ETH',
        status: 'confirmed',
        timestamp: new Date('2023-12-01'),
        isIncoming: true,
        usdValue: 2400,
        category: 'transfer'
      },
      {
        walletId,
        network: 'ethereum',
        txHash: '0xdef456',
        fromAddress: '0x1234567890123456789012345678901234567890',
        toAddress: '0x2222222222222222222222222222222222222222',
        amount: '0.5',
        tokenSymbol: 'ETH',
        status: 'confirmed',
        timestamp: new Date('2023-12-02'),
        isIncoming: false,
        usdValue: 800,
        category: 'transfer'
      },
      {
        walletId,
        network: 'ethereum',
        txHash: '0xghi789',
        fromAddress: '0x3333333333333333333333333333333333333333',
        toAddress: '0x1234567890123456789012345678901234567890',
        amount: '100',
        tokenSymbol: 'USDC',
        tokenAddress: '0xa0b86a33e6b8b2e8f3f3b4b4b4b4b4b4b4b4b4b4',
        status: 'confirmed',
        timestamp: new Date('2023-12-03'),
        isIncoming: true,
        usdValue: 100,
        category: 'transfer'
      },
      {
        walletId,
        network: 'bitcoin',
        txHash: 'btc123abc',
        fromAddress: 'bc1test1',
        toAddress: 'bc1test2',
        amount: '0.01',
        tokenSymbol: 'BTC',
        status: 'pending',
        timestamp: new Date('2023-12-04'),
        isIncoming: false,
        usdValue: 420,
        category: 'transfer'
      }
    ];

    for (const txData of transactionData) {
      const transaction = await prisma.transaction.create({
        data: txData
      });
      testTransactions.push(transaction);
    }
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.transaction.deleteMany({
      where: { walletId }
    });
    await prisma.wallet.delete({
      where: { id: walletId }
    });
  });

  describe('getWalletTransactionsAdvanced', () => {
    test('should get all transactions with default pagination', async () => {
      const result = await databaseTransactionService.getWalletTransactionsAdvanced(walletId, {});

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(4);
      expect(result.total).toBe(4);
    });

    test('should filter transactions by network', async () => {
      const result = await databaseTransactionService.getWalletTransactionsAdvanced(walletId, {
        network: 'ethereum'
      });

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(3);
      expect(result.transactions.every(tx => tx.network === 'ethereum')).toBe(true);
    });

    test('should filter transactions by type (incoming/outgoing)', async () => {
      const result = await databaseTransactionService.getWalletTransactionsAdvanced(walletId, {
        type: 'incoming'
      });

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions.every(tx => tx.isIncoming === true)).toBe(true);
    });

    test('should filter transactions by status', async () => {
      const result = await databaseTransactionService.getWalletTransactionsAdvanced(walletId, {
        status: 'confirmed'
      });

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(3);
      expect(result.transactions.every(tx => tx.status === 'confirmed')).toBe(true);
    });

    test('should search transactions by hash', async () => {
      const result = await databaseTransactionService.getWalletTransactionsAdvanced(walletId, {
        search: 'abc123'
      });

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].txHash).toBe('0xabc123');
    });

    test('should filter transactions by date range', async () => {
      const result = await databaseTransactionService.getWalletTransactionsAdvanced(walletId, {
        dateFrom: '2023-12-02',
        dateTo: '2023-12-03'
      });

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(2);
    });

    test('should filter transactions by amount range', async () => {
      const result = await databaseTransactionService.getWalletTransactionsAdvanced(walletId, {
        amountMin: 0.5,
        amountMax: 1.5
      });

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(2);
    });

    test('should sort transactions by amount ascending', async () => {
      const result = await databaseTransactionService.getWalletTransactionsAdvanced(walletId, {
        sortBy: 'amount',
        sortOrder: 'asc'
      });

      expect(result.success).toBe(true);
      const amounts = result.transactions.map(tx => parseFloat(tx.amount));
      expect(amounts).toEqual([...amounts].sort((a, b) => a - b));
    });

    test('should implement pagination correctly', async () => {
      const page1Result = await databaseTransactionService.getWalletTransactionsAdvanced(walletId, {
        limit: 2,
        offset: 0
      });

      expect(page1Result.transactions).toHaveLength(2);
      expect(page1Result.hasMore).toBe(true);

      const page2Result = await databaseTransactionService.getWalletTransactionsAdvanced(walletId, {
        limit: 2,
        offset: 2
      });

      expect(page2Result.transactions).toHaveLength(2);
      expect(page2Result.hasMore).toBe(false);
    });

    test('should combine multiple filters', async () => {
      const result = await databaseTransactionService.getWalletTransactionsAdvanced(walletId, {
        network: 'ethereum',
        type: 'incoming',
        tokenSymbol: 'ETH'
      });

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].tokenSymbol).toBe('ETH');
      expect(result.transactions[0].isIncoming).toBe(true);
    });
  });

  describe('getTransactionAnalytics', () => {
    test('should get transaction analytics with default timeframe', async () => {
      const result = await databaseTransactionService.getTransactionAnalytics(walletId, {});

      expect(result.success).toBe(true);
      expect(result.analytics).toHaveProperty('timeframe', '30d');
      expect(result.analytics).toHaveProperty('overview');
      expect(result.analytics.overview).toHaveProperty('totalTransactions');
      expect(result.analytics.overview).toHaveProperty('incomingTransactions');
      expect(result.analytics.overview).toHaveProperty('outgoingTransactions');
      expect(result.analytics.overview).toHaveProperty('successRate');
    });

    test('should filter analytics by network', async () => {
      const result = await databaseTransactionService.getTransactionAnalytics(walletId, {
        network: 'ethereum'
      });

      expect(result.success).toBe(true);
      expect(result.analytics).toHaveProperty('volumeByToken');
      expect(result.analytics).toHaveProperty('topTokens');
    });

    test('should return analytics for different timeframes', async () => {
      const result = await databaseTransactionService.getTransactionAnalytics(walletId, {
        timeframe: '7d'
      });

      expect(result.success).toBe(true);
      expect(result.analytics.timeframe).toBe('7d');
    });
  });

  describe('exportTransactions', () => {
    test('should export transactions in JSON format', async () => {
      const result = await databaseTransactionService.exportTransactions(walletId, {
        format: 'json'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data).toHaveLength(4);
    });

    test('should export transactions in CSV format', async () => {
      const result = await databaseTransactionService.exportTransactions(walletId, {
        format: 'csv'
      });

      expect(result.success).toBe(true);
      expect(result.data).toContain('Date,Network,Transaction Hash');
      expect(result.data.split('\n')).toHaveLength(6); // Header + 4 data rows + empty line
    });

    test('should filter exported transactions by network', async () => {
      const result = await databaseTransactionService.exportTransactions(walletId, {
        format: 'json',
        network: 'ethereum'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data.every(tx => tx.network === 'ethereum')).toBe(true);
    });

    test('should filter exported transactions by date range', async () => {
      const result = await databaseTransactionService.exportTransactions(walletId, {
        format: 'json',
        dateFrom: '2023-12-02',
        dateTo: '2023-12-03'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });
});