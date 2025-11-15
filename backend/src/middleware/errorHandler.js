/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses and logging
 */

/**
 * Standard error codes for the application
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Wallet Operations
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_ALREADY_EXISTS: 'WALLET_ALREADY_EXISTS',
  INVALID_MNEMONIC: 'INVALID_MNEMONIC',
  INVALID_PRIVATE_KEY: 'INVALID_PRIVATE_KEY',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',
  
  // Blockchain Operations
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RPC_ERROR: 'RPC_ERROR',
  
  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
};

/**
 * Custom Application Error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = ErrorCodes.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Specific error classes
 */

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, ErrorCodes.UNAUTHORIZED);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, ErrorCodes.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, ErrorCodes.RECORD_NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, ErrorCodes.DUPLICATE_ENTRY);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, ErrorCodes.RATE_LIMIT_EXCEEDED);
  }
}

export class BlockchainError extends AppError {
  constructor(message, details = null) {
    super(message, 500, ErrorCodes.NETWORK_ERROR, details);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(message = 'Insufficient balance') {
    super(message, 400, ErrorCodes.INSUFFICIENT_BALANCE);
  }
}

/**
 * Error logging function
 */
const logError = (error, req) => {
  const timestamp = new Date().toISOString();
  const method = req?.method || 'UNKNOWN';
  const url = req?.originalUrl || req?.url || 'UNKNOWN';
  const userId = req?.userId || req?.user?.id || 'anonymous';
  const ip = req?.ip || 'UNKNOWN';
  
  console.error('\n=== ERROR LOG ===');
  console.error(`Timestamp: ${timestamp}`);
  console.error(`Method: ${method} ${url}`);
  console.error(`User: ${userId}`);
  console.error(`IP: ${ip}`);
  console.error(`Error Name: ${error.name}`);
  console.error(`Error Code: ${error.errorCode || 'N/A'}`);
  console.error(`Message: ${error.message}`);
  
  if (error.details) {
    console.error(`Details:`, error.details);
  }
  
  if (error.stack && process.env.NODE_ENV === 'development') {
    console.error(`Stack Trace:\n${error.stack}`);
  }
  
  console.error('=================\n');
};

/**
 * Format error response
 */
const formatErrorResponse = (error, req) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response = {
    success: false,
    error: error.message || 'An error occurred',
    errorCode: error.errorCode || ErrorCodes.INTERNAL_SERVER_ERROR,
    timestamp: new Date().toISOString(),
  };
  
  // Add details if available
  if (error.details) {
    response.details = error.details;
  }
  
  // Add stack trace in development
  if (isDevelopment && error.stack) {
    response.stack = error.stack.split('\n');
  }
  
  // Add request info in development
  if (isDevelopment && req) {
    response.request = {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      query: req.query,
    };
  }
  
  return response;
};

/**
 * Main error handling middleware
 */
export const errorHandler = (error, req, res, next) => {
  // Log the error
  logError(error, req);
  
  // Determine status code
  let statusCode = error.statusCode || 500;
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
  } else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
  } else if (error.name === 'RateLimitError') {
    statusCode = 429;
  }
  
  // Prisma-specific errors
  if (error.code?.startsWith('P')) {
    statusCode = 400;
    if (error.code === 'P2002') {
      error.message = 'This record already exists';
      error.errorCode = ErrorCodes.DUPLICATE_ENTRY;
    } else if (error.code === 'P2025') {
      error.message = 'Record not found';
      error.errorCode = ErrorCodes.RECORD_NOT_FOUND;
      statusCode = 404;
    } else {
      error.message = 'Database operation failed';
      error.errorCode = ErrorCodes.DATABASE_ERROR;
    }
  }
  
  // Format and send response
  const response = formatErrorResponse(error, req);
  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Route');
  error.message = `Cannot ${req.method} ${req.originalUrl}`;
  next(error);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Graceful error response helper
 */
export const sendErrorResponse = (res, statusCode, message, errorCode, details = null) => {
  res.status(statusCode).json({
    success: false,
    error: message,
    errorCode,
    details,
    timestamp: new Date().toISOString(),
  });
};

export default {
  ErrorCodes,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  BlockchainError,
  InsufficientBalanceError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  sendErrorResponse,
};
