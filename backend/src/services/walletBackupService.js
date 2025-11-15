import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';
import walletService from './walletService.js';

/**
 * Wallet Backup & Export Service
 * Handles secure wallet backups, exports, and imports with multiple formats
 */
class WalletBackupService {
  constructor() {
    this.supportedFormats = ['json', 'csv', 'encrypted', 'mnemonic'];
    this.encryptionAlgorithm = 'aes-256-gcm';
  }

  /**
   * Create a comprehensive wallet backup
   */
  async createWalletBackup(walletId, userId, options = {}) {
    try {
      const {
        format = 'encrypted',
        includeTransactions = true,
        includeMetadata = true,
        password = null,
        compression = true
      } = options;

      // Validate format
      if (!this.supportedFormats.includes(format)) {
        return {
          success: false,
          error: `Unsupported format: ${format}. Supported: ${this.supportedFormats.join(', ')}`
        };
      }

      // Get wallet data
      const walletData = await this._getWalletData(walletId, userId, {
        includeTransactions,
        includeMetadata
      });

      if (!walletData.success) {
        return walletData;
      }

      // Generate backup based on format
      let backupData;
      let filename;
      let mimeType;

      switch (format) {
        case 'json':
          ({ data: backupData, filename, mimeType } = await this._createJsonBackup(walletData.data, password));
          break;
        case 'csv':
          ({ data: backupData, filename, mimeType } = await this._createCsvBackup(walletData.data));
          break;
        case 'encrypted':
          ({ data: backupData, filename, mimeType } = await this._createEncryptedBackup(walletData.data, password));
          break;
        case 'mnemonic':
          ({ data: backupData, filename, mimeType } = await this._createMnemonicBackup(walletData.data, password));
          break;
        default:
          return { success: false, error: 'Invalid format specified' };
      }

      // Apply compression if requested
      if (compression && format !== 'mnemonic') {
        const compressed = await this._compressBackup(backupData, filename);
        backupData = compressed.data;
        filename = compressed.filename;
        mimeType = compressed.mimeType;
      }

      return {
        success: true,
        data: backupData,
        filename,
        mimeType,
        size: Buffer.byteLength(backupData),
        format,
        compressed: compression && format !== 'mnemonic',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error creating wallet backup:', error);
      return {
        success: false,
        error: 'Failed to create wallet backup'
      };
    }
  }

  /**
   * Import wallet from backup
   */
  async importWalletFromBackup(backupData, userId, options = {}) {
    try {
      const {
        password = null,
        overwrite = false,
        validateOnly = false
      } = options;

      // Detect backup format
      const format = await this._detectBackupFormat(backupData);
      if (!format.success) {
        return format;
      }

      // Parse backup data
      let parsedData;
      switch (format.format) {
        case 'json':
          parsedData = await this._parseJsonBackup(backupData, password);
          break;
        case 'encrypted':
          parsedData = await this._parseEncryptedBackup(backupData, password);
          break;
        case 'mnemonic':
          parsedData = await this._parseMnemonicBackup(backupData, password);
          break;
        default:
          return { success: false, error: 'Unsupported backup format' };
      }

      if (!parsedData.success) {
        return parsedData;
      }

      // Validate backup data integrity
      const validation = await this._validateBackupData(parsedData.data);
      if (!validation.success) {
        return validation;
      }

      // If validation only, return success
      if (validateOnly) {
        return {
          success: true,
          message: 'Backup validation successful',
          walletInfo: {
            name: parsedData.data.wallet.name,
            addresses: parsedData.data.wallet.addresses,
            networks: Object.keys(parsedData.data.wallet.addresses),
            transactionCount: parsedData.data.transactions?.length || 0,
            createdAt: parsedData.data.wallet.createdAt
          }
        };
      }

      // Check for existing wallet conflicts
      const conflict = await this._checkWalletConflicts(parsedData.data.wallet, userId);
      if (conflict.exists && !overwrite) {
        return {
          success: false,
          error: 'Wallet already exists',
          conflictInfo: conflict.wallet,
          suggestion: 'Use overwrite option or rename the wallet'
        };
      }

      // Import wallet
      const importResult = await this._importWallet(parsedData.data, userId, { overwrite });
      return importResult;

    } catch (error) {
      console.error('Error importing wallet from backup:', error);
      return {
        success: false,
        error: 'Failed to import wallet from backup'
      };
    }
  }

  /**
   * Export wallet addresses for external use
   */
  async exportWalletAddresses(walletId, userId, format = 'json') {
    try {
      const wallet = await walletService.getWalletById(walletId, userId);
      if (!wallet.success) {
        return wallet;
      }

      const addresses = wallet.data.addresses;
      const timestamp = new Date().toISOString();

      let exportData;
      let filename;
      let mimeType;

      switch (format) {
        case 'json':
          exportData = JSON.stringify({
            wallet: {
              id: walletId,
              name: wallet.data.name,
              addresses
            },
            exportedAt: timestamp,
            format: 'addresses_json'
          }, null, 2);
          filename = `wallet_addresses_${walletId.slice(0, 8)}_${Date.now()}.json`;
          mimeType = 'application/json';
          break;

        case 'csv':
          const csvData = ['Network,Address'];
          for (const [network, address] of Object.entries(addresses)) {
            csvData.push(`${network},${address}`);
          }
          exportData = csvData.join('\n');
          filename = `wallet_addresses_${walletId.slice(0, 8)}_${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;

        case 'txt':
          const txtData = Object.entries(addresses)
            .map(([network, address]) => `${network.toUpperCase()}: ${address}`)
            .join('\n');
          exportData = `Wallet Addresses\nExported: ${timestamp}\n\n${txtData}`;
          filename = `wallet_addresses_${walletId.slice(0, 8)}_${Date.now()}.txt`;
          mimeType = 'text/plain';
          break;

        default:
          return { success: false, error: 'Unsupported export format' };
      }

      return {
        success: true,
        data: exportData,
        filename,
        mimeType,
        size: Buffer.byteLength(exportData)
      };

    } catch (error) {
      console.error('Error exporting wallet addresses:', error);
      return {
        success: false,
        error: 'Failed to export wallet addresses'
      };
    }
  }

  /**
   * Create wallet recovery phrase export
   */
  async exportMnemonicPhrase(walletId, userId, password) {
    try {
      if (!password) {
        return {
          success: false,
          error: 'Password is required for mnemonic export'
        };
      }

      const wallet = await walletService.getWalletById(walletId, userId);
      if (!wallet.success) {
        return wallet;
      }

      // Decrypt mnemonic (this would need to be implemented in walletService)
      const mnemonic = await walletService.decryptMnemonic(walletId, userId);
      if (!mnemonic.success) {
        return mnemonic;
      }

      // Create secure mnemonic export
      const exportData = {
        type: 'mnemonic_export',
        wallet: {
          id: walletId,
          name: wallet.data.name,
          derivationPath: wallet.data.derivationPath
        },
        mnemonic: mnemonic.phrase,
        warning: 'KEEP THIS PHRASE SECURE! Anyone with this phrase can access your funds.',
        instructions: [
          '1. Store this phrase in a secure location',
          '2. Never share this phrase with anyone',
          '3. Consider using a hardware wallet for better security',
          '4. Verify you can restore your wallet before deleting it'
        ],
        exportedAt: new Date().toISOString()
      };

      // Encrypt with password if provided
      const encrypted = await this._encryptData(JSON.stringify(exportData), password);
      
      return {
        success: true,
        data: encrypted.data,
        filename: `mnemonic_${walletId.slice(0, 8)}_${Date.now()}.enc`,
        mimeType: 'application/octet-stream',
        encrypted: true,
        warning: 'This file contains your wallet recovery phrase. Keep it secure!'
      };

    } catch (error) {
      console.error('Error exporting mnemonic phrase:', error);
      return {
        success: false,
        error: 'Failed to export mnemonic phrase'
      };
    }
  }

  /**
   * Get wallet data for backup
   */
  async _getWalletData(walletId, userId, options) {
    try {
      const { includeTransactions, includeMetadata } = options;

      // Get wallet details
      const wallet = await walletService.getWalletById(walletId, userId);
      if (!wallet.success) {
        return wallet;
      }

      const backupData = {
        version: '1.0.0',
        type: 'wallet_backup',
        wallet: wallet.data,
        metadata: includeMetadata ? await this._getWalletMetadata(walletId) : null,
        transactions: includeTransactions ? await this._getWalletTransactions(walletId) : null,
        createdAt: new Date().toISOString()
      };

      return {
        success: true,
        data: backupData
      };

    } catch (error) {
      console.error('Error getting wallet data:', error);
      return {
        success: false,
        error: 'Failed to get wallet data'
      };
    }
  }

  /**
   * Create JSON backup
   */
  async _createJsonBackup(data, password) {
    const jsonData = JSON.stringify(data, null, 2);
    let backupData = jsonData;
    
    if (password) {
      const encrypted = await this._encryptData(jsonData, password);
      backupData = encrypted.data;
    }

    return {
      data: backupData,
      filename: `wallet_backup_${Date.now()}.${password ? 'enc' : 'json'}`,
      mimeType: password ? 'application/octet-stream' : 'application/json'
    };
  }

  /**
   * Create CSV backup (transactions only)
   */
  async _createCsvBackup(data) {
    const transactions = data.transactions || [];
    
    const csvHeaders = [
      'Date', 'Network', 'Transaction Hash', 'From', 'To', 
      'Amount', 'Token', 'Status', 'Type', 'USD Value'
    ];

    const csvRows = [csvHeaders.join(',')];
    
    transactions.forEach(tx => {
      const row = [
        new Date(tx.timestamp).toISOString(),
        tx.network,
        tx.txHash,
        tx.fromAddress,
        tx.toAddress,
        tx.amount,
        tx.tokenSymbol,
        tx.status,
        tx.isIncoming ? 'Incoming' : 'Outgoing',
        tx.usdValueAtTime || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`);
      
      csvRows.push(row.join(','));
    });

    return {
      data: csvRows.join('\n'),
      filename: `wallet_transactions_${Date.now()}.csv`,
      mimeType: 'text/csv'
    };
  }

