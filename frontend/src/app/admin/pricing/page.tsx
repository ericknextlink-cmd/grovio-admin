'use client'

import React, { useState, useEffect } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { pricingApi } from '@/lib/api'
import { toast } from 'sonner'
import { Percent, Loader2, RefreshCw, Tag, Package } from 'lucide-react'

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
  const [applyingDiscounts, setApplyingDiscounts] = useState(false)
  const [applyingBundleMarkup, setApplyingBundleMarkup] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [percentageInputs, setPercentageInputs] = useState<Record<string, string>>({})
  const [discountInputs, setDiscountInputs] = useState<Record<string, string>>({})
  const [bundleMarkupPercent, setBundleMarkupPercent] = useState<string>('')

  const fetchRanges = async () => {
    setLoading(true)
    try {
      const res = await pricingApi.getRanges()
      if (res.success && res.data) {
        const data = res.data as { ranges?: PriceRange[]; total_products?: number }
        const rangeList = Array.isArray(data.ranges) ? data.ranges : []
        setRanges(rangeList)
        setTotalProducts(data.total_products ?? 0)
        setPercentageInputs(
          rangeList.reduce(
            (acc, r) => ({ ...acc, [r.id]: String(r.percentage ?? 0) }),
            {} as Record<string, string>
          )
        )
        setDiscountInputs(
          rangeList.reduce(
            (acc, r) => ({ ...acc, [r.id]: '' }),
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
    const payload = (ranges ?? []).map((r) => ({
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

  const handleApplyDiscounts = async () => {
    const payload = (ranges ?? []).map((r) => ({
      min_value: r.min_value,
      max_value: r.max_value,
      percentage: parseFloat(discountInputs[r.id] || '0') || 0
    }))
    setApplyingDiscounts(true)
    try {
      const res = await pricingApi.applyDiscounts(payload)
      if (res.success) {
        toast.success(res.message || 'Discounts applied')
        fetchRanges()
      } else {
        toast.error(res.message || 'Failed to apply discounts')
      }
    } catch (e) {
      toast.error('Failed to apply discounts')
    } finally {
      setApplyingDiscounts(false)
    }
  }

  const handleApplyBundleMarkup = async () => {
    const pct = parseFloat(bundleMarkupPercent || '0')
    if (Number.isNaN(pct) || pct < 0) {
      toast.error('Enter a valid non-negative percentage')
      return
    }
    setApplyingBundleMarkup(true)
    try {
      const res = await pricingApi.applyBundleMarkup(pct)
      if (res.success) {
        toast.success(res.message || 'Bundle markup applied')
        setBundleMarkupPercent('')
      } else {
        toast.error(res.message || 'Failed to apply bundle markup')
      }
    } catch (e) {
      toast.error('Failed to apply bundle markup')
    } finally {
      setApplyingBundleMarkup(false)
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
                Markup by price range, discounts by range, and bundle markup on total original (supplier) price.
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
              {/* Section 1: Markup by price range (original supplier price) */}
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Markup by price range (original / supplier price)
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Set markup % per range. Selling price = original (supplier) price × (1 + markup %).
                </p>
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
                      {(ranges ?? []).map((r) => (
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
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {applying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Percent className="h-5 w-5" />}
                    Apply markup
                  </button>
                </div>
              </section>

              {/* Section 2: Discounts by same price ranges */}
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Discounts by price range
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Apply a discount % to current selling price for products in each range. New price = current price × (1 − discount %).
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Price range (original)</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Products</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Discount %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(ranges ?? []).map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="py-3 px-4 text-gray-900 dark:text-white">{r.label}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{r.product_count ?? 0}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                placeholder="0"
                                value={discountInputs[r.id] ?? ''}
                                onChange={(e) =>
                                  setDiscountInputs((prev) => ({ ...prev, [r.id]: e.target.value }))
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
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleApplyDiscounts}
                    disabled={applyingDiscounts}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >
                    {applyingDiscounts ? <Loader2 className="h-5 w-5 animate-spin" /> : <Tag className="h-5 w-5" />}
                    Apply discounts
                  </button>
                </div>
              </section>

              {/* Section 3: Bundle markup (on total original price) */}
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Bundle markup
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  For each bundle, total = sum of products’ original (supplier) prices. Bundle selling price = total × (1 + markup %). One markup on the bundle total, not per product.
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-4">
                  <label className="font-medium text-gray-700 dark:text-gray-300">Markup %</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 15"
                    value={bundleMarkupPercent}
                    onChange={(e) => setBundleMarkupPercent(e.target.value)}
                    className="w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleApplyBundleMarkup}
                    disabled={applyingBundleMarkup}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {applyingBundleMarkup ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-5 w-5" />}
                    Apply to all bundles
                  </button>
                </div>
              </section>

              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Total products in database: <strong>{totalProducts}</strong>
                {totalProducts > 0 && (
                  <> · In ranges above: <strong>{(ranges ?? []).reduce((sum, r) => sum + (r.product_count ?? 0), 0)}</strong></>
                )}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
