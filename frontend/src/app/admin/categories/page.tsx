'use client'

import React, { useState } from 'react'
import { useAdminStore } from '@/store/adminStore'
import CategoriesTable from '@/components/CategoriesTable'
import AdminSidebar from '@/components/AdminSidebar'
import { GroceryCategory } from '@/types/grocery'
import { X } from 'lucide-react'

export default function CategoriesPage() {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useAdminStore()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<GroceryCategory | undefined>()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    subcategories: [] as string[],
  })

  const handleAddCategory = () => {
    setEditingCategory(undefined)
    setFormData({ name: '', subcategories: [] })
    setIsFormOpen(true)
  }

  const handleEditCategory = (category: GroceryCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      subcategories: [...category.subcategories],
    })
    setIsFormOpen(true)
  }

  const handleDeleteCategory = (category: GroceryCategory) => {
    deleteCategory(category.id)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.name.trim()) {
      if (editingCategory) {
        updateCategory(editingCategory.id, formData)
      } else {
        addCategory(formData)
      }
      setIsFormOpen(false)
      setFormData({ name: '', subcategories: [] })
    }
  }

  const handleFormCancel = () => {
    setIsFormOpen(false)
    setEditingCategory(undefined)
    setFormData({ name: '', subcategories: [] })
  }

  const addSubcategory = () => {
    const input = document.getElementById('subcategory-input') as HTMLInputElement
    if (input && input.value.trim()) {
      setFormData(prev => ({
        ...prev,
        subcategories: [...prev.subcategories, input.value.trim()]
      }))
      input.value = ''
    }
  }

  const removeSubcategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Shared Admin Sidebar */}
      <AdminSidebar 
        currentPage="categories"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories Management</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your product categories and subcategories</p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6">
          <CategoriesTable
            categories={categories}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            onAdd={handleAddCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>
      </div>

      {/* Category Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                onClick={handleFormCancel}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subcategories
                </label>
                <div className="flex gap-2">
                  <input
                    id="subcategory-input"
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    placeholder="Add subcategory"
                  />
                  <button
                    type="button"
                    onClick={addSubcategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                
                {/* Subcategories List */}
                {formData.subcategories.length > 0 && (
                  <div className="space-y-2">
                    {formData.subcategories.map((sub, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{sub}</span>
                        <button
                          type="button"
                          onClick={() => removeSubcategory(index)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleFormCancel}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
