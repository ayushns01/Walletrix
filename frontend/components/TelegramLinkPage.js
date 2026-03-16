'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Bot, Copy, RefreshCw, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { telegramAPI } from '@/lib/api'
import { copyToClipboard, formatAddress } from '@/lib/utils'

export default function TelegramLinkPage({ isSignedIn, getToken, onBack }) {
  const [status, setStatus] = useState(null)
  const [linkCode, setLinkCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadStatus = useCallback(async ({ silent = false } = {}) => {
    if (!isSignedIn) return

    try {
      setLoading(true)
      setError('')
      const token = await getToken()
      if (!token) {
        setError('Sign in to use Telegram bot features.')
        return
      }

      const response = await telegramAPI.getStatus(token)
      setStatus(response)

      if (response?.linked) {
        setLinkCode(null)
      }
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Failed to load Telegram status'
      setError(message)
      if (!silent) {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn])

  useEffect(() => {
    if (!isSignedIn) {
      setStatus(null)
      setLinkCode(null)
      setError('')
      return
    }

    loadStatus({ silent: true })
  }, [isSignedIn, loadStatus])

  const generateLinkCode = async () => {
    try {
      setLoading(true)
      setError('')
      const token = await getToken()
      if (!token) {
        toast.error('Sign in to generate a link code')
        return
      }

      const response = await telegramAPI.generateLinkCode(token)
      setLinkCode(response)
      toast.success('Telegram link code generated')
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Failed to generate link code'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const unlinkTelegram = async () => {
    if (!confirm('Unlink your Telegram account?')) return

    try {
      setLoading(true)
      const token = await getToken()
      if (!token) {
        toast.error('Sign in to continue')
        return
      }

      await telegramAPI.unlinkTelegram(token)
      setStatus({ success: true, linked: false })
      setLinkCode(null)
      toast.success('Telegram unlinked successfully')
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Failed to unlink Telegram'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (value, label) => {
    const success = await copyToClipboard(value)
    if (success) {
      toast.success(`${label} copied`)
    } else {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 rounded-lg px-3 py-2 text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back</span>
      </button>

      <div className="rounded-3xl border border-sky-500/20 bg-gradient-to-b from-slate-800/90 to-slate-900/95 p-8 shadow-2xl shadow-sky-500/10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/20">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Telegram Bot Wallet</h2>
              <p className="mt-1 text-sm text-sky-200/80">Link your Telegram account from this screen.</p>
            </div>
          </div>

          <button
            onClick={() => loadStatus()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 transition-all hover:bg-sky-500/20 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!status ? (
          <div className="mt-6 rounded-xl border border-slate-700/50 bg-slate-900/30 px-4 py-4 text-sm text-slate-300">
            {loading ? 'Checking Telegram status...' : 'Telegram status will appear here.'}
          </div>
        ) : status.linked ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-950/20 px-4 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <span className="text-sm font-medium text-green-300">Linked to Telegram</span>
              <span className="ml-auto text-xs text-green-200/70">ID: {status.telegramId}</span>
            </div>

            <div className="rounded-xl border border-sky-500/10 bg-slate-900/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-sky-300/70">Bot wallet</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {formatAddress(status?.botWallet?.address || '', 8, 6)}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    This is the dedicated wallet used by the Telegram bot.
                  </p>
                </div>
                {status?.botWallet?.address ? (
                  <button
                    onClick={() => handleCopy(status.botWallet.address, 'Bot wallet address')}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 transition-all hover:bg-sky-500/20"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                ) : null}
              </div>
            </div>

            <button
              onClick={unlinkTelegram}
              disabled={loading}
              className="w-full rounded-xl border border-red-500/20 bg-red-600/15 px-4 py-3 text-sm font-medium text-red-300 transition-all hover:bg-red-600/25 disabled:opacity-60"
            >
              Unlink Telegram
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-900/30 px-4 py-3">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              <span className="text-sm text-slate-200">Not linked yet</span>
            </div>

            {!linkCode ? (
              <button
                onClick={generateLinkCode}
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-3 text-base font-semibold text-white transition-all hover:from-sky-400 hover:to-blue-400 disabled:opacity-60"
              >
                {loading ? 'Generating link code...' : 'Generate Telegram Link Code'}
              </button>
            ) : (
              <div className="space-y-4 rounded-xl border border-sky-500/10 bg-slate-900/30 p-4">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-sky-300/70">One-time link code</p>
                  <p className="mt-3 font-mono text-3xl font-bold tracking-[0.3em] text-white">{linkCode.code}</p>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-950/30 p-4 text-sm text-slate-300">
                  <p className="font-medium text-white">How to link</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>Open Telegram and search for `@WalletrixBot`.</li>
                    <li>Send `/start {linkCode.code}`.</li>
                    <li>Return here and tap refresh after the bot confirms.</li>
                  </ol>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleCopy(linkCode.code, 'Link code')}
                    className="flex-1 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200 transition-all hover:bg-sky-500/20"
                  >
                    Copy Code
                  </button>
                  <button
                    onClick={() => loadStatus()}
                    className="flex-1 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-slate-800/50"
                  >
                    I linked it
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-700/40 bg-slate-950/20 px-4 py-3 text-xs text-slate-300">
          <Bot className="h-4 w-4 text-sky-400" />
          Your Telegram address list still lives in Settings → Telegram Bot.
        </div>
      </div>
    </div>
  )
}
