import transactionService from '../services/transactionService.js';

/**
 * Transaction Controller
 * Handles transaction creation and broadcasting HTTP requests
 */

class TransactionController {
  /**
   * Send Ethereum transaction
   * POST /api/v1/transactions/ethereum/send
   * Body: { privateKey, to, value, gasLimit?, gasPrice?, nonce?, data? }
   */
  async sendEthereumTransaction(req, res) {
    try {
      const { privateKey, to, value, gasLimit, gasPrice, nonce, data, network = 'mainnet' } = req.body;

      // Validate required fields
      if (!privateKey || !to || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'privateKey, to, and value are required',
        });
      }

      console.log('Sending ETH transaction:', {
        to,
        value,
        network,
        from: 'wallet-address-hidden'
      });

      const result = await transactionService.sendEthereumTransaction(
        privateKey,
        to,
        value,
        network
      );

      console.log('Transaction result:', {
        success: result.success,
        txHash: result.txHash,
        error: result.error
      });

      if (!result.success) {
        return res.status(400).json(result);
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
      const { privateKey, tokenAddress, to, amount, gasLimit, gasPrice, nonce } = req.body;

      // Validate required fields
      if (!privateKey || !tokenAddress || !to || !amount) {
        return res.status(400).json({
          success: false,
          error: 'privateKey, tokenAddress, to, and amount are required',
        });
      }

      const result = await transactionService.sendTokenTransaction(
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
      const { privateKey, to, amount, feeRate } = req.body;

      // Validate required fields
      if (!privateKey || !to || !amount) {
        return res.status(400).json({
          success: false,
          error: 'privateKey, to, and amount are required',
        });
      }

      const result = await transactionService.sendBitcoinTransaction(
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
}

export default new TransactionController();
