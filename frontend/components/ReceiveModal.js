'use client'

import { useState, useEffect, useRef } from 'react';
import { X, Copy, Download, Check } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full border border-purple-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {asset?.icon || asset?.symbol?.[0]}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Receive {asset?.symbol}</h3>
              <p className="text-sm text-gray-400">{asset?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-2xl">
              {qrCode ? (
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 bg-gray-200 animate-pulse rounded-lg"></div>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your {asset?.symbol} Address
            </label>
            <div className="bg-gray-700 rounded-lg p-4 break-all">
              <p className="text-white font-mono text-sm">{address}</p>
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
