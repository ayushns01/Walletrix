import prisma from '../lib/prisma.js';

class DatabaseTransactionService {
  /**
   * Create a new transaction record from a broadcasted transaction
   */
  async createTransactionFromBroadcast(walletId, txData) {
    try {
      const { txHash, fromAddress, toAddress, amount, network, tokenSymbol, tokenAddress, tokenDecimals } = txData;

      const transaction = await prisma.transaction.create({
        data: {
          walletId,
          network,
          txHash,
          fromAddress: fromAddress.toLowerCase(),
          toAddress: toAddress.toLowerCase(),
          amount,
          tokenSymbol: tokenSymbol || (network === 'bitcoin' ? 'BTC' : 'ETH'),
          tokenAddress: tokenAddress?.toLowerCase(),
          tokenDecimals: tokenDecimals || 18,
          status: 'pending', // Transactions are pending until confirmed
          timestamp: new Date(),
          isIncoming: false, // Outgoing transaction
          category: 'transfer',
        }
      });

      return { success: true, transaction };
    } catch (error) {
      console.error('Error creating transaction from broadcast:', error);
      // Don't block the main flow, just log the error
      return { success: false, error: error.message };
    }
  }

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
          usdValueAtTime: transactionData.usdValueAtTime || transactionData.usdValue,
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

