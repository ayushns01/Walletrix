'use client'

import { useState, useEffect, useRef } from 'react';
import { X, Copy, Download, Check } from 'lucide-react';
import { useWallet } from '@/contexts/DatabaseWalletContext';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

export default function ReceiveModal({ isOpen, onClose, asset }) {
  const { wallet } = useWallet();
  const [copied, setCopied] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const canvasRef = useRef(null);

  const address = asset?.symbol === 'BTC' ? wallet?.bitcoin?.address : wallet?.ethereum?.address;

  // Generate QR code
  useEffect(() => {
    if (isOpen && address) {
      QRCode.toDataURL(address, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then(url => setQrCode(url))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [isOpen, address]);

  // Early return AFTER all hooks are declared
  if (!isOpen) return null;

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (qrCode) {
      const link = document.createElement('a');
      link.download = `${asset?.symbol}-address-qr.png`;
      link.href = qrCode;
      link.click();
      toast.success('QR code downloaded!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" style={{ zIndex: 9999 }}>
      <div className="glass-effect rounded-3xl max-w-md w-full border border-green-500/30 shadow-2xl shadow-green-500/20 transform animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-green-800 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-green-500/30">
                {asset?.icon || asset?.symbol?.[0]}
              </div>
              <div className="absolute inset-0 blur-xl bg-green-400/20" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-50">Receive {asset?.symbol}</h3>
              <p className="text-sm text-green-300">{asset?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-all duration-200 group"
          >
            <X className="w-5 h-5 text-green-300 group-hover:text-red-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-2xl ring-2 ring-green-500/20">
              {qrCode ? (
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse rounded-lg"></div>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-green-300 mb-2">
              Your {asset?.symbol} Address
            </label>
            <div className="bg-gradient-to-r from-green-900/30 to-green-800/20 rounded-xl p-4 break-all border border-green-500/20">
              <p className="text-green-50 font-mono text-sm">{address}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Address
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Save QR
            </button>
          </div>

          {/* Warning */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-300">
              <span className="font-medium">Note:</span> Only send {asset?.symbol} to this address. 
              Sending other assets may result in permanent loss.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
