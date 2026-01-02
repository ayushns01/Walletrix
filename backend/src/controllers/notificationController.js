import notificationService from '../services/notificationService.js';
import logger from '../services/loggerService.js';

/**
 * Notification Controller
 * Handles notification-related API requests
 */

class NotificationController {
    /**
     * Get user's notifications
     * GET /api/v1/notifications
     */
    async getNotifications(req, res) {
        try {
            const userId = req.user.id;
            const { limit, unreadOnly } = req.query;

            const notifications = await notificationService.getUserNotifications(userId, {
                limit: limit ? parseInt(limit) : 50,
                unreadOnly: unreadOnly === 'true'
            });

            res.status(200).json({
                success: true,
                notifications
            });
        } catch (error) {
            logger.error('Error fetching notifications', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to fetch notifications'
            });
        }
    }

    /**
     * Get unread notification count
     * GET /api/v1/notifications/unread-count
     */
    async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;
            const count = await notificationService.getUnreadCount(userId);

            res.status(200).json({
                success: true,
                count
            });
        } catch (error) {
            logger.error('Error getting unread count', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to get unread count'
            });
        }
    }

    /**
     * Mark notification as read
     * PUT /api/v1/notifications/:id/read
     */
    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            await notificationService.markAsRead(id, userId);

            res.status(200).json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error) {
            logger.error('Error marking notification as read', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to mark notification as read'
            });
        }
    }

    /**
     * Mark all notifications as read
     * PUT /api/v1/notifications/read-all
     */
    async markAllAsRead(req, res) {
        try {
            const userId = req.user.id;
            const result = await notificationService.markAllAsRead(userId);

            res.status(200).json({
                success: true,
                message: 'All notifications marked as read',
                count: result.count
            });
        } catch (error) {
            logger.error('Error marking all notifications as read', {
                error: error.message,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                error: 'Failed to mark all notifications as read'
            });
        }
    }
}

export default new NotificationController();
