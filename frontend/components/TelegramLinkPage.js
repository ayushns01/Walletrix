'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bot, Copy, RefreshCw, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { stealthAPI, telegramAPI } from '@/lib/api'
import { copyToClipboard, formatAddress } from '@/lib/utils'

function formatTimestamp(value) {
  if (!value) return 'Pending'
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStealthStatusBadge(status) {
  if (status === 'FUNDED') {
    return 'border-emerald-500/20 bg-emerald-950/20 text-emerald-300'
  }
  if (status === 'CLAIMED') {
    return 'border-sky-500/20 bg-sky-950/20 text-sky-300'
  }
  return 'border-amber-500/20 bg-amber-950/20 text-amber-200'
}

function groupStealthIssues(issues) {
  return {
    FUNDED: issues.filter((issue) => issue.status === 'FUNDED'),
    ACTIVE: issues.filter((issue) => issue.status === 'ACTIVE'),
    CLAIMED: issues.filter((issue) => issue.status === 'CLAIMED'),
  }
}

export default function TelegramLinkPage({ isSignedIn, getToken, onBack }) {
  const [status, setStatus] = useState(null)
  const [linkCode, setLinkCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stealthIssues, setStealthIssues] = useState([])
  const [stealthLoading, setStealthLoading] = useState(false)
  const [stealthError, setStealthError] = useState('')
  const [refreshingIssueId, setRefreshingIssueId] = useState('')
  const [previewLoadingIssueId, setPreviewLoadingIssueId] = useState('')
  const [claimingIssueId, setClaimingIssueId] = useState('')
  const [claimPreview, setClaimPreview] = useState(null)

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
      } else {
        setStealthIssues([])
        setClaimPreview(null)
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

  const loadStealthIssues = useCallback(async ({ silent = false } = {}) => {
    if (!isSignedIn) return

    try {
      setStealthLoading(true)
      setStealthError('')
      const token = await getToken()
      if (!token) {
        return
      }

      const response = await stealthAPI.listIssues(token)
      setStealthIssues(Array.isArray(response?.issues) ? response.issues : [])
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Failed to load stealth issues'
      setStealthError(message)
      if (!silent) {
        toast.error(message)
      }
    } finally {
      setStealthLoading(false)
    }
  }, [getToken, isSignedIn])

  useEffect(() => {
    if (!isSignedIn) {
      setStatus(null)
      setLinkCode(null)
      setError('')
      setStealthIssues([])
      setClaimPreview(null)
      return
    }

    loadStatus({ silent: true })
  }, [isSignedIn, loadStatus])

  useEffect(() => {
    if (!status?.linked) {
      setStealthIssues([])
      setClaimPreview(null)
      setStealthError('')
      return
    }

    loadStealthIssues({ silent: true })
  }, [status?.linked, loadStealthIssues])

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
      setStealthIssues([])
      setClaimPreview(null)
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

  const handleRefreshIssue = async (issueId) => {
    try {
      setRefreshingIssueId(issueId)
      const token = await getToken()
      if (!token) return

      await stealthAPI.refreshIssue(token, issueId)
      await loadStealthIssues({ silent: true })
      toast.success('Stealth issue refreshed')
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Failed to refresh stealth issue'
      toast.error(message)
    } finally {
      setRefreshingIssueId('')
    }
  }

  const handleOpenClaimPreview = async (issueId) => {
    try {
      setPreviewLoadingIssueId(issueId)
      const token = await getToken()
      if (!token) return

      const response = await stealthAPI.getClaimPreview(token, issueId)
      setClaimPreview({
        issue: response.issue,
        preview: response.preview,
      })
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Failed to load claim preview'
      toast.error(message)
    } finally {
      setPreviewLoadingIssueId('')
    }
  }

  const handleConfirmClaim = async () => {
    if (!claimPreview?.issue?.id) return

    try {
      setClaimingIssueId(claimPreview.issue.id)
      const token = await getToken()
      if (!token) return

      const response = await stealthAPI.claimIssue(token, claimPreview.issue.id)
      setClaimPreview(null)
      await loadStealthIssues({ silent: true })
      toast.success(`Stealth claim submitted: ${formatAddress(response.txHash || '', 8, 6)}`)
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Failed to claim stealth funds'
      toast.error(message)
    } finally {
      setClaimingIssueId('')
    }
  }

  const groupedIssues = useMemo(() => groupStealthIssues(stealthIssues), [stealthIssues])

  return (
    <div className="mx-auto max-w-3xl py-8">
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
              <p className="mt-1 text-sm text-sky-200/80">Link your Telegram account and manage stealth claims from here.</p>
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

            <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-violet-300/70">Stealth receives</p>
                  <p className="mt-1 text-sm text-slate-200">
                    Track funded stealth addresses and sweep them into the wallet they were issued for.
                  </p>
                </div>
                <button
                  onClick={() => loadStealthIssues()}
                  disabled={stealthLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200 transition-all hover:bg-violet-500/20 disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${stealthLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {stealthError ? (
                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-950/20 px-4 py-3 text-sm text-red-200">
                  {stealthError}
                </div>
              ) : null}

              <div className="mt-4 space-y-4">
                {['FUNDED', 'ACTIVE', 'CLAIMED'].map((statusKey) => {
                  const issues = groupedIssues[statusKey]
                  if (!issues.length) return null

                  const heading = statusKey === 'FUNDED'
                    ? 'Ready to Claim'
                    : statusKey === 'ACTIVE'
                      ? 'Waiting for Funds'
                      : 'Claimed'

                  return (
                    <div key={statusKey} className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-200/70">{heading}</p>
                      {issues.map((issue) => (
                        <div key={issue.id} className="rounded-xl border border-slate-700/40 bg-slate-950/30 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{issue.walletLabel}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {issue.networkLabel} · {issue.kindLabel}
                              </p>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStealthStatusBadge(issue.status)}`}>
                              {issue.status}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
                            <div>
                              <p className="text-slate-500">Stealth address</p>
                              <p className="mt-1 font-mono text-slate-200">{formatAddress(issue.stealthAddress, 8, 6)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Destination wallet</p>
                              <p className="mt-1 font-mono text-slate-200">{formatAddress(issue.destinationAddress, 8, 6)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Observed balance</p>
                              <p className="mt-1 text-slate-200">{issue.lastObservedBalanceEth} ETH</p>
                            </div>
                            <div>
                              <p className="text-slate-500">{issue.status === 'CLAIMED' ? 'Claimed at' : 'Last checked'}</p>
                              <p className="mt-1 text-slate-200">
                                {issue.status === 'CLAIMED' ? formatTimestamp(issue.claimedAt) : formatTimestamp(issue.lastCheckedAt)}
                              </p>
                            </div>
                          </div>

                          {issue.claimTxHash ? (
                            <div className="mt-3 rounded-lg border border-sky-500/10 bg-sky-950/10 px-3 py-2 text-xs text-sky-100">
                              Claim tx: <span className="font-mono">{formatAddress(issue.claimTxHash, 10, 8)}</span>
                            </div>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => handleRefreshIssue(issue.id)}
                              disabled={refreshingIssueId === issue.id}
                              className="rounded-lg border border-slate-600/40 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-200 transition-all hover:bg-slate-700/60 disabled:opacity-60"
                            >
                              {refreshingIssueId === issue.id ? 'Refreshing...' : 'Refresh'}
                            </button>
                            {issue.status === 'FUNDED' ? (
                              <button
                                onClick={() => handleOpenClaimPreview(issue.id)}
                                disabled={previewLoadingIssueId === issue.id}
                                className="rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-60"
                              >
                                {previewLoadingIssueId === issue.id ? 'Loading preview...' : 'Claim'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}

                {!stealthLoading && stealthIssues.length === 0 ? (
                  <div className="rounded-xl border border-slate-700/50 bg-slate-950/30 px-4 py-4 text-sm text-slate-300">
                    No stealth receive addresses have been issued for this account yet.
                  </div>
                ) : null}
              </div>
            </div>

            {claimPreview ? (
              <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-950/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-fuchsia-300/70">Claim preview</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{claimPreview.issue.walletLabel}</h3>
                    <p className="mt-1 text-sm text-slate-300">{claimPreview.issue.networkLabel}</p>
                  </div>
                  <button
                    onClick={() => setClaimPreview(null)}
                    className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2 text-xs font-medium text-slate-200 transition-all hover:bg-slate-800/60"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-700/40 bg-slate-950/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Detected balance</p>
                    <p className="mt-2 text-lg font-semibold text-white">{claimPreview.preview.balanceEth} ETH</p>
                  </div>
                  <div className="rounded-lg border border-slate-700/40 bg-slate-950/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Estimated gas</p>
                    <p className="mt-2 text-lg font-semibold text-white">{claimPreview.preview.estimatedFeeEth} ETH</p>
                  </div>
                  <div className="rounded-lg border border-slate-700/40 bg-slate-950/40 p-3 sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Claimable amount</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{claimPreview.preview.claimableEth} ETH</p>
                    <p className="mt-2 text-xs text-slate-400">
                      Funds will be swept into {formatAddress(claimPreview.issue.destinationAddress, 8, 6)}.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={handleConfirmClaim}
                    disabled={claimingIssueId === claimPreview.issue.id}
                    className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-fuchsia-400 hover:to-violet-400 disabled:opacity-60"
                  >
                    {claimingIssueId === claimPreview.issue.id ? 'Claiming...' : 'Confirm Claim'}
                  </button>
                  <button
                    onClick={() => setClaimPreview(null)}
                    className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3 text-sm font-medium text-slate-200 transition-all hover:bg-slate-800/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

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
