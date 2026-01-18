import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

global.console = {
  ...console,

  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

jest.setTimeout(30000);

afterEach(() => {
  jest.clearAllMocks();
});

beforeAll(() => {

  process.env.NODE_ENV = 'test';

  if (!process.env.COINGECKO_API_KEY) {
    process.env.COINGECKO_API_KEY = 'test-api-key';
  }

  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  }

  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
  }
});

afterAll(async () => {

});

expect.extend({
  toBeValidEthereumAddress(received) {
    const isValid = /^0x[a-fA-F0-9]{40}$/.test(received);
    return {
      message: () =>
        `expected ${received} ${this.isNot ? 'not ' : ''}to be a valid Ethereum address`,
      pass: isValid
    };
  },

  toBeValidBitcoinAddress(received) {
    const isValid = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(received);
    return {
      message: () =>
        `expected ${received} ${this.isNot ? 'not ' : ''}to be a valid Bitcoin address`,
      pass: isValid
    };
  },

  toBeValidPrivateKey(received) {
    const isValid = /^[0-9a-fA-F]{64}$/.test(received.replace(/^0x/, ''));
    return {
      message: () =>
        `expected ${received} ${this.isNot ? 'not ' : ''}to be a valid private key`,
      pass: isValid
    };
  },

  toBeValidMnemonic(received) {
    const words = received.trim().split(/\s+/);
    const isValid = words.length === 12 || words.length === 24;
    return {
      message: () =>
        `expected ${received} ${this.isNot ? 'not ' : ''}to be a valid mnemonic (12 or 24 words)`,
      pass: isValid
    };
  }
});

export default {};
