import rateLimit from 'express-rate-limit';

/**
 * Enhanced Rate Limiting Middleware
 * Provides different rate limits for different types of operations
 */

/**
 * Authentication endpoints - Strict limits to prevent brute force
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

/**
 * Wallet generation - Moderate limits
 */
export const walletGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 1000 : 50, // 1000 in dev, 50 in production
  message: {
    success: false,
    error: 'Too many wallet generation requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

/**
 * Transaction operations - Strict limits for security
 */
export const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 transactions per minute
  message: {
    success: false,
    error: 'Too many transaction requests. Please wait before sending another transaction.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.userId || req.ip;
  },
});

/**
 * Blockchain queries - Moderate limits
 */
export const blockchainQueryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 500 : 120, // 500 in dev, 120 in production
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

/**
 * Price data - Generous limits (read-only)
 */
export const priceDataLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Too many price data requests. Please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

/**
 * Token queries - Moderate limits
 */
export const tokenQueryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'Too many token queries. Please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

/**
 * Database wallet operations - Moderate limits
 */
export const databaseWalletLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 200 : 30, // 200 in dev, 30 in production
  message: {
    success: false,
    error: 'Too many wallet operations. Please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    return req.userId || req.ip;
  },
});

/**
 * Global API limiter - Fallback for uncategorized endpoints
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // 1000 in dev, 100 in production
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Fix trust proxy validation error on Render/Railway
  validate: {
    trustProxy: false,
  },
});

/**
 * Per-user rate limiter (for authenticated users)
 */
export const perUserLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10000, // 10,000 requests per day per user
  message: {
    success: false,
    error: 'Daily request limit exceeded. Please try again tomorrow.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {
    // Use user ID if authenticated
    return req.userId || `ip:${req.ip}`;
  },
  skip: (req) => {
    // Skip for unauthenticated users (use IP-based limits instead)
    return !req.userId;
  },
});

/**
 * Strict limiter for sensitive operations
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 attempts per hour
  message: {
    success: false,
    error: 'Too many attempts at this sensitive operation. Please try again in 1 hour.',
  },
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

/**
 * Backup operations - Very strict limits for security
 */
export const backupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 backup operations per hour
  message: {
    success: false,
    error: 'Too many backup operations. Please try again in 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {
    return req.userId || req.ip;
  },
});

/**
 * Sensitive operations like mnemonic export - Extremely strict
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 2, // Only 2 attempts per day
  message: {
    success: false,
    error: 'Daily limit exceeded for sensitive operations. Please try again tomorrow.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {
    return req.userId || req.ip;
  },
});

/**
 * Standard operations rate limiter
 */
export const standardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: 'Too many requests. Please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

/**
 * Export rate limiters for specific purposes
 */
export default {
  auth: authLimiter,
  walletGeneration: walletGenerationLimiter,
  transaction: transactionLimiter,
  blockchainQuery: blockchainQueryLimiter,
  priceData: priceDataLimiter,
  tokenQuery: tokenQueryLimiter,
  databaseWallet: databaseWalletLimiter,
  global: globalLimiter,
  perUser: perUserLimiter,
  strict: strictLimiter,
  backup: backupLimiter,
  sensitive: sensitiveLimiter,
  standard: standardLimiter,
};
