import priceService from '../services/priceService.js';

/**
 * Price Controller
 * Handles cryptocurrency price and market data HTTP requests
 */

class PriceController {
  /**
   * Get price for a cryptocurrency
   * GET /api/v1/prices/:coinId
   */
  async getPrice(req, res) {
    try {
      const { coinId } = req.params;
      const { currency = 'usd' } = req.query;

      const result = await priceService.getPrice(coinId, currency);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getPrice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get price',
      });
    }
  }

  /**
   * Get multiple prices
   * POST /api/v1/prices/multiple
   * Body: { coinIds[], currency? }
   */
  async getMultiplePrices(req, res) {
    try {
      const { coinIds, currency = 'usd' } = req.body;

      if (!coinIds || !Array.isArray(coinIds)) {
        return res.status(400).json({
          success: false,
          error: 'coinIds array is required',
        });
      }

      const result = await priceService.getMultiplePrices(coinIds, currency);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getMultiplePrices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get prices',
      });
    }
  }

  /**
   * Get popular crypto prices
   * GET /api/v1/prices/popular
   */
  async getPopularPrices(req, res) {
    try {
      const { currency = 'usd' } = req.query;

      const result = await priceService.getPopularPrices(currency);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getPopularPrices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular prices',
      });
    }
  }

  /**
   * Get detailed coin data
   * GET /api/v1/prices/coin/:coinId
   */
  async getCoinData(req, res) {
    try {
      const { coinId } = req.params;

      const result = await priceService.getCoinData(coinId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getCoinData:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get coin data',
      });
    }
  }

  /**
   * Get price chart data
   * GET /api/v1/prices/chart/:coinId
   */
  async getPriceChart(req, res) {
    try {
      const { coinId } = req.params;
      const { currency = 'usd', days = 7 } = req.query;

      const result = await priceService.getPriceChart(coinId, currency, parseInt(days));

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getPriceChart:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get price chart',
      });
    }
  }

  /**
   * Search for cryptocurrencies
   * GET /api/v1/prices/search
   */
  async searchCoins(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
      }

      const result = await priceService.searchCoins(q);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in searchCoins:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search coins',
      });
    }
  }

  /**
   * Get trending coins
   * GET /api/v1/prices/trending
   */
  async getTrendingCoins(req, res) {
    try {
      const result = await priceService.getTrendingCoins();

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getTrendingCoins:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trending coins',
      });
    }
  }

  /**
   * Get top coins by market cap
   * GET /api/v1/prices/top
   */
  async getTopCoins(req, res) {
    try {
      const { currency = 'usd', limit = 10 } = req.query;

      const result = await priceService.getTopCoins(currency, parseInt(limit));

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getTopCoins:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get top coins',
      });
    }
  }
}

export default new PriceController();
