import tokenService from '../services/tokenService.js';

/**
 * Token Controller
 * Handles ERC-20 token HTTP requests
 */

class TokenController {
  /**
   * Get token info
   * GET /api/v1/tokens/info/:address
   */
  async getTokenInfo(req, res) {
    try {
      const { address } = req.params;
      const { network = 'mainnet' } = req.query;

      const result = await tokenService.getTokenInfo(address, network);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getTokenInfo:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get token info',
      });
    }
  }

  /**
   * Get token balance
   * GET /api/v1/tokens/balance/:tokenAddress/:walletAddress
   */
  async getTokenBalance(req, res) {
    try {
      const { tokenAddress, walletAddress } = req.params;
      const { network = 'mainnet' } = req.query;

      const result = await tokenService.getTokenBalance(tokenAddress, walletAddress, network);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getTokenBalance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get token balance',
      });
    }
  }

  /**
   * Get multiple token balances
   * POST /api/v1/tokens/balances
   * Body: { walletAddress, tokenAddresses[], network? }
   */
  async getMultipleBalances(req, res) {
    try {
      const { walletAddress, tokenAddresses, network = 'mainnet' } = req.body;

      if (!walletAddress || !tokenAddresses) {
        return res.status(400).json({
          success: false,
          error: 'walletAddress and tokenAddresses are required',
        });
      }

      const result = await tokenService.getMultipleTokenBalances(
        walletAddress,
        tokenAddresses,
        network
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getMultipleBalances:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get token balances',
      });
    }
  }

  /**
   * Get popular token balances for a wallet
   * GET /api/v1/tokens/popular/:walletAddress
   */
  async getPopularTokenBalances(req, res) {
    try {
      const { walletAddress } = req.params;
      const { network = 'mainnet' } = req.query;

      const result = await tokenService.getPopularTokenBalances(walletAddress, network);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getPopularTokenBalances:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular token balances',
      });
    }
  }

  /**
   * Get list of popular tokens
   * GET /api/v1/tokens/popular
   */
  getPopularTokens(req, res) {
    try {
      const result = tokenService.getPopularTokens();
      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getPopularTokens:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular tokens',
      });
    }
  }
}

export default new TokenController();
