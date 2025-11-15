/**
 * Transaction Status Tracking Service
 * Monitors pending transactions and updates their status
 */

import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import logger, { logTransaction, logBlockchain } from './loggerService.js';

const prisma = new PrismaClient();

// Store active monitoring sessions
const monitoringSessions = new Map();

/**
 * Transaction status enum
 */
export const TransactionStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  DROPPED: 'dropped',
};

/**
 * Start monitoring a transaction
 */
export async function startMonitoring(transactionId, txHash, network, config = {}) {
  const {
    maxRetries = 100,
    pollInterval = 5000, // 5 seconds
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
      // Check transaction status
      const status = await checkTransactionStatus(txHash, network, confirmations);

      // If status changed, update database and notify
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

        // Stop monitoring if transaction is finalized
        if ([TransactionStatus.SUCCESS, TransactionStatus.FAILED, TransactionStatus.DROPPED].includes(status)) {
          stopMonitoring(transactionId);
        }
      }

      retries++;

      // Stop after max retries
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

/**
 * Stop monitoring a transaction
 */
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

/**
 * Check transaction status on blockchain
 */
async function checkTransactionStatus(txHash, network, requiredConfirmations = 1) {
  try {
    // Get provider for network
    const provider = getProvider(network);
    
    if (!provider) {
      return TransactionStatus.PENDING;
    }

    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      // Transaction not mined yet
      // Check if transaction is still in mempool
      try {
        const tx = await provider.getTransaction(txHash);
        return tx ? TransactionStatus.PENDING : TransactionStatus.DROPPED;
      } catch {
        return TransactionStatus.PENDING;
      }
    }

    // Check confirmations
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber + 1;

    if (confirmations >= requiredConfirmations) {
      // Transaction is confirmed, check if successful
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

/**
 * Update transaction status in database
 */
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

/**
 * Get provider for network
 */
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

/**
 * Get all pending transactions that need monitoring
 */
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

/**
 * Resume monitoring for all pending transactions
 * Called on server startup
 */
export async function resumeMonitoring() {
  const pendingTransactions = await getPendingTransactions();
  
  logger.info('Resuming monitoring for pending transactions', {
    count: pendingTransactions.length,
  });

  for (const tx of pendingTransactions) {
    startMonitoring(tx.id, tx.txHash, tx.network);
  }
}

/**
 * Get monitoring status for all transactions
 */
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

/**
 * Estimate transaction time
 */
export async function estimateTransactionTime(network, gasPrice) {
  // Simple estimation based on network
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
  
  // Return average time in seconds
  return times.average;
}

/**
 * Check if transaction is stuck
 */
export async function isTransactionStuck(txHash, network, thresholdMinutes = 30) {
  try {
    const provider = getProvider(network);
    if (!provider) return false;

    const tx = await provider.getTransaction(txHash);
    if (!tx) return true; // Transaction not found, possibly dropped

    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) return false; // Transaction is mined

    // Check if transaction is older than threshold
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

/**
 * Get transaction details with current status
 */
export async function getTransactionDetails(transactionId) {
  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      return null;
    }

    // Check if being monitored
    const isMonitored = monitoringSessions.has(transactionId);

    // Get live status if pending
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

/**
 * Stop all monitoring on shutdown
 */
export function stopAllMonitoring() {
  logger.info('Stopping all transaction monitoring', {
    count: monitoringSessions.size,
  });

  for (const [transactionId] of monitoringSessions) {
    stopMonitoring(transactionId);
  }
}

// Handle graceful shutdown
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
