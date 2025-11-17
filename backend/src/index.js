import dotenv from 'dotenv';

// Load environment variables FIRST before importing other modules
dotenv.config();

// Validate environment configuration before starting
import { requireValidEnvironment } from './middleware/validateEnv.js';
requireValidEnvironment();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimiters from './middleware/rateLimiters.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import logger, { morganStream } from './services/loggerService.js';
import { 
  requestLogger, 
  metricsCollector, 
  getMetrics, 
  getHealthStatus,
  startMetricsLogging 
} from './middleware/monitoring.js';
import walletRoutes from './routes/walletRoutes.js';
import blockchainRoutes from './routes/blockchainRoutes.js';
import tokenRoutes from './routes/tokenRoutes.js';
import priceRoutes from './routes/priceRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import authRoutes from './routes/authRoutes.js';
import databaseWalletRoutes from './routes/databaseWalletRoutes.js';
import { specs, swaggerConfig } from './config/swagger.js';
import swaggerUi from 'swagger-ui-express';
import sessionCleanupJob from './jobs/sessionCleanup.js';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration - Allow all localhost origins in development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all localhost origins
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // In production, check against whitelist
    const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Global rate limiting (fallback)
app.use(rateLimiters.global);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Monitoring and metrics
app.use(requestLogger);
app.use(metricsCollector);

// HTTP logging with winston
if (process.env.NODE_ENV !== 'test') {
  const morgan = (await import('morgan')).default;
  app.use(morgan('combined', { stream: morganStream }));
}

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Walletrix API',
    version: '1.0.0',
    status: 'running',
    message: 'Welcome to Walletrix - Cryptocurrency Wallet API',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      docs: '/api/docs',
      metrics: process.env.NODE_ENV === 'development' ? '/metrics' : 'disabled',
    },
    database: {
      connected: true,
      port: 5431,
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint with detailed monitoring
app.get('/health', (req, res) => {
  res.status(200).json(getHealthStatus());
});

// API Documentation - Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerConfig));

// Metrics endpoint (development only for security)
if (process.env.NODE_ENV === 'development') {
  app.get('/metrics', (req, res) => {
    res.status(200).json(getMetrics());
  });
}

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
        getWalletTransactions: 'GET /api/v1/transactions/wallet/:walletId',
        getAnalytics: 'GET /api/v1/transactions/wallet/:walletId/analytics',
        exportTransactions: 'GET /api/v1/transactions/wallet/:walletId/export',
      },
      backup: {
        createBackup: 'POST /api/v1/wallet-backup/:walletId/backup',
        importBackup: 'POST /api/v1/wallet-backup/import',
        exportAddresses: 'GET /api/v1/wallet-backup/:walletId/export/addresses',
        exportMnemonic: 'POST /api/v1/wallet-backup/:walletId/export/mnemonic',
        getBackupHistory: 'GET /api/v1/wallet-backup/:walletId/backups',
        validateBackup: 'POST /api/v1/wallet-backup/validate',
      },
    },
  });
});

// Use all routes with specific rate limiters
app.use('/api/v1/auth', rateLimiters.auth, authRoutes);
app.use('/api/v1/wallet', rateLimiters.walletGeneration, walletRoutes);
app.use('/api/v1/wallets', rateLimiters.databaseWallet, databaseWalletRoutes);
app.use('/api/v1/blockchain', rateLimiters.blockchainQuery, blockchainRoutes);
app.use('/api/v1/tokens', rateLimiters.tokenQuery, tokenRoutes);
app.use('/api/v1/prices', rateLimiters.priceData, priceRoutes);
app.use('/api/v1/transactions', rateLimiters.transaction, transactionRoutes);

// Import wallet backup routes
const walletBackupRoutes = await import('./routes/walletBackupRoutes.js');
app.use('/api/v1/wallet-backup', rateLimiters.backup, walletBackupRoutes.default);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    logger.info('Server started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    });
    
    console.log(`\n🚀 Walletrix API server running!`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API: http://localhost:${PORT}/api/v1`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
    }
    console.log('');
    
    // Start periodic metrics logging (every hour)
    startMetricsLogging(60);
    
    // Start session cleanup job
    sessionCleanupJob.start();
    logger.info('Session cleanup job started');
    
    // Resume transaction monitoring for pending transactions
    try {
      const { resumeMonitoring } = await import('./services/transactionMonitorService.js');
      await resumeMonitoring();
      logger.info('Transaction monitoring resumed');
    } catch (error) {
      logger.error('Failed to resume transaction monitoring', { error: error.message });
    }
  });
}

export default app;
