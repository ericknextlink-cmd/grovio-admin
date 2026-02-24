'use client'

import React, { useState, useEffect, useCallback } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { bundlesApi, productsApi } from '@/lib/api'
import { toast } from 'sonner'
import { Layers, Loader2, ChevronDown, ChevronUp, Sparkles, Package, ChevronLeft, ChevronRight } from 'lucide-react'

interface BundleProduct {
  id: string
  name: string
  price: number
  quantity: number
}

interface Bundle {
  id: string
  bundleId: string
  title: string
  description: string
  category: string
  targetAudience: string
  badge?: string
  productIds: string[]
  products: BundleProduct[]
  originalPrice: number
  currentPrice: number
  savings?: number
  discountPercentage?: number
  createdAt: string
  generatedBy?: 'ai' | 'admin'
}

const PAGE_SIZE = 10

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [prompt, setPrompt] = useState('')
  const [budgetMin, setBudgetMin] = useState<string>('')
  const [budgetMax, setBudgetMax] = useState<string>('')
  const [count, setCount] = useState<string>('5')

  const [showManualForm, setShowManualForm] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualCategory, setManualCategory] = useState('')
  const [manualProductIds, setManualProductIds] = useState<string[]>([])
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const fetchBundles = useCallback(async (pageNum: number = page) => {
    setLoading(true)
    try {
      const res = await bundlesApi.getAll({ page: pageNum, limit: PAGE_SIZE })
      if (res.success && res.data) {
        setBundles(Array.isArray(res.data) ? res.data : [])
      }
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages)
        setTotal(res.pagination.total)
      }
    } catch {
      toast.error('Failed to load bundles')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchBundles(page)
  }, [page, fetchBundles])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const body: { count?: number; prompt?: string; budgetMin?: number; budgetMax?: number } = {
        count: parseInt(count, 10) || 5,
      }
      if (prompt.trim()) body.prompt = prompt.trim()
      const min = parseFloat(budgetMin)
      const max = parseFloat(budgetMax)
      if (!isNaN(min)) body.budgetMin = min
      if (!isNaN(max)) body.budgetMax = max

      const res = await bundlesApi.generate(body)
      if (res.success && res.data) {
        const data = res.data as { saved?: number; generated?: number }
        toast.success(`Generated and saved ${data.saved ?? data.generated ?? 0} bundle(s)`)
        setPage(1)
        fetchBundles(1)
      } else {
        toast.error((res as { message?: string }).message || 'Failed to generate bundles')
      }
    } catch {
      toast.error('Failed to generate bundles')
    } finally {
      setGenerating(false)
    }
  }

  const loadProductsForManual = useCallback(async () => {
    setProductsLoading(true)
    try {
      const res = await productsApi.getAll({ page: 1, limit: 200 })
      if (res.success && res.data && Array.isArray(res.data)) {
        setProducts(res.data.map((p: { id: string; name: string; price: number }) => ({ id: p.id, name: p.name, price: p.price })))
      }
    } catch {
      toast.error('Failed to load products')
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (showManualForm && products.length === 0) {
      loadProductsForManual()
    }
  }, [showManualForm, products.length, loadProductsForManual])

  const toggleProductForManual = (id: string) => {
    setManualProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleCreateManual = async () => {
    if (!manualTitle.trim()) {
      toast.error('Enter a bundle title')
      return
    }
    if (manualProductIds.length < 2) {
      toast.error('Select at least 2 products')
      return
    }
    setCreating(true)
    try {
      const res = await bundlesApi.createManual({
        title: manualTitle.trim(),
        description: manualDescription.trim(),
        category: manualCategory.trim() || 'General',
        productIds: manualProductIds,
      })
      if (res.success) {
        toast.success('Bundle created')
        setShowManualForm(false)
        setManualTitle('')
        setManualDescription('')
        setManualCategory('')
        setManualProductIds([])
        setPage(1)
        fetchBundles(1)
      } else {
        toast.error((res as { message?: string }).message || 'Failed to create bundle')
      }
    } catch {
      toast.error('Failed to create bundle')
    } finally {
      setCreating(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar currentPage="bundles" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <main className="lg:pl-64 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="h-8 w-8" />
            Bundles
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 mb-8">
            View and create bundles: AI-generated (from catalog) or manual (you pick products). All bundles use products from the database.
          </p>

          <div className="flex flex-wrap gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex-1 min-w-[280px]">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Generate with AI
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">What should the bundles contain? (optional)</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Student essentials: rice, oil, seasonings"
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget min (GHS)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      placeholder="50"
                      className="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget max (GHS)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      placeholder="300"
                      className="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Count</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                      className="w-16 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                    />
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  Generate bundles
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex-1 min-w-[280px]">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Manual bundle
              </h2>
              {!showManualForm ? (
                <button
                  onClick={() => setShowManualForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Package className="h-5 w-5" />
                  Create bundle manually
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Bundle title"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                  <textarea
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                  <input
                    type="text"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    placeholder="Category (optional)"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select products (min 2)</p>
                    {productsLoading ? (
                      <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading products...</div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 space-y-1">
                        {products.slice(0, 100).map((p) => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={manualProductIds.includes(p.id)}
                              onChange={() => toggleProductForManual(p.id)}
                            />
                            <span className="text-gray-900 dark:text-white">{p.name}</span>
                            <span className="text-gray-500">₵{p.price.toFixed(2)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateManual}
                      disabled={creating || manualProductIds.length < 2 || !manualTitle.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save bundle'}
                    </button>
                    <button
                      onClick={() => { setShowManualForm(false); setManualProductIds([]); setManualTitle(''); setManualDescription(''); setManualCategory(''); }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span>Saved bundles ({total})</span>
              {totalPages > 1 && (
                <span className="text-sm font-normal text-gray-500">
                  Page {page} of {totalPages}
                </span>
              )}
            </h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : bundles.length === 0 ? (
              <p className="p-6 text-gray-500 dark:text-gray-400">No bundles yet. Generate with AI or create one manually.</p>
            ) : (
              <>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bundles.map((b) => {
                    const isExpanded = expandedId === b.bundleId
                    const totalFromItems = b.products?.reduce((sum, p) => sum + p.price * (p.quantity || 1), 0) ?? b.originalPrice
                    const source = b.generatedBy ?? 'ai'
                    return (
                      <li key={b.bundleId} className="p-4">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleExpand(b.bundleId)}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 dark:text-white">{b.title}</span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                              {source === 'admin' ? 'Admin' : 'AI'}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">({b.category})</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              ₵{b.originalPrice.toFixed(2)}
                              {b.discountPercentage != null && b.discountPercentage > 0 && (
                                <span className="text-sm text-green-600 ml-1"> (list: ₵{b.currentPrice.toFixed(2)})</span>
                              )}
                            </span>
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="mt-3 pl-2 border-l-2 border-gray-200 dark:border-gray-600 space-y-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{b.description}</p>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Items in bundle</p>
                            {(b.products || []).map((p) => (
                              <div key={p.id} className="flex justify-between text-sm">
                                <span>{p.name}</span>
                                <span>×{p.quantity || 1} = ₵{((p.price || 0) * (p.quantity || 1)).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-medium pt-2 border-t border-gray-100 dark:border-gray-700">
                              <span>Total (sum of items)</span>
                              <span>₵{totalFromItems.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 text-gray-700 dark:text-gray-300"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {page} of {totalPages} ({total} total)
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 text-gray-700 dark:text-gray-300"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
