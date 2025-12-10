import transactionService from '../services/transactionService.js';
import databaseTransactionService from '../services/databaseTransactionService.js';
import transactionSecurityService from '../services/transactionSecurityService.js';

/**
 * Transaction Controller
 * Handles transaction creation and broadcasting HTTP requests
 */

class TransactionController {
  /**
   * Validate transaction before sending
   * POST /api/v1/transactions/validate
   * Body: { from, to, amount, asset, network, userId }
   */
  async validateTransaction(req, res) {
    try {
      const { from, to, amount, asset, network, userId } = req.body;

      if (!from || !to || !amount || !asset) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: from, to, amount, asset'
        });
      }

      const validation = await transactionSecurityService.validateTransaction({
        from,
        to,
        amount,
        asset,
        network: network || 'mainnet',
        userId: userId || req.userId
      });

      res.status(200).json({
        success: true,
        validation
      });
    } catch (error) {
      console.error('Error validating transaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate transaction'
      });
    }
  }

  /**
   * Send Ethereum transaction
   * POST /api/v1/transactions/ethereum/send
   * Body: { privateKey, to, value, gasLimit?, gasPrice?, nonce?, data? }
   */
  async sendEthereumTransaction(req, res) {
    try {
      const { privateKey, to, value, gasLimit, gasPrice, nonce, data, network = 'mainnet', from, userId } = req.body;

      // Validate required fields
      if (!privateKey || !to || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'privateKey, to, and value are required',
        });
      }

      // Run security validation
      const validation = await transactionSecurityService.validateTransaction({
        from: from || req.body.walletAddress,
        to,
        amount: value,
        asset: 'ETH',
        network,
        userId: userId || req.userId
      });

      // Block if validation failed
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Transaction validation failed',
          validation
        });
      }

      // Return warnings for user confirmation if high risk
      if (validation.riskLevel === 'high' || validation.riskLevel === 'critical') {
        if (!req.body.confirmedRisks) {
          return res.status(200).json({
            success: false,
            requiresConfirmation: true,
            validation,
            message: 'Transaction has security warnings. Please review and confirm.'
          });
        }
      }

      console.log('Sending ETH transaction:', {
        to,
        value,
        network,
        from: 'wallet-address-hidden',
        riskLevel: validation.riskLevel
      });

      const result = await transactionService.sendEthereumTransaction(
        privateKey,
        to,
        value,
        network
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Save the transaction to the database
      if (result.success && req.body.walletId) {
        databaseTransactionService.createTransactionFromBroadcast(req.body.walletId, {
          txHash: result.txHash,
          fromAddress: result.from,
          toAddress: result.to,
          amount: value,
          network: network,
        }).catch(err => console.error('Failed to save transaction to DB:', err)); // Log error but don't block response
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in sendEthereumTransaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send Ethereum transaction',
      });
    }
  }

  /**
   * Send ERC-20 token transaction
   * POST /api/v1/transactions/token/send
   * Body: { privateKey, tokenAddress, to, amount, gasLimit?, gasPrice?, nonce? }
   */
  async sendTokenTransaction(req, res) {
    try {
      const { privateKey, tokenAddress, to, amount, decimals, network = 'mainnet', walletId, from, userId } = req.body;

      // Validate required fields
      if (!privateKey || !tokenAddress || !to || !amount) {
        return res.status(400).json({
          success: false,
          error: 'privateKey, tokenAddress, to, and amount are required',
        });
      }

      // Run security validation
      const validation = await transactionSecurityService.validateTransaction({
        from: from || req.body.walletAddress,
        to,
        amount,
        asset: 'TOKEN',
        network,
        userId: userId || req.userId
      });

      // Block if validation failed
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Transaction validation failed',
          validation
        });
      }

      // Return warnings for high-risk transactions
      if (validation.riskLevel === 'high' || validation.riskLevel === 'critical') {
        if (!req.body.confirmedRisks) {
          return res.status(200).json({
            success: false,
            requiresConfirmation: true,
            validation,
            message: 'Transaction has security warnings. Please review and confirm.'
          });
        }
      }

      const result = await transactionService.sendTokenTransaction(
        privateKey,
        tokenAddress,
        to,
        amount,
        decimals,
        network
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Save the transaction to the database
      if (result.success && walletId) {
        databaseTransactionService.createTransactionFromBroadcast(walletId, {
          txHash: result.txHash,
          fromAddress: result.from,
          toAddress: result.to,
          amount: amount,
          network: network,
          tokenSymbol: result.tokenSymbol, // Assuming service returns this
          tokenAddress: tokenAddress,
        }).catch(err => console.error('Failed to save token transaction to DB:', err));
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in sendTokenTransaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send token transaction',
      });
    }
  }

  /**
   * Send Bitcoin transaction
   * POST /api/v1/transactions/bitcoin/send
   * Body: { privateKey, to, amount, feeRate? }
   */
  async sendBitcoinTransaction(req, res) {
    try {
      const { privateKey, to, amount, feeRate, network = 'mainnet', walletId, confirmed = false } = req.body;

      // Validate required fields
      if (!privateKey || !to || !amount) {
        return res.status(400).json({
          success: false,
          error: 'privateKey, to, and amount are required',
        });
      }

      // Security validation
      const validation = await transactionSecurityService.validateTransaction({
        network: 'bitcoin',
        from: null, // Will be derived from private key
        to,
        amount,
        walletId
      });

      // Block transaction if validation failed
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Transaction validation failed',
          validation
        });
      }

      // Require confirmation for high-risk transactions
      if ((validation.riskLevel === 'high' || validation.riskLevel === 'critical') && !confirmed) {
        return res.status(200).json({
          success: false,
          requiresConfirmation: true,
          validation,
          message: 'This transaction requires confirmation due to security concerns'
        });
      }

      const result = await transactionService.sendBitcoinTransaction(
        privateKey,
        to,
        amount,
        network
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Save the transaction to the database
      if (result.success && walletId) {
        databaseTransactionService.createTransactionFromBroadcast(walletId, {
          txHash: result.txHash,
          fromAddress: result.from,
          toAddress: result.to,
          amount: amount,
          network: network,
          tokenSymbol: 'BTC',
        }).catch(err => console.error('Failed to save BTC transaction to DB:', err));
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in sendBitcoinTransaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send Bitcoin transaction',
      });
    }
  }

  /**
   * Create Ethereum transaction (without sending)
   * POST /api/v1/transactions/ethereum/create
   * Body: { privateKey, to, value, gasLimit?, gasPrice?, nonce?, data? }
   */
  async createEthereumTransaction(req, res) {
    try {
      const { privateKey, to, value, gasLimit, gasPrice, nonce, data } = req.body;

      // Validate required fields
      if (!privateKey || !to || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'privateKey, to, and value are required',
        });
      }

      const result = await transactionService.createEthereumTransaction(
        privateKey,
        to,
        value,
        gasLimit,
        gasPrice,
        nonce,
        data
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in createEthereumTransaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create Ethereum transaction',
      });
    }
  }

  /**
   * Create token transaction (without sending)
   * POST /api/v1/transactions/token/create
   * Body: { privateKey, tokenAddress, to, amount, gasLimit?, gasPrice?, nonce? }
   */
  async createTokenTransaction(req, res) {
    try {
      const { privateKey, tokenAddress, to, amount, gasLimit, gasPrice, nonce } = req.body;

      // Validate required fields
      if (!privateKey || !tokenAddress || !to || !amount) {
        return res.status(400).json({
          success: false,
          error: 'privateKey, tokenAddress, to, and amount are required',
        });
      }

      const result = await transactionService.createTokenTransaction(
        privateKey,
        tokenAddress,
        to,
        amount,
        gasLimit,
        gasPrice,
        nonce
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in createTokenTransaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create token transaction',
      });
    }
  }

  /**
   * Create Bitcoin transaction (without sending)
   * POST /api/v1/transactions/bitcoin/create
   * Body: { privateKey, to, amount, feeRate? }
   */
  async createBitcoinTransaction(req, res) {
    try {
      const { privateKey, to, amount, feeRate } = req.body;

      // Validate required fields
      if (!privateKey || !to || !amount) {
        return res.status(400).json({
          success: false,
          error: 'privateKey, to, and amount are required',
        });
      }

      const result = await transactionService.createBitcoinTransaction(
        privateKey,
        to,
        amount,
        feeRate
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in createBitcoinTransaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create Bitcoin transaction',
      });
    }
  }

  /**
   * Get transaction status
   * GET /api/v1/transactions/:transactionId/status
   */
  async getTransactionStatus(req, res) {
    try {
      const { transactionId } = req.params;
      
      const { getTransactionDetails } = await import('../services/transactionMonitorService.js');
      const transaction = await getTransactionDetails(transactionId);
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
        });
      }
      
      res.status(200).json({
        success: true,
        transaction,
      });
    } catch (error) {
      console.error('Error getting transaction status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction status',
      });
    }
  }

  /**
   * Get all pending transactions
   * GET /api/v1/transactions/pending
   */
  async getPendingTransactions(req, res) {
    try {
      const { getPendingTransactions } = await import('../services/transactionMonitorService.js');
      const transactions = await getPendingTransactions();
      
      res.status(200).json({
        success: true,
        count: transactions.length,
        transactions,
      });
    } catch (error) {
      console.error('Error getting pending transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pending transactions',
      });
    }
  }

  /**
   * Get monitoring status
   * GET /api/v1/transactions/monitoring/status
   */
  async getMonitoringStatus(req, res) {
    try {
      const { getMonitoringStatus } = await import('../services/transactionMonitorService.js');
      const status = getMonitoringStatus();
      
      res.status(200).json({
        success: true,
        ...status,
      });
    } catch (error) {
      console.error('Error getting monitoring status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get monitoring status',
      });
    }
  }

  /**
   * Get wallet transactions with advanced filtering, search, pagination and sorting
   * GET /api/v1/transactions/wallet/:walletId
   * Query params: page, limit, network, status, type, sortBy, sortOrder, search, dateFrom, dateTo, amountMin, amountMax
   */
  async getWalletTransactions(req, res) {
    try {
      const { walletId } = req.params;
      const {
        page = 1,
        limit = 20,
        network,
        status,
        type, // 'incoming', 'outgoing'
        sortBy = 'timestamp',
        sortOrder = 'desc',
        search,
        dateFrom,
        dateTo,
        amountMin,
        amountMax,
        tokenSymbol,
        category
      } = req.query;

      // Validation
      if (!walletId) {
        return res.status(400).json({
          success: false,
          error: 'Wallet ID is required',
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // Valid sort fields
      const validSortFields = ['timestamp', 'amount', 'status', 'network', 'gasUsed'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'timestamp';
      const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

      const databaseTransactionService = await import('../services/databaseTransactionService.js');
      const result = await databaseTransactionService.default.getWalletTransactionsAdvanced(walletId, {
        limit: limitNum,
        offset,
        network,
        status,
        type,
        sortBy: sortField,
        sortOrder: sortDirection,
        search,
        dateFrom,
        dateTo,
        amountMin: amountMin ? parseFloat(amountMin) : null,
        amountMax: amountMax ? parseFloat(amountMax) : null,
        tokenSymbol,
        category
      });

      if (!result.success) {
        return res.status(500).json(result);
      }

      // Calculate pagination metadata
      const totalPages = Math.ceil(result.total / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPreviousPage = pageNum > 1;

      res.status(200).json({
        success: true,
        data: {
          transactions: result.transactions,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems: result.total,
            itemsPerPage: limitNum,
            hasNextPage,
            hasPreviousPage,
            nextPage: hasNextPage ? pageNum + 1 : null,
            previousPage: hasPreviousPage ? pageNum - 1 : null
          },
          filters: {
            network,
            status,
            type,
            tokenSymbol,
            category,
            search,
            dateFrom,
            dateTo,
            amountMin,
            amountMax
          },
          sorting: {
            sortBy: sortField,
            sortOrder: sortDirection
          }
        }
      });
    } catch (error) {
      console.error('Error getting wallet transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get wallet transactions',
      });
    }
  }

  /**
   * Get transaction statistics and analytics
   * GET /api/v1/transactions/wallet/:walletId/analytics
   * Query params: network, timeframe (7d, 30d, 90d, 1y), currency
   */
  async getTransactionAnalytics(req, res) {
    try {
      const { walletId } = req.params;
      const { network, timeframe = '30d', currency = 'USD' } = req.query;

      if (!walletId) {
        return res.status(400).json({
          success: false,
          error: 'Wallet ID is required',
        });
      }

      const databaseTransactionService = await import('../services/databaseTransactionService.js');
      const result = await databaseTransactionService.default.getTransactionAnalytics(walletId, {
        network,
        timeframe,
        currency
      });

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json({
        success: true,
        data: result.analytics
      });
    } catch (error) {
      console.error('Error getting transaction analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction analytics',
      });
    }
  }

  /**
   * Export transactions in various formats
   * GET /api/v1/transactions/wallet/:walletId/export
   * Query params: format (csv, json), network, dateFrom, dateTo
   */
  async exportTransactions(req, res) {
    try {
      const { walletId } = req.params;
      const { format = 'json', network, dateFrom, dateTo } = req.query;

      if (!walletId) {
        return res.status(400).json({
          success: false,
          error: 'Wallet ID is required',
        });
      }

      if (!['csv', 'json'].includes(format)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid format. Supported formats: csv, json',
        });
      }

      const databaseTransactionService = await import('../services/databaseTransactionService.js');
      const result = await databaseTransactionService.default.exportTransactions(walletId, {
        format,
        network,
        dateFrom,
        dateTo
      });

      if (!result.success) {
        return res.status(500).json(result);
      }

      // Set appropriate headers
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `transactions_${walletId}_${timestamp}.${format}`;

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.send(result.data);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.json({
          success: true,
          exported_at: new Date().toISOString(),
          wallet_id: walletId,
          filters: { network, dateFrom, dateTo },
          data: result.data
        });
      }
    } catch (error) {
      console.error('Error exporting transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export transactions',
      });
    }
  }

  /**
   * Start monitoring a transaction
   * POST /api/v1/transactions/:transactionId/monitor
   */
  async startTransactionMonitoring(req, res) {
    try {
      const { transactionId } = req.params;
      const { txHash, network } = req.body;
      
      if (!txHash || !network) {
        return res.status(400).json({
          success: false,
          error: 'txHash and network are required',
        });
      }
      
      const { startMonitoring } = await import('../services/transactionMonitorService.js');
      await startMonitoring(transactionId, txHash, network);
      
      res.status(200).json({
        success: true,
        message: 'Transaction monitoring started',
      });
    } catch (error) {
      console.error('Error starting transaction monitoring:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start transaction monitoring',
      });
    }
  }

  /**
   * Stop monitoring a transaction
   * POST /api/v1/transactions/:transactionId/stop-monitoring
   */
  async stopTransactionMonitoring(req, res) {
    try {
      const { transactionId } = req.params;
      
      const { stopMonitoring } = await import('../services/transactionMonitorService.js');
      stopMonitoring(transactionId);
      
      res.status(200).json({
        success: true,
        message: 'Transaction monitoring stopped',
      });
    } catch (error) {
      console.error('Error stopping transaction monitoring:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop transaction monitoring',
      });
    }
  }
}

export default new TransactionController();
