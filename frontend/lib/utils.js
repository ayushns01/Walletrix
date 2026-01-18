export function formatAddress(address, startChars = 6, endChars = 4) {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function formatCurrency(value, decimals = 2, currency = '$') {
  const num = parseFloat(value);
  if (isNaN(num)) return `${currency}0.00`;

  return `${currency}${num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

export function formatCrypto(value, decimals = 6, compact = false) {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';

  if (compact && num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (compact && num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }

  if (num < 0.001 && num > 0) {
    return num.toFixed(8);
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

export function formatPercentage(value, decimals = 2) {
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00%';

  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(decimals)}%`;
}

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

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {

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

export function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidBitcoinAddress(address) {

  return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
         /^bc1[a-z0-9]{39,59}$/.test(address);
}

export function generateColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const color = Math.abs(hash).toString(16).substring(0, 6);
  return '#' + '000000'.substring(0, 6 - color.length) + color;
}

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

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
