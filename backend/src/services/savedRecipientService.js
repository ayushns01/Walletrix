import { ethers } from 'ethers';
import prisma from '../lib/prisma.js';

const ENS_NAME_RE = /^[a-z0-9-]+\.eth$/i;
const ADDRESS_OR_ENS_RE = /(0x[0-9a-fA-F]{40}|[a-z0-9-]+\.eth)/i;
const RESERVED_CONTACT_NAMES = new Set([
  'help',
  'balance',
  'start',
  'unlink',
  'contacts',
  'addresses',
  'address list',
  'previous recipient',
  'previous',
  'last recipient',
  'same address',
]);

const SAVE_ACTION_RE = /\b(save|add)\b/i;
const CONTACT_LIST_RE = /\b(contact list|contacts|saved addresses|saved recipients|address book|address list|addresses)\b/i;
const CONTACT_LIST_VERB_RE = /\b(show|list|see|view|display|open|check|what|which|my)\b/i;

function cleanQuotedValue(value) {
  return String(value || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

function normalizeParsingText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAddressOrEnsMatch(text) {
  const match = String(text || '').match(ADDRESS_OR_ENS_RE);
  if (!match) return null;
  return {
    raw: match[0],
    normalized: normalizeSavedRecipientAddress(match[0]),
  };
}

function sanitizeSavedRecipientNameCandidate(value) {
  let candidate = formatSavedRecipientName(value)
    .replace(/^(?:as|named|name it|call it|for)\s+/i, '')
    .trim();

  const commentarySplit = candidate.split(/\b(?:if|for|because|so that|in case|when)\b/i);
  if (commentarySplit[0]) {
    candidate = commentarySplit[0].trim();
  }

  candidate = candidate.replace(/[,:;.-]+$/g, '').trim();
  return candidate;
}

function sanitizeDeleteRecipientNameCandidate(value) {
  return formatSavedRecipientName(value)
    .replace(/^(?:the|my)\s+/i, '')
    .replace(/\s+(?:from\s+(?:my\s+)?(?:contacts|saved addresses|saved recipients|address list|addresses))$/i, '')
    .trim();
}

function buildSavedRecipientNameVariants(name) {
  const normalized = normalizeSavedRecipientName(
    sanitizeDeleteRecipientNameCandidate(name)
  );

  if (!normalized) return [];

  const variants = [normalized];
  const compact = normalized.replace(/\s+/g, '');
  if (compact && compact !== normalized) {
    variants.push(compact);
  }

  return variants;
}

export function normalizeSavedRecipientName(name) {
  return cleanQuotedValue(name)
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function formatSavedRecipientName(name) {
  return cleanQuotedValue(name).replace(/\s+/g, ' ');
}

export function normalizeSavedRecipientAddress(address) {
  const trimmed = String(address || '').trim();
  if (!trimmed) return null;
  if (ethers.isAddress(trimmed)) return ethers.getAddress(trimmed);
  if (ENS_NAME_RE.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

export function validateSavedRecipientName(name) {
  const formatted = formatSavedRecipientName(name);
  const normalized = normalizeSavedRecipientName(name);

  if (!formatted) {
    return { ok: false, error: 'Recipient name is required.' };
  }
  if (formatted.length > 50) {
    return { ok: false, error: 'Recipient name must be 50 characters or fewer.' };
  }
  if (!/[a-z]/i.test(formatted)) {
    return { ok: false, error: 'Recipient name should include at least one letter.' };
  }
  if (RESERVED_CONTACT_NAMES.has(normalized)) {
    return { ok: false, error: 'That name is reserved. Pick a different contact name.' };
  }

  return { ok: true, formatted, normalized };
}

export function parseSavedRecipientSaveRequest(text) {
  const message = normalizeParsingText(text);
  if (!message) return null;

  const patterns = [
    /^(?:save|add)\s+(?<address>0x[0-9a-fA-F]{40}|[a-z0-9-]+\.eth)\s+as\s+(?<name>.+)$/i,
    /^(?:save|add)\s+(?<name>.+?)\s+as\s+(?<address>0x[0-9a-fA-F]{40}|[a-z0-9-]+\.eth)$/i,
    /^(?:save|add)\s+(?<name>.+?)\s*[:=-]\s*(?<address>0x[0-9a-fA-F]{40}|[a-z0-9-]+\.eth)$/i,
    /^(?:i\s+want\s+you\s+to\s+)?(?:save|add)\s+(?:this\s+)?(?:address|recipient|wallet)\s+as\s+(?<address>0x[0-9a-fA-F]{40}|[a-z0-9-]+\.eth)\s+(?<name>.+)$/i,
    /^(?:please\s+)?(?:save|add)\s+(?:this\s+)?(?:address|recipient|wallet)\s+(?<address>0x[0-9a-fA-F]{40}|[a-z0-9-]+\.eth)\s+as\s+(?<name>.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (!match?.groups) continue;

    const name = sanitizeSavedRecipientNameCandidate(match.groups.name);
    const address = normalizeSavedRecipientAddress(match.groups.address);
    if (!name || !address) return null;

    return { name, normalizedName: normalizeSavedRecipientName(name), address };
  }

  if (!SAVE_ACTION_RE.test(message)) return null;

  const addressMatch = extractAddressOrEnsMatch(message);
  if (!addressMatch?.normalized) return null;

  const rawAfterAddress = message.slice(message.indexOf(addressMatch.raw) + addressMatch.raw.length);
  const nameAfterAddress = sanitizeSavedRecipientNameCandidate(rawAfterAddress);
  if (nameAfterAddress) {
    return {
      name: nameAfterAddress,
      normalizedName: normalizeSavedRecipientName(nameAfterAddress),
      address: addressMatch.normalized,
    };
  }

  return null;
}

export function isSavedRecipientSaveIntent(text) {
  const message = normalizeParsingText(text);
  if (!message) return false;
  return SAVE_ACTION_RE.test(message) && (
    /\b(address|recipient|wallet|contact)\b/i.test(message)
    || Boolean(extractAddressOrEnsMatch(message)?.normalized)
  );
}

export function parseSavedRecipientDeleteRequest(text) {
  const message = normalizeParsingText(text);
  if (!message) return null;

  const patterns = [
    /^(?:delete|remove|forget)\s+(?:the\s+)?(?<name>.+?)\s+from\s+(?:my\s+)?(?:contacts|saved addresses|saved recipients|address list|addresses)$/i,
    /^(?:delete|remove|forget)\s+(?:the\s+)?(?<name>[a-z][a-z0-9 _.'-]{0,48})$/i,
    /^(?:delete|remove|forget)\s+(?:the\s+)?(?:contact|address|recipient|entry)\s+(?<name>.+?)(?:\s+from\s+(?:my\s+)?(?:contacts|saved addresses|saved recipients|address list|addresses))?$/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (!match?.groups?.name) continue;

    const name = sanitizeDeleteRecipientNameCandidate(match.groups.name);
    const normalizedName = normalizeSavedRecipientName(name);
    if (!normalizedName) return null;

    return { name, normalizedName };
  }

  return null;
}

export function isListSavedRecipientsIntent(text) {
  const message = normalizeParsingText(text).toLowerCase();
  if (!message) return false;
  if (/^\/contacts\b/i.test(message)) return true;
  if (/^\/addresses\b/i.test(message)) return true;
  if (/^(?:contacts|saved addresses|saved recipients|address book|address list|addresses)$/i.test(message)) return true;
  return CONTACT_LIST_RE.test(message) && CONTACT_LIST_VERB_RE.test(message);
}

function sanitizeAliasCandidate(value) {
  return cleanQuotedValue(value)
    .replace(/^(?:contact|recipient)\s+(?=[a-z][a-z0-9 _.'-]*$)/i, '')
    .replace(/\s+(?:please|pls|now)$/i, '')
    .trim();
}

export function extractSavedRecipientAliasCandidate(text, { allowBareName = false } = {}) {
  const message = String(text || '').trim();
  if (!message) return null;
  if (ADDRESS_OR_ENS_RE.test(message)) return null;
  if (/\b(previous|last|same)\b.*\b(recipient|address|transaction|tx)\b/i.test(message)) return null;

  const toMatch = message.match(/\bto\s+("?)(?<name>[a-z][a-z0-9 _.'-]{0,48})\1\s*$/i);
  if (toMatch?.groups?.name) {
    return sanitizeAliasCandidate(toMatch.groups.name);
  }

  if (!allowBareName) return null;
  if (/\b(send|transfer|pay|balance|help|start|unlink|cancel|confirm)\b/i.test(message)) return null;
  if (/\b(actually|make|change|set|update|amount|token|address)\b/i.test(message)) return null;
  if (/\d/.test(message)) return null;

  const candidate = sanitizeAliasCandidate(message);
  if (!candidate || candidate.length > 50) return null;
  if (!/[a-z]/i.test(candidate)) return null;
  if (candidate.split(/\s+/).length > 3) return null;

  return candidate;
}

function mapSavedRecipient(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    normalizedName: record.normalizedName,
    address: record.address,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function saveSavedRecipient(userId, { name, address }) {
  const nameValidation = validateSavedRecipientName(name);
  if (!nameValidation.ok) {
    throw new Error(nameValidation.error);
  }

  const normalizedAddress = normalizeSavedRecipientAddress(address);
  if (!normalizedAddress) {
    throw new Error('Recipient address must be a valid 0x address or ENS name.');
  }

  const existing = await prisma.savedRecipient.findUnique({
    where: {
      userId_normalizedName: {
        userId,
        normalizedName: nameValidation.normalized,
      },
    },
  });

  const record = await prisma.savedRecipient.upsert({
    where: {
      userId_normalizedName: {
        userId,
        normalizedName: nameValidation.normalized,
      },
    },
    update: {
      name: nameValidation.formatted,
      address: normalizedAddress,
    },
    create: {
      userId,
      name: nameValidation.formatted,
      normalizedName: nameValidation.normalized,
      address: normalizedAddress,
    },
  });

  return {
    recipient: mapSavedRecipient(record),
    created: !existing,
  };
}

export async function listSavedRecipients(userId) {
  const recipients = await prisma.savedRecipient.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });

  return recipients.map(mapSavedRecipient);
}

export async function findSavedRecipientByName(userId, name) {
  const variants = buildSavedRecipientNameVariants(name);
  if (variants.length === 0) return null;

  const exactRecord = await prisma.savedRecipient.findUnique({
    where: {
      userId_normalizedName: {
        userId,
        normalizedName: variants[0],
      },
    },
  });
  if (exactRecord) return mapSavedRecipient(exactRecord);

  const records = await prisma.savedRecipient.findMany({
    where: { userId },
  });

  const compactVariants = variants.map((variant) => variant.replace(/\s+/g, ''));
  const match = variants
    .map((variant) => records.find((record) => record.normalizedName === variant))
    .find(Boolean)
    || records.find((record) => compactVariants.includes(String(record.normalizedName || '').replace(/\s+/g, '')));

  return mapSavedRecipient(match || null);
}

export async function deleteSavedRecipientById(userId, recipientId) {
  const deleted = await prisma.savedRecipient.deleteMany({
    where: {
      id: recipientId,
      userId,
    },
  });

  return deleted.count > 0;
}

export async function removeSavedRecipientByName(userId, name) {
  const record = await findSavedRecipientByName(userId, name);
  if (!record) return null;

  const deleted = await deleteSavedRecipientById(userId, record.id);
  return deleted ? record : null;
}

export async function resolveSavedRecipientFromText(userId, text, options = {}) {
  const alias = extractSavedRecipientAliasCandidate(text, options);
  if (!alias) return null;

  const record = await findSavedRecipientByName(userId, alias);
  if (!record) return null;

  return {
    ...record,
    alias,
  };
}
