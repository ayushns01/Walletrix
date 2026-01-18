import priceService from '../services/priceService.js';

class PriceController {

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
