'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/DatabaseWalletContext';
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewsPage() {
    const router = useRouter();
    const { selectedNetwork } = useWallet();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('ETH');

    const fetchCryptoNews = async (category) => {
        try {
            setLoading(true);

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
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCryptoNews(activeCategory);
    }, [activeCategory]);

    useEffect(() => {
        if (selectedNetwork) {
            const [chain] = selectedNetwork.split('-');
            if (chain === 'bitcoin') {
                setActiveCategory('BTC');
            } else if (chain === 'ethereum') {
                setActiveCategory('ETH');
            } else if (chain === 'solana') {
                setActiveCategory('Blockchain');
            } else {
                setActiveCategory('ETH');
            }
        }
    }, [selectedNetwork]);

    const formatTime = (timestamp) => {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const categories = [
        { id: 'BTC', name: 'Bitcoin', icon: '₿' },
        { id: 'ETH', name: 'Ethereum', icon: 'Ξ' },
        { id: 'Blockchain', name: 'Blockchain', icon: '⛓️' },
        { id: 'Trading', name: 'Trading', icon: '📈' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
            <div className="max-w-6xl mx-auto">
                {}
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
                            <h1 className="text-4xl font-bold text-white mb-2">Crypto News</h1>
                            <p className="text-gray-400">Stay updated with the latest cryptocurrency news</p>
                        </div>
                        <button
                            onClick={() => fetchCryptoNews(activeCategory)}
                            disabled={loading}
                            className="p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {}
                <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeCategory === category.id
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            <span className="mr-2">{category.icon}</span>
                            {category.name}
                        </button>
                    ))}
                </div>

                {}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                    </div>
                ) : news.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <p className="text-lg">No news available</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {news.map((article) => (
                            <a
                                key={article.id}
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/20"
                            >
                                {}
                                {article.imageurl && (
                                    <div className="relative h-48 overflow-hidden bg-gray-800">
                                        <img
                                            src={article.imageurl}
                                            alt={article.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => {
                                                e.target.parentElement.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}

                                {}
                                <div className="p-5">
                                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                                        {article.title}
                                    </h3>

                                    <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                                        {article.body}
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-purple-400">{article.source}</span>
                                            <span>•</span>
                                            <span>{formatTime(article.published_on)}</span>
                                        </div>
                                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
