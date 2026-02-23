'use client'

import React, { useState, useEffect, useCallback } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { bundlesApi } from '@/lib/api'
import { toast } from 'sonner'
import { Layers, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

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
}

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [prompt, setPrompt] = useState('')
  const [budgetMin, setBudgetMin] = useState<string>('')
  const [budgetMax, setBudgetMax] = useState<string>('')
  const [count, setCount] = useState<string>('5')

  const fetchBundles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await bundlesApi.getAll({ limit: 50 })
      if (res.success && res.data) {
        setBundles(Array.isArray(res.data) ? res.data : [])
      }
    } catch {
      toast.error('Failed to load bundles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBundles()
  }, [fetchBundles])

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
        fetchBundles()
      } else {
        toast.error((res as { message?: string }).message || 'Failed to generate bundles')
      }
    } catch {
      toast.error('Failed to generate bundles')
    } finally {
      setGenerating(false)
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
            AI creates bundled products (combinations of catalog items). Each bundle lists its items and the total = sum of item prices. Set a prompt and budget range so the AI builds bundles that match and fall within that range.
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate bundles
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">What should the bundles contain? (optional)</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Student essentials: rice, oil, seasonings, and breakfast items for a week"
                  rows={3}
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
                    placeholder="e.g. 50"
                    className="w-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
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
                    placeholder="e.g. 300"
                    className="w-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of bundles</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2"
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

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white p-4 border-b border-gray-200 dark:border-gray-700">
              Saved bundles
            </h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : bundles.length === 0 ? (
              <p className="p-6 text-gray-500 dark:text-gray-400">No bundles yet. Generate some above.</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {bundles.map((b) => {
                  const isExpanded = expandedId === b.bundleId
                  const totalFromItems = b.products?.reduce((sum, p) => sum + p.price * (p.quantity || 1), 0) ?? b.originalPrice
                  return (
                    <li key={b.bundleId} className="p-4">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleExpand(b.bundleId)}
                      >
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{b.title}</span>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({b.category})</span>
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
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
