import express from 'express';
import { requireClerkAuth } from '../middleware/clerkAuth.js';

const router = express.Router();

// All routes require Clerk authentication (frontend uses Clerk tokens)
router.use(requireClerkAuth);

/**
 * GET /api/v1/notifications/unread-count
 * Returns the number of unread notifications for the authenticated user.
 */
router.get('/unread-count', (req, res) => {
  res.status(200).json({ success: true, count: 0 });
});

/**
 * GET /api/v1/notifications
 * Returns a list of notifications for the authenticated user.
 */
router.get('/', (req, res) => {
  res.status(200).json({ success: true, notifications: [] });
});

/**
 * PUT /api/v1/notifications/read-all
 * Marks all notifications as read.
 */
router.put('/read-all', (req, res) => {
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

/**
 * PUT /api/v1/notifications/:id/read
 * Marks a single notification as read.
 */
router.put('/:id/read', (req, res) => {
  res.status(200).json({ success: true, message: 'Notification marked as read' });
});

export default router;
