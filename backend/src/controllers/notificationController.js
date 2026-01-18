import notificationService from '../services/notificationService.js';
import logger from '../services/loggerService.js';

class NotificationController {

    async getNotifications(req, res) {
        try {
            const userId = req.user.id;
            const { walletId, limit, unreadOnly } = req.query;

            const notifications = await notificationService.getUserNotifications(userId, {
                walletId,
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

    async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;
            const { walletId } = req.query;
            const count = await notificationService.getUnreadCount(userId, walletId);

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
