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

router.use(authenticate);

router.post('/:walletId/backup',
  rateLimiters.backup,
  createBackupValidation,
  walletBackupController.createBackup
);

router.post('/import',
  rateLimiters.backup,
  importBackupValidation,
  walletBackupController.importBackup
);

router.get('/:walletId/export/addresses',
  rateLimiters.standard,
  exportAddressesValidation,
  walletBackupController.exportAddresses
);

router.post('/:walletId/export/mnemonic',
  rateLimiters.sensitive,
  exportMnemonicValidation,
  walletBackupController.exportMnemonic
);

router.get('/:walletId/backups',
  rateLimiters.standard,
  walletBackupController.getBackupHistory
);

router.post('/validate',
  rateLimiters.standard,
  validateBackupValidation,
  walletBackupController.validateBackup
);

export default router;
