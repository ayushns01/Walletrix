import prisma from '../lib/prisma.js';
import activityLogService from './activityLogService.js';

class DatabaseWalletService {

  async createWallet(userId, name, encryptedData, addresses, description = null, ipAddress = null, userAgent = null) {
    try {
      const wallet = await prisma.wallet.create({
        data: {
          userId,
          name,
          description,
          encryptedPrivateKeys: encryptedData,
          addresses,
          lastAccessedAt: new Date()
        }
      });

      await activityLogService.logWalletCreate(userId, wallet.id, 'hd', ipAddress, userAgent);

      return {
        success: true,
        wallet: {
          id: wallet.id,
          name: wallet.name,
          description: wallet.description,
          addresses: wallet.addresses,
          createdAt: wallet.createdAt,
          lastAccessedAt: wallet.lastAccessedAt
        }
      };
    } catch (error) {
      console.error('Error creating wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserWallets(userId) {
    try {
      const wallets = await prisma.wallet.findMany({
        where: {
          userId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          description: true,
          addresses: true,
          createdAt: true,
          lastAccessedAt: true,
          encryptedPrivateKeys: true
        },
        orderBy: {
          lastAccessedAt: 'desc'
        }
      });

      const formattedWallets = wallets.map(wallet => ({
        ...wallet,
        encryptedData: wallet.encryptedPrivateKeys,
        encryptedPrivateKeys: undefined
      }));

      return {
        success: true,
        wallets: formattedWallets
      };
    } catch (error) {
      console.error('Error getting wallets:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getWallet(walletId, userId) {
    try {
      const wallet = await prisma.wallet.findFirst({
        where: {
          id: walletId,
          userId,
          isActive: true
        },
        include: {
          transactions: {
            orderBy: { timestamp: 'desc' },
            take: 50
          },
          portfolioSnapshots: {
            orderBy: { snapshotDate: 'desc' },
            take: 30
          }
        }
      });

      if (!wallet) {
        throw new Error('Wallet not found or access denied');
      }

      await prisma.wallet.update({
        where: { id: walletId },
        data: { lastAccessed: new Date() }
      });

      return {
        success: true,
        wallet: {
          id: wallet.id,
          name: wallet.name,
          description: wallet.description,
          addresses: wallet.addresses,
          encryptedData: wallet.encryptedData,
          transactions: wallet.transactions,
          portfolioSnapshots: wallet.portfolioSnapshots,
          createdAt: wallet.createdAt,
          lastAccessed: wallet.lastAccessed
        }
      };
    } catch (error) {
      console.error('Error getting wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateWallet(walletId, userId, updates) {
    try {
      const wallet = await prisma.wallet.findFirst({
        where: {
          id: walletId,
          userId,
          isActive: true
        }
      });

      if (!wallet) {
        throw new Error('Wallet not found or access denied');
      }

      const updatedWallet = await prisma.wallet.update({
        where: { id: walletId },
        data: {
          ...updates,
          lastAccessed: new Date()
        }
      });

      return {
        success: true,
        wallet: {
          id: updatedWallet.id,
          name: updatedWallet.name,
          description: updatedWallet.description,
          addresses: updatedWallet.addresses
        }
      };
    } catch (error) {
      console.error('Error updating wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteWallet(walletId, userId, ipAddress = null, userAgent = null) {
    try {

      const wallet = await prisma.wallet.findFirst({
        where: {
          id: walletId,
          userId
        }
      });

      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found or access denied'
        };
      }

      await prisma.wallet.delete({
        where: {
          id: walletId
        }
      });

      await activityLogService.logWalletDelete(userId, walletId, ipAddress, userAgent);

      return {
        success: true,
        message: 'Wallet deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async importFromLocalStorage(userId, localStorageData, walletName = 'Imported Wallet') {
    try {

      const walletData = typeof localStorageData === 'string'
        ? JSON.parse(localStorageData)
        : localStorageData;

      if (!walletData.encrypted || !walletData.ethereum?.address) {
        throw new Error('Invalid wallet data format');
      }

      const wallet = await this.createWallet(
        userId,
        walletName,
        walletData.encrypted,
        {
          ethereum: walletData.ethereum.address,
          bitcoin: walletData.bitcoin?.address || null
        },
        'Imported from browser storage'
      );

      return wallet;
    } catch (error) {
      console.error('Error importing wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new DatabaseWalletService();
