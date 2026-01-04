'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useWallet } from '@/contexts/DatabaseWalletContext';
import { ArrowLeft, Bell, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
    const router = useRouter();
    const { getToken } = useAuth();
    const { selectedNetwork } = useWallet();
    const [activeTab, setActiveTab] = useState('notifications');
    const [notifications, setNotifications] = useState([]);
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newsLoading, setNewsLoading] = useState(false);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications?limit=50`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

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

    // Fetch crypto news
    const fetchCryptoNews = async () => {
        try {
            setNewsLoading(true);

            const [chain] = (selectedNetwork || 'ethereum-mainnet').split('-');
            let category = 'ETH';

            if (chain === 'bitcoin') category = 'BTC';
            else if (chain === 'ethereum') category = 'ETH';
            else if (chain === 'solana') category = 'Blockchain';

            const response = await fetch(
                `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=${category}&sortOrder=latest`
            );

            const data = await response.json();
            if (data.Data) {
                setNews(data.Data.slice(0, 20));
            }
        } catch (error) {
            console.error('Failed to fetch crypto news:', error);
            setNews([]);
        } finally {
            setNewsLoading(false);
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

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
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
            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        fetchCryptoNews();
    }, []);

    useEffect(() => {
        fetchCryptoNews();
    }, [selectedNetwork]);

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

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'multisig_transaction': return '📝';
            case 'multisig_signed': return '✍️';
            case 'multisig_executed': return '✅';
            default: return '🔔';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </button>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">Notifications & News</h1>
                            <p className="text-gray-400">Stay updated with your wallet activity and crypto news</p>
                        </div>
                        <button
                            onClick={() => {
                                fetchNotifications();
                                fetchCryptoNews();
                            }}
                            className="p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-3 mb-6">
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`flex-1 px-6 py-4 rounded-xl font-medium transition-all ${activeTab === 'notifications'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        <Bell className="w-5 h-5 inline-block mr-2" />
                        Notifications
                        {notifications.filter(n => !n.isRead).length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                {notifications.filter(n => !n.isRead).length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('news')}
                        className={`flex-1 px-6 py-4 rounded-xl font-medium transition-all ${activeTab === 'news'
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        📰 News
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'notifications' ? (
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-purple-500/30 overflow-hidden">
                        {/* Header */}
                        {notifications.some(n => !n.isRead) && (
                            <div className="p-4 border-b border-gray-700/50 flex justify-end">
                                <button
                                    onClick={markAllAsRead}
                                    className="text-sm text-purple-400 hover:text-purple-300 font-medium"
                                >
                                    Mark all as read
                                </button>
                            </div>
                        )}

                        {/* Notifications List */}
                        <div className="divide-y divide-gray-700/50">
                            {loading ? (
                                <div className="p-12 text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-6 hover:bg-gray-700/30 transition-colors ${!notification.isRead ? 'bg-purple-500/5' : ''
                                            }`}
                                    >
                                        <div className="flex gap-4">
                                            <div className="text-3xl">{getNotificationIcon(notification.type)}</div>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h3 className="font-semibold text-white">{notification.title}</h3>
                                                    {!notification.isRead && (
                                                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-400 mb-2">{notification.message}</p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs text-gray-500">
                                                        {formatTime(notification.createdAt)}
                                                    </span>
                                                    {notification.actionUrl && (
                                                        <button
                                                            onClick={() => {
                                                                if (!notification.isRead) {
                                                                    markAsRead(notification.id);
                                                                }
                                                                router.push(notification.actionUrl);
                                                            }}
                                                            className="text-xs text-purple-400 hover:text-purple-300"
                                                        >
                                                            View →
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    // News Tab
                    <div>
                        {newsLoading ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                            </div>
                        ) : news.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <p className="text-lg">No news available</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {news.map((article) => (
                                    <a
                                        key={article.id}
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500/50 transition-all"
                                    >
                                        {article.imageurl && (
                                            <div className="relative h-48 overflow-hidden bg-gray-800">
                                                <img
                                                    src={article.imageurl}
                                                    alt={article.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => e.target.parentElement.style.display = 'none'}
                                                />
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                                                {article.title}
                                            </h3>
                                            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                                                {article.body}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="text-purple-400 font-medium">{article.source}</span>
                                                <span>•</span>
                                                <span>{formatTime(new Date(article.published_on * 1000).toISOString())}</span>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
