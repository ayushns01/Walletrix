import express from 'express';
import priceController from '../controllers/priceController.js';

const router = express.Router();

// Specific routes must come BEFORE the catch-all /:coinId route
router.post('/multiple', priceController.getMultiplePrices);

router.get('/list/popular', priceController.getPopularPrices);

router.get('/list/trending', priceController.getTrendingCoins);

router.get('/list/top', priceController.getTopCoins);

router.get('/coin/:coinId', priceController.getCoinData);

router.get('/chart/:coinId', priceController.getPriceChart);

router.get('/search/query', priceController.searchCoins);

// Catch-all route for single coin price - must be LAST
router.get('/:coinId', priceController.getPrice);

export default router;
