/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Edit, Trash2, Package, Loader2, Sparkles, CheckCircle, XCircle, Archive, Layers } from 'lucide-react'
import AdminSidebar from '@/components/AdminSidebar'
import { aiProductsApi, bundlesApi } from '@/lib/api'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'

interface AIProduct {
  id: string
  name: string
  brand?: string
  description?: string
  category_name: string
  subcategory?: string
  price: number
  currency: string
  quantity: number
  weight?: number
  volume?: number
  type?: string
  packaging?: string
  in_stock: boolean
  rating?: number
  reviews_count?: number
  images?: string[]
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
  published_at?: string
}

export default function AIProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<AIProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'draft' | 'published' | 'archived' | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [aiBundles, setAiBundles] = useState<Array<{ bundleId: string; title: string; category: string; originalPrice: number }>>([])
  const [aiBundlesLoading, setAiBundlesLoading] = useState(false)

  const fetchAiBundles = useCallback(async () => {
    setAiBundlesLoading(true)
    try {
      const res = await bundlesApi.getAll({ source: 'ai', limit: 8 })
      if (res.success && res.data && Array.isArray(res.data)) {
        setAiBundles(res.data.map((b: { bundleId: string; title: string; category: string; originalPrice: number }) => ({
          bundleId: b.bundleId,
          title: b.title,
          category: b.category,
          originalPrice: b.originalPrice,
        })))
      }
    } catch {
      // non-blocking
    } finally {
      setAiBundlesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAiBundles()
  }, [fetchAiBundles])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params: any = {
        page,
        limit,
      }

      if (searchQuery) {
        params.search = searchQuery
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter
      }

      if (selectedCategory) {
        params.category = selectedCategory
      }

      const response = await aiProductsApi.getAll(params)

      if (response.success && response.data) {
        setProducts(Array.isArray(response.data) ? response.data : [])
        
        if (response.pagination) {
          setTotal(response.pagination.total)
          setTotalPages(response.pagination.totalPages)
        }
      } else {
        setError(response.message || 'Failed to fetch products')
      }
    } catch (err) {
      setError('An error occurred while fetching products')
      console.error('Fetch AI products error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, selectedCategory, searchQuery, limit])

  useEffect(() => {
    fetchProducts()
  }, [page, statusFilter, selectedCategory, fetchProducts])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchProducts()
      } else {
        setPage(1)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, fetchProducts, page])

  const handleGenerate = async () => {
    if (!confirm('Generate 10 new AI products? This may take a moment.')) {
      return
    }

    setGenerating(true)
    setError(null)

    try {
      const response = await aiProductsApi.generate(10)

      if (response.success) {
        const count = Array.isArray(response.data) ? response.data.length : 0
        toast.success(`Generated ${count} AI product${count === 1 ? '' : 's'}`)
        fetchProducts()
      } else {
        setError(response.message || 'Failed to generate products')
        toast.error(response.message || 'Failed to generate products')
      }
    } catch (err) {
      setError('An error occurred while generating products')
      console.error('Generate AI products error:', err)
      toast.error('An error occurred while generating products')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      const response = await aiProductsApi.delete(id)
      if (response.success) {
        fetchProducts()
        toast.success('AI product deleted')
      } else {
        toast.error(response.message || 'Failed to delete product')
      }
    } catch (err) {
      console.error('Delete AI product error:', err)
      toast.error('An error occurred while deleting the product')
    }
  }

  const handlePublish = async (id: string) => {
    try {
      const response = await aiProductsApi.publish(id)
      if (response.success) {
        fetchProducts()
        toast.success('AI product published')
      } else {
        toast.error(response.message || 'Failed to publish product')
      }
    } catch (err) {
      console.error('Publish AI product error:', err)
      toast.error('An error occurred while publishing the product')
    }
  }

  const handleUnpublish = async (id: string) => {
    try {
      const response = await aiProductsApi.unpublish(id)
      if (response.success) {
        fetchProducts()
        toast.success('AI product moved back to draft')
      } else {
        toast.error(response.message || 'Failed to unpublish product')
      }
    } catch (err) {
      console.error('Unpublish AI product error:', err)
      toast.error('An error occurred while unpublishing the product')
    }
  }

  const handleArchive = async (id: string) => {
    try {
      const response = await aiProductsApi.archive(id)
      if (response.success) {
        fetchProducts()
        toast.success('AI product archived')
      } else {
        toast.error(response.message || 'Failed to archive product')
      }
    } catch (err) {
      console.error('Archive AI product error:', err)
      toast.error('An error occurred while archiving the product')
    }
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency || 'GHS',
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    }
    return badges[status as keyof typeof badges] || badges.draft
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar
        currentPage="ai-products"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="lg:ml-64">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                AI Products
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage AI-generated single product suggestions. For bundled products (combinations of items + budget), use the Bundles page.
              </p>
            </div>
            <button
              onClick={handleGenerate}
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
                  Generate Products
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI-generated bundles (from Bundles page) */}
        <div className="mx-6 mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4" />
              AI-generated bundles
            </h3>
            <Link
              href="/admin/bundles"
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              View all →
            </Link>
          </div>
          {aiBundlesLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : aiBundles.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No AI bundles yet. Create some on the Bundles page.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {aiBundles.map((b) => (
                <li key={b.bundleId} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200">
                  <Link href="/admin/bundles" className="hover:underline">{b.title}</Link>
                  <span className="ml-2 text-gray-500">₵{b.originalPrice.toFixed(2)} · {b.category}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Filters and Search */}
        <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name, brand, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any)
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && products.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading products...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <button
                onClick={fetchProducts}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No AI products found</p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                Generate Products
              </button>
            </div>
          ) : (
            <>
              {/* Products Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 shrink-0 mr-3">
                                {product.images && product.images.length > 0 ? (
                                  <Image
                                    src={product.images[0]}
                                    alt={product.name}
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <Package className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {product.name}
                                </div>
                                {product.brand && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {product.brand}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {product.category_name}
                            </div>
                            {product.subcategory && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {product.subcategory}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatPrice(product.price, product.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(product.status)}`}
                            >
                              {product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(product.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              {product.status === 'draft' && (
                                <button
                                  onClick={() => handlePublish(product.id)}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                  title="Publish"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              {product.status === 'published' && (
                                <button
                                  onClick={() => handleUnpublish(product.id)}
                                  className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                                  title="Unpublish"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => router.push(`/admin/ai-products/${product.id}`)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleArchive(product.id)}
                                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                                title="Archive"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete"
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} products
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
                      disabled={page === totalPages}
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
    </div>
  )
}

