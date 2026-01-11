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
                className="group relative p-3 rounded-xl bg-gradient-to-br from-blue-500/30 via-indigo-500/20 to-purple-600/30 hover:from-blue-500/50 hover:via-indigo-500/30 hover:to-purple-600/50 border border-blue-400/50 hover:border-indigo-300/70 text-blue-300 hover:text-indigo-200 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-indigo-500/40 hover:scale-110"
                title="Notifications"
            >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Bell className="w-5 h-5 relative z-10 group-hover:animate-[wiggle_0.3s_ease-in-out]" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg shadow-red-500/50 animate-pulse border border-red-400/50">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
}
