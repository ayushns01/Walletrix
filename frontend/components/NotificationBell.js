'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationBell({ currentWalletId }) {
    const { getToken } = useAuth();
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread count
    const fetchUnreadCount = async () => {
        try {
            const token = await getToken();
            const url = currentWalletId
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/unread-count?walletId=${currentWalletId}`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/unread-count`;

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

    // Poll for new notifications every 30 seconds
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    // Re-fetch when wallet changes
    useEffect(() => {
        fetchUnreadCount();
    }, [currentWalletId]);

    return (
        <div className="relative">
            {/* Bell Icon */}
            <button
                onClick={() => router.push('/notifications')}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors relative"
                title="Notifications"
            >
                <Bell className="w-6 h-6 text-white" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
}
