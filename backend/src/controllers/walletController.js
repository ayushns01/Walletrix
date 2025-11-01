import walletService from '../services/walletService.js';

/**
 * Wallet Controller
 * Handles wallet-related HTTP requests
 */

class WalletController {
  /**
   * Generate new wallet
   * POST /api/v1/wallet/generate
   */
  async generateWallet(req, res) {
    try {
      const result = walletService.generateNewWallet();
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      // Note: In production, NEVER return private keys directly
      // This is for demonstration purposes
      // You should encrypt and store securely
      res.status(200).json({
        success: true,
        message: 'Wallet generated successfully',
        data: {
          mnemonic: result.mnemonic,
          ethereum: {
            address: result.ethereum.address,
            // Only return private key if explicitly requested and authenticated
            privateKey: result.ethereum.privateKey,
          },
          bitcoin: {
            address: result.bitcoin.address,
            privateKey: result.bitcoin.privateKey,
          },
        },
        warning: 'Store your mnemonic phrase securely. Never share it with anyone.',
      });
    } catch (error) {
      console.error('Error in generateWallet:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate wallet',
      });
    }
  }

  /**
   * Import wallet from mnemonic
   * POST /api/v1/wallet/import/mnemonic
   * Body: { mnemonic: string }
   */
  async importFromMnemonic(req, res) {
    try {
      const { mnemonic } = req.body;

      if (!mnemonic) {
        return res.status(400).json({
          success: false,
          error: 'Mnemonic phrase is required',
        });
      }

      const result = walletService.importFromMnemonic(mnemonic.trim());

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
          ethereum: {
            address: result.ethereum.address,
            privateKey: result.ethereum.privateKey,
          },
          bitcoin: {
            address: result.bitcoin.address,
            privateKey: result.bitcoin.privateKey,
          },
        },
      });
    } catch (error) {
      console.error('Error in importFromMnemonic:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import wallet',
      });
    }
  }

  /**
   * Import Ethereum wallet from private key
   * POST /api/v1/wallet/import/private-key
   * Body: { privateKey: string }
   */
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
      console.error('Error in importFromPrivateKey:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import wallet',
      });
    }
  }

  /**
   * Derive multiple accounts from mnemonic
   * POST /api/v1/wallet/derive-accounts
   * Body: { mnemonic: string, count?: number }
   */
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
      console.error('Error in deriveAccounts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to derive accounts',
      });
    }
  }

  /**
   * Validate address
   * GET /api/v1/wallet/validate/:network/:address
   */
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
      console.error('Error in validateAddress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate address',
      });
    }
  }

  /**
   * Encrypt data
   * POST /api/v1/wallet/encrypt
   * Body: { data: string, password: string }
   */
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
      console.error('Error in encryptData:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to encrypt data',
      });
    }
  }

  /**
   * Decrypt data
   * POST /api/v1/wallet/decrypt
   * Body: { encryptedData: string, password: string }
   */
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
      console.error('Error in decryptData:', error);
      res.status(401).json({
        success: false,
        error: 'Failed to decrypt data. Invalid password or corrupted data.',
      });
    }
  }
}

export default new WalletController();
