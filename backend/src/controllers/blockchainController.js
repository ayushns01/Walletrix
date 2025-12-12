import ethereumService from '../services/ethereumService.js';
import bitcoinService from '../services/bitcoinService.js';
import solanaService from '../services/solanaService.js';

/**
 * Blockchain Controller
 * Handles blockchain-related HTTP requests
 */

class BlockchainController {
  /**
   * Get Ethereum balance
   * GET /api/v1/blockchain/ethereum/balance/:address
   */
  async getEthereumBalance(req, res) {
    try {
      const { address } = req.params;
      const { network = 'mainnet' } = req.query;

      const result = await ethereumService.getBalance(address, network);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getEthereumBalance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Ethereum balance',
      });
    }
  }

  /**
   * Get Bitcoin balance
   * GET /api/v1/blockchain/bitcoin/balance/:address
   */
  async getBitcoinBalance(req, res) {
    try {
      const { address } = req.params;
      const { network = 'mainnet' } = req.query;

      const result = await bitcoinService.getBalance(address, network);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getBitcoinBalance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Bitcoin balance',
      });
    }
  }

  /**
   * Get Solana balance
   * GET /api/v1/blockchain/solana/balance/:address
   */
  async getSolanaBalance(req, res) {
    try {
      const { address } = req.params;
      const { network = 'mainnet-beta' } = req.query;

      const result = await solanaService.getBalance(address, network);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getSolanaBalance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Solana balance',
      });
    }
  }

  /**
   * Get Ethereum transaction history
   * GET /api/v1/blockchain/ethereum/transactions/:address
   */
  async getEthereumTransactions(req, res) {
    try {
      const { address } = req.params;
      const { network = 'mainnet' } = req.query;

      const result = await ethereumService.getTransactionHistory(address, network);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getEthereumTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction history',
      });
    }
  }

  /**
   * Get Bitcoin transaction history
   * GET /api/v1/blockchain/bitcoin/transactions/:address
   */
  async getBitcoinTransactions(req, res) {
    try {
      const { address } = req.params;
      const { network = 'mainnet', limit = 50 } = req.query;

      const result = await bitcoinService.getTransactionHistory(address, network, parseInt(limit));

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getBitcoinTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction history',
      });
    }
  }

  /**
   * Get Ethereum gas price
   * GET /api/v1/blockchain/ethereum/gas-price
   */
  async getGasPrice(req, res) {
    try {
      const { network = 'mainnet' } = req.query;

      const result = await ethereumService.getGasPrice(network);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getGasPrice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get gas price',
      });
    }
  }

  /**
   * Get Bitcoin fee estimate
   * GET /api/v1/blockchain/bitcoin/fee-estimate
   */
  async getBitcoinFeeEstimate(req, res) {
    try {
      const { network = 'mainnet' } = req.query;

      const result = await bitcoinService.getFeeEstimate(network);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getBitcoinFeeEstimate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get fee estimate',
      });
    }
  }

  /**
   * Get transaction details
   * GET /api/v1/blockchain/:chain/transaction/:txHash
   */
  async getTransaction(req, res) {
    try {
      const { chain, txHash } = req.params;
      const { network = 'mainnet' } = req.query;

      let result;
      if (chain === 'ethereum' || chain === 'eth') {
        result = await ethereumService.getTransaction(txHash, network);
      } else if (chain === 'bitcoin' || chain === 'btc') {
        result = await bitcoinService.getTransaction(txHash, network);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid blockchain. Use "ethereum" or "bitcoin"',
        });
      }

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getTransaction:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction',
      });
    }
  }
}

export default new BlockchainController();
