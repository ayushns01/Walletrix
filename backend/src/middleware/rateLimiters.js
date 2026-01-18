import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export const walletGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 50,
  message: {
    success: false,
    error: 'Too many wallet generation requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export const transactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Too many transaction requests. Please wait before sending another transaction.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {

    return req.userId || req.ip;
  },
});

export const blockchainQueryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 500 : 120,
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export const priceDataLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many price data requests. Please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export const tokenQueryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: 'Too many token queries. Please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export const databaseWalletLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 200 : 30,
  message: {
    success: false,
    error: 'Too many wallet operations. Please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {

    return req.userId || req.ip;
  },
});

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,

  validate: {
    trustProxy: false,
  },
});

export const perUserLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10000,
  message: {
    success: false,
    error: 'Daily request limit exceeded. Please try again tomorrow.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  keyGenerator: (req) => {

    return req.userId || `ip:${req.ip}`;
  },
  skip: (req) => {

    return !req.userId;
  },
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: 'Too many attempts at this sensitive operation. Please try again in 1 hour.',
  },
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

export const backupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
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

export const sensitiveLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 2,
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

export const standardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: 'Too many requests. Please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

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
