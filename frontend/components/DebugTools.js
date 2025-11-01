'use client'

import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { blockchainAPI } from '@/lib/api';
import { RefreshCw, Search } from 'lucide-react';

export default function DebugTools() {
  const { wallet, selectedNetwork, refreshData, balances, prices, tokens } = useWallet();
  const [debugging, setDebugging] = useState(false);
  const [debugResult, setDebugResult] = useState(null);
  const [testAddress, setTestAddress] = useState('');

  const getNetworkInfo = () => {
    const [chain, network] = selectedNetwork.split('-');
    return { chain, network };
  };

  const debugBalance = async () => {
    if (!wallet) return;
    
    setDebugging(true);
    setDebugResult(null);
    
    try {
      const { chain, network } = getNetworkInfo();
      const address = testAddress || wallet.ethereum?.address;
      
      console.log('Debug Info:', {
        selectedNetwork,
        chain,
        network,
        address,
        walletAddresses: {
          ethereum: wallet.ethereum?.address,
          bitcoin: wallet.bitcoin?.address
        }
      });

      let result = null;
      
      if (chain === 'ethereum') {
        result = await blockchainAPI.getEthereumBalance(address, network);
      } else if (chain === 'bitcoin') {
        result = await blockchainAPI.getBitcoinBalance(address, network);
      }
      
      setDebugResult({
        network: `${chain}-${network}`,
        address,
        response: result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      setDebugResult({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setDebugging(false);
    }
  };

  const checkEtherscan = () => {
    const { chain, network } = getNetworkInfo();
    const address = wallet?.ethereum?.address;
    
    if (chain === 'ethereum' && address) {
      let etherscanUrl = '';
      if (network === 'mainnet') {
        etherscanUrl = `https://etherscan.io/address/${address}`;
      } else if (network === 'sepolia') {
        etherscanUrl = `https://sepolia.etherscan.io/address/${address}`;
      } else if (network === 'goerli') {
        etherscanUrl = `https://goerli.etherscan.io/address/${address}`;
      }
      
      if (etherscanUrl) {
        window.open(etherscanUrl, '_blank');
      }
    }
  };

  if (!wallet) return null;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/20">
      <h3 className="text-lg font-bold text-yellow-400 mb-4">🔧 Debug Tools</h3>
      
      <div className="space-y-4">
        {/* Current Status */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Current Status</h4>
          <div className="text-sm space-y-1">
            <p className="text-gray-300">
              <span className="text-gray-500">Network:</span> {selectedNetwork}
            </p>
            <p className="text-gray-300">
              <span className="text-gray-500">Ethereum Address:</span> 
              <span className="font-mono ml-2">{wallet.ethereum?.address}</span>
            </p>
            {wallet.bitcoin && (
              <p className="text-gray-300">
                <span className="text-gray-500">Bitcoin Address:</span> 
                <span className="font-mono ml-2">{wallet.bitcoin?.address}</span>
              </p>
            )}
            <p className="text-gray-300">
              <span className="text-gray-500">ETH Balance:</span> 
              <span className="ml-2 font-mono">{balances.ethereum || '0'} ETH</span>
            </p>
            <p className="text-gray-300">
              <span className="text-gray-500">BTC Balance:</span> 
              <span className="ml-2 font-mono">{balances.bitcoin || '0'} BTC</span>
            </p>
            <p className="text-gray-300">
              <span className="text-gray-500">ETH Price:</span> 
              <span className="ml-2">${prices.ethereum?.current_price || 'Loading...'}</span>
            </p>
            <p className="text-gray-300">
              <span className="text-gray-500">Tokens:</span> 
              <span className="ml-2">{tokens.length} found</span>
            </p>
          </div>
        </div>

        {/* Manual Balance Check */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Manual Balance Check</h4>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter address to check (optional - uses your address)"
              value={testAddress}
              onChange={(e) => setTestAddress(e.target.value)}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 font-mono text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={debugBalance}
                disabled={debugging}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-600/50 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${debugging ? 'animate-spin' : ''}`} />
                Check Balance
              </button>
              
              <button
                onClick={checkEtherscan}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                View on Etherscan
              </button>
              
              <button
                onClick={refreshData}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh All Data
              </button>
              
              <button
                onClick={() => {
                  // Force calculate portfolio value
                  const ethValue = (parseFloat(balances.ethereum || 0) * (prices.ethereum?.current_price || 0));
                  const btcValue = (parseFloat(balances.bitcoin || 0) * (prices.bitcoin?.current_price || 0));
                  const totalValue = ethValue + btcValue;
                  
                  setDebugResult({
                    manualCalculation: {
                      ethBalance: balances.ethereum || '0',
                      ethPrice: prices.ethereum?.current_price || 0,
                      ethValue: ethValue,
                      btcBalance: balances.bitcoin || '0', 
                      btcPrice: prices.bitcoin?.current_price || 0,
                      btcValue: btcValue,
                      totalValue: totalValue
                    },
                    timestamp: new Date().toISOString()
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                Calculate Portfolio
              </button>
              
              <button
                onClick={() => {
                  // Force balance refresh to see logs
                  console.log('=== FORCE REFRESH BALANCES ===');
                  refreshData();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Debug Balance Fetch
              </button>
              
              <button
                onClick={() => {
                  console.log('=== WALLET DEBUG ===');
                  console.log('Full wallet object:', wallet);
                  console.log('Encrypted data exists:', !!wallet?.encrypted);
                  console.log('Encrypted data length:', wallet?.encrypted?.length);
                  
                  setDebugResult({
                    walletDebug: {
                      hasWallet: !!wallet,
                      hasEncrypted: !!wallet?.encrypted,
                      encryptedDataLength: wallet?.encrypted?.length || 0,
                      ethereumAddress: wallet?.ethereum?.address,
                      bitcoinAddress: wallet?.bitcoin?.address,
                      walletStructure: Object.keys(wallet || {})
                    },
                    timestamp: new Date().toISOString()
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                Debug Wallet Data
              </button>
            </div>
          </div>
        </div>

        {/* Debug Results */}
        {debugResult && (
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Debug Results</h4>
            <pre className="text-xs text-gray-300 bg-gray-800 p-3 rounded overflow-auto max-h-60">
              {JSON.stringify(debugResult, null, 2)}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h4 className="text-blue-300 font-medium mb-2">Troubleshooting Steps:</h4>
          <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
            <li>Verify the network matches what you used in MetaMask</li>
            <li>Check that the address matches exactly</li>
            <li>Confirm your transaction on Etherscan</li>
            <li>Try the manual balance check above</li>
            <li>Use the refresh button if data seems stale</li>
          </ol>
        </div>
      </div>
    </div>
  );
}