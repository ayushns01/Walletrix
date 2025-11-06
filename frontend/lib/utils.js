/**
 * Utility functions for Walletrix frontend
 */

/**
 * Format a wallet address for display (show first 6 and last 4 characters)
 * @param {string} address - The full wallet address
 * @param {number} startChars - Number of characters to show at start (default: 6)
 * @param {number} endChars - Number of characters to show at end (default: 4)
 * @returns {string} Formatted address like "0x1234...abcd"
 */
export function formatAddress(address, startChars = 6, endChars = 4) {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format a number for currency display
 * @param {string|number} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, decimals = 2, currency = '$') {
  const num = parseFloat(value);
  if (isNaN(num)) return `${currency}0.00`;
  
  return `${currency}${num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

/**
 * Format a crypto amount for display
 * @param {string|number} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 6)
 * @param {boolean} compact - Whether to use compact notation for large numbers
 * @returns {string} Formatted crypto amount
 */
export function formatCrypto(value, decimals = 6, compact = false) {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  
  if (compact && num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (compact && num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  
  // For very small numbers, show more decimals
  if (num < 0.001 && num > 0) {
    return num.toFixed(8);
  }
  
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

/**
 * Format a percentage value
 * @param {string|number} value - The percentage value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage with % sign
 */
export function formatPercentage(value, decimals = 2) {
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00%';
  
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(decimals)}%`;
}

/**
 * Format a timestamp for display
 * @param {string|number|Date} timestamp - The timestamp to format
 * @param {boolean} relative - Whether to show relative time (default: false)
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp, relative = false) {
  const date = new Date(timestamp);
  
  if (relative) {
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Validate an Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} Whether the address is valid
 */
export function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate a Bitcoin address (basic validation)
 * @param {string} address - Address to validate
 * @returns {boolean} Whether the address might be valid
 */
export function isValidBitcoinAddress(address) {
  // Basic validation for common Bitcoin address formats
  return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || // P2PKH/P2SH
         /^bc1[a-z0-9]{39,59}$/.test(address); // Bech32
}

/**
 * Generate a random color for identicons/avatars
 * @param {string} seed - Seed string for consistent colors
 * @returns {string} Hex color code
 */
export function generateColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const color = Math.abs(hash).toString(16).substring(0, 6);
  return '#' + '000000'.substring(0, 6 - color.length) + color;
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}