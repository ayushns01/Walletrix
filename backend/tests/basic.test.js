/**
 * Basic Test Suite
 * Simple tests to verify testing infrastructure
 */

describe('Testing Infrastructure', () => {
  test('should run basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBe('hello');
    expect(true).toBeTruthy();
  });

  test('should handle async operations', async () => {
    const asyncResult = await Promise.resolve('test');
    expect(asyncResult).toBe('test');
  });

  test('should validate custom matchers', () => {
    // Test Ethereum address matcher
    expect('0x742d35Cc6465C395C6de4D83F2e47Aa4E6AA6b95').toBeValidEthereumAddress();
    expect('invalid-address').not.toBeValidEthereumAddress();

    // Test Bitcoin address matcher
    expect('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa').toBeValidBitcoinAddress();
    expect('invalid-btc-address').not.toBeValidBitcoinAddress();

    // Test mnemonic matcher
    const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    expect(validMnemonic).toBeValidMnemonic();
    expect('invalid mnemonic').not.toBeValidMnemonic();

    // Test private key matcher
    expect('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef').toBeValidPrivateKey();
    expect('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef').toBeValidPrivateKey();
    expect('invalid-key').not.toBeValidPrivateKey();
  });

  test('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.ENCRYPTION_KEY).toBeDefined();
  });
});