import walletService from './services/walletService.js';

console.log('🧪 Testing Walletrix Wallet Service\n');

console.log('Test 1: Generate New Wallet');
console.log('='.repeat(50));
const wallet = walletService.generateNewWallet();
console.log('Success:', wallet.success);
if (wallet.success) {
  console.log('Mnemonic:', wallet.mnemonic);
  console.log('Ethereum Address:', wallet.ethereum.address);
  console.log('Bitcoin Address:', wallet.bitcoin.address);
}
console.log('\n');

console.log('Test 2: Import from Mnemonic');
console.log('='.repeat(50));
const imported = walletService.importFromMnemonic(wallet.mnemonic);
console.log('Success:', imported.success);
if (imported.success) {
  console.log('Ethereum Address:', imported.ethereum.address);
  console.log('Bitcoin Address:', imported.bitcoin.address);
  console.log('Addresses Match:',
    imported.ethereum.address === wallet.ethereum.address &&
    imported.bitcoin.address === wallet.bitcoin.address
  );
}
console.log('\n');

console.log('Test 3: Validate Addresses');
console.log('='.repeat(50));
const ethValid = walletService.isValidEthereumAddress(wallet.ethereum.address);
const btcValid = walletService.isValidBitcoinAddress(wallet.bitcoin.address);
console.log('Ethereum Address Valid:', ethValid);
console.log('Bitcoin Address Valid:', btcValid);
console.log('\n');

console.log('Test 4: Encrypt/Decrypt');
console.log('='.repeat(50));
const password = 'test-password-123';
const encrypted = walletService.encryptData(wallet.mnemonic, password);
console.log('Encrypted:', encrypted.substring(0, 50) + '...');
const decrypted = walletService.decryptData(encrypted, password);
console.log('Decrypted:', decrypted);
console.log('Match:', decrypted === wallet.mnemonic);
console.log('\n');

console.log('Test 5: Derive Multiple Accounts');
console.log('='.repeat(50));
const accounts = walletService.deriveAccounts(wallet.mnemonic, 3);
console.log('Success:', accounts.success);
if (accounts.success) {
  accounts.accounts.forEach((acc, index) => {
    console.log(`Account ${index}:`);
    console.log('  ETH:', acc.ethereum.address);
    console.log('  BTC:', acc.bitcoin.address);
  });
}

console.log('\n✅ All tests completed!');
