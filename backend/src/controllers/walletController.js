import walletService from '../services/walletService.js';
import logger from '../services/loggerService.js';

class WalletController {
  async generateWallet(req, res) {
    try {
      const { passphrase } = req.body;
      const result = walletService.generateNewWallet(passphrase);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Wallet generated successfully',
        data: {
          mnemonic: result.mnemonic,
          addresses: {
            ethereum: result.addresses.ethereum,
            bitcoin: result.addresses.bitcoin,
            solana: result.addresses.solana,
          },
        },
        security: {
          warning: 'Write down your recovery phrase on paper and store it securely',
          instructions: [
            'Never share your recovery phrase with anyone',
            'Never store it digitally (screenshots, cloud, etc.)',
            'Store in multiple secure physical locations',
            'Private keys are derived client-side from your mnemonic'
          ]
        }
      });
    } catch (error) {
      logger.error('Wallet generation failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to generate wallet',
      });
    }
  }

  async importFromMnemonic(req, res) {
    try {
      const { mnemonic, passphrase } = req.body;

      if (!mnemonic) {
        return res.status(400).json({
          success: false,
          error: 'Mnemonic phrase is required',
        });
      }

      const result = walletService.importFromMnemonic(mnemonic.trim(), passphrase);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Wallet imported successfully',
        data: {
          addresses: {
            ethereum: result.addresses.ethereum,
            bitcoin: result.addresses.bitcoin,
            solana: result.addresses.solana,
          },
        },
      });
    } catch (error) {
      logger.error('Mnemonic import failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to import wallet',
      });
    }
  }

  async importFromPrivateKey(req, res) {
    try {
      const { privateKey } = req.body;

      if (!privateKey) {
        return res.status(400).json({
          success: false,
          error: 'Private key is required',
        });
      }

      const result = walletService.importEthereumFromPrivateKey(privateKey.trim());

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Ethereum wallet imported successfully',
        data: result.ethereum,
      });
    } catch (error) {
      logger.error('Private key import failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to import wallet',
      });
    }
  }

  async deriveAccounts(req, res) {
    try {
      const { mnemonic, count = 5 } = req.body;

      if (!mnemonic) {
        return res.status(400).json({
          success: false,
          error: 'Mnemonic phrase is required',
        });
      }

      if (count < 1 || count > 20) {
        return res.status(400).json({
          success: false,
          error: 'Count must be between 1 and 20',
        });
      }

      const result = walletService.deriveAccounts(mnemonic.trim(), count);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: `Derived ${count} accounts successfully`,
        data: result.accounts,
      });
    } catch (error) {
      logger.error('Account derivation failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to derive accounts',
      });
    }
  }

  async validateAddress(req, res) {
    try {
      const { network, address } = req.params;
      let isValid = false;

      if (network === 'ethereum' || network === 'eth') {
        isValid = walletService.isValidEthereumAddress(address);
      } else if (network === 'bitcoin' || network === 'btc') {
        isValid = walletService.isValidBitcoinAddress(address);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid network. Use "ethereum" or "bitcoin"',
        });
      }

      res.status(200).json({
        success: true,
        network,
        address,
        isValid,
      });
    } catch (error) {
      logger.error('Address validation failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to validate address',
      });
    }
  }

  async encryptData(req, res) {
    try {
      const { data, password } = req.body;

      if (!data || !password) {
        return res.status(400).json({
          success: false,
          error: 'Data and password are required',
        });
      }

      const encrypted = walletService.encryptData(data, password);

      res.status(200).json({
        success: true,
        encrypted,
      });
    } catch (error) {
      logger.error('Data encryption failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to encrypt data',
      });
    }
  }

  async validatePasswordStrength(req, res) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required',
        });
      }

      const validation = walletService.validatePasswordStrength(password);

      res.status(200).json({
        success: true,
        validation,
      });
    } catch (error) {
      logger.error('Password validation failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to validate password',
      });
    }
  }

  async decryptData(req, res) {
    try {
      const { encryptedData, password } = req.body;

      if (!encryptedData || !password) {
        return res.status(400).json({
          success: false,
          error: 'Encrypted data and password are required',
        });
      }

      const decrypted = walletService.decryptData(encryptedData, password);

      res.status(200).json({
        success: true,
        decrypted,
      });
    } catch (error) {
      logger.error('Data decryption failed', { error: error.message });
      res.status(401).json({
        success: false,
        error: 'Failed to decrypt data. Invalid password or corrupted data.',
      });
    }
  }

  async addSolanaToWallet(req, res) {
    try {
      const { mnemonic, passphrase } = req.body;

      if (!mnemonic) {
        return res.status(400).json({
          success: false,
          error: 'Mnemonic phrase is required',
        });
      }

      const result = walletService.importFromMnemonic(mnemonic.trim(), passphrase);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Solana address generated successfully',
        data: {
          solana: {
            address: result.addresses.solana,
          },
        },
      });
    } catch (error) {
      logger.error('Solana address generation failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to generate Solana address',
      });
    }
  }
}

export default new WalletController();
