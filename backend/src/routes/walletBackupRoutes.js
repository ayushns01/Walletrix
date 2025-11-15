import express from 'express';
import walletBackupController, {
  createBackupValidation,
  importBackupValidation,
  exportAddressesValidation,
  exportMnemonicValidation,
  validateBackupValidation
} from '../controllers/walletBackupController.js';
import { authenticate } from '../middleware/auth.js';
import rateLimiters from '../middleware/rateLimiters.js';

const router = express.Router();

/**
 * Wallet Backup & Export Routes
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/v1/wallet-backup/{walletId}/backup:
 *   post:
 *     summary: Create wallet backup
 *     description: Create a comprehensive backup of wallet data with multiple format options
 *     tags: [Wallet Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID to backup
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [json, csv, encrypted, mnemonic]
 *                 default: encrypted
 *                 description: Backup format
 *               includeTransactions:
 *                 type: boolean
 *                 default: true
 *                 description: Include transaction history
 *               includeMetadata:
 *                 type: boolean
 *                 default: true
 *                 description: Include wallet metadata
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Encryption password (required for encrypted/mnemonic formats)
 *               compression:
 *                 type: boolean
 *                 default: true
 *                 description: Compress backup file
 *             example:
 *               format: encrypted
 *               includeTransactions: true
 *               includeMetadata: true
 *               password: "SecurePassword123"
 *               compression: true
 *     responses:
 *       200:
 *         description: Backup file download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request or validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/:walletId/backup', 
  rateLimiters.backup,
  createBackupValidation,
  walletBackupController.createBackup
);

/**
 * @swagger
 * /api/v1/wallet-backup/import:
 *   post:
 *     summary: Import wallet from backup
 *     description: Import a wallet from backup data with validation and conflict checking
 *     tags: [Wallet Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - backupData
 *             properties:
 *               backupData:
 *                 type: string
 *                 description: Base64 encoded backup data
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Decryption password (if backup is encrypted)
 *               overwrite:
 *                 type: boolean
 *                 default: false
 *                 description: Overwrite existing wallet if conflict
 *               validateOnly:
 *                 type: boolean
 *                 default: false
 *                 description: Only validate backup without importing
 *             example:
 *               backupData: "base64EncodedBackupData..."
 *               password: "SecurePassword123"
 *               overwrite: false
 *               validateOnly: false
 *     responses:
 *       200:
 *         description: Validation successful (if validateOnly=true)
 *       201:
 *         description: Wallet imported successfully
 *       400:
 *         description: Invalid backup data or validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Wallet conflict (already exists)
 *       500:
 *         description: Internal server error
 */
router.post('/import',
  rateLimiters.backup,
  importBackupValidation,
  walletBackupController.importBackup
);

/**
 * @swagger
 * /api/v1/wallet-backup/{walletId}/export/addresses:
 *   get:
 *     summary: Export wallet addresses
 *     description: Export wallet addresses in various formats
 *     tags: [Wallet Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID to export addresses from
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, txt]
 *           default: json
 *         description: Export format
 *     responses:
 *       200:
 *         description: Address export file download
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *           text/plain:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Internal server error
 */
router.get('/:walletId/export/addresses',
  rateLimiters.standard,
  exportAddressesValidation,
  walletBackupController.exportAddresses
);

/**
 * @swagger
 * /api/v1/wallet-backup/{walletId}/export/mnemonic:
 *   post:
 *     summary: Export mnemonic phrase
 *     description: Export encrypted wallet mnemonic phrase (HIGHLY SENSITIVE)
 *     tags: [Wallet Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID to export mnemonic from
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: User password for verification and encryption
 *             example:
 *               password: "UserPassword123"
 *     responses:
 *       200:
 *         description: Encrypted mnemonic export successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 filename:
 *                   type: string
 *                 data:
 *                   type: string
 *                   description: Base64 encoded encrypted mnemonic
 *                 warning:
 *                   type: string
 *                 encrypted:
 *                   type: boolean
 *       400:
 *         description: Invalid request or missing password
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Internal server error
 */
router.post('/:walletId/export/mnemonic',
  rateLimiters.sensitive,
  exportMnemonicValidation,
  walletBackupController.exportMnemonic
);

/**
 * @swagger
 * /api/v1/wallet-backup/{walletId}/backups:
 *   get:
 *     summary: Get backup history
 *     description: Get history of backups created for a wallet
 *     tags: [Wallet Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *     responses:
 *       200:
 *         description: Backup history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 backups:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       format:
 *                         type: string
 *                       size:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Internal server error
 */
router.get('/:walletId/backups',
  rateLimiters.standard,
  walletBackupController.getBackupHistory
);

/**
 * @swagger
 * /api/v1/wallet-backup/validate:
 *   post:
 *     summary: Validate backup file
 *     description: Validate backup file integrity without importing
 *     tags: [Wallet Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - backupData
 *             properties:
 *               backupData:
 *                 type: string
 *                 description: Base64 encoded backup data
 *               password:
 *                 type: string
 *                 description: Decryption password (if backup is encrypted)
 *             example:
 *               backupData: "base64EncodedBackupData..."
 *               password: "SecurePassword123"
 *     responses:
 *       200:
 *         description: Backup validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 walletInfo:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     addresses:
 *                       type: object
 *                     networks:
 *                       type: array
 *                       items:
 *                         type: string
 *                     transactionCount:
 *                       type: number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid backup data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/validate',
  rateLimiters.standard,
  validateBackupValidation,
  walletBackupController.validateBackup
);

export default router;