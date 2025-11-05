/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import React, { useState, useEffect } from 'react'
import { useAdminStore } from '@/store/adminStore'
import StatsDashboard from '@/components/StatsDashboard'
import ProductsTable from '@/components/ProductsTable'
import ProductForm from '@/components/ProductForm'
import AdminSidebar from '@/components/AdminSidebar'
import { GroceryProduct } from '@/types/grocery'
import { productsApi } from '@/lib/api'

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
  in_stock: boolean
  images?: string[]
  [key: string]: any
}

export default function AdminDashboard() {
  const {
    categories,
    stats,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    deleteProduct,
  } = useAdminStore()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<GroceryProduct | undefined>()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await productsApi.getAll({ 
          page: 1, 
          limit: 100,
          sortBy: 'created_at',
          sortOrder: 'desc'
        })
        
        if (response.success && response.data) {
          setProducts(Array.isArray(response.data) ? response.data : [])
        } else {
          setError(response.message || 'Failed to fetch products')
        }
      } catch (err) {
        console.error('Fetch products error:', err)
        setError('An error occurred while fetching products')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Convert API products to GroceryProduct format
  const filteredProducts: GroceryProduct[] = products
    .filter(product => {
      const matchesSearch = searchQuery === '' ||
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category_name?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = selectedCategory === '' || product.category_name === selectedCategory

      return matchesSearch && matchesCategory
    })
    .map(product => ({
      id: product.id,
      name: product.name || '',
      brand: product.brand || '',
      description: product.description || '',
      category: product.category_name || '',
      subcategory: product.subcategory || '',
      price: product.price || 0,
      currency: product.currency || 'GHS',
      quantity: product.quantity || 0,
      weight: product.weight,
      volume: product.volume,
      type: product.type || '',
      packaging: product.packaging || '',
      inStock: product.in_stock ?? true,
      rating: product.rating || 0,
      reviews: product.reviews_count || 0,
      images: product.images || [],
      createdAt: new Date(product.created_at || Date.now()),
      updatedAt: new Date(product.updated_at || Date.now()),
    }))

  const handleAddProduct = () => {
    setEditingProduct(undefined)
    setIsFormOpen(true)
  }

  const handleEditProduct = (product: GroceryProduct) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const handleDeleteProduct = async (product: GroceryProduct) => {
    if (confirm(`Are you sure you want to delete ${product.name}?`)) {
      try {
        const response = await productsApi.delete(product.id)
        if (response.success) {
          setProducts(products.filter(p => p.id !== product.id))
        } else {
          alert(response.message || 'Failed to delete product')
        }
      } catch (err) {
        console.error('Delete product error:', err)
        alert('Failed to delete product')
      }
    }
  }

  const handleFormSubmit = async (productData: Omit<GroceryProduct, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingProduct) {
        const response = await productsApi.update(editingProduct.id, {
          name: productData.name,
          brand: productData.brand,
          description: productData.description,
          category_name: productData.category,
          subcategory: productData.subcategory,
          price: productData.price,
          currency: productData.currency,
          quantity: productData.quantity,
          weight: productData.weight,
          volume: productData.volume,
          type: productData.type,
          packaging: productData.packaging,
          in_stock: productData.inStock,
          images: productData.images,
        })
        
        if (response.success) {
          // Refresh products
          const refreshResponse = await productsApi.getAll({ page: 1, limit: 100 })
          if (refreshResponse.success && refreshResponse.data) {
            setProducts(Array.isArray(refreshResponse.data) ? refreshResponse.data : [])
          }
          setIsFormOpen(false)
        } else {
          alert(response.message || 'Failed to update product')
        }
      } else {
        const response = await productsApi.create({
          name: productData.name,
          brand: productData.brand,
          description: productData.description,
          category_name: productData.category,
          subcategory: productData.subcategory,
          price: productData.price,
          currency: productData.currency,
          quantity: productData.quantity,
          weight: productData.weight,
          volume: productData.volume,
          type: productData.type,
          packaging: productData.packaging,
          in_stock: productData.inStock,
          images: productData.images,
        })
        
        if (response.success) {
          // Refresh products
          const refreshResponse = await productsApi.getAll({ page: 1, limit: 100 })
          if (refreshResponse.success && refreshResponse.data) {
            setProducts(Array.isArray(refreshResponse.data) ? refreshResponse.data : [])
          }
          setIsFormOpen(false)
        } else {
          alert(response.message || 'Failed to create product')
        }
      }
    } catch (err) {
      console.error('Submit product error:', err)
      alert('Failed to save product')
    }
  }

  const handleFormCancel = () => {
    setIsFormOpen(false)
    setEditingProduct(undefined)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Shared Admin Sidebar */}
      <AdminSidebar 
        currentPage="dashboard"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your grocery store inventory</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Last updated</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6 space-y-8">
          {/* Statistics Dashboard */}
          <StatsDashboard stats={stats} />

          {/* Products Management */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          ) : (
            <ProductsTable
              products={filteredProducts}
              categories={categories}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onAdd={handleAddProduct}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              onSearchChange={setSearchQuery}
              onCategoryChange={setSelectedCategory}
            />
          )}
        </div>
      </div>

      {/* Product Form Modal */}
      <ProductForm
        product={editingProduct}
        categories={categories}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
        isOpen={isFormOpen}
      />
    </div>
  )
}
