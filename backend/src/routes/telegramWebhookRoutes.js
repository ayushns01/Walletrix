/**
 * telegramWebhookRoutes.js
 * Public webhook endpoint — Telegram calls this directly (no user auth).
 * Security is enforced via X-Telegram-Bot-Api-Secret-Token header verification
 * inside the controller.
 */

import express from 'express';
import { handleWebhook } from '../controllers/telegramWebhookController.js';

const router = express.Router();

// POST /api/v1/telegram/webhook
router.post('/webhook', handleWebhook);

export default router;
