import { useState } from 'react';
import { useWallet } from '@/contexts/DatabaseWalletContext';
import { formatAddress } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';

export default function WalletSelector({ isOpen, onClose, onCreateWallet }) {
  const { userWallets, activeWalletId, switchWallet, isAuthenticated, deleteDatabaseWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [deletingWalletId, setDeletingWalletId] = useState(null);

  if (!isAuthenticated || !isOpen) return null;

  const handleSwitchWallet = async (walletId) => {
    if (walletId === activeWalletId) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      await switchWallet(walletId);
      toast.success('Wallet switched successfully');
      onClose();
    } catch (error) {
      console.error('Error switching wallet:', error);
      toast.error('Failed to switch wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWallet = async (e, walletId, walletName) => {
    e.stopPropagation(); // Prevent wallet switch when clicking delete
    
    if (!confirm(`Are you sure you want to delete "${walletName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingWalletId(walletId);
      const result = await deleteDatabaseWallet(walletId);
      if (result.success) {
        // Success toast already shown in deleteDatabaseWallet
      }
    } catch (error) {
      console.error('Error deleting wallet:', error);
      toast.error('Failed to delete wallet');
    } finally {
      setDeletingWalletId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center p-2 sm:p-4 animate-fade-in" style={{ zIndex: 9999 }}>
      <div className="glass-effect rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] border border-blue-500/30 shadow-2xl shadow-blue-500/20 flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-blue-500/20 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden sm:block">
              {/* Animated Wallet Logo */}
              <div className="relative w-10 h-10">
                {/* Rotating geometric frame */}
                <div className="absolute inset-0 border-2 border-blue-400/40 rounded-lg animate-spin" style={{animationDuration: '8s'}} />
                <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-lg animate-spin" style={{animationDuration: '12s', animationDirection: 'reverse'}} />
                
                {/* Center wallet icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                  </svg>
                </div>
                
                {/* Network nodes */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" />
              </div>
              <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-400/30 to-cyan-400/30" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold gradient-text">
                Select Wallet
              </h2>
              <p className="text-xs sm:text-sm text-blue-300 hidden sm:block">Switch between your wallets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-3 hover:bg-red-500/20 rounded-xl transition-all duration-200 group"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Wallet List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-3">
          {userWallets.length === 0 ? (
            <div className="text-center py-8">
              <div className="relative inline-block mb-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto relative">
                  {/* Rotating geometric frames */}
                  <div className="absolute inset-0 border-2 border-blue-400/40 rounded-2xl animate-spin" style={{animationDuration: '10s'}} />
                  <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-2xl animate-spin" style={{animationDuration: '15s', animationDirection: 'reverse'}} />
                  
                  {/* Center circle with wallet */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-blue-800/30 rounded-2xl backdrop-blur-sm border border-blue-500/20 flex items-center justify-center">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                    </svg>
                  </div>
                  
                  {/* Network nodes at corners */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" />
                  <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50" />
                  <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
                </div>
                <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-blue-400/30 to-cyan-400/30" />
              </div>
              <p className="text-blue-300 text-base sm:text-lg font-semibold">No wallets found</p>
              <p className="text-sm text-blue-400 mt-2">
                Create a new wallet to get started
              </p>
            </div>
          ) : (
            userWallets.map((wallet) => (
              <div
                key={wallet.id}
                onClick={() => handleSwitchWallet(wallet.id)}
                className={`glass-effect p-3 sm:p-4 border rounded-xl cursor-pointer transition-all duration-300 ${
                  wallet.id === activeWalletId
                    ? 'border-blue-500/50 bg-gradient-to-r from-blue-600/20 to-blue-800/20'
                    : 'border-blue-500/20 hover:border-blue-400/40 hover:bg-blue-900/10'
                } ${loading || deletingWalletId === wallet.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-blue-100 text-sm sm:text-base truncate">
                        {wallet.name}
                      </h3>
                      {wallet.id === activeWalletId && (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-300 rounded-full whitespace-nowrap">
                          Active
                        </span>
                      )}
                    </div>
                    {wallet.description && (
                      <p className="text-xs sm:text-sm text-blue-300 mt-1 line-clamp-2">
                        {wallet.description}
                      </p>
                    )}
                    <div className="mt-2 space-y-1">
                      {wallet.addresses.ethereum && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <span className="text-blue-400 font-semibold" title="Works on Ethereum, Polygon, Arbitrum, Avalanche, Optimism, Base, BSC">EVM:</span>
                          <span className="font-mono text-blue-200 truncate">
                            {formatAddress(wallet.addresses.ethereum)}
                          </span>
                        </div>
                      )}
                      {wallet.addresses.bitcoin && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <span className="text-orange-400 font-semibold">BTC:</span>
                          <span className="font-mono text-blue-200 truncate">
                            {formatAddress(wallet.addresses.bitcoin)}
                          </span>
                        </div>
                      )}
                      {wallet.addresses.solana && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <span className="text-purple-400 font-semibold">SOL:</span>
                          <span className="font-mono text-blue-200 truncate">
                            {formatAddress(wallet.addresses.solana)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteWallet(e, wallet.id, wallet.name)}
                      disabled={deletingWalletId === wallet.id}
                      className="p-1.5 sm:p-2 text-blue-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all disabled:opacity-50"
                      title="Delete wallet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {/* Active Checkmark */}
                    {wallet.id === activeWalletId && (
                      <div className="p-1">
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-blue-500/10 flex items-center justify-between text-xs text-blue-400">
                  <span>Created {new Date(wallet.createdAt).toLocaleDateString()}</span>
                  <span className="hidden sm:inline">Updated {new Date(wallet.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="p-3 sm:p-6 border-t border-blue-500/20 flex gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 sm:py-3 border border-blue-500/30 text-blue-300 rounded-xl hover:bg-blue-900/20 hover:border-blue-400/40 transition-all duration-300 font-medium text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onClose();
              if (onCreateWallet) {
                onCreateWallet();
              }
            }}
            className="flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/30 font-semibold text-sm sm:text-base"
          >
            Create New
          </button>
        </div>
      </div>
    </div>
  );
}