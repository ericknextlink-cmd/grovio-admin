/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Edit, Trash2, Package, Loader2 } from 'lucide-react'
import AdminSidebar from '@/components/AdminSidebar'
import ProductForm from '@/components/ProductForm'
import { productsApi, categoriesApi } from '@/lib/api'
import { uploadLocalImages } from '@/lib/upload'
import { GroceryCategory, GroceryProduct } from '@/types/grocery'
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
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [categories, setCategories] = useState<GroceryCategory[]>([])
  
  // Pagination
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
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
      const { images: uploadedImages, errors } = await uploadLocalImages(formValues.images, 'products')
      if (errors.length > 0) {
        console.warn('Some product images failed to upload:', errors)
        toast.warning(`Some images failed to upload: ${errors.join(', ')}`)
      }

      const payload = {
        name: formValues.name.trim(),
        brand: formValues.brand.trim() || null,
        description: formValues.description.trim(),
        category: formValues.category,
        category_name: formValues.category,
        subcategory: formValues.subcategory || null,
        price: formValues.price,
        currency: formValues.currency,
        quantity: formValues.quantity,
        weight: formValues.weight ?? null,
        volume: formValues.volume ?? null,
        type: formValues.type || null,
        packaging: formValues.packaging || null,
        in_stock: formValues.inStock,
        rating: formValues.rating ?? 0,
        reviews_count: formValues.reviews ?? 0,
        images: uploadedImages,
      }

      let response
      if (editingProduct) {
        response = await productsApi.update(editingProduct.id, payload)
      } else {
        response = await productsApi.create(payload)
      }

      if (!response.success) {
        toast.error(response.message || 'Failed to save product')
        return
      }

      toast.success(editingProduct ? 'Product updated' : 'Product created')
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
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
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

      <ProductForm
        isOpen={isProductModalOpen}
        product={editingProduct ? mapProductToFormProduct(editingProduct) : undefined}
        categories={categories}
        onSubmit={handleProductFormSubmit}
        onCancel={closeProductModal}
      />
    </div>
  )
}
