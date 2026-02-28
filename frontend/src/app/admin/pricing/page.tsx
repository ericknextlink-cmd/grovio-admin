'use client'

import React, { useState, useEffect } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { pricingApi } from '@/lib/api'
import { toast } from 'sonner'
import { Percent, Loader2, RefreshCw } from 'lucide-react'

interface PriceRange {
  id: string
  min_value: number
  max_value: number
  label: string
  percentage: number
  product_count?: number
}

export default function PricingPage() {
  const [ranges, setRanges] = useState<PriceRange[]>([])
  const [totalProducts, setTotalProducts] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [percentageInputs, setPercentageInputs] = useState<Record<string, string>>({})

  const fetchRanges = async () => {
    setLoading(true)
    try {
      const res = await pricingApi.getRanges()
      if (res.success && res.data) {
        const data = res.data as { ranges: PriceRange[]; total_products: number }
        setRanges(data.ranges)
        setTotalProducts(data.total_products ?? 0)
        setPercentageInputs(
          (data.ranges ?? []).reduce(
            (acc, r) => ({
              ...acc,
              [r.id]: r.percentage > 0 ? String(r.percentage) : ''
            }),
            {} as Record<string, string>
          )
        )
      } else {
        toast.error(res.message || 'Failed to load price ranges')
      }
    } catch (e) {
      toast.error('Failed to load price ranges')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRanges()
  }, [])

  const handleApply = async () => {
    const payload = ranges.map((r) => ({
      min_value: r.min_value,
      max_value: r.max_value,
      percentage: parseFloat(percentageInputs[r.id] || '0') || 0
    }))
    setApplying(true)
    try {
      const res = await pricingApi.applyPricing(payload)
      if (res.success) {
        toast.success(res.message || 'Pricing applied')
        fetchRanges()
      } else {
        toast.error(res.message || 'Failed to apply pricing')
      }
    } catch (e) {
      toast.error('Failed to apply pricing')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar
        currentPage="pricing"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <main className="lg:pl-64 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pricing</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Set markup percentages by price range. Apply updates selling prices for all products in each range based on original (supplier) price.
              </p>
            </div>
            <button
              onClick={fetchRanges}
              disabled={loading}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Price range (original)</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Products</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Markup %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {ranges.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{r.label}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{r.product_count ?? 0}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="0"
                              value={percentageInputs[r.id] ?? ''}
                              onChange={(e) =>
                                setPercentageInputs((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                              className="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                            />
                            <span className="text-gray-500">%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Total products in database: <strong>{totalProducts}</strong>
                {totalProducts > 0 && (
                  <> · In ranges above: <strong>{ranges.reduce((sum, r) => sum + (r.product_count ?? 0), 0)}</strong></>
                )}
              </p>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {applying ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Percent className="h-5 w-5" />
                  )}
                  Apply pricing
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
