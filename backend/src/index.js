import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import walletRoutes from './routes/walletRoutes.js';
import blockchainRoutes from './routes/blockchainRoutes.js';
import tokenRoutes from './routes/tokenRoutes.js';
import priceRoutes from './routes/priceRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    message: 'Walletrix API v1.0.0',
    status: 'Active',
    endpoints: {
      wallet: {
        generate: 'POST /api/v1/wallet/generate',
        importMnemonic: 'POST /api/v1/wallet/import/mnemonic',
        importPrivateKey: 'POST /api/v1/wallet/import/private-key',
        deriveAccounts: 'POST /api/v1/wallet/derive-accounts',
        validateAddress: 'GET /api/v1/wallet/validate/:network/:address',
        encrypt: 'POST /api/v1/wallet/encrypt',
        decrypt: 'POST /api/v1/wallet/decrypt',
      },
      blockchain: {
        ethereumBalance: 'GET /api/v1/blockchain/ethereum/balance/:address',
        bitcoinBalance: 'GET /api/v1/blockchain/bitcoin/balance/:address',
        ethereumTransactions: 'GET /api/v1/blockchain/ethereum/transactions/:address',
        bitcoinTransactions: 'GET /api/v1/blockchain/bitcoin/transactions/:address',
        gasPrice: 'GET /api/v1/blockchain/ethereum/gas-price',
        bitcoinFeeEstimate: 'GET /api/v1/blockchain/bitcoin/fee-estimate',
        getTransaction: 'GET /api/v1/blockchain/transaction/:network/:txHash',
      },
      tokens: {
        info: 'GET /api/v1/tokens/info/:tokenAddress',
        balance: 'GET /api/v1/tokens/balance/:tokenAddress/:address',
        multipleBalances: 'POST /api/v1/tokens/balances/multiple',
        popularBalances: 'GET /api/v1/tokens/balances/popular/:address',
        popularList: 'GET /api/v1/tokens/popular',
      },
      prices: {
        getPrice: 'GET /api/v1/prices/:coinId',
        multiplePrices: 'POST /api/v1/prices/multiple',
        popularPrices: 'GET /api/v1/prices/list/popular',
        coinData: 'GET /api/v1/prices/coin/:coinId',
        chart: 'GET /api/v1/prices/chart/:coinId',
        search: 'GET /api/v1/prices/search/query',
        trending: 'GET /api/v1/prices/list/trending',
        topCoins: 'GET /api/v1/prices/list/top',
      },
      transactions: {
        sendEthereum: 'POST /api/v1/transactions/ethereum/send',
        sendToken: 'POST /api/v1/transactions/token/send',
        sendBitcoin: 'POST /api/v1/transactions/bitcoin/send',
        createEthereum: 'POST /api/v1/transactions/ethereum/create',
        createToken: 'POST /api/v1/transactions/token/create',
        createBitcoin: 'POST /api/v1/transactions/bitcoin/create',
      },
    },
  });
});

// Use all routes
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/blockchain', blockchainRoutes);
app.use('/api/v1/tokens', tokenRoutes);
app.use('/api/v1/prices', priceRoutes);
app.use('/api/v1/transactions', transactionRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Walletrix API server running!`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API: http://localhost:${PORT}/api/v1\n`);
  });
}

export default app;
