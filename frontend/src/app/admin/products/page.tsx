/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Edit, Trash2, Package, Loader2, Sparkles, X, CheckSquare, Square } from 'lucide-react'
import AdminSidebar from '@/components/AdminSidebar'
import ProductForm from '@/components/ProductForm'
import AIProductRecommendationsBar, { AIRecommendedProduct } from '@/components/AIProductRecommendationsBar'
import { productsApi, categoriesApi, aiApi } from '@/lib/api'
import { uploadLocalImages } from '@/lib/upload'
import { GroceryCategory, GroceryProduct } from '@/types/grocery'
import { useAICart } from '@/contexts/AICartContext'
import Image from 'next/image'
import { toast } from 'sonner'

interface Product {
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
  weight_unit?: 'kg' | 'g'
  volume?: number
  type?: string
  packaging?: string
  in_stock: boolean
  rating?: number
  reviews_count?: number
  images?: string[]
  created_at: string
  updated_at: string
}

export default function ProductsPage() {
  const router = useRouter()
  const { aiCart, addToAICart, removeFromAICart, clearAICart, getAICartTotal, isInAICart } = useAICart()
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [categories, setCategories] = useState<GroceryCategory[]>([])
  
  // Pagination
  const [page, setPage] = useState(1)
  const LIMIT_OPTIONS = [10, 20, 50, 100, 200, 500, 1000] as const
  const [limitOption, setLimitOption] = useState<number | 'custom'>(20)
  const [customLimit, setCustomLimit] = useState<string>('100')
  const limit = limitOption === 'custom' ? (parseInt(customLimit, 10) || 100) : limitOption
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [inStockFilter, setInStockFilter] = useState<boolean | undefined>(undefined)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [similarProducts, setSimilarProducts] = useState<Product[]>([])
  const [similarProductsLoading, setSimilarProductsLoading] = useState(false)

  // Row selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStockLoading, setBulkStockLoading] = useState(false)
  const [bulkQuantityInput, setBulkQuantityInput] = useState('')
  const [bulkSetQuantityLoading, setBulkSetQuantityLoading] = useState(false)
  
  // AI Recommendation state
  const [showAIRecommendationModal, setShowAIRecommendationModal] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [aiRecommendedProducts, setAiRecommendedProducts] = useState<AIRecommendedProduct[]>([])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params: any = {
        page,
        limit,
        sortBy,
        sortOrder,
      }

      if (searchQuery) {
        params.search = searchQuery
      }

      if (selectedCategory) {
        params.category = selectedCategory
      }

      if (inStockFilter !== undefined) {
        params.inStock = inStockFilter
      }

      const response = await productsApi.getAll(params)

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
      console.error('Fetch products error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, sortBy, sortOrder, selectedCategory, inStockFilter, searchQuery, limit])

  const handleLimitChange = (value: number | 'custom') => {
    setLimitOption(value)
    setPage(1)
  }

  useEffect(() => {
    fetchProducts()
  }, [page, sortBy, sortOrder, selectedCategory, inStockFilter, fetchProducts])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoriesApi.getAll()
      if (response.success && response.data) {
        const normalized = (response.data as any[]).map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description || '',
          icon: category.icon || '',
          images: Array.isArray(category.images) ? category.images : [],
          subcategories: Array.isArray(category.subcategories) ? category.subcategories : [],
        })) as GroceryCategory[]
        setCategories(normalized)
      }
    } catch (err) {
      console.error('Fetch categories error:', err)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  /** Score name similarity for "reuse image from similar product". Higher = more similar. */
  const nameSimilarityScore = (a: string, b: string): number => {
    const na = a.trim().toLowerCase()
    const nb = b.trim().toLowerCase()
    if (na === nb) return 100
    const wordsA = new Set(na.split(/\s+/).filter(Boolean))
    const wordsB = new Set(nb.split(/\s+/).filter(Boolean))
    let common = 0
    wordsA.forEach((w) => { if (wordsB.has(w)) common++ })
    const score = (common / Math.max(wordsA.size, wordsB.size, 1)) * 50
    if (na.includes(nb) || nb.includes(na)) return score + 40
    return score
  }

  useEffect(() => {
    if (!editingProduct?.name) {
      setSimilarProducts([])
      return
    }
    let cancelled = false
    setSimilarProductsLoading(true)
    setSimilarProducts([])
    productsApi
      .getAll({ search: editingProduct.name, limit: 100, page: 1, sortBy: 'name', sortOrder: 'asc' })
      .then((response) => {
        if (cancelled || !response.success || !response.data) return
        const list = Array.isArray(response.data) ? response.data : []
        const others = list
          .filter((p: Product) => p.id !== editingProduct.id && Array.isArray(p.images) && p.images.length > 0)
          .map((p: Product) => ({ ...p, _score: nameSimilarityScore(editingProduct.name, p.name) }))
          .sort((a: Product & { _score: number }, b: Product & { _score: number }) => (b._score - a._score))
          .slice(0, 2)
          .map(({ _score, ...p }: Product & { _score: number }) => p)
        if (!cancelled) setSimilarProducts(others)
      })
      .catch(() => { if (!cancelled) setSimilarProducts([]) })
      .finally(() => { if (!cancelled) setSimilarProductsLoading(false) })
    return () => { cancelled = true }
  }, [editingProduct?.id, editingProduct?.name])

  // When search query changes, reset to page 1 (pagination stays on current page otherwise)
  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      const response = await productsApi.delete(id)
      if (response.success) {
        toast.success('Product deleted')
        await fetchProducts()
      } else {
        toast.error(response.message || 'Failed to delete product')
      }
    } catch (err) {
      console.error('Delete product error:', err)
      toast.error('An error occurred while deleting the product')
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

  const openCreateModal = () => {
    setEditingProduct(null)
    setIsProductModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsProductModalOpen(true)
  }

  const closeProductModal = () => {
    setIsProductModalOpen(false)
    setEditingProduct(null)
    setSimilarProducts([])
  }

  const handleAIRecommendation = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt for AI recommendations')
      return
    }

    setAiLoading(true)
    setAiResponse('')

    try {
      const prompt = aiPrompt.trim()
      const result = await aiApi.getSupplierRecommendations({
        message: prompt,
      })

      if (result.success && result.data) {
        setAiResponse(result.data.response || '')
        // Store all recommended products (final list + alternatives) for cart functionality
        const allProducts = result.data.allRecommendedProducts || result.data.recommendedProducts || []
        setAiRecommendedProducts(allProducts)
      } else {
        toast.error(result.message || 'Failed to get AI recommendations')
      }
    } catch (error) {
      console.error('AI recommendation error:', error)
      toast.error('Failed to get AI recommendations. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAddToMainCart = () => {
    // Add items from AI cart to main shopping cart
    if (aiCart.length === 0) {
      toast.error('Please add items to AI cart first')
      return
    }
    
    // TODO: Integrate with main cart system
    toast.success(`Added ${aiCart.length} items to cart (₵${getAICartTotal().toFixed(2)})`)
    clearAICart()
  }

  const handleCloseAIModal = () => {
    setShowAIRecommendationModal(false)
    setAiResponse('')
    setAiRecommendedProducts([])
    clearAICart()
  }

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllOnPage = () => {
    const onPage = new Set(products.map((p) => p.id))
    const allSelected = onPage.size > 0 && products.every((p) => selectedIds.has(p.id))
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        onPage.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        onPage.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const handleBulkMarkStock = async (inStock: boolean) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkStockLoading(true)
    try {
      let ok = 0
      let fail = 0
      for (const id of ids) {
        const product = products.find((p) => p.id === id)
        const quantity = product?.quantity ?? 0
        const res = await productsApi.updateStock(id, quantity, inStock)
        if (res.success) ok++
        else fail++
      }
      if (fail > 0) {
        toast.error(`${ok} updated, ${fail} failed`)
      } else {
        toast.success(`${ok} product${ok === 1 ? '' : 's'} marked as ${inStock ? 'in stock' : 'out of stock'}`)
      }
      setSelectedIds(new Set())
      await fetchProducts()
    } catch (e) {
      toast.error('Bulk update failed')
      console.error(e)
    } finally {
      setBulkStockLoading(false)
    }
  }

  const handleBulkSetQuantity = async () => {
    const value = Math.floor(Number(bulkQuantityInput))
    if (Number.isNaN(value) || value < 0) {
      toast.error('Enter a valid quantity (0 or more)')
      return
    }
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkSetQuantityLoading(true)
    try {
      let ok = 0
      let fail = 0
      for (const id of ids) {
        const product = products.find((p) => p.id === id)
        const inStock = product?.in_stock ?? true
        const res = await productsApi.updateStock(id, value, inStock)
        if (res.success) ok++
        else fail++
      }
      if (fail > 0) {
        toast.error(`${ok} updated, ${fail} failed`)
      } else {
        toast.success(`Quantity set to ${value} for ${ok} product${ok === 1 ? '' : 's'}`)
      }
      setSelectedIds(new Set())
      setBulkQuantityInput('')
      await fetchProducts()
    } catch (e) {
      toast.error('Bulk set quantity failed')
      console.error(e)
    } finally {
      setBulkSetQuantityLoading(false)
    }
  }

  const mapProductToFormProduct = (product: Product): GroceryProduct => ({
    id: product.id,
    name: product.name,
    brand: product.brand || '',
    description: product.description || '',
    category: product.category_name,
    subcategory: product.subcategory || '',
    price: product.price,
    currency: product.currency,
    quantity: product.quantity,
    weight: product.weight,
    weight_unit: product.weight_unit ?? 'kg',
    volume: product.volume,
    type: product.type || '',
    packaging: product.packaging || '',
    inStock: product.in_stock,
    rating: product.rating ?? 0,
    reviews: product.reviews_count ?? 0,
    images: product.images || [],
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at),
  })

  const handleProductFormSubmit = async (formValues: Omit<GroceryProduct, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { images: uploadedImages, errors } = await uploadLocalImages(formValues.images || [], 'products')
      if (errors.length > 0) {
        console.warn('Some product images failed to upload:', errors)
        toast.warning(`Some images failed to upload: ${errors.join(', ')}`)
      }
      // Only send URLs (backend validation expects URL strings; strip any leftover data URLs)
      const imageUrls = (uploadedImages || []).filter((url): url is string => typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://')))

      const payload = {
        name: formValues.name.trim(),
        brand: formValues.brand.trim() || null,
        description: (formValues.description && formValues.description.trim()) ? formValues.description.trim() : formValues.name.trim(),
        category: formValues.category,
        category_name: formValues.category,
        subcategory: formValues.subcategory || null,
        price: formValues.price,
        currency: formValues.currency,
        quantity: formValues.quantity,
        weight: formValues.weight ?? null,
        weight_unit: formValues.weight_unit ?? null,
        volume: formValues.volume ?? null,
        type: formValues.type || null,
        packaging: formValues.packaging || null,
        in_stock: formValues.inStock,
        rating: formValues.rating ?? 0,
        reviews_count: formValues.reviews ?? 0,
        images: imageUrls,
      }

      let response
      if (editingProduct) {
        response = await productsApi.update(editingProduct.id, payload)
        if (!response.success && imageUrls.length > 0) {
          // Save failed but we already uploaded images — try to at least save image URLs so they're not orphaned
          const imagesOnlyResponse = await productsApi.update(editingProduct.id, { images: imageUrls })
          if (imagesOnlyResponse.success) {
            toast.success('Product images saved. Other fields could not be updated — please try again.')
            await fetchProducts()
            setEditingProduct(null)
            setIsProductModalOpen(false)
            return
          }
        }
      } else {
        response = await productsApi.create(payload)
      }

      if (!response.success) {
        toast.error(response.message || 'Failed to save product')
        return
      }

      toast.success(editingProduct ? 'Product updated' : 'Product created')
      setEditingProduct(null)
      setIsProductModalOpen(false)
      await fetchProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save product')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar
        currentPage="products"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="lg:ml-64">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your product inventory</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
              <button
                onClick={() => setShowAIRecommendationModal(true)}
                disabled={products.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4" />
                AI Recommendations
              </button>
            </div>
          </div>
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
                  placeholder="Search products by name, brand, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Categories</option>
              {(categories ?? []).map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>

            {/* Stock Filter */}
            <select
              value={inStockFilter === undefined ? '' : inStockFilter ? 'true' : 'false'}
              onChange={(e) => {
                const value = e.target.value
                setInStockFilter(value === '' ? undefined : value === 'true')
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Stock Status</option>
              <option value="true">In Stock</option>
              <option value="false">Out of Stock</option>
            </select>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-')
                setSortBy(newSortBy)
                setSortOrder(newSortOrder as 'asc' | 'desc')
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="price-asc">Price Low to High</option>
              <option value="price-desc">Price High to Low</option>
              <option value="quantity-desc">Stock High to Low</option>
              <option value="quantity-asc">Stock Low to High</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && products.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
              <p className="text-gray-600 dark:text-gray-400">No products found</p>
            </div>
          ) : (
            <>
              {/* Bulk actions bar */}
              {selectedIds.size > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {selectedIds.size} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBulkMarkStock(true)}
                    disabled={bulkStockLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {bulkStockLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Mark in stock
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkMarkStock(false)}
                    disabled={bulkStockLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {bulkStockLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Mark out of stock
                  </button>
                  <div className="inline-flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={bulkQuantityInput}
                      onChange={(e) => setBulkQuantityInput(e.target.value)}
                      placeholder="Qty"
                      className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleBulkSetQuantity}
                      disabled={bulkSetQuantityLoading || !bulkQuantityInput.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {bulkSetQuantityLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Set quantity
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                  >
                    Clear selection
                  </button>
                </div>
              )}

              {/* Products Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="w-10 px-4 py-3 text-left">
                          <button
                            type="button"
                            onClick={toggleSelectAllOnPage}
                            className="inline-flex items-center justify-center rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title={products.every((p) => selectedIds.has(p.id)) ? 'Deselect all' : 'Select all'}
                          >
                            {products.length > 0 && products.every((p) => selectedIds.has(p.id)) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </th>
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
                          Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Updated
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="w-10 px-4 py-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleSelectProduct(product.id)}
                              className="inline-flex items-center justify-center rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {selectedIds.has(product.id) ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </td>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {product.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                product.in_stock
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              {product.in_stock ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(product.updated_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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

              {/* Table count selector + Pagination */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span>Show</span>
                    <select
                      value={limitOption === 'custom' ? 'custom' : limitOption}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === 'custom') handleLimitChange('custom')
                        else handleLimitChange(parseInt(v, 10))
                      }}
                      className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      {LIMIT_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                      <option value="custom">Custom</option>
                    </select>
                    <span>per page</span>
                    {limitOption === 'custom' && (
                      <input
                        type="number"
                        min={1}
                        max={5000}
                        value={customLimit}
                        onChange={(e) => {
                          setCustomLimit(e.target.value)
                          setPage(1)
                        }}
                        onBlur={() => setPage(1)}
                        className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    )}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} products
                  </div>
                </div>
                {totalPages > 1 && (
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
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ProductForm
        isOpen={isProductModalOpen}
        product={editingProduct ? mapProductToFormProduct(editingProduct) : undefined}
        categories={categories}
        onSubmit={handleProductFormSubmit}
        onCancel={closeProductModal}
        similarProducts={editingProduct ? similarProducts.map((p) => ({ id: p.id, name: p.name, images: p.images || [] })) : []}
        similarProductsLoading={similarProductsLoading}
      />
      
      {/* AI Recommendation Modal */}
      {showAIRecommendationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Product Recommendations</h3>
              <button
                onClick={() => setShowAIRecommendationModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What kind of products are you looking for? (e.g., "breakfast items for family of 4 under ₵500")
                </label>
                <textarea
                  id="ai-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe your needs..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleAIRecommendation}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Getting Recommendations...
                    </>
                  ) : (
                    <>
                      Get AI Recommendations
                    </>
                  )}
                </button>
              </div>
              
              {aiResponse && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">AI Recommendations:</h4>
                  <div className="whitespace-pre-wrap bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200">
                    {aiResponse}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
