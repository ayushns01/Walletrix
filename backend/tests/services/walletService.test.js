/**
 * Wallet Service Unit Tests
 * Comprehensive testing for wallet generation, import, and validation
 */

import walletService from '../walletService.js';

describe('WalletService', () => {
  describe('generateWallet', () => {
    test('should generate wallet with 12-word mnemonic by default', async () => {
      const wallet = await walletService.generateWallet();
      
      expect(wallet).toHaveProperty('mnemonic');
      expect(wallet).toHaveProperty('addresses');
      expect(wallet).toHaveProperty('privateKeys');
      expect(wallet.mnemonic).toBeValidMnemonic();
      
      const words = wallet.mnemonic.split(' ');
      expect(words).toHaveLength(12);
    });

    test('should generate wallet with 24-word mnemonic when strength is 256', async () => {
      const wallet = await walletService.generateWallet({ strength: 256 });
      
      expect(wallet.mnemonic).toBeValidMnemonic();
      
      const words = wallet.mnemonic.split(' ');
      expect(words).toHaveLength(24);
    });

    test('should generate Ethereum address by default', async () => {
      const wallet = await walletService.generateWallet();
      
      expect(wallet.addresses).toHaveProperty('ethereum');
      expect(wallet.addresses.ethereum).toBeValidEthereumAddress();
      expect(wallet.privateKeys).toHaveProperty('ethereum');
      expect(wallet.privateKeys.ethereum).toBeValidPrivateKey();
    });

    test('should generate Bitcoin address by default', async () => {
      const wallet = await walletService.generateWallet();
      
      expect(wallet.addresses).toHaveProperty('bitcoin');
      expect(wallet.addresses.bitcoin).toBeValidBitcoinAddress();
      expect(wallet.privateKeys).toHaveProperty('bitcoin');
    });

    test('should generate addresses for specified networks only', async () => {
      const wallet = await walletService.generateWallet({ 
        networks: ['ethereum', 'polygon'] 
      });
      
      expect(wallet.addresses).toHaveProperty('ethereum');
      expect(wallet.addresses).toHaveProperty('polygon');
      expect(wallet.addresses).not.toHaveProperty('bitcoin');
      expect(wallet.addresses.ethereum).toBeValidEthereumAddress();
      expect(wallet.addresses.polygon).toBeValidEthereumAddress();
    });

    test('should throw error for invalid strength', async () => {
      await expect(walletService.generateWallet({ strength: 96 }))
        .rejects.toThrow('Invalid entropy strength');
    });

    test('should throw error for unsupported network', async () => {
      await expect(walletService.generateWallet({ 
        networks: ['unsupported-network'] 
      })).rejects.toThrow('Unsupported network');
    });
  });

  describe('importFromMnemonic', () => {
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    test('should import wallet from valid mnemonic', async () => {
      const wallet = await walletService.importFromMnemonic(testMnemonic);
      
      expect(wallet).toHaveProperty('mnemonic', testMnemonic);
      expect(wallet).toHaveProperty('addresses');
      expect(wallet).toHaveProperty('privateKeys');
      expect(wallet.addresses.ethereum).toBeValidEthereumAddress();
    });

    test('should generate deterministic addresses from same mnemonic', async () => {
      const wallet1 = await walletService.importFromMnemonic(testMnemonic);
      const wallet2 = await walletService.importFromMnemonic(testMnemonic);
      
      expect(wallet1.addresses.ethereum).toBe(wallet2.addresses.ethereum);
      expect(wallet1.addresses.bitcoin).toBe(wallet2.addresses.bitcoin);
    });

    test('should import with custom networks', async () => {
      const wallet = await walletService.importFromMnemonic(testMnemonic, {
        networks: ['ethereum', 'arbitrum']
      });
      
      expect(wallet.addresses).toHaveProperty('ethereum');
      expect(wallet.addresses).toHaveProperty('arbitrum');
      expect(wallet.addresses).not.toHaveProperty('bitcoin');
    });

    test('should handle passphrase correctly', async () => {
      const walletWithoutPassphrase = await walletService.importFromMnemonic(testMnemonic);
      const walletWithPassphrase = await walletService.importFromMnemonic(testMnemonic, {
        passphrase: 'test-passphrase'
      });
      
      // Addresses should be different with passphrase
      expect(walletWithPassphrase.addresses.ethereum)
        .not.toBe(walletWithoutPassphrase.addresses.ethereum);
    });

    test('should throw error for invalid mnemonic', async () => {
      await expect(walletService.importFromMnemonic('invalid mnemonic phrase'))
        .rejects.toThrow('Invalid mnemonic phrase');
    });

    test('should throw error for incomplete mnemonic', async () => {
      await expect(walletService.importFromMnemonic('abandon abandon abandon'))
        .rejects.toThrow('Invalid mnemonic phrase');
    });
  });

  describe('importFromPrivateKey', () => {
    const testPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    test('should import Ethereum wallet from private key', async () => {
      const wallet = await walletService.importFromPrivateKey(testPrivateKey, 'ethereum');
      
      expect(wallet).toHaveProperty('address');
      expect(wallet).toHaveProperty('privateKey');
      expect(wallet).toHaveProperty('network', 'ethereum');
      expect(wallet.address).toBeValidEthereumAddress();
      expect(wallet.privateKey).toBeValidPrivateKey();
    });

    test('should handle private key without 0x prefix', async () => {
      const privateKeyWithoutPrefix = testPrivateKey.slice(2);
      const wallet = await walletService.importFromPrivateKey(privateKeyWithoutPrefix, 'ethereum');
      
      expect(wallet.address).toBeValidEthereumAddress();
    });

    test('should generate same address for same private key', async () => {
      const wallet1 = await walletService.importFromPrivateKey(testPrivateKey, 'ethereum');
      const wallet2 = await walletService.importFromPrivateKey(testPrivateKey, 'ethereum');
      
      expect(wallet1.address).toBe(wallet2.address);
    });

    test('should throw error for invalid private key', async () => {
      await expect(walletService.importFromPrivateKey('invalid-key', 'ethereum'))
        .rejects.toThrow('Invalid private key');
    });

    test('should throw error for unsupported network', async () => {
      await expect(walletService.importFromPrivateKey(testPrivateKey, 'unsupported'))
        .rejects.toThrow('Unsupported network');
    });
  });

  describe('validateAddress', () => {
    test('should validate correct Ethereum address', () => {
      const address = '0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95';
      const result = walletService.validateAddress(address, 'ethereum');
      
      expect(result).toHaveProperty('valid', true);
      expect(result).toHaveProperty('address', address);
      expect(result).toHaveProperty('network', 'ethereum');
      expect(result).toHaveProperty('checksumAddress');
    });

    test('should validate correct Bitcoin address', () => {
      const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const result = walletService.validateAddress(address, 'bitcoin');
      
      expect(result).toHaveProperty('valid', true);
      expect(result).toHaveProperty('address', address);
      expect(result).toHaveProperty('network', 'bitcoin');
    });

    test('should validate Ethereum address case insensitively', () => {
      const address = '0x742d35cc6465c395c6de4d83f2e47aa4e6aa6b95';
      const result = walletService.validateAddress(address, 'ethereum');
      
      expect(result.valid).toBe(true);
      expect(result.checksumAddress).toBe('0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95');
    });

    test('should reject invalid Ethereum address', () => {
      const address = '0xinvalid';
      const result = walletService.validateAddress(address, 'ethereum');
      
      expect(result.valid).toBe(false);
    });

    test('should reject invalid Bitcoin address', () => {
      const address = 'invalid-bitcoin-address';
      const result = walletService.validateAddress(address, 'bitcoin');
      
      expect(result.valid).toBe(false);
    });

    test('should reject address for wrong network', () => {
      const ethAddress = '0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95';
      const result = walletService.validateAddress(ethAddress, 'bitcoin');
      
      expect(result.valid).toBe(false);
    });
  });

  describe('encryptData', () => {
    const testData = 'sensitive wallet data';
    const testPassword = 'secure-password-123';

    test('should encrypt data successfully', async () => {
      const encrypted = await walletService.encryptData(testData, testPassword);
      
      expect(encrypted).toHaveProperty('encryptedData');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted.encryptedData).not.toBe(testData);
    });

    test('should produce different ciphertext for same data', async () => {
      const encrypted1 = await walletService.encryptData(testData, testPassword);
      const encrypted2 = await walletService.encryptData(testData, testPassword);
      
      // Should be different due to random IV
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    test('should throw error for empty data', async () => {
      await expect(walletService.encryptData('', testPassword))
        .rejects.toThrow('Data cannot be empty');
    });

    test('should throw error for weak password', async () => {
      await expect(walletService.encryptData(testData, '123'))
        .rejects.toThrow('Password too weak');
    });
  });

  describe('decryptData', () => {
    const testData = 'sensitive wallet data';
    const testPassword = 'secure-password-123';

    test('should decrypt data successfully', async () => {
      const encrypted = await walletService.encryptData(testData, testPassword);
      const decrypted = await walletService.decryptData(encrypted, testPassword);
      
      expect(decrypted).toBe(testData);
    });

    test('should throw error for wrong password', async () => {
      const encrypted = await walletService.encryptData(testData, testPassword);
      
      await expect(walletService.decryptData(encrypted, 'wrong-password'))
        .rejects.toThrow('Decryption failed');
    });

    test('should throw error for tampered data', async () => {
      const encrypted = await walletService.encryptData(testData, testPassword);
      
      // Tamper with encrypted data
      encrypted.encryptedData = encrypted.encryptedData.slice(0, -2) + 'XX';
      
      await expect(walletService.decryptData(encrypted, testPassword))
        .rejects.toThrow('Decryption failed');
    });

    test('should throw error for missing encryption components', async () => {
      const incompleteData = { encryptedData: 'data' };
      
      await expect(walletService.decryptData(incompleteData, testPassword))
        .rejects.toThrow('Invalid encryption data');
    });
  });

  describe('deriveAccounts', () => {
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

    test('should derive multiple accounts from mnemonic', async () => {
      const accounts = await walletService.deriveAccounts(testMnemonic, {
        networks: ['ethereum'],
        count: 3
      });
      
      expect(accounts).toHaveLength(3);
      accounts.forEach((account, index) => {
        expect(account).toHaveProperty('index', index);
        expect(account).toHaveProperty('address');
        expect(account).toHaveProperty('privateKey');
        expect(account.address).toBeValidEthereumAddress();
      });
    });

    test('should generate different addresses for each derivation path', async () => {
      const accounts = await walletService.deriveAccounts(testMnemonic, {
        networks: ['ethereum'],
        count: 3
      });
      
      const addresses = accounts.map(account => account.address);
      const uniqueAddresses = [...new Set(addresses)];
      expect(uniqueAddresses).toHaveLength(3);
    });

    test('should handle custom derivation path', async () => {
      const accounts = await walletService.deriveAccounts(testMnemonic, {
        networks: ['ethereum'],
        count: 1,
        basePath: "m/44'/60'/1'/0"
      });
      
      expect(accounts[0]).toHaveProperty('address');
      expect(accounts[0].address).toBeValidEthereumAddress();
    });
  });
});