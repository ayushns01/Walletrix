/**
 * telegramController.js
 * Handles account linking between Telegram and Walletrix (authenticated endpoints).
 * All routes require Clerk auth — req.clerkUserId is set by requireClerkAuth middleware.
 */

import prisma from '../lib/prisma.js';
import { createBotWallet, getBotWalletBalance } from '../services/telegramExecutionService.js';
import {
  deleteSavedRecipientById,
  listSavedRecipients,
  saveSavedRecipient,
  updateSavedRecipientById,
} from '../services/savedRecipientService.js';
import logger from '../services/loggerService.js';

async function findAuthenticatedUser(clerkUserId) {
  return prisma.user.findUnique({ where: { email: clerkUserId } });
}

async function findOrCreateAuthenticatedUser(clerkUserId) {
  return prisma.user.upsert({
    where: { email: clerkUserId },
    update: {},
    create: {
      email: clerkUserId,
      name: 'Clerk User',
      passwordHash: 'clerk-managed',
    },
  });
}

/**
 * Generate a link code for the authenticated user.
 * Called by the frontend when user clicks "Link Telegram" in Settings.
 *
 * POST /api/v1/telegram/link/generate
 */
export async function generateLinkCode(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await findOrCreateAuthenticatedUser(clerkUserId);

    // Check if already linked
    if (user.telegramId) {
      return res.status(200).json({
        success: true,
        alreadyLinked: true,
        telegramId: user.telegramId,
      });
    }

    // Generate a 6-char alphanumeric code
    const code = Math.random().toString(36).toUpperCase().slice(2, 8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert link code (user can regenerate)
    await prisma.telegramLinkCode.upsert({
      where: { userId: user.id },
      update: { code, expiresAt },
      create: { userId: user.id, code, telegramId: '', expiresAt },
    });

    logger.info('[Telegram] Link code generated', { userId: user.id, code });

    res.status(200).json({ success: true, code, expiresAt });
  } catch (error) {
    logger.error('[Telegram] generateLinkCode error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate link code' });
  }
}

/**
 * Verify and apply a link code submitted by the user from the bot.
 * This is called from the bot's /start flow — NOT from the frontend.
 * (Internal use — called by telegramWebhookController)
 *
 * @param {string} telegramId
 * @param {string} code
 * @returns {{ success: boolean, userId?: string, address?: string }}
 */
export async function applyLinkCode(telegramId, code) {
  // Find valid link code
  const linkCode = await prisma.telegramLinkCode.findUnique({ where: { code } });

  if (!linkCode) return { success: false, error: 'Invalid code' };
  if (new Date() > linkCode.expiresAt) return { success: false, error: 'Code expired' };

  // Check this Telegram ID isn't already linked to another account
  const existingLink = await prisma.user.findUnique({ where: { telegramId } });
  if (existingLink && existingLink.id !== linkCode.userId) {
    return { success: false, error: 'This Telegram account is already linked to another Walletrix account' };
  }

  // Update user: set telegramId
  const user = await prisma.user.update({
    where: { id: linkCode.userId },
    data: { telegramId, telegramLinkedAt: new Date() },
  });

  // Delete used link code
  await prisma.telegramLinkCode.delete({ where: { code } });

  // Generate dedicated bot wallet for this user
  const { address } = await createBotWallet(user.id);

  logger.info('[Telegram] Account linked', { userId: user.id, telegramId, botWallet: address });

  return { success: true, userId: user.id, address };
}

/**
 * Unlink Telegram from the authenticated user's account.
 *
 * POST /api/v1/telegram/unlink
 */
export async function unlinkTelegram(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await findAuthenticatedUser(clerkUserId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (!user.telegramId) {
      return res.status(400).json({ success: false, error: 'No Telegram account linked' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramId: null, telegramLinkedAt: null },
    });

    logger.info('[Telegram] Account unlinked', { userId: user.id });
    res.status(200).json({ success: true, message: 'Telegram account unlinked' });
  } catch (error) {
    logger.error('[Telegram] unlinkTelegram error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to unlink' });
  }
}

