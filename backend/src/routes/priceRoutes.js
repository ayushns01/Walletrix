import express from 'express';
import priceController from '../controllers/priceController.js';

const router = express.Router();

router.get('/:coinId', priceController.getPrice);

router.post('/multiple', priceController.getMultiplePrices);

router.get('/list/popular', priceController.getPopularPrices);

router.get('/coin/:coinId', priceController.getCoinData);

router.get('/chart/:coinId', priceController.getPriceChart);

router.get('/search/query', priceController.searchCoins);

router.get('/list/trending', priceController.getTrendingCoins);

router.get('/list/top', priceController.getTopCoins);

export default router;
