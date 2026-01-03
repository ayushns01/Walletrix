'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationBell({ currentWalletId }) {
    const { getToken } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch unread count
    const fetchUnreadCount = async () => {
        try {
            const token = await getToken();
            console.log('🔍 NotificationBell - currentWalletId:', currentWalletId); // DEBUG
            // 🔍 NEW: Add walletId query parameter if available
            const url = currentWalletId
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/unread-count?walletId=${currentWalletId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/unread-count`;

            console.log('🔍 Fetching from URL:', url); // DEBUG

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.success) {
                setUnreadCount(data.count);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            // 🔍 NEW: Add walletId query parameter if available
            const url = currentWalletId
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications?limit=10&walletId=${currentWalletId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications?limit=10`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (data.success) {
                setNotifications(data.notifications);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mark as read
    const markAsRead = async (notificationId) => {
        try {
            const token = await getToken();
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            // Update local state
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const token = await getToken();
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/read-all`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    // Poll for new notifications every 30 seconds
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    // 🔍 NEW: Re-fetch notifications when wallet changes
    useEffect(() => {
        fetchUnreadCount();
    }, [currentWalletId]);

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (showDropdown) {
            fetchNotifications();
        }
    }, [showDropdown]);

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'multisig_transaction':
                return '📝';
            case 'multisig_signed':
                return '✍️';
            case 'multisig_executed':
                return '✅';
            default:
                return '🔔';
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="relative">
            {/* Bell Icon */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />

                    {/* Dropdown Panel */}
                    <div className="absolute right-0 mt-2 w-96 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 z-50 max-h-[500px] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto flex-1">
                            {loading ? (
                                <div className="p-8 text-center text-gray-400">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-700">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-gray-750 transition-colors ${!notification.isRead ? 'bg-purple-500/5' : ''
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="text-2xl flex-shrink-0">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h4 className="text-sm font-semibold text-white truncate">
                                                            {notification.title}
                                                        </h4>
                                                        {!notification.isRead && (
                                                            <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1"></div>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-400 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {formatTime(notification.createdAt)}
                                                    </p>

                                                    {/* Action buttons for multi-sig transactions */}
                                                    {notification.type === 'multisig_transaction' && (
                                                        <div className="flex gap-2 mt-3">
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();

                                                                    // Check if already signed
                                                                    if (notification.data?.hasSigned) {
                                                                        return; // Already signed, do nothing
                                                                    }

                                                                    try {
                                                                        const token = await getToken();
                                                                        const txId = notification.data?.transactionId;
                                                                        const signerId = notification.data?.signerId;

                                                                        if (!txId || !signerId) {
                                                                            toast.error('Missing transaction data');
                                                                            return;
                                                                        }

                                                                        // TODO: Get actual signature from wallet
                                                                        const signature = 'placeholder_signature';

                                                                        const response = await fetch(
                                                                            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/wallet/multisig/transaction/${txId}/sign`,
                                                                            {
                                                                                method: 'POST',
                                                                                headers: {
                                                                                    'Authorization': `Bearer ${token}`,
                                                                                    'Content-Type': 'application/json'
                                                                                },
                                                                                body: JSON.stringify({
                                                                                    signerId,
                                                                                    signature
                                                                                })
                                                                            }
                                                                        );

                                                                        const data = await response.json();

                                                                        if (data.success) {
                                                                            toast.success('Transaction signed successfully!');
                                                                            if (!notification.isRead) {
                                                                                markAsRead(notification.id);
                                                                            }
                                                                            fetchNotifications(); // Refresh
                                                                        } else {
                                                                            toast.error(data.error || 'Failed to sign transaction');
                                                                        }
                                                                    } catch (error) {
                                                                        console.error('Error signing transaction:', error);
                                                                        toast.error('Failed to sign transaction');
                                                                    }
                                                                }}
                                                                disabled={notification.data?.hasSigned}
                                                                className={`px-3 py-1.5 text-white text-xs rounded-lg transition-colors font-medium ${notification.data?.hasSigned
                                                                        ? 'bg-green-600 cursor-not-allowed opacity-75'
                                                                        : 'bg-purple-600 hover:bg-purple-700'
                                                                    }`}
                                                            >
                                                                {notification.data?.hasSigned ? '✓ Signed' : 'Sign Now'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (!notification.isRead) {
                                                                        markAsRead(notification.id);
                                                                    }
                                                                    if (notification.actionUrl) {
                                                                        window.location.href = notification.actionUrl;
                                                                    }
                                                                }}
                                                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors"
                                                            >
                                                                View Details
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* For other notification types, keep the old click behavior */}
                                                    {notification.type !== 'multisig_transaction' && notification.actionUrl && (
                                                        <button
                                                            onClick={() => {
                                                                if (!notification.isRead) {
                                                                    markAsRead(notification.id);
                                                                }
                                                                window.location.href = notification.actionUrl;
                                                            }}
                                                            className="text-xs text-purple-400 hover:text-purple-300 mt-2"
                                                        >
                                                            View →
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-3 border-t border-gray-700 text-center">
                                <button
                                    onClick={() => {
                                        setShowDropdown(false);
                                        // Navigate to notifications page if you have one
                                    }}
                                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    View all notifications
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
