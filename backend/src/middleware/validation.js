import { body, param, query, validationResult } from 'express-validator';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';

/**
 * Centralized Validation Middleware
 * Provides reusable validation chains for all API endpoints
 */

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param || err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Custom validators
 */

// Ethereum address validator
const isValidEthereumAddress = (address) => {
  if (!address) return false;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return false;
  
  try {
    // Check EIP-55 checksum
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
};

// Bitcoin address validator
const isValidBitcoinAddress = (address, network = 'mainnet') => {
  if (!address) return false;
  
  try {
    const networkObj = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    bitcoin.address.toOutputScript(address, networkObj);
    return true;
  } catch {
    return false;
  }
};

// Network address validator (multi-chain)
const isValidNetworkAddress = (address, network) => {
  if (!address || !network) return false;
  
  if (network.startsWith('ethereum') || network.startsWith('polygon') || 
      network.startsWith('arbitrum') || network.startsWith('optimism') ||
      network.startsWith('base') || network.startsWith('bsc') || 
      network.startsWith('avalanche')) {
    return isValidEthereumAddress(address);
  }
  
  if (network.startsWith('bitcoin')) {
    const bitcoinNetwork = network.includes('testnet') ? 'testnet' : 'mainnet';
    return isValidBitcoinAddress(address, bitcoinNetwork);
  }
  
  return false;
};

// Amount validator
const isValidAmount = (value) => {
  if (!value) return false;
  const num = parseFloat(value);
  return !isNaN(num) && num > 0 && num < 1e15; // Reasonable upper limit
};

// Mnemonic validator
const isValidMnemonic = (mnemonic) => {
  if (!mnemonic) return false;
  const words = mnemonic.trim().split(/\s+/);
  return words.length === 12 || words.length === 24;
};

// Private key validator
const isValidPrivateKey = (key) => {
  if (!key) return false;
  // Ethereum private key format
  return /^(0x)?[a-fA-F0-9]{64}$/.test(key);
};

/**
 * Validation Rules
 */

export const validationRules = {
  // Authentication
  register: [
    body('email')
      .isEmail().normalizeEmail()
      .withMessage('Invalid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('displayName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .escape()
      .withMessage('Display name must be 1-100 characters')
  ],

  login: [
    body('email')
      .isEmail().normalizeEmail()
      .withMessage('Invalid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain uppercase, lowercase, and number')
  ],

  // Wallet operations
  generateWallet: [],

  importMnemonic: [
    body('mnemonic')
      .notEmpty()
      .withMessage('Mnemonic is required')
      .custom(isValidMnemonic)
      .withMessage('Invalid mnemonic phrase (must be 12 or 24 words)')
  ],

  importPrivateKey: [
    body('privateKey')
      .notEmpty()
      .withMessage('Private key is required')
      .custom(isValidPrivateKey)
      .withMessage('Invalid private key format')
  ],

  encryptData: [
    body('data')
      .notEmpty()
      .withMessage('Data is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
  ],

  decryptData: [
    body('encryptedData')
      .notEmpty()
      .withMessage('Encrypted data is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  validateAddress: [
    param('network')
      .isIn(['ethereum', 'bitcoin', 'ethereum-mainnet', 'ethereum-sepolia', 'ethereum-goerli', 
             'bitcoin-mainnet', 'bitcoin-testnet', 'polygon-mainnet', 'arbitrum-one', 
             'optimism-mainnet', 'base-mainnet'])
      .withMessage('Invalid network'),
    param('address')
      .notEmpty()
      .withMessage('Address is required')
      .custom((value, { req }) => isValidNetworkAddress(value, req.params.network))
      .withMessage('Invalid address for the specified network')
  ],

  // Blockchain queries
  getBalance: [
    param('address')
      .notEmpty()
      .withMessage('Address is required')
      .custom(isValidEthereumAddress)
      .withMessage('Invalid Ethereum address'),
    query('network')
      .optional()
      .isString()
      .withMessage('Network must be a string')
  ],

  getBitcoinBalance: [
    param('address')
      .notEmpty()
      .withMessage('Address is required')
      .custom((value, { req }) => {
        const network = req.query.network || 'mainnet';
        return isValidBitcoinAddress(value, network);
      })
      .withMessage('Invalid Bitcoin address')
  ],

  getTransactions: [
    param('address')
      .notEmpty()
      .withMessage('Address is required'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  // Token operations
  getTokenInfo: [
    param('tokenAddress')
      .notEmpty()
      .withMessage('Token address is required')
      .custom(isValidEthereumAddress)
      .withMessage('Invalid token address')
  ],

  getTokenBalance: [
    param('tokenAddress')
      .notEmpty()
      .withMessage('Token address is required')
      .custom(isValidEthereumAddress)
      .withMessage('Invalid token address'),
    param('address')
      .notEmpty()
      .withMessage('Wallet address is required')
      .custom(isValidEthereumAddress)
      .withMessage('Invalid wallet address')
  ],

  getMultipleTokenBalances: [
    body('address')
      .notEmpty()
      .withMessage('Wallet address is required')
      .custom(isValidEthereumAddress)
      .withMessage('Invalid wallet address'),
    body('tokenAddresses')
      .isArray({ min: 1, max: 50 })
      .withMessage('Token addresses must be an array (1-50 tokens)'),
    body('tokenAddresses.*')
      .custom(isValidEthereumAddress)
      .withMessage('All token addresses must be valid Ethereum addresses')
  ],

  // Transactions
  sendEthereumTransaction: [
    body('privateKey')
      .notEmpty()
      .withMessage('Private key is required')
      .custom(isValidPrivateKey)
      .withMessage('Invalid private key'),
    body('to')
      .notEmpty()
      .withMessage('Recipient address is required')
      .custom(isValidEthereumAddress)
      .withMessage('Invalid recipient address'),
    body('value')
      .notEmpty()
      .withMessage('Amount is required')
      .custom(isValidAmount)
      .withMessage('Invalid amount'),
    body('gasLimit')
      .optional()
      .isInt({ min: 21000, max: 10000000 })
      .withMessage('Gas limit must be between 21000 and 10000000'),
    body('gasPrice')
      .optional()
      .isString()
      .withMessage('Gas price must be a string (in wei)'),
    body('nonce')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Nonce must be a non-negative integer')
  ],

  sendTokenTransaction: [
    body('privateKey')
      .notEmpty()
      .withMessage('Private key is required')
      .custom(isValidPrivateKey)
      .withMessage('Invalid private key'),
    body('tokenAddress')
      .notEmpty()
      .withMessage('Token address is required')
      .custom(isValidEthereumAddress)
      .withMessage('Invalid token address'),
    body('to')
      .notEmpty()
      .withMessage('Recipient address is required')
      .custom(isValidEthereumAddress)
      .withMessage('Invalid recipient address'),
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .custom(isValidAmount)
      .withMessage('Invalid amount'),
    body('gasLimit')
      .optional()
      .isInt({ min: 50000, max: 10000000 })
      .withMessage('Gas limit must be between 50000 and 10000000')
  ],

  sendBitcoinTransaction: [
    body('privateKey')
      .notEmpty()
      .withMessage('Private key is required'),
    body('to')
      .notEmpty()
      .withMessage('Recipient address is required')
      .custom((value, { req }) => {
        const network = req.body.network || 'mainnet';
        return isValidBitcoinAddress(value, network);
      })
      .withMessage('Invalid Bitcoin address'),
    body('amount')
      .notEmpty()
      .withMessage('Amount is required')
      .isFloat({ min: 0.00000001 })
      .withMessage('Amount must be at least 0.00000001 BTC'),
    body('feeRate')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Fee rate must be between 1 and 1000 sat/vB')
  ],

  // Database wallet operations
  createWallet: [
    body('name')
      .notEmpty()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Wallet name must be 1-100 characters'),
    body('encryptedData')
      .notEmpty()
      .withMessage('Encrypted data is required'),
    body('addresses')
      .isObject()
      .withMessage('Addresses must be an object'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or less')
  ],

  updateWallet: [
    param('walletId')
      .notEmpty()
      .withMessage('Wallet ID is required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Wallet name must be 1-100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be 500 characters or less')
  ],

  // Price operations
  getPrice: [
    param('coinId')
      .notEmpty()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Coin ID is required'),
    query('currency')
      .optional()
      .isIn(['usd', 'eur', 'gbp', 'jpy', 'btc', 'eth'])
      .withMessage('Invalid currency')
  ],

  getMultiplePrices: [
    body('coinIds')
      .isArray({ min: 1, max: 100 })
      .withMessage('Coin IDs must be an array (1-100 coins)'),
    body('currency')
      .optional()
      .isIn(['usd', 'eur', 'gbp', 'jpy', 'btc', 'eth'])
      .withMessage('Invalid currency')
  ],

  searchCoins: [
    query('q')
      .notEmpty()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query is required (1-100 characters)')
  ]
};

/**
 * Two-Factor Authentication validation rules
 */
export const validateTwoFactor = {
  verifyTOTP: [
    body('code')
      .notEmpty()
      .withMessage('Verification code is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('Verification code must be 6 digits')
      .isNumeric()
      .withMessage('Verification code must contain only numbers')
  ],

  verifyBackupCode: [
    body('code')
      .notEmpty()
      .withMessage('Backup code is required')
      .isLength({ min: 8, max: 8 })
      .withMessage('Backup code must be 8 characters')
      .matches(/^[A-Fa-f0-9]+$/)
      .withMessage('Invalid backup code format')
  ],

  setupSMS: [
    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required')
      .isMobilePhone()
      .withMessage('Invalid phone number format')
  ],

  verifySMS: [
    body('code')
      .notEmpty()
      .withMessage('Verification code is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('Verification code must be 6 digits')
      .isNumeric()
      .withMessage('Verification code must contain only numbers')
  ],

  disable2FA: [
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    body('code')
      .notEmpty()
      .withMessage('Verification code is required')
      .isLength({ min: 6, max: 8 })
      .withMessage('Invalid verification code length')
  ]
};

export default {
  validationRules,
  validateTwoFactor,
  handleValidationErrors,
  isValidEthereumAddress,
  isValidBitcoinAddress,
  isValidNetworkAddress,
  isValidAmount,
  isValidMnemonic,
  isValidPrivateKey
};
