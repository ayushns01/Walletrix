import walletBackupService from '../services/walletBackupService.js';
import { body, param, query, validationResult } from 'express-validator';
import logger from '../services/loggerService.js';

class WalletBackupController {
  async createBackup(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { walletId } = req.params;
      const userId = req.user?.id;
      const {
        format = 'encrypted',
        includeTransactions = true,
        includeMetadata = true,
        password,
        compression = true
      } = req.body;

      if ((format === 'encrypted' || format === 'mnemonic') && !password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required for encrypted and mnemonic backups'
        });
      }

      const result = await walletBackupService.createWalletBackup(walletId, userId, {
        format,
        includeTransactions,
        includeMetadata,
        password,
        compression
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.size);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      if (Buffer.isBuffer(result.data)) {
        res.send(result.data);
      } else {
        res.send(result.data);
      }

    } catch (error) {
      logger.error('Error creating wallet backup', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to create wallet backup'
      });
    }
  }

  async importBackup(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user?.id;
      const {
        backupData,
        password,
        overwrite = false,
        validateOnly = false
      } = req.body;

      const result = await walletBackupService.importWalletFromBackup(backupData, userId, {
        password,
        overwrite,
        validateOnly
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(validateOnly ? 200 : 201).json({
        success: true,
        ...result
      });

    } catch (error) {
      logger.error('Error importing wallet backup', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to import wallet backup'
      });
    }
  }

  async exportAddresses(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { walletId } = req.params;
      const userId = req.user?.id;
      const { format = 'json' } = req.query;

      const result = await walletBackupService.exportWalletAddresses(walletId, userId, format);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.size);

      res.send(result.data);

    } catch (error) {
      logger.error('Error exporting wallet addresses', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to export wallet addresses'
      });
    }
  }

  async exportMnemonic(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { walletId } = req.params;
      const userId = req.user?.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required for mnemonic export'
        });
      }

      const result = await walletBackupService.exportMnemonicPhrase(walletId, userId, password);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.status(200).json({
        success: true,
        message: 'Mnemonic export successful',
        filename: result.filename,
        data: result.data,
        warning: result.warning,
        encrypted: result.encrypted
      });

    } catch (error) {
      logger.error('Error exporting wallet mnemonic', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to export wallet mnemonic'
      });
    }
  }

  async getBackupHistory(req, res) {
    try {
      const { walletId } = req.params;
      const userId = req.user?.id;

      res.status(200).json({
        success: true,
        backups: [],
        message: 'Backup history feature coming soon'
      });

    } catch (error) {
      logger.error('Error getting backup history', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get backup history'
      });
    }
  }

  async validateBackup(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { backupData, password } = req.body;

      const result = await walletBackupService.importWalletFromBackup(backupData, null, {
        password,
        validateOnly: true
      });

      res.status(200).json(result);

    } catch (error) {
      logger.error('Error validating backup', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to validate backup'
      });
    }
  }
}

export const createBackupValidation = [
  param('walletId').isLength({ min: 1 }).withMessage('Wallet ID is required'),
  body('format').optional().isIn(['json', 'csv', 'encrypted', 'mnemonic'])
    .withMessage('Format must be json, csv, encrypted, or mnemonic'),
  body('includeTransactions').optional().isBoolean()
    .withMessage('includeTransactions must be boolean'),
  body('includeMetadata').optional().isBoolean()
    .withMessage('includeMetadata must be boolean'),
  body('password').optional().isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('compression').optional().isBoolean()
    .withMessage('compression must be boolean')
];

export const importBackupValidation = [
  body('backupData').notEmpty().withMessage('Backup data is required'),
  body('password').optional().isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('overwrite').optional().isBoolean()
    .withMessage('overwrite must be boolean'),
  body('validateOnly').optional().isBoolean()
    .withMessage('validateOnly must be boolean')
];

export const exportAddressesValidation = [
  param('walletId').isLength({ min: 1 }).withMessage('Wallet ID is required'),
  query('format').optional().isIn(['json', 'csv', 'txt'])
    .withMessage('Format must be json, csv, or txt')
];

export const exportMnemonicValidation = [
  param('walletId').isLength({ min: 1 }).withMessage('Wallet ID is required'),
  body('password').notEmpty().withMessage('Password is required')
];

export const validateBackupValidation = [
  body('backupData').notEmpty().withMessage('Backup data is required'),
  body('password').optional().isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
];

export default new WalletBackupController();