  /**
   * Get wallet transactions with advanced filtering, search, pagination and sorting
   */
  async getWalletTransactionsAdvanced(walletId, options = {}) {
    try {
      const {
        network = null,
        status = null,
        type = null, // 'incoming', 'outgoing'
        limit = 20,
        offset = 0,
        sortBy = 'timestamp',
        sortOrder = 'desc',
        search = null,
        dateFrom = null,
        dateTo = null,
        amountMin = null,
        amountMax = null,
        tokenSymbol = null,
        category = null
      } = options;

      // Build WHERE clause
      const whereClause = { walletId };

      // Network filter
      if (network) {
        whereClause.network = network;
      }

      // Status filter
      if (status) {
        whereClause.status = status;
      }

      // Type filter (incoming/outgoing)
      if (type === 'incoming') {
        whereClause.isIncoming = true;
      } else if (type === 'outgoing') {
        whereClause.isIncoming = false;
      }

      // Token symbol filter
      if (tokenSymbol) {
        whereClause.tokenSymbol = tokenSymbol;
      }

      // Category filter
      if (category) {
        whereClause.category = category;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        whereClause.timestamp = {};
        if (dateFrom) {
          whereClause.timestamp.gte = new Date(dateFrom);
        }
        if (dateTo) {
          whereClause.timestamp.lte = new Date(dateTo);
        }
      }

      // Amount range filter
      if (amountMin !== null || amountMax !== null) {
        whereClause.amount = {};
        if (amountMin !== null) {
          whereClause.amount.gte = amountMin.toString();
        }
        if (amountMax !== null) {
          whereClause.amount.lte = amountMax.toString();
        }
      }

      // Search filter (across multiple fields)
      if (search) {
        const searchTerm = search.toLowerCase();
        whereClause.OR = [
          { txHash: { contains: searchTerm, mode: 'insensitive' } },
          { fromAddress: { contains: searchTerm, mode: 'insensitive' } },
          { toAddress: { contains: searchTerm, mode: 'insensitive' } },
          { tokenSymbol: { contains: searchTerm, mode: 'insensitive' } },
          { category: { contains: searchTerm, mode: 'insensitive' } }
        ];
      }

      // Build ORDER BY clause
      const orderBy = {};
      orderBy[sortBy] = sortOrder;

      const transactions = await prisma.transaction.findMany({
        where: whereClause,
        orderBy,
        take: limit,
        skip: offset,
        select: {
          id: true,
          network: true,
          txHash: true,
          fromAddress: true,
          toAddress: true,
          amount: true,
          tokenSymbol: true,
          tokenAddress: true,
          tokenDecimals: true,
          status: true,
          blockNumber: true,
          gasUsed: true,
          gasPrice: true,
          nonce: true,
          transactionFee: true,
          timestamp: true,
          isIncoming: true,
          usdValueAtTime: true,
          category: true,
          metadata: true,
          createdAt: true,
          updatedAt: true
        }
      });

      const total = await prisma.transaction.count({ where: whereClause });

      // Convert BigInt fields to strings for JSON serialization
      const serializedTransactions = transactions.map(tx => ({
        ...tx,
        blockNumber: tx.blockNumber ? tx.blockNumber.toString() : null,
        gasUsed: tx.gasUsed ? tx.gasUsed.toString() : null
      }));

      return {
        success: true,
        transactions: serializedTransactions,
        total,
        hasMore: offset + limit < total
      };
    } catch (error) {
      console.error('Error getting wallet transactions with advanced filtering:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get transaction analytics and statistics
   */
  async getTransactionAnalytics(walletId, options = {}) {
    try {
      const { network = null, timeframe = '30d', currency = 'USD' } = options;

      // Calculate date range based on timeframe
      const now = new Date();
      let dateFrom;
      
      switch (timeframe) {
        case '7d':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const whereClause = {
        walletId,
        timestamp: {
          gte: dateFrom,
          lte: now
        }
      };

      if (network) {
        whereClause.network = network;
      }

      // Get basic statistics
      const totalTransactions = await prisma.transaction.count({ where: whereClause });
      const incomingTransactions = await prisma.transaction.count({
        where: { ...whereClause, isIncoming: true }
      });
      const outgoingTransactions = await prisma.transaction.count({
        where: { ...whereClause, isIncoming: false }
      });

      // Get transaction volume by token
      const volumeByToken = await prisma.transaction.groupBy({
        by: ['tokenSymbol', 'isIncoming'],
        where: whereClause,
        _sum: {
          usdValueAtTime: true
        },
        _count: {
          id: true
        }
      });

      // Calculate daily transaction counts
      let dailyTransactions;
      if (network) {
        dailyTransactions = await prisma.$queryRawUnsafe(`
          SELECT 
            DATE(timestamp) as date,
            COUNT(*) as count,
            COALESCE(SUM(CASE WHEN is_incoming = true THEN COALESCE(usd_value_at_time, 0) ELSE 0 END), 0) as incoming_volume,
            COALESCE(SUM(CASE WHEN is_incoming = false THEN COALESCE(usd_value_at_time, 0) ELSE 0 END), 0) as outgoing_volume
          FROM transactions
          WHERE wallet_id = $1
            AND timestamp >= $2
            AND timestamp <= $3
            AND network = $4
          GROUP BY DATE(timestamp)
          ORDER BY date DESC
          LIMIT 30
        `, walletId, dateFrom, now, network);
      } else {
        dailyTransactions = await prisma.$queryRawUnsafe(`
          SELECT 
            DATE(timestamp) as date,
            COUNT(*) as count,
            COALESCE(SUM(CASE WHEN is_incoming = true THEN COALESCE(usd_value_at_time, 0) ELSE 0 END), 0) as incoming_volume,
            COALESCE(SUM(CASE WHEN is_incoming = false THEN COALESCE(usd_value_at_time, 0) ELSE 0 END), 0) as outgoing_volume
          FROM transactions
          WHERE wallet_id = $1
            AND timestamp >= $2
            AND timestamp <= $3
          GROUP BY DATE(timestamp)
          ORDER BY date DESC
          LIMIT 30
        `, walletId, dateFrom, now);
      }

      // Get top token interactions
      const topTokens = await prisma.transaction.groupBy({
        by: ['tokenSymbol'],
        where: whereClause,
        _count: {
          id: true
        },
        _sum: {
          usdValueAtTime: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 10
      });

      // Calculate success rate
      const successfulTransactions = await prisma.transaction.count({
        where: { ...whereClause, status: 'confirmed' }
      });
      const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

      return {
        success: true,
        analytics: {
          timeframe,
          dateRange: {
            from: dateFrom.toISOString(),
            to: now.toISOString()
          },
          overview: {
            totalTransactions,
            incomingTransactions,
            outgoingTransactions,
            successRate: Math.round(successRate * 100) / 100
          },
          volumeByToken: volumeByToken.map(item => ({
            token: item.tokenSymbol,
            direction: item.isIncoming ? 'incoming' : 'outgoing',
            volume: item._sum.usdValueAtTime || 0,
            count: item._count.id
          })),
          dailyActivity: dailyTransactions.map(item => ({
            date: item.date,
            count: Number(item.count),
            incomingVolume: Number(item.incoming_volume) || 0,
            outgoingVolume: Number(item.outgoing_volume) || 0
          })),
          topTokens: topTokens.map(item => ({
            token: item.tokenSymbol,
            transactionCount: item._count.id,
            totalVolume: item._sum.usdValueAtTime || 0
          }))
        }
      };
    } catch (error) {
      console.error('Error getting transaction analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export transactions in different formats
   */
  async exportTransactions(walletId, options = {}) {
    try {
      const { format = 'json', network = null, dateFrom = null, dateTo = null } = options;

      const whereClause = { walletId };
      if (network) whereClause.network = network;
      
      if (dateFrom || dateTo) {
        whereClause.timestamp = {};
        if (dateFrom) whereClause.timestamp.gte = new Date(dateFrom);
        if (dateTo) whereClause.timestamp.lte = new Date(dateTo);
      }

      const transactions = await prisma.transaction.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' }
      });

      // Convert BigInt fields to strings for serialization
      const serializedTransactions = transactions.map(tx => ({
        ...tx,
        blockNumber: tx.blockNumber ? tx.blockNumber.toString() : null,
        gasUsed: tx.gasUsed ? tx.gasUsed.toString() : null
      }));

      if (format === 'csv') {
        // Convert to CSV format
        if (serializedTransactions.length === 0) {
          return {
            success: true,
            data: 'No transactions found for the specified criteria'
          };
        }

        const headers = [
          'Date',
          'Network',
          'Transaction Hash',
          'From Address',
          'To Address',
          'Amount',
          'Token Symbol',
          'Status',
          'Block Number',
          'Gas Used',
          'Gas Price',
          'USD Value',
          'Direction',
          'Category'
        ];

        const csvRows = [headers.join(',')];
        
        serializedTransactions.forEach(tx => {
          const row = [
            tx.timestamp.toISOString(),
            tx.network,
            tx.txHash,
            tx.fromAddress,
            tx.toAddress,
            tx.amount,
            tx.tokenSymbol,
            tx.status,
            tx.blockNumber || '',
            tx.gasUsed || '',
            tx.gasPrice || '',
            tx.usdValueAtTime || '',
            tx.isIncoming ? 'Incoming' : 'Outgoing',
            tx.category
          ].map(field => `"${String(field).replace(/"/g, '""')}"`);
          
          csvRows.push(row.join(','));
        });

        return {
          success: true,
          data: csvRows.join('\n')
        };
      } else {
        // Return JSON format
        return {
          success: true,
          data: serializedTransactions
        };
      }
    } catch (error) {
      console.error('Error exporting transactions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new DatabaseTransactionService();