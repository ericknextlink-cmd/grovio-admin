/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, Package, Loader2, Sparkles, Layers, X } from 'lucide-react'
import AdminSidebar from '@/components/AdminSidebar'
import { bundlesApi } from '@/lib/api'
import Link from 'next/link'
import { toast } from 'sonner'

interface AIBundle {
  bundleId: string
  title: string
  description?: string
  category: string
  originalPrice: number
  currentPrice?: number
  products?: Array<{ id: string; name: string; price: number; quantity?: number }>
}

export default function AIProductsPage() {
  const router = useRouter()
  const [bundles, setBundles] = useState<AIBundle[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [bundleToDelete, setBundleToDelete] = useState<AIBundle | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchBundles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await bundlesApi.getAll({ source: 'ai', page, limit })
      if (res.success && res.data && Array.isArray(res.data)) {
        setBundles(res.data as AIBundle[])
        const pag = (res as { pagination?: { total?: number; totalPages?: number } }).pagination
        if (pag) {
          setTotal(pag.total ?? res.data.length)
          setTotalPages(pag.totalPages ?? 1)
        } else {
          setTotal(res.data.length)
          setTotalPages(1)
        }
      } else {
        setError((res as { message?: string }).message || 'Failed to fetch AI bundles')
      }
    } catch (err) {
      setError('Failed to fetch AI bundles')
      console.error('Fetch AI bundles error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    fetchBundles()
  }, [fetchBundles])

  const handleGenerateClick = () => setGenerateModalOpen(true)

  const handleGenerateConfirm = async () => {
    setGenerating(true)
    setError(null)
    try {
      const response = await bundlesApi.generate({ count: 10 })
      if (response.success && response.data) {
        const data = response.data as { saved?: number; generated?: number }
        const count = data.saved ?? data.generated ?? 0
        toast.success(`Generated and saved ${count} AI bundle${count === 1 ? '' : 's'}`)
        setGenerateModalOpen(false)
        fetchBundles()
      } else {
        toast.error((response as { message?: string }).message || 'Failed to generate bundles')
      }
    } catch (err) {
      console.error('Generate bundles error:', err)
      toast.error('Failed to generate bundles')
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteClick = (bundle: AIBundle) => {
    setBundleToDelete(bundle)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!bundleToDelete) return
    setDeleting(true)
    try {
      const response = await bundlesApi.delete(bundleToDelete.bundleId)
      if (response.success) {
        toast.success('Bundle deleted')
        setDeleteModalOpen(false)
        setBundleToDelete(null)
        fetchBundles()
      } else {
        toast.error((response as { message?: string }).message || 'Failed to delete bundle')
      }
    } catch (err) {
      console.error('Delete bundle error:', err)
      toast.error('Failed to delete bundle')
    } finally {
      setDeleting(false)
    }
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(price)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar
        currentPage="ai-products"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="lg:ml-64">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                AI Products
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                AI-generated bundles created by the agent for you to review and approve. For supervised generation with your own prompt, use the Bundles page.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                How it works: When you click &quot;Generate bundles&quot;, the backend sends your catalog to the AI (OpenAI or xAI/Grok when configured). The AI picks product combinations from the catalog, names the bundles, and saves them here. No new products are invented—only bundles of existing catalog items. You can edit or delete any bundle.
              </p>
            </div>
            <button
              onClick={handleGenerateClick}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate bundles
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick link to Bundles page + how AI creates bundles */}
        <div className="mx-6 mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Supervised bundle creation
            </h3>
            <Link
              href="/admin/bundles"
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              Create bundles with your own prompt →
            </Link>
          </div>
          <details className="text-sm text-gray-600 dark:text-gray-400">
            <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">How does the AI create bundles?</summary>
            <p className="mt-2 pl-2 border-l-2 border-gray-200 dark:border-gray-600">
              The backend loads your product catalog and sends it to the model (OpenAI or xAI/Grok if XAI_API_KEY is set). The AI selects product IDs from that catalog to form each bundle, assigns a title and category, and returns a JSON list. Bundles are saved to the database and listed here. Nothing is auto-generated on page load or server startup—only when you click &quot;Generate bundles&quot; or use the Bundles page with a prompt.
            </p>
          </details>
        </div>

        <div className="p-6">
          {loading && bundles.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading bundles...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <button
                onClick={() => fetchBundles()}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : bundles.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No AI bundles yet</p>
              <p className="text-sm text-gray-500 mt-1">Generate bundles for the agent to create suggestions for approval.</p>
              <button
                onClick={handleGenerateClick}
                disabled={generating}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                Generate bundles
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Bundle
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {bundles.map((bundle) => (
                        <tr key={bundle.bundleId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {bundle.title}
                            </div>
                            {bundle.description && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {bundle.description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {bundle.category || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {formatPrice(bundle.originalPrice)}
                            {bundle.currentPrice != null && bundle.currentPrice !== bundle.originalPrice && (
                              <span className="text-gray-500 ml-1">(list: {formatPrice(bundle.currentPrice)})</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/bundles/${encodeURIComponent(bundle.bundleId)}`}
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                              >
                                <Edit className="h-4 w-4" /> View / Edit
                              </Link>
                              <button
                                onClick={() => handleDeleteClick(bundle)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                                title="Delete bundle"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} bundles
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Generate bundles modal */}
      {generateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Generate AI bundles</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              The agent will create 10 new bundles based on the catalog. You can review and edit them after generation.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => !generating && setGenerateModalOpen(false)}
                disabled={generating}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateConfirm}
                disabled={generating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete bundle modal */}
      {deleteModalOpen && bundleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete bundle</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Delete &quot;{bundleToDelete.title}&quot;? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => !deleting && (setDeleteModalOpen(false), setBundleToDelete(null))}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
