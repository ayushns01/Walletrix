const mockIssueState = new Map();

function seedIssue(overrides = {}) {
  const issue = {
    id: overrides.id || 'issue-1',
    stealthAddress: overrides.stealthAddress || '0x1111111111111111111111111111111111111111',
    destinationAddress: overrides.destinationAddress || '0x2222222222222222222222222222222222222222',
    walletLabel: overrides.walletLabel || 'Main Wallet',
    walletType: overrides.walletType || 'ACCOUNT_WALLET',
    kindLabel: overrides.kindLabel || 'Account wallet',
    network: overrides.network || 'SEPOLIA',
    networkLabel: overrides.networkLabel || 'Sepolia',
    status: overrides.status || 'ACTIVE',
    createdAt: overrides.createdAt || new Date(),
    usedAt: overrides.usedAt || null,
    expiresAt: null,
    lastCheckedAt: overrides.lastCheckedAt || null,
    lastObservedBalanceWei: overrides.lastObservedBalanceWei || '0',
    claimedAt: overrides.claimedAt || null,
    claimTxHash: overrides.claimTxHash || null,
    profile: {
      id: overrides.profileId || 'profile-1',
      userId: overrides.userId || 'user-1',
      walletType: overrides.walletType || 'ACCOUNT_WALLET',
      walletLabel: overrides.walletLabel || 'Main Wallet',
      encryptedScanPrivateKey: 'enc-scan',
      encryptedSpendPrivateKey: 'enc-spend',
      user: overrides.telegramId ? { id: overrides.userId || 'user-1', telegramId: overrides.telegramId } : undefined,
    },
    ...overrides,
  };

  mockIssueState.set(issue.id, issue);
  return issue;
}

const mockProvider = {
  getBalance: jest.fn(),
  getFeeData: jest.fn(),
  estimateGas: jest.fn(),
};

jest.mock('../src/lib/prisma.js', () => ({
  __esModule: true,
  default: {
    activityLog: {
      create: jest.fn(async ({ data }) => ({ id: `activity-${data.action}`, ...data })),
    },
    stealthAddressIssue: {
      findMany: jest.fn(async () => [...mockIssueState.values()]),
    },
  },
}));

jest.mock('../src/services/telegramService.js', () => ({
  __esModule: true,
  sendPlainMessage: jest.fn(async () => ({ ok: true })),
}));

