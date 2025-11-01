import express from 'express';
import priceController from '../controllers/priceController.js';

const router = express.Router();

/**
 * Price Routes
 * Handles cryptocurrency price and market data requests
 */

// Get price for a specific cryptocurrency
router.get('/:coinId', priceController.getPrice);

// Get multiple prices
router.post('/multiple', priceController.getMultiplePrices);

// Get popular crypto prices
router.get('/list/popular', priceController.getPopularPrices);

// Get detailed coin data
router.get('/coin/:coinId', priceController.getCoinData);

// Get price chart data
router.get('/chart/:coinId', priceController.getPriceChart);

// Search for cryptocurrencies
router.get('/search/query', priceController.searchCoins);

// Get trending coins
router.get('/list/trending', priceController.getTrendingCoins);

// Get top coins by market cap
router.get('/list/top', priceController.getTopCoins);

export default router;