  /**
   * Create encrypted backup
   */
  async _createEncryptedBackup(data, password) {
    if (!password) {
      throw new Error('Password is required for encrypted backup');
    }

    const jsonData = JSON.stringify(data);
    const encrypted = await this._encryptData(jsonData, password);

    return {
      data: encrypted.data,
      filename: `wallet_backup_${Date.now()}.wbk`,
      mimeType: 'application/octet-stream'
    };
  }

  /**
   * Create mnemonic-only backup
   */
  async _createMnemonicBackup(data, password) {
    const mnemonicData = {
      type: 'mnemonic_backup',
      wallet: {
        name: data.wallet.name,
        derivationPath: data.wallet.derivationPath
      },
      mnemonic: data.wallet.encryptedMnemonic, // Would need to decrypt this
      createdAt: new Date().toISOString()
    };

    let backupData = JSON.stringify(mnemonicData, null, 2);
    
    if (password) {
      const encrypted = await this._encryptData(backupData, password);
      backupData = encrypted.data;
    }

    return {
      data: backupData,
      filename: `wallet_mnemonic_${Date.now()}.${password ? 'enc' : 'txt'}`,
      mimeType: password ? 'application/octet-stream' : 'text/plain'
    };
  }

  /**
   * Compress backup data
   */
  async _compressBackup(data, originalFilename) {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks = [];

      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => {
        resolve({
          data: Buffer.concat(chunks),
          filename: `${originalFilename}.zip`,
          mimeType: 'application/zip'
        });
      });
      archive.on('error', reject);

