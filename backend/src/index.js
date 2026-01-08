import dotenv from 'dotenv';
dotenv.config();

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
import authRoutes from './routes/authRoutes.js';
import databaseWalletRoutes from './routes/databaseWalletRoutes.js';
import addressBookRoutes from './routes/addressBookRoutes.js';
import { specs, swaggerConfig } from './config/swagger.js';
import swaggerUi from 'swagger-ui-express';
import sessionCleanupJob from './jobs/sessionCleanup.js';
import securityHeadersMiddleware from './middleware/securityHeadersMiddleware.js';

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 3001;

app.set('trust proxy', true);

app.use(helmet());
app.use(securityHeadersMiddleware.allSecurityHeaders);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '').split(',').map(url => url.trim()).filter(Boolean);

    const isAllowedOrigin = allowedOrigins.indexOf(origin) !== -1 ||
      origin.includes('walletrix.vercel.app') ||
      origin.includes('walletrix-git-') ||
      origin.includes('ayushns01s-projects.vercel.app');

    if (isAllowedOrigin) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(rateLimiters.global);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(requestLogger);
app.use(metricsCollector);

if (process.env.NODE_ENV !== 'test') {
  const morgan = (await import('morgan')).default;
  app.use(morgan('combined', { stream: morganStream }));
}

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
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json(getHealthStatus());
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerConfig));

if (process.env.NODE_ENV === 'development') {
  app.get('/metrics', (req, res) => {
    res.status(200).json(getMetrics());
  });
}

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
        gasPrice: 'GET /api/v1/blockchain/ethereum/gas-price',
        bitcoinFeeEstimate: 'GET /api/v1/blockchain/bitcoin/fee-estimate',
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

app.use('/api/v1/auth', rateLimiters.auth, authRoutes);
app.use('/api/v1/wallet', rateLimiters.walletGeneration, walletRoutes);
app.use('/api/v1/wallets', rateLimiters.databaseWallet, databaseWalletRoutes);
app.use('/api/v1/blockchain', rateLimiters.blockchainQuery, blockchainRoutes);
app.use('/api/v1/tokens', rateLimiters.tokenQuery, tokenRoutes);
app.use('/api/v1/prices', rateLimiters.priceData, priceRoutes);
app.use('/api/v1/address-book', rateLimiters.global, addressBookRoutes);

const walletBackupRoutes = await import('./routes/walletBackupRoutes.js');
app.use('/api/v1/wallet-backup', rateLimiters.backup, walletBackupRoutes.default);

const bip85Routes = await import('./routes/bip85Routes.js');
app.use('/api/v1/wallet/bip85', rateLimiters.walletGeneration, bip85Routes.default);

const multiSigRoutes = await import('./routes/multiSigRoutes.js');
app.use('/api/v1/wallet/multisig', rateLimiters.walletGeneration, multiSigRoutes.default);

const notificationRoutes = await import('./routes/notificationRoutes.js');
app.use('/api/v1/notifications', rateLimiters.global, notificationRoutes.default);

app.use(notFoundHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, async () => {
    logger.info('Server started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    });

    startMetricsLogging(60);
    sessionCleanupJob.start();
    logger.info('Session cleanup job started');

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
