// Quick localStorage clearer for browser console
// Copy and paste this into your browser console at localhost:3002

console.log('🧹 Clearing all Walletrix data...');

// Clear all localStorage
localStorage.clear();

// Clear all sessionStorage  
sessionStorage.clear();

// Clear specific Walletrix keys (just to be sure)
const walletrixKeys = [
  'walletrix_auth_token',
  'walletrix_user', 
  'walletrix_wallet',
  'walletrix_preferences',
  'walletrix_session',
  'walletrix_cache',
  'walletrix_wallets',
  'walletrix_active_wallet'
];

walletrixKeys.forEach(key => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
});

console.log('✅ All Walletrix data cleared!');
console.log('🔄 Refresh the page to start fresh');

// Auto refresh after 2 seconds
setTimeout(() => {
  window.location.reload();
}, 2000);

console.log('⏰ Page will refresh in 2 seconds...');