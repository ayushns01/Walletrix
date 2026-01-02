import express from 'express';
import notificationController from '../controllers/notificationController.js';
import { authenticateClerk } from '../middleware/clerkAuth.js';

const router = express.Router();

/**
 * Notification Routes
 * All routes require authentication
 */

// Get user's notifications
router.get('/', authenticateClerk, notificationController.getNotifications);

// Get unread count
router.get('/unread-count', authenticateClerk, notificationController.getUnreadCount);

// Mark notification as read
router.put('/:id/read', authenticateClerk, notificationController.markAsRead);

// Mark all as read
router.put('/read-all', authenticateClerk, notificationController.markAllAsRead);

export default router;
