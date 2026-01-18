import tokenService from '../services/tokenService.js';

class TokenController {

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

  async getPopularTokenBalances(req, res) {
    try {
      const { address } = req.params;
      const { network = 'mainnet' } = req.query;

      const result = await tokenService.getPopularTokenBalances(address, network);

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
