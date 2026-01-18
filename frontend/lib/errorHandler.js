export const ErrorCodes = {

  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_ALREADY_EXISTS: 'WALLET_ALREADY_EXISTS',
  INVALID_MNEMONIC: 'INVALID_MNEMONIC',
  INVALID_PRIVATE_KEY: 'INVALID_PRIVATE_KEY',
  DECRYPTION_FAILED: 'DECRYPTION_FAILED',

  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RPC_ERROR: 'RPC_ERROR',

  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
};

export class APIError extends Error {
  constructor(message, statusCode, errorCode, details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export function parseAPIError(error) {

  if (!error.response) {
    return new APIError(
      'Network error. Please check your connection.',
      0,
      ErrorCodes.NETWORK_ERROR
    );
  }

  const { status, data } = error.response;

  const message = data?.error || data?.message || 'An error occurred';
  const errorCode = data?.errorCode || ErrorCodes.INTERNAL_SERVER_ERROR;
  const details = data?.details || null;

  return new APIError(message, status, errorCode, details);
}

export function getUserFriendlyError(error) {
  if (error instanceof APIError) {

    switch (error.errorCode) {
      case ErrorCodes.UNAUTHORIZED:
      case ErrorCodes.TOKEN_EXPIRED:
        return 'Your session has expired. Please log in again.';

      case ErrorCodes.FORBIDDEN:
        return 'You do not have permission to perform this action.';

      case ErrorCodes.INVALID_CREDENTIALS:
        return 'Invalid username or password.';

      case ErrorCodes.VALIDATION_ERROR:
      case ErrorCodes.INVALID_INPUT:
        return error.details
          ? `Validation error: ${JSON.stringify(error.details)}`
          : 'Please check your input and try again.';

      case ErrorCodes.WALLET_NOT_FOUND:
        return 'Wallet not found.';

      case ErrorCodes.WALLET_ALREADY_EXISTS:
        return 'A wallet with this address already exists.';

      case ErrorCodes.INVALID_MNEMONIC:
        return 'Invalid recovery phrase. Please check and try again.';

      case ErrorCodes.INVALID_PRIVATE_KEY:
        return 'Invalid private key format.';

      case ErrorCodes.DECRYPTION_FAILED:
        return 'Failed to decrypt wallet. Please check your password.';

      case ErrorCodes.INSUFFICIENT_BALANCE:
        return 'Insufficient balance to complete this transaction.';

      case ErrorCodes.TRANSACTION_FAILED:
        return 'Transaction failed. Please try again.';

      case ErrorCodes.INVALID_ADDRESS:
        return 'Invalid wallet address format.';

      case ErrorCodes.NETWORK_ERROR:
        return 'Network connection error. Please check your internet connection.';

      case ErrorCodes.RPC_ERROR:
        return 'Blockchain network error. Please try again later.';

      case ErrorCodes.RATE_LIMIT_EXCEEDED:
        return 'Too many requests. Please wait a moment and try again.';

      case ErrorCodes.SERVICE_UNAVAILABLE:
        return 'Service temporarily unavailable. Please try again later.';

      case ErrorCodes.DUPLICATE_ENTRY:
        return 'This record already exists.';

      case ErrorCodes.RECORD_NOT_FOUND:
        return 'Record not found.';

      case ErrorCodes.INTERNAL_SERVER_ERROR:
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  return error.message || 'An unexpected error occurred.';
}

export function handleAPIError(error, toast, customMessage = null) {
  const apiError = error instanceof APIError ? error : parseAPIError(error);
  const message = customMessage || getUserFriendlyError(apiError);

  toast.error(message, {
    duration: 5000,
  });

  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', {
      message: apiError.message,
      statusCode: apiError.statusCode,
      errorCode: apiError.errorCode,
      details: apiError.details,
    });
  }

  return apiError;
}

export async function withErrorHandling(apiCall, toast, options = {}) {
  const {
    successMessage = null,
    errorMessage = null,
    showSuccessToast = false,
    rethrow = false,
  } = options;

  try {
    const result = await apiCall();

    if (showSuccessToast && successMessage) {
      toast.success(successMessage);
    }

    return { success: true, data: result };
  } catch (error) {
    const apiError = handleAPIError(error, toast, errorMessage);

    if (rethrow) {
      throw apiError;
    }

    return { success: false, error: apiError };
  }
}

export function requiresReauth(error) {
  if (error instanceof APIError) {
    return [
      ErrorCodes.UNAUTHORIZED,
      ErrorCodes.TOKEN_EXPIRED,
      ErrorCodes.TOKEN_INVALID,
    ].includes(error.errorCode);
  }
  return false;
}

export function isRetryable(error) {
  if (error instanceof APIError) {
    return [
      ErrorCodes.NETWORK_ERROR,
      ErrorCodes.SERVICE_UNAVAILABLE,
      ErrorCodes.RPC_ERROR,
    ].includes(error.errorCode);
  }
  return false;
}

export async function retryAPICall(apiCall, maxRetries = 3, delayMs = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error instanceof APIError ? error : parseAPIError(error);

      if (!isRetryable(lastError)) {
        throw lastError;
      }

      if (i < maxRetries - 1) {

        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}

export default {
  ErrorCodes,
  APIError,
  parseAPIError,
  getUserFriendlyError,
  handleAPIError,
  withErrorHandling,
  requiresReauth,
  isRetryable,
  retryAPICall,
};
