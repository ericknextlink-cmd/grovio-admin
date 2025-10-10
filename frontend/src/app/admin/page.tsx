'use client'

import React, { useState } from 'react'
import { useAdminStore } from '@/store/adminStore'
import StatsDashboard from '@/components/StatsDashboard'
import ProductsTable from '@/components/ProductsTable'
import ProductForm from '@/components/ProductForm'
import AdminSidebar from '@/components/AdminSidebar'
import { GroceryProduct } from '@/types/grocery'

export default function AdminDashboard() {
  const {
    // products,
    categories,
    stats,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useAdminStore()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<GroceryProduct | undefined>()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const filteredProducts = useAdminStore.getState().getFilteredProducts()

  const handleAddProduct = () => {
    setEditingProduct(undefined)
    setIsFormOpen(true)
  }

  const handleEditProduct = (product: GroceryProduct) => {
    setEditingProduct(product)
    setIsFormOpen(true)
  }

  const handleDeleteProduct = (product: GroceryProduct) => {
    deleteProduct(product.id)
  }

  const handleFormSubmit = async (productData: Omit<GroceryProduct, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, productData)
    } else {
      addProduct(productData)
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
