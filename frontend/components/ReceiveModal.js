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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300" style={{ zIndex: 9999 }}>
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl max-w-md w-full border border-emerald-500/30 shadow-2xl shadow-emerald-500/20 transform transition-all duration-300 overflow-hidden">
        {/* Header with Gradient Background */}
        <div className="relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-green-500/20 to-emerald-600/20" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90" />

          <div className="relative flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {/* Asset icon with glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-400 rounded-2xl blur-xl opacity-50" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {asset?.icon || asset?.symbol?.[0]}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Receive {asset?.symbol}</h3>
                <p className="text-sm text-emerald-300/80">{asset?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/5 hover:bg-red-500/20 rounded-xl transition-all duration-200 group border border-white/10 hover:border-red-500/30"
            >
              <X className="w-5 h-5 text-slate-400 group-hover:text-red-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* QR Code Section */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Decorative corners */}
              <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-500 rounded-tl-lg" />
              <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-500 rounded-tr-lg" />
              <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-500 rounded-bl-lg" />
              <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-500 rounded-br-lg" />

              <div className="bg-white p-5 rounded-2xl shadow-2xl">
                {qrCode ? (
                  <img src={qrCode} alt="QR Code" className="w-52 h-52" />
                ) : (
                  <div className="w-52 h-52 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse rounded-lg" />
                )}
              </div>
            </div>
          </div>

          {/* Scan instructions */}
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Scan QR code to receive {asset?.symbol}
          </div>

          {/* Address Section */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <span className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              Your {asset?.symbol} Address
            </label>
            <div className="relative group">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 break-all">
                <p className="text-white font-mono text-sm">{address}</p>
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-xl" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className={`flex-1 py-4 px-6 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${copied
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]'
                }`}
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
              className="flex-1 py-4 px-6 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white font-semibold rounded-xl transition-all duration-200 border border-slate-700/50 hover:border-slate-600/50 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Save QR
            </button>
          </div>

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">Important</p>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Only send {asset?.symbol} to this address. Sending other assets may result in permanent loss.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
