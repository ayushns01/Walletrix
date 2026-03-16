'use client'

import { ChevronRight, Smartphone } from 'lucide-react'

export default function TelegramHomeCard({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-950/30 via-slate-800/70 to-blue-950/20 p-4 text-left transition-all hover:border-sky-400/40 hover:bg-slate-800/80"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20">
          <Smartphone className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold text-white">Telegram Bot</p>
            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
              Setup
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-300">
            Open the dedicated setup page for linking and bot wallet access
          </p>
        </div>

        <ChevronRight className="h-5 w-5 text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-sky-300" />
      </div>
    </button>
  )
}
