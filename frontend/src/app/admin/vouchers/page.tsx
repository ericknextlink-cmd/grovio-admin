'use client'

import React, { useState, useEffect } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { adminVouchersApi } from '@/lib/api'
import { toast } from 'sonner'
import { Plus, Ticket, UserPlus, Image as ImageIcon, X } from 'lucide-react'

type VoucherRow = {
  id: string
  code: string
  discount_type: string
  discount_value: number
  description: string | null
  image_type: string | null
  min_order_amount: number
  valid_from: string
  valid_until: string | null
  max_uses: number | null
  use_count: number
  created_at: string
}

type UserOption = { id: string; email: string; name: string }

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherRow[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [assignVoucher, setAssignVoucher] = useState<VoucherRow | null>(null)
  const [previewVoucher, setPreviewVoucher] = useState<VoucherRow | null>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)

  const [formCode, setFormCode] = useState('')
  const [formType, setFormType] = useState<'percentage' | 'fixed'>('fixed')
  const [formValue, setFormValue] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formImageType, setFormImageType] = useState<'regular' | 'nss'>('regular')
  const [formMinOrder, setFormMinOrder] = useState('')
  const [formValidUntil, setFormValidUntil] = useState('')
  const [formMaxUses, setFormMaxUses] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadVouchers = async () => {
    try {
      const res = await adminVouchersApi.list()
      if (res.success && res.data) setVouchers(Array.isArray(res.data) ? res.data : [])
      else setVouchers([])
    } catch {
      setVouchers([])
    }
  }

  const loadUsers = async () => {
    try {
      const res = await adminVouchersApi.listUsers()
      if (res.success && res.data) setUsers(Array.isArray(res.data) ? res.data : [])
      else setUsers([])
    } catch {
      setUsers([])
    }
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      await Promise.all([loadVouchers(), loadUsers()])
      if (!cancelled) setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!previewVoucher) {
      setPreviewBlobUrl(null)
      return
    }
    let blobUrl: string | null = null
    adminVouchersApi
      .fetchPreviewImageBlobUrl(
        previewVoucher.id,
        (previewVoucher.image_type === 'nss' ? 'nss' : 'regular')
      )
      .then((url) => {
        blobUrl = url
        setPreviewBlobUrl(url)
      })
      .catch(() => toast.error('Could not load preview image'))
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      setPreviewBlobUrl(null)
    }
  }, [previewVoucher?.id, previewVoucher?.image_type])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseFloat(formValue)
    if (!formCode.trim() || isNaN(value) || value <= 0) {
      toast.error('Code and a positive discount value are required')
      return
    }
    if (formType === 'percentage' && value > 100) {
      toast.error('Percentage cannot exceed 100')
      return
    }
    setSubmitting(true)
    try {
      const res = await adminVouchersApi.create({
        code: formCode.trim().toUpperCase(),
        discount_type: formType,
        discount_value: value,
        description: formDescription.trim() || undefined,
        image_type: formImageType,
        min_order_amount: formMinOrder ? parseFloat(formMinOrder) : undefined,
        valid_until: formValidUntil || undefined,
        max_uses: formMaxUses ? parseInt(formMaxUses, 10) : undefined,
      })
      if (res.success && res.data) {
        toast.success(`Voucher ${res.data.code} created`)
        setShowCreate(false)
        setFormCode('')
        setFormValue('')
        setFormDescription('')
        setFormMaxUses('')
        setFormValidUntil('')
        loadVouchers()
      } else {
        toast.error((res as { message?: string }).message || 'Failed to create voucher')
      }
    } catch {
      toast.error('Failed to create voucher')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignVoucher || !assignUserId) {
      toast.error('Select a user')
      return
    }
    setSubmitting(true)
    try {
      const res = await adminVouchersApi.assign(assignUserId, assignVoucher.id)
      if (res.success) {
        toast.success('Voucher assigned to user')
        setAssignVoucher(null)
        setAssignUserId('')
      } else {
        toast.error((res as { message?: string }).message || 'Failed to assign')
      }
    } catch {
      toast.error('Failed to assign voucher')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar currentPage="vouchers" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="lg:ml-64">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discounts</h1>
              <p className="text-gray-600 dark:text-gray-400">Create vouchers and assign them to users</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center px-4 py-2 bg-[#D35F0E] text-white rounded-lg hover:bg-[#D35F0E]/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create voucher
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Image</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Valid until</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Uses</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No vouchers yet. Create one to get started.
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-white">{v.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{v.discount_type}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {v.discount_type === 'percentage' ? `${v.discount_value}%` : `GHC ${v.discount_value}`}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{v.image_type || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {v.valid_until ? new Date(v.valid_until).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{v.use_count} {v.max_uses != null ? `/ ${v.max_uses}` : ''}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewVoucher(v)}
                              className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                              title="Preview image"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAssignVoucher(v); setAssignUserId('') }}
                              className="p-2 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                              title="Assign to user"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create voucher</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="e.g. SAVE20"
                  required
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'percentage' | 'fixed')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="fixed">Fixed amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
                  <input
                    type="number"
                    step={formType === 'percentage' ? 1 : 0.01}
                    min={0}
                    max={formType === 'percentage' ? 100 : undefined}
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image type</label>
                <select
                  value={formImageType}
                  onChange={(e) => setFormImageType(e.target.value as 'regular' | 'nss')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="regular">Regular (Orange)</option>
                  <option value="nss">NSS (Blue)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min order (GHC)</label>
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max uses</label>
                  <input
                    type="number"
                    min={1}
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid until (optional)</label>
                <input
                  type="date"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#D35F0E] text-white rounded-lg hover:bg-[#D35F0E]/90 disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignVoucher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assign {assignVoucher.code} to user</h2>
              <button type="button" onClick={() => setAssignVoucher(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User</label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAssignVoucher(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#D35F0E] text-white rounded-lg hover:bg-[#D35F0E]/90 disabled:opacity-50">
                  {submitting ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview image modal */}
      {previewVoucher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setPreviewVoucher(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preview: {previewVoucher.code}</h2>
              <button type="button" onClick={() => setPreviewVoucher(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              {previewBlobUrl ? (
                <img src={previewBlobUrl} alt={`Voucher ${previewVoucher.code}`} className="w-full rounded-lg border border-gray-200 dark:border-gray-700" />
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Loading preview...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
