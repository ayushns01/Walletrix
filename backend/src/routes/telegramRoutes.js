/**
 * telegramRoutes.js
 * Authenticated endpoints for linking/unlinking Telegram.
 * Requires Clerk auth — frontend sends these with a Clerk JWT.
 */

import express from 'express';
import { requireClerkAuth } from '../middleware/clerkAuth.js';
import {
  generateLinkCode,
  unlinkTelegram,
  getTelegramStatus,
  getBotBalance,
  getSavedRecipients,
  upsertSavedRecipient,
  deleteSavedRecipient,
} from '../controllers/telegramController.js';

const router = express.Router();

router.use(requireClerkAuth);

// GET  /api/v1/telegram/status  — Check if linked and get bot wallet address
router.get('/status', getTelegramStatus);

// POST /api/v1/telegram/link/generate  — Generate a one-time link code
router.post('/link/generate', generateLinkCode);

// POST /api/v1/telegram/unlink  — Remove Telegram link
router.post('/unlink', unlinkTelegram);

// GET  /api/v1/telegram/bot-balance  — Bot wallet ETH balance on Sepolia
router.get('/bot-balance', getBotBalance);

// GET  /api/v1/telegram/recipients  — List saved recipients
router.get('/recipients', getSavedRecipients);

// POST /api/v1/telegram/recipients  — Create or update a saved recipient
router.post('/recipients', upsertSavedRecipient);

// DELETE /api/v1/telegram/recipients/:recipientId  — Remove a saved recipient
router.delete('/recipients/:recipientId', deleteSavedRecipient);

export default router;
