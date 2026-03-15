var mockSavedRecipientDelegate = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  upsert: jest.fn(),
  deleteMany: jest.fn(),
};

jest.mock('../src/lib/prisma.js', () => ({
  __esModule: true,
  default: {
    get savedRecipient() {
      return mockSavedRecipientDelegate;
    },
    set savedRecipient(value) {
      mockSavedRecipientDelegate = value;
    },
  },
}));

import {
  extractSavedRecipientAliasCandidate,
  findSavedRecipientByName,
  isListSavedRecipientsIntent,
  normalizeSavedRecipientAddress,
  parseSavedRecipientDeleteRequest,
  parseSavedRecipientSaveRequest,
  resolveSavedRecipientFromText,
  saveSavedRecipient,
} from '../src/services/savedRecipientService.js';

describe('savedRecipientService', () => {
  beforeEach(() => {
    mockSavedRecipientDelegate = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    };
  });

  it('parses natural save commands in both common formats', () => {
    expect(parseSavedRecipientSaveRequest('save 0x1111111111111111111111111111111111111111 as Alice')).toEqual({
      name: 'Alice',
      normalizedName: 'alice',
      address: '0x1111111111111111111111111111111111111111',
    });

    expect(parseSavedRecipientSaveRequest('add Alice as 0x1111111111111111111111111111111111111111')).toEqual({
      name: 'Alice',
      normalizedName: 'alice',
      address: '0x1111111111111111111111111111111111111111',
    });

    expect(parseSavedRecipientSaveRequest('I want you to save this address as 0x1111111111111111111111111111111111111111 Contact 1 if I need it in future')).toEqual({
      name: 'Contact 1',
      normalizedName: 'contact 1',
      address: '0x1111111111111111111111111111111111111111',
    });
  });

  it('normalizes EVM addresses to checksum format', () => {
    expect(normalizeSavedRecipientAddress('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBe('0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa');
  });

  it('upserts saved recipients and returns whether the entry was newly created', async () => {
    mockSavedRecipientDelegate.findUnique.mockResolvedValue(null);
    mockSavedRecipientDelegate.upsert.mockResolvedValue({
      id: 'recipient-1',
      userId: 'user-1',
      name: 'Alice',
      normalizedName: 'alice',
      address: '0x1111111111111111111111111111111111111111',
      createdAt: new Date('2026-03-14T00:00:00.000Z'),
      updatedAt: new Date('2026-03-14T00:00:00.000Z'),
    });

    const result = await saveSavedRecipient('user-1', {
      name: 'Alice',
      address: '0x1111111111111111111111111111111111111111',
    });

    expect(result.created).toBe(true);
    expect(result.recipient.name).toBe('Alice');
    expect(mockSavedRecipientDelegate.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_normalizedName: {
          userId: 'user-1',
          normalizedName: 'alice',
        },
      },
    }));
  });

  it('resolves a saved recipient from transfer phrasing', async () => {
    mockSavedRecipientDelegate.findUnique.mockResolvedValue({
      id: 'recipient-1',
      userId: 'user-1',
      name: 'Alice',
      normalizedName: 'alice',
      address: '0x1111111111111111111111111111111111111111',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const resolved = await resolveSavedRecipientFromText('user-1', 'send 0.4 eth to Alice');

    expect(resolved).toEqual(expect.objectContaining({
      name: 'Alice',
      address: '0x1111111111111111111111111111111111111111',
      alias: 'Alice',
    }));
  });

  it('parses natural delete phrases and strips filler words', () => {
    expect(parseSavedRecipientDeleteRequest('Delete the contact1')).toEqual({
      name: 'contact1',
      normalizedName: 'contact1',
    });
    expect(parseSavedRecipientDeleteRequest('Delete contact 1 from address list')).toEqual({
      name: 'contact 1',
      normalizedName: 'contact 1',
    });
  });

  it('finds names even when spacing differs', async () => {
    mockSavedRecipientDelegate.findUnique.mockResolvedValueOnce(null);
    mockSavedRecipientDelegate.findMany.mockResolvedValueOnce([
      {
        id: 'recipient-1',
        userId: 'user-1',
        name: 'Contact 1',
        normalizedName: 'contact 1',
        address: '0x1111111111111111111111111111111111111111',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const recipient = await findSavedRecipientByName('user-1', 'Contact1');

    expect(recipient).toEqual(expect.objectContaining({
      name: 'Contact 1',
      normalizedName: 'contact 1',
    }));
  });

  it('supports bare-name resolution only when allowed', () => {
    expect(extractSavedRecipientAliasCandidate('Alice')).toBeNull();
    expect(extractSavedRecipientAliasCandidate('Alice', { allowBareName: true })).toBe('Alice');
    expect(extractSavedRecipientAliasCandidate('send 0.3 eth to Contact 1')).toBe('Contact 1');
    expect(extractSavedRecipientAliasCandidate('actually make it 0.2', { allowBareName: true })).toBeNull();
  });

  it('recognizes natural contact-list requests', () => {
    expect(isListSavedRecipientsIntent('show me my contact list')).toBe(true);
    expect(isListSavedRecipientsIntent('show me my address list')).toBe(true);
    expect(isListSavedRecipientsIntent('what are my saved addresses')).toBe(true);
    expect(isListSavedRecipientsIntent('/addresses')).toBe(true);
    expect(isListSavedRecipientsIntent('tell me a joke')).toBe(false);
  });
});
