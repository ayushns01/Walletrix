'use client'

import { ChevronRight, Smartphone } from 'lucide-react'

export default function TelegramHomeCard({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-6 w-full rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-950/40 via-slate-800/70 to-blue-950/40 p-4 text-left transition-all hover:border-sky-400/40 hover:bg-slate-800/80"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20">
          <Smartphone className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold text-white">Telegram Bot Wallet</p>
          </div>
          <p className="mt-1 text-sm text-slate-300">
            Open setup and manage Telegram bot linking separately
          </p>
        </div>

        <ChevronRight className="h-5 w-5 text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-sky-300" />
      </div>
    </button>
  )
}
