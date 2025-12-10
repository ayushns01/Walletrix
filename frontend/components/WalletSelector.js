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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Select Wallet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Wallet List */}
        <div className="space-y-3">
          {userWallets.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">No wallets found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Create a new wallet to get started
              </p>
            </div>
          ) : (
            userWallets.map((wallet) => (
              <div
                key={wallet.id}
                onClick={() => handleSwitchWallet(wallet.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  wallet.id === activeWalletId
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } ${loading || deletingWalletId === wallet.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {wallet.name}
                      </h3>
                      {wallet.id === activeWalletId && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    {wallet.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {wallet.description}
                      </p>
                    )}
                    <div className="mt-2 space-y-1">
                      {wallet.addresses.ethereum && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">ETH:</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {formatAddress(wallet.addresses.ethereum)}
                          </span>
                        </div>
                      )}
                      {wallet.addresses.bitcoin && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">BTC:</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {formatAddress(wallet.addresses.bitcoin)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-3">
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteWallet(e, wallet.id, wallet.name)}
                      disabled={deletingWalletId === wallet.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                      title="Delete wallet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    {/* Active Checkmark */}
                    {wallet.id === activeWalletId && (
                      <div>
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Created {new Date(wallet.createdAt).toLocaleDateString()}</span>
                  <span>Last updated {new Date(wallet.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New
          </button>
        </div>
      </div>
    </div>
  );
}