      archive.append(data, { name: originalFilename });
      archive.finalize();
    });
  }

  /**
   * Encrypt data with password
   */
  async _encryptData(data, password) {
    const key = crypto.scryptSync(password, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.encryptionAlgorithm, key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    const result = {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted
    };

    return {
      data: Buffer.from(JSON.stringify(result)).toString('base64')
    };
  }

  /**
   * Detect backup format from data
   */
  async _detectBackupFormat(data) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(data);
      
      if (parsed.type === 'wallet_backup') {
        return { success: true, format: 'json' };
      } else if (parsed.type === 'mnemonic_backup' || parsed.type === 'mnemonic_export') {
        return { success: true, format: 'mnemonic' };
      } else if (parsed.iv && parsed.authTag && parsed.encrypted) {
        return { success: true, format: 'encrypted' };
      }
      
      return { success: false, error: 'Unknown backup format' };
      
    } catch (error) {
      // Check if it's base64 encoded encrypted data
      try {
        const decoded = Buffer.from(data, 'base64').toString();
        const parsed = JSON.parse(decoded);
        if (parsed.iv && parsed.authTag && parsed.encrypted) {
          return { success: true, format: 'encrypted' };
        }
      } catch (e) {
        // Not base64 encoded
      }
      
      return { success: false, error: 'Invalid backup format' };
    }
  }

  /**
   * Validate backup data integrity
   */
  async _validateBackupData(data) {
    try {
      // Check required fields
      if (!data.wallet || !data.wallet.addresses) {
        return { success: false, error: 'Invalid wallet data in backup' };
      }

      // Validate addresses format
      const addresses = data.wallet.addresses;
      for (const [network, address] of Object.entries(addresses)) {
        if (!address || typeof address !== 'string') {
          return { success: false, error: `Invalid address for network: ${network}` };
        }
      }

      // Validate transactions if present
      if (data.transactions) {
        for (const tx of data.transactions) {
          if (!tx.txHash || !tx.network || !tx.fromAddress || !tx.toAddress) {
            return { success: false, error: 'Invalid transaction data in backup' };
          }
        }
      }

      return { success: true };

    } catch (error) {
      console.error('Error validating backup data:', error);
      return {
        success: false,
        error: 'Failed to validate backup data'
      };
    }
  }

  /**
   * Check for wallet conflicts during import
   */
  async _checkWalletConflicts(walletData, userId) {
    try {
      // Check if wallet with same addresses already exists
      const existingWallet = await walletService.findWalletByAddresses(walletData.addresses, userId);
      
      return {
        exists: existingWallet.success,
        wallet: existingWallet.success ? existingWallet.data : null
      };

    } catch (error) {
      console.error('Error checking wallet conflicts:', error);
      return { exists: false };
    }
  }

  /**
   * Import wallet from parsed backup data
   */
  async _importWallet(backupData, userId, options) {
    try {
      const { overwrite } = options;
      
      // Import wallet
      const importResult = await walletService.importWallet({
        ...backupData.wallet,
        userId
      }, { overwrite });

      if (!importResult.success) {
        return importResult;
      }

      // Import transactions if present
      if (backupData.transactions && backupData.transactions.length > 0) {
        // This would need to be implemented in transaction service
        // await transactionService.importTransactions(importResult.walletId, backupData.transactions);
      }

      return {
        success: true,
        message: 'Wallet imported successfully',
        walletId: importResult.walletId,
        imported: {
          wallet: true,
          transactions: backupData.transactions?.length || 0,
          metadata: !!backupData.metadata
        }
      };

    } catch (error) {
      console.error('Error importing wallet:', error);
      return {
        success: false,
        error: 'Failed to import wallet'
      };
    }
  }

  /**
   * Get wallet metadata for backup
   */
  async _getWalletMetadata(walletId) {
    // This would implement additional metadata collection
    return {
      settings: {},
      preferences: {},
      customLabels: {}
    };
  }

  /**
   * Get wallet transactions for backup
   */
  async _getWalletTransactions(walletId) {
    // This would get transactions from the transaction service
    // For now, return empty array
    return [];
  }
}

export default new WalletBackupService();