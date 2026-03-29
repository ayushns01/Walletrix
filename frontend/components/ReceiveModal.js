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
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-xl"
      style={{ zIndex: 9999 }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#111214]/95 shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
        <div className="relative border-b border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.10),transparent_34%),radial-gradient(circle_at_left,rgba(148,163,184,0.08),transparent_28%)]" />
          <div className="relative flex items-start justify-between gap-4 p-5 sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-2xl" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#1d1f22] via-[#16181b] to-[#0f1113] text-2xl font-semibold text-white shadow-lg shadow-black/30">
                  {asset?.icon || asset?.symbol?.[0]}
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[0.7rem] uppercase tracking-[0.28em] text-slate-400">
                  Receive
                </p>
                <h3 className="truncate text-xl font-semibold text-white sm:text-2xl">
                  {asset?.symbol}
                </h3>
                <p className="truncate text-sm text-slate-400">
                  {asset?.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Close receive modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2rem] border border-emerald-400/10 bg-emerald-400/5 blur-[2px]" />
              <div className="absolute -top-2 -left-2 h-8 w-8 rounded-tl-2xl border-t-2 border-l-2 border-emerald-400/80" />
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-tr-2xl border-t-2 border-r-2 border-emerald-400/80" />
              <div className="absolute -bottom-2 -left-2 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-emerald-400/80" />
              <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-br-2xl border-b-2 border-r-2 border-emerald-400/80" />

              <div className="relative rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white to-[#f4f5f7] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
                {qrCode ? (
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="h-56 w-56 max-w-[72vw] rounded-[1rem] sm:h-60 sm:w-60"
                  />
                ) : (
                  <div className="h-56 w-56 max-w-[72vw] animate-pulse rounded-[1rem] bg-gradient-to-br from-slate-100 to-slate-200 sm:h-60 sm:w-60" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Scan the code to receive {asset?.symbol}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-emerald-400/15 bg-emerald-400/10">
                <svg className="h-3.5 w-3.5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              Your {asset?.symbol} Address
            </label>

            <div className="relative">
              <div className="rounded-2xl border border-white/10 bg-[#17191d] px-4 py-4 shadow-inner shadow-black/30">
                <p className="break-all font-mono text-[0.92rem] leading-6 text-slate-100 sm:text-sm">
                  {address}
                </p>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold transition-all duration-200 ${
                copied
                  ? 'border border-emerald-400/20 bg-emerald-400/15 text-emerald-100'
                  : 'border border-emerald-400/25 bg-emerald-400 text-[#08110b] shadow-[0_10px_30px_rgba(16,185,129,0.18)] hover:translate-y-[-1px] hover:bg-emerald-300 active:translate-y-0'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Address
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <Download className="h-4 w-4" />
              Save QR
            </button>
          </div>

          <div className="flex gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/10">
              <svg className="h-5 w-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-amber-100">Important</p>
              <p className="mt-1 text-sm leading-5 text-amber-50/70">
                Only send {asset?.symbol} to this address. Sending any other asset can result in permanent loss.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