jest.mock('../src/services/conversationSessionService.js', () => ({
  __esModule: true,
  loadConversationSession: jest.fn(async () => null),
  saveConversationSession: jest.fn(async () => true),
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

jest.mock('../src/services/ethereumService.js', () => ({
  __esModule: true,
  default: {
    getProvider: jest.fn(() => mockProvider),
  },
}));

jest.mock('../src/services/stealthAddressService.js', () => ({
  __esModule: true,
  default: {
    deriveStealthPrivateKey: jest.fn(() => '0x59c6995e998f97a5a004497e5d5f3cb6330f0b8f5ce98b5eb2d646f092d137ec'),
  },
}));

jest.mock('../src/services/stealthWalletService.js', () => ({
  __esModule: true,
  decryptSecret: jest.fn((value) => `${value}-decrypted`),
  findStealthIssueForUser: jest.fn(async (userId, issueId) => {
    const issue = mockIssueState.get(issueId) || null;
    return issue && issue.profile?.userId === userId ? issue : null;
  }),
  listStealthIssuesForUser: jest.fn(async (userId, { statuses = [] } = {}) => {
    const issues = [...mockIssueState.values()].filter((issue) => issue.profile?.userId === userId);
    if (!statuses.length) return issues;
    return issues.filter((issue) => statuses.includes(issue.status));
  }),
  updateStealthIssue: jest.fn(async (issueId, data) => {
    const existing = mockIssueState.get(issueId);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    mockIssueState.set(issueId, updated);
    return updated;
  }),
  formatStealthNetworkLabel: jest.fn((network) => (String(network || '').toUpperCase() === 'ETHEREUM' ? 'Ethereum Mainnet' : 'Sepolia')),
  toEthereumServiceNetwork: jest.fn((network) => (String(network || '').toUpperCase() === 'ETHEREUM' ? 'mainnet' : 'sepolia')),
}));

import { ethers } from 'ethers';
import prisma from '../src/lib/prisma.js';
import { sendPlainMessage } from '../src/services/telegramService.js';
import { loadConversationSession, saveConversationSession } from '../src/services/conversationSessionService.js';
import {
  claimStealthIssueForUser,
  getStealthClaimPreviewForUser,
  listStealthIssuesForAuthenticatedUser,
  pollStealthIssueMonitor,
} from '../src/services/stealthLifecycleService.js';

describe('stealthLifecycleService', () => {
  beforeEach(() => {
    mockIssueState.clear();
    jest.clearAllMocks();
    mockProvider.getBalance.mockReset();
    mockProvider.getFeeData.mockReset();
    mockProvider.estimateGas.mockReset();
  });

  it('marks an active stealth issue as funded and sends a notification during monitor polling', async () => {
    seedIssue({ id: 'issue-funded', telegramId: '9001', status: 'ACTIVE' });

    mockProvider.getBalance.mockResolvedValue(500000000000000000n);
    mockProvider.getFeeData.mockResolvedValue({
      gasPrice: 1_000_000_000n,
      maxFeePerGas: 1_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
    });
    mockProvider.estimateGas.mockResolvedValue(21_000n);

    await pollStealthIssueMonitor();

    const updated = mockIssueState.get('issue-funded');
    expect(updated.status).toBe('FUNDED');
    expect(updated.lastObservedBalanceWei).toBe('500000000000000000');
    expect(saveConversationSession).toHaveBeenCalledWith('9001', expect.objectContaining({
      chatContext: expect.objectContaining({
        scene: 'stealth',
        currentStep: 'claim_prompt',
        pendingStealthClaim: expect.objectContaining({
          issueId: 'issue-funded',
        }),
      }),
    }));
    expect(sendPlainMessage).toHaveBeenCalledWith(
      '9001',
      expect.stringContaining('Would you like to claim it now?'),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          keyboard: [
            [{ text: 'Claim now' }, { text: 'Later' }],
          ],
        }),
      }),
    );
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'STEALTH_ADDRESS_FUNDED_NOTIFIED',
      }),
    }));
  });

  it('preserves an existing durable transfer draft when seeding a stealth claim prompt', async () => {
    seedIssue({ id: 'issue-funded-persisted', telegramId: '9002', status: 'ACTIVE' });
    loadConversationSession.mockResolvedValueOnce({
      chatContext: {
        scene: 'transfer',
        currentStep: 'confirm',
      },
      transferDraft: {
        intent: {
          intent: 'transfer',
          details: {
            tokenSymbol: 'ETH',
            amount: 0.12,
            recipientAddress: '0x3333333333333333333333333333333333333333',
          },
        },
        expiresAt: Date.now() + 60_000,
      },
      pendingIntent: {
        intent: 'transfer',
        expiresAt: Date.now() + 60_000,
      },
      expiresAt: new Date(Date.now() + 60_000),
    });

    mockProvider.getBalance.mockResolvedValue(500000000000000000n);
    mockProvider.getFeeData.mockResolvedValue({
      gasPrice: 1_000_000_000n,
      maxFeePerGas: 1_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
    });
    mockProvider.estimateGas.mockResolvedValue(21_000n);

    await pollStealthIssueMonitor();

    expect(saveConversationSession).toHaveBeenCalledWith('9002', expect.objectContaining({
      transferDraft: expect.objectContaining({
        intent: expect.objectContaining({
          intent: 'transfer',
        }),
      }),
      pendingIntent: expect.objectContaining({
        intent: 'transfer',
      }),
    }));
  });

  it('builds a claim preview with claimable balance after gas', async () => {
    seedIssue({
      id: 'issue-preview',
      status: 'FUNDED',
      lastObservedBalanceWei: '400000000000000000',
    });

    mockProvider.getBalance.mockResolvedValue(400000000000000000n);
    mockProvider.getFeeData.mockResolvedValue({
      gasPrice: 1_000_000_000n,
      maxFeePerGas: 1_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
    });
    mockProvider.estimateGas.mockResolvedValue(21_000n);

    const result = await getStealthClaimPreviewForUser('user-1', 'issue-preview');

    expect(result.issue.status).toBe('FUNDED');
    expect(result.preview.balanceEth).toBe('0.4');
    expect(result.preview.estimatedFeeWei).toBe('21000000000000');
    expect(result.preview.claimableWei).toBe('399979000000000000');
    expect(result.preview.canClaim).toBe(true);
  });

  it('refreshes active stealth issues when listing them for the authenticated user', async () => {
    seedIssue({
      id: 'issue-list-refresh',
      telegramId: '9010',
      status: 'ACTIVE',
      lastObservedBalanceWei: '0',
    });

    mockProvider.getBalance.mockResolvedValue(250000000000000000n);

    const issues = await listStealthIssuesForAuthenticatedUser('user-1');

    expect(issues).toHaveLength(1);
    expect(issues[0].status).toBe('FUNDED');
    expect(issues[0].lastObservedBalanceWei).toBe('250000000000000000');
    expect(sendPlainMessage).toHaveBeenCalledWith(
      '9010',
      expect.stringContaining('Would you like to claim it now?'),
      expect.any(Object),
    );
  });

  it('claims a funded stealth issue and marks it claimed', async () => {
    seedIssue({
      id: 'issue-claim',
      status: 'FUNDED',
      lastObservedBalanceWei: '400000000000000000',
    });

    mockProvider.getBalance.mockResolvedValue(400000000000000000n);
    mockProvider.getFeeData.mockResolvedValue({
      gasPrice: 1_000_000_000n,
      maxFeePerGas: 1_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
    });
    mockProvider.estimateGas.mockResolvedValue(21_000n);

    const sendTransactionSpy = jest.spyOn(ethers.Wallet.prototype, 'sendTransaction').mockResolvedValue({
      hash: '0xstealthclaim',
      wait: jest.fn(async () => ({ status: 1 })),
    });

    const result = await claimStealthIssueForUser('user-1', 'issue-claim');

    expect(sendTransactionSpy).toHaveBeenCalledWith(expect.objectContaining({
      to: '0x2222222222222222222222222222222222222222',
      value: 399979000000000000n,
    }));
    expect(result.txHash).toBe('0xstealthclaim');
    expect(mockIssueState.get('issue-claim').status).toBe('CLAIMED');
    expect(mockIssueState.get('issue-claim').claimTxHash).toBe('0xstealthclaim');
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'STEALTH_CLAIM_CONFIRMED',
      }),
    }));

    sendTransactionSpy.mockRestore();
  });
});
