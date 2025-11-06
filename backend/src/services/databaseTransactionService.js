import prisma from '../lib/prisma.js';

class DatabaseTransactionService {
  /**
   * Cache transaction from blockchain
   */
  async cacheTransaction(walletId, transactionData) {
    try {
      // Check if transaction already exists
      const existingTx = await prisma.transaction.findUnique({
        where: { txHash: transactionData.txHash }
      });

      if (existingTx) {
        return { success: true, transaction: existingTx, cached: false };
      }

      // Create new transaction record
      const transaction = await prisma.transaction.create({
        data: {
          walletId,
          network: transactionData.network,
          txHash: transactionData.txHash,
          fromAddress: transactionData.fromAddress.toLowerCase(),
          toAddress: transactionData.toAddress.toLowerCase(),
          amount: transactionData.amount,
          tokenSymbol: transactionData.tokenSymbol || 'ETH',
          tokenAddress: transactionData.tokenAddress?.toLowerCase(),
          status: transactionData.status,
          blockNumber: transactionData.blockNumber ? BigInt(transactionData.blockNumber) : null,
          gasUsed: transactionData.gasUsed ? BigInt(transactionData.gasUsed) : null,
          gasPrice: transactionData.gasPrice,
          nonce: transactionData.nonce,
          timestamp: new Date(transactionData.timestamp),
          isIncoming: transactionData.isIncoming,
          usdValue: transactionData.usdValue,
          category: transactionData.category || 'transfer',
          metadata: transactionData.metadata || {}
        }
      });

      return { success: true, transaction, cached: true };
    } catch (error) {
      console.error('Error caching transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get wallet transactions from database
   */
  async getWalletTransactions(walletId, options = {}) {
    try {
      const {
        network = null,
        limit = 50,
        offset = 0,
        status = null
      } = options;

      const whereClause = { walletId };
      if (network) whereClause.network = network;
      if (status) whereClause.status = status;

      const transactions = await prisma.transaction.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      const total = await prisma.transaction.count({ where: whereClause });

      return {
        success: true,
        transactions,
        total,
        hasMore: offset + limit < total
      };
    } catch (error) {
      console.error('Error getting wallet transactions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Bulk cache transactions
   */
  async bulkCacheTransactions(walletId, transactions) {
    try {
      const results = [];
      
      for (const txData of transactions) {
        const result = await this.cacheTransaction(walletId, txData);
        results.push(result);
      }

      const cached = results.filter(r => r.cached).length;
      const total = results.length;

      return {
        success: true,
        total,
        cached,
        skipped: total - cached
      };
    } catch (error) {
      console.error('Error bulk caching transactions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new DatabaseTransactionService();