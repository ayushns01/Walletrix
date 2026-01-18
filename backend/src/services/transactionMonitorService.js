import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import logger, { logTransaction, logBlockchain } from './loggerService.js';

const prisma = new PrismaClient();

const monitoringSessions = new Map();

export const TransactionStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  DROPPED: 'dropped',
};

export async function startMonitoring(transactionId, txHash, network, config = {}) {
  const {
    maxRetries = 100,
    pollInterval = 5000,
    confirmations = 1,
    onStatusChange = null,
  } = config;

  if (monitoringSessions.has(transactionId)) {
    logger.warn('Transaction already being monitored', { transactionId });
    return;
  }

  logger.info('Started monitoring transaction', {
    transactionId,
    txHash,
    network,
  });

  let retries = 0;
  let lastStatus = TransactionStatus.PENDING;

  const monitor = setInterval(async () => {
    try {

      const status = await checkTransactionStatus(txHash, network, confirmations);

      if (status !== lastStatus) {
        lastStatus = status;

        await updateTransactionStatus(transactionId, status);

        logTransaction('Status Updated', network, txHash, {
          status,
          retries,
        });

        if (onStatusChange) {
          onStatusChange(status, transactionId);
        }

        if ([TransactionStatus.SUCCESS, TransactionStatus.FAILED, TransactionStatus.DROPPED].includes(status)) {
          stopMonitoring(transactionId);
        }
      }

      retries++;

      if (retries >= maxRetries) {
        logger.warn('Max retries reached for transaction monitoring', {
          transactionId,
          txHash,
        });
        stopMonitoring(transactionId);
      }
    } catch (error) {
      logger.error('Error monitoring transaction', {
        error: error.message,
        transactionId,
        txHash,
      });
    }
  }, pollInterval);

  monitoringSessions.set(transactionId, {
    interval: monitor,
    txHash,
    network,
    startTime: Date.now(),
  });
}

export function stopMonitoring(transactionId) {
  const session = monitoringSessions.get(transactionId);

  if (session) {
    clearInterval(session.interval);
    monitoringSessions.delete(transactionId);

    const duration = Date.now() - session.startTime;
    logger.info('Stopped monitoring transaction', {
      transactionId,
      txHash: session.txHash,
      duration: `${(duration / 1000).toFixed(2)}s`,
    });
  }
}

async function checkTransactionStatus(txHash, network, requiredConfirmations = 1) {
  try {

    const provider = getProvider(network);

    if (!provider) {
      return TransactionStatus.PENDING;
    }

    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {

      try {
        const tx = await provider.getTransaction(txHash);
        return tx ? TransactionStatus.PENDING : TransactionStatus.DROPPED;
      } catch {
        return TransactionStatus.PENDING;
      }
    }

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber + 1;

    if (confirmations >= requiredConfirmations) {

      return receipt.status === 1
        ? TransactionStatus.SUCCESS
        : TransactionStatus.FAILED;
    }

    return TransactionStatus.CONFIRMED;
  } catch (error) {
    logger.error('Error checking transaction status', {
      error: error.message,
      txHash,
      network,
    });
    return TransactionStatus.PENDING;
  }
}

async function updateTransactionStatus(transactionId, status) {
  try {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    logger.debug('Updated transaction status in database', {
      transactionId,
      status,
    });
  } catch (error) {
    logger.error('Error updating transaction status', {
      error: error.message,
      transactionId,
      status,
    });
  }
}

function getProvider(network) {
  const providers = {
    'ethereum': process.env.ETHEREUM_RPC_URL,
    'ethereum-sepolia': process.env.ETHEREUM_SEPOLIA_RPC_URL,
    'polygon': process.env.POLYGON_RPC_URL,
    'arbitrum': process.env.ARBITRUM_RPC_URL,
    'optimism': process.env.OPTIMISM_RPC_URL,
    'base': process.env.BASE_RPC_URL,
    'bsc': process.env.BSC_RPC_URL,
    'avalanche': process.env.AVALANCHE_RPC_URL,
  };

  const rpcUrl = providers[network] || providers[network.toLowerCase()];

  if (!rpcUrl) {
    logger.warn('No RPC URL configured for network', { network });
    return null;
  }

  return new ethers.JsonRpcProvider(rpcUrl);
}

export async function getPendingTransactions() {
  try {
    return await prisma.transaction.findMany({
      where: {
        status: TransactionStatus.PENDING,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  } catch (error) {
    logger.error('Error fetching pending transactions', {
      error: error.message,
    });
    return [];
  }
}

export async function resumeMonitoring() {
  const pendingTransactions = await getPendingTransactions();

  logger.info('Resuming monitoring for pending transactions', {
    count: pendingTransactions.length,
  });

  for (const tx of pendingTransactions) {
    startMonitoring(tx.id, tx.txHash, tx.network);
  }
}

export function getMonitoringStatus() {
  const sessions = Array.from(monitoringSessions.entries()).map(([id, session]) => ({
    transactionId: id,
    txHash: session.txHash,
    network: session.network,
    duration: Date.now() - session.startTime,
  }));

  return {
    activeCount: sessions.length,
    sessions,
  };
}

export async function estimateTransactionTime(network, gasPrice) {

  const estimations = {
    'ethereum': { fast: 30, average: 120, slow: 600 },
    'polygon': { fast: 5, average: 15, slow: 60 },
    'arbitrum': { fast: 1, average: 5, slow: 30 },
    'optimism': { fast: 1, average: 5, slow: 30 },
    'base': { fast: 2, average: 10, slow: 60 },
    'bsc': { fast: 3, average: 10, slow: 30 },
    'avalanche': { fast: 2, average: 5, slow: 30 },
  };

  const times = estimations[network] || estimations['ethereum'];

  return times.average;
}

export async function isTransactionStuck(txHash, network, thresholdMinutes = 30) {
  try {
    const provider = getProvider(network);
    if (!provider) return false;

    const tx = await provider.getTransaction(txHash);
    if (!tx) return true;

    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) return false;

    const currentBlock = await provider.getBlockNumber();
    const blockTimestamp = (await provider.getBlock(currentBlock)).timestamp;
    const txAge = blockTimestamp - tx.blockNumber;

    return txAge > (thresholdMinutes * 60);
  } catch (error) {
    logger.error('Error checking if transaction is stuck', {
      error: error.message,
      txHash,
      network,
    });
    return false;
  }
}

export async function getTransactionDetails(transactionId) {
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      return null;
    }

    const isMonitored = monitoringSessions.has(transactionId);

    let currentStatus = tx.status;
    if (tx.status === TransactionStatus.PENDING) {
      currentStatus = await checkTransactionStatus(tx.txHash, tx.network);
    }

    return {
      ...tx,
      currentStatus,
      isMonitored,
    };
  } catch (error) {
    logger.error('Error getting transaction details', {
      error: error.message,
      transactionId,
    });
    return null;
  }
}

export function stopAllMonitoring() {
  logger.info('Stopping all transaction monitoring', {
    count: monitoringSessions.size,
  });

  for (const [transactionId] of monitoringSessions) {
    stopMonitoring(transactionId);
  }
}

process.on('SIGTERM', stopAllMonitoring);
process.on('SIGINT', stopAllMonitoring);

export default {
  TransactionStatus,
  startMonitoring,
  stopMonitoring,
  checkTransactionStatus,
  getPendingTransactions,
  resumeMonitoring,
  getMonitoringStatus,
  estimateTransactionTime,
  isTransactionStuck,
  getTransactionDetails,
  stopAllMonitoring,
};