/**
 * Get Telegram link status for the authenticated user.
 *
 * GET /api/v1/telegram/status
 */
export async function getTelegramStatus(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await prisma.user.findUnique({
      where: { email: clerkUserId },
      include: { telegramBotWallet: true },
    });

    if (!user) {
      return res.status(200).json({ success: true, linked: false });
    }

    res.status(200).json({
      success: true,
      linked: !!user.telegramId,
      telegramId: user.telegramId || null,
      linkedAt: user.telegramLinkedAt || null,
      botWallet: user.telegramBotWallet
        ? { address: user.telegramBotWallet.address }
        : null,
    });
  } catch (error) {
    logger.error('[Telegram] getTelegramStatus error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get status' });
  }
}

/**
 * Get the bot wallet's current ETH balance on Sepolia.
 *
 * GET /api/v1/telegram/bot-balance
 */
export async function getBotBalance(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await findAuthenticatedUser(clerkUserId);
    if (!user || !user.telegramId) {
      return res.status(404).json({ success: false, error: 'No linked Telegram account' });
    }

    const data = await getBotWalletBalance(user.id);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    logger.error('[Telegram] getBotBalance error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch bot balance' });
  }
}

/**
 * List the authenticated user's saved recipients.
 *
 * GET /api/v1/telegram/recipients
 */
export async function getSavedRecipients(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await findAuthenticatedUser(clerkUserId);

    if (!user) {
      return res.status(200).json({ success: true, recipients: [] });
    }

    const recipients = await listSavedRecipients(user.id);
    return res.status(200).json({ success: true, recipients });
  } catch (error) {
    logger.error('[Telegram] getSavedRecipients error', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to load saved recipients' });
  }
}

/**
 * Create or update a saved recipient for the authenticated user.
 *
 * POST /api/v1/telegram/recipients
 */
export async function upsertSavedRecipient(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await findOrCreateAuthenticatedUser(clerkUserId);
    const { name, address } = req.body || {};

    const result = await saveSavedRecipient(user.id, { name, address });
    return res.status(result.created ? 201 : 200).json({
      success: true,
      created: result.created,
      recipient: result.recipient,
    });
  } catch (error) {
    const statusCode = /required|valid|reserved|fewer/i.test(error.message || '') ? 400 : 500;
    logger.error('[Telegram] upsertSavedRecipient error', { error: error.message });
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? error.message : 'Failed to save recipient',
    });
  }
}

/**
 * Delete a saved recipient for the authenticated user.
 *
 * DELETE /api/v1/telegram/recipients/:recipientId
 */
export async function deleteSavedRecipient(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await findAuthenticatedUser(clerkUserId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const removed = await deleteSavedRecipientById(user.id, req.params.recipientId);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Saved recipient not found' });
    }

    return res.status(200).json({ success: true, deleted: true });
  } catch (error) {
    logger.error('[Telegram] deleteSavedRecipient error', { error: error.message });
    return res.status(500).json({ success: false, error: 'Failed to delete recipient' });
  }
}

/**
 * Update a saved recipient for the authenticated user.
 *
 * PATCH /api/v1/telegram/recipients/:recipientId
 */
export async function updateSavedRecipient(req, res) {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await findAuthenticatedUser(clerkUserId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { name, address } = req.body || {};
    const result = await updateSavedRecipientById(user.id, req.params.recipientId, { name, address });
    if (!result) {
      return res.status(404).json({ success: false, error: 'Saved recipient not found' });
    }

    return res.status(200).json({
      success: true,
      recipient: result.recipient,
    });
  } catch (error) {
    const statusCode = /required|valid|reserved|fewer|already/i.test(error.message || '') ? 400 : 500;
    logger.error('[Telegram] updateSavedRecipient error', { error: error.message });
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 400 ? error.message : 'Failed to update recipient',
    });
  }
}
