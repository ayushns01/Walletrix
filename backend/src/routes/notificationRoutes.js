import express from 'express';
import notificationController from '../controllers/notificationController.js';
import { authenticateClerk } from '../middleware/clerkAuth.js';

const router = express.Router();

router.get('/', authenticateClerk, notificationController.getNotifications);

router.get('/unread-count', authenticateClerk, notificationController.getUnreadCount);

router.put('/:id/read', authenticateClerk, notificationController.markAsRead);

router.put('/read-all', authenticateClerk, notificationController.markAllAsRead);

export default router;
