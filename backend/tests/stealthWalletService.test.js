const mockWalletRows = new Map();
const mockBotWallets = new Map();
const mockIssuesById = new Map();
const mockIssuesByUserId = new Map();

function seedWalletRows(userId, rows) {
  mockWalletRows.set(String(userId), rows);
}

function seedBotWallet(userId, wallet) {
  mockBotWallets.set(String(userId), wallet);
}

function seedIssue(userId, issue) {
  mockIssuesById.set(issue.id, issue);
  const key = String(userId);
  const issues = mockIssuesByUserId.get(key) || [];
  issues.push(issue);
  mockIssuesByUserId.set(key, issues);
}

jest.mock('../src/lib/prisma.js', () => ({
  __esModule: true,
  default: {
    wallet: {
      findMany: jest.fn(async ({ where }) => mockWalletRows.get(String(where.userId)) || []),
    },
    telegramBotWallet: {
      findUnique: jest.fn(async ({ where }) => mockBotWallets.get(String(where.userId)) || null),
    },
    stealthWalletProfile: {
      findUnique: jest.fn(async () => null),
    },
    stealthAddressIssue: {
      findFirst: jest.fn(async ({ where }) => {
        const issue = mockIssuesById.get(where.id) || null;
        return issue && issue.profile?.userId === where.profile.userId ? issue : null;
      }),
      findMany: jest.fn(async ({ where }) => {
        const issues = mockIssuesByUserId.get(String(where.profile.userId)) || [];
        return issues;
      }),
    },
  },
}));

jest.mock('../src/config/telegram.js', () => ({
  __esModule: true,
  default: {
    SERVER_SIGNING_KEY: 'test-signing-key',
  },
}));

jest.mock('../src/services/loggerService.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../src/services/stealthAddressService.js', () => ({
  __esModule: true,
  default: {
    generateStealthKeys: jest.fn(() => ({
      scanPublicKey: 'scan-public',
      spendPublicKey: 'spend-public',
      scanPrivateKey: 'scan-private',
      spendPrivateKey: 'spend-private',
      stealthMetaAddress: 'st:eth:mock',
    })),
    generateStealthAddress: jest.fn(() => ({
      stealthAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
      ephemeralPublicKey: '0x9999',
    })),
    deriveStealthPrivateKey: jest.fn(),
  },
}));

import {
  findStealthIssueForUser,
  issueStealthReceiveAddress,
  listStealthIssuesForUser,
} from '../src/services/stealthWalletService.js';

describe('stealthWalletService legacy issue hydration', () => {
  const originalAllowMemoryFallback = process.env.ALLOW_IN_MEMORY_STEALTH_FALLBACK;

  beforeEach(() => {
    mockWalletRows.clear();
    mockBotWallets.clear();
    mockIssuesById.clear();
    mockIssuesByUserId.clear();
    jest.clearAllMocks();
    delete process.env.ALLOW_IN_MEMORY_STEALTH_FALLBACK;
  });

  afterAll(() => {
    if (typeof originalAllowMemoryFallback === 'string') {
      process.env.ALLOW_IN_MEMORY_STEALTH_FALLBACK = originalAllowMemoryFallback;
    } else {
      delete process.env.ALLOW_IN_MEMORY_STEALTH_FALLBACK;
    }
  });

  it('resolves destinationAddress for a legacy account-wallet issue from the linked wallet group', async () => {
    seedWalletRows('user-1', [
      {
        id: 'wallet-eth',
        userId: 'user-1',
        label: 'Main Wallet',
        network: 'ETHEREUM',
        address: '0x1111111111111111111111111111111111111111',
        metadata: { groupId: 'grp-main' },
        createdAt: new Date(),
      },
    ]);

    seedIssue('user-1', {
      id: 'issue-legacy-account',
      stealthAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ephemeralPublicKey: '0x1234',
      destinationAddress: null,
      status: 'ACTIVE',
      createdAt: new Date(),
      profile: {
        id: 'profile-1',
        userId: 'user-1',
        walletType: 'ACCOUNT_WALLET',
        walletRef: 'grp-main',
        walletLabel: 'Main Wallet',
      },
    });

    const issue = await findStealthIssueForUser('user-1', 'issue-legacy-account');

    expect(issue.destinationAddress).toBe('0x1111111111111111111111111111111111111111');
    expect(issue.walletLabel).toBe('Main Wallet');
  });

  it('resolves destinationAddress for a legacy bot-wallet issue from the telegram bot wallet', async () => {
    seedBotWallet('user-2', {
      userId: 'user-2',
      address: '0x2222222222222222222222222222222222222222',
    });

    seedIssue('user-2', {
      id: 'issue-legacy-bot',
      stealthAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      ephemeralPublicKey: '0x5678',
      destinationAddress: null,
      status: 'FUNDED',
      createdAt: new Date(),
      profile: {
        id: 'profile-2',
        userId: 'user-2',
        walletType: 'TELEGRAM_BOT_WALLET',
        walletRef: '__telegram_bot__',
        walletLabel: 'Telegram Bot Wallet',
      },
    });

    const issues = await listStealthIssuesForUser('user-2');

    expect(issues).toHaveLength(1);
    expect(issues[0].destinationAddress).toBe('0x2222222222222222222222222222222222222222');
    expect(issues[0].walletLabel).toBe('Telegram Bot Wallet');
  });

  it('throws instead of creating a memory-only stealth issue when fallback is disabled', async () => {
    process.env.ALLOW_IN_MEMORY_STEALTH_FALLBACK = 'false';

    await expect(issueStealthReceiveAddress('user-3', {
      walletType: 'ACCOUNT_WALLET',
      walletRef: 'grp-main',
      label: 'Main Wallet',
      address: '0x3333333333333333333333333333333333333333',
    }, 'SEPOLIA')).rejects.toThrow('Stealth address persistence is unavailable');
  });
});
