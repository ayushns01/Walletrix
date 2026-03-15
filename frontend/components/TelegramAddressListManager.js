'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { telegramAPI } from '@/lib/api'
import { copyToClipboard, formatAddress } from '@/lib/utils'

const EMPTY_FORM = {
  name: '',
  address: '',
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

export default function TelegramAddressListManager({ isVisible, linked, getToken }) {
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingRecipient, setEditingRecipient] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const resetForm = useCallback(() => {
    setEditingRecipient(null)
    setForm(EMPTY_FORM)
  }, [])

  const loadRecipients = useCallback(async ({ quiet = false } = {}) => {
    try {
      if (!quiet) {
        setLoading(true)
      }

      const token = await getToken()
      if (!token) {
        toast.error('Not signed in')
        return
      }

      const response = await telegramAPI.getRecipients(token)
      setRecipients(Array.isArray(response?.recipients) ? response.recipients : [])
    } catch (error) {
      toast.error('Failed to load address list: ' + (error?.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    if (isVisible) {
      loadRecipients({ quiet: true })
    }
  }, [isVisible, loadRecipients])

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleCopy = useCallback(async (address) => {
    const copied = await copyToClipboard(address)
    if (copied) {
      toast.success('Address copied')
    } else {
      toast.error('Could not copy address')
    }
  }, [])

  const handleEdit = useCallback((recipient) => {
    setEditingRecipient(recipient)
    setForm({
      name: recipient.name,
      address: recipient.address,
    })
  }, [])

  const handleDelete = useCallback(async (recipient) => {
    const confirmed = window.confirm(`Remove "${recipient.name}" from your address list?`)
    if (!confirmed) return

    try {
      setDeletingId(recipient.id)
      const token = await getToken()
      if (!token) {
        toast.error('Not signed in')
        return
      }

      await telegramAPI.deleteRecipient(token, recipient.id)
      setRecipients((current) => current.filter((entry) => entry.id !== recipient.id))
      if (editingRecipient?.id === recipient.id) {
        resetForm()
      }
      toast.success(`Removed ${recipient.name}`)
    } catch (error) {
      toast.error('Failed to delete address: ' + (error?.response?.data?.error || error.message))
    } finally {
      setDeletingId(null)
    }
  }, [editingRecipient?.id, getToken, resetForm])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const name = form.name.trim().replace(/\s+/g, ' ')
    const address = form.address.trim()

    if (!name || !address) {
      toast.error('Enter both a name and an address')
      return
    }

    const duplicate = recipients.find((recipient) => (
      normalizeName(recipient.name) === normalizeName(name)
      && recipient.id !== editingRecipient?.id
    ))

    if (duplicate) {
      toast.error(`"${name}" already exists in your address list`)
      return
    }

    try {
      setSaving(true)
      const token = await getToken()
      if (!token) {
        toast.error('Not signed in')
        return
      }

      if (editingRecipient) {
        await telegramAPI.updateRecipient(token, editingRecipient.id, { name, address })
      } else {
        await telegramAPI.saveRecipient(token, { name, address })
      }

      await loadRecipients({ quiet: true })
      resetForm()
      toast.success(editingRecipient ? 'Address updated' : 'Address saved')
    } catch (error) {
      toast.error('Failed to save address: ' + (error?.response?.data?.error || error.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-effect rounded-xl p-4 sm:p-6 border border-blue-500/20 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/15 border border-blue-400/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-blue-100 text-sm sm:text-base">Address List</h4>
              <span className="px-2.5 py-1 rounded-full text-[11px] bg-blue-500/15 text-blue-200 border border-blue-400/15">
                {recipients.length} saved
              </span>
            </div>
            <p className="text-xs sm:text-sm text-blue-300 mt-1 max-w-2xl">
              Save names like Alice or Payroll so the bot can understand messages like
              {' '}
              <span className="text-blue-100">send 0.01 ETH to Alice</span>.
            </p>
            <p className="text-[11px] sm:text-xs text-blue-400 mt-2">
              {linked
                ? 'These names are live in Telegram right now.'
                : 'You can prepare this list now. It will work in Telegram once your account is linked.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadRecipients()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 text-xs sm:text-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[1fr,1.4fr,auto] gap-3">
        <div>
          <label className="block text-xs text-blue-400 mb-2">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="Alice"
            maxLength={50}
            className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-blue-500/20 text-blue-100 placeholder:text-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <div>
          <label className="block text-xs text-blue-400 mb-2">Wallet Address or ENS</label>
          <input
            type="text"
            value={form.address}
            onChange={handleChange('address')}
            placeholder="0x... or alice.eth"
            className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-blue-500/20 text-blue-100 placeholder:text-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {editingRecipient ? 'Update' : 'Save'}
          </button>

          {editingRecipient && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-3 rounded-xl bg-slate-900/70 border border-blue-500/20 text-blue-200 hover:bg-slate-900 transition-all"
              aria-label="Cancel editing"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {editingRecipient && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
          <p className="text-xs sm:text-sm text-amber-100">
            Editing
            {' '}
            <span className="font-semibold">{editingRecipient.name}</span>.
            Save when you are ready, or cancel to keep the current entry.
          </p>
        </div>
      )}

      {recipients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-blue-500/20 bg-slate-950/35 px-4 py-8 text-center">
          <p className="text-sm text-blue-200 font-medium">Your address list is empty.</p>
          <p className="text-xs sm:text-sm text-blue-400 mt-2">
            Add your first entry above so the Telegram bot can use names instead of raw addresses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {recipients.map((recipient) => (
            <div
              key={recipient.id}
              className="rounded-2xl border border-blue-500/15 bg-slate-950/40 px-4 py-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h5 className="text-sm sm:text-base font-semibold text-blue-100 break-words">
                      {recipient.name}
                    </h5>
                    <span className="px-2 py-1 rounded-full text-[11px] bg-blue-500/10 text-blue-300 border border-blue-400/10">
                      {formatAddress(recipient.address)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs sm:text-sm text-blue-300 font-mono break-all">
                    {recipient.address}
                  </p>
                  <p className="mt-2 text-[11px] sm:text-xs text-blue-400">
                    Telegram example:
                    {' '}
                    <span className="text-blue-200">send 0.01 ETH to {recipient.name}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(recipient.address)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-200 text-xs sm:text-sm transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEdit(recipient)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-blue-200 text-xs sm:text-sm transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(recipient)}
                    disabled={deletingId === recipient.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/15 hover:bg-red-600/25 text-red-200 text-xs sm:text-sm transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deletingId === recipient.id ? 'Removing...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
