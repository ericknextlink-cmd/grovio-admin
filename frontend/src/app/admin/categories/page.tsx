'use client'

import React, { useCallback, useEffect, useState } from 'react'
import CategoriesTable from '@/components/CategoriesTable'
import AdminSidebar from '@/components/AdminSidebar'
import { GroceryCategory } from '@/types/grocery'
import ImageUpload from '@/components/ImageUpload'
import { categoriesApi } from '@/lib/api'
import { uploadLocalImages } from '@/lib/upload'
import { X } from 'lucide-react'

const emptyForm = {
  name: '',
  description: '',
  subcategories: [] as string[],
  images: [] as string[],
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<GroceryCategory[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<GroceryCategory | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newSubcategoryInput, setNewSubcategoryInput] = useState('')

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
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
          createdAt: category.created_at,
          updatedAt: category.updated_at,
        })) as GroceryCategory[]
        setCategories(normalized)
      } else {
        setCategories([])
        setError(response.message || 'Failed to load categories')
      }
    } catch (err) {
      console.error('Fetch categories error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const resetForm = () => {
    setFormData(emptyForm)
    setEditingCategory(null)
    setNewSubcategoryInput('')
  }

  const handleAddCategory = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const handleEditCategory = (category: GroceryCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      subcategories: [...category.subcategories],
      images: [...(category.images || [])],
    })
    setIsFormOpen(true)
  }

  const handleDeleteCategory = async (category: GroceryCategory) => {
    try {
      setSubmitting(true)
      const response = await categoriesApi.delete(category.id)
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete category')
      }
      await fetchCategories()
    } catch (err) {
      console.error('Delete category error:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete category')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      setSubmitting(true)
      // Ensure all images are uploaded
      const { images: uploadedImages, errors } = await uploadLocalImages(formData.images, 'categories')
      if (errors.length > 0) {
        console.warn('Some images failed to upload:', errors)
        alert(`Some images failed to upload: ${errors.join(', ')}`)
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        subcategories: formData.subcategories,
        images: uploadedImages,
      }

      let response
      if (editingCategory) {
        response = await categoriesApi.update(editingCategory.id, payload)
      } else {
        response = await categoriesApi.create(payload)
      }

      if (!response.success) {
        throw new Error(response.message || 'Failed to save category')
      }

      await fetchCategories()
      setIsFormOpen(false)
      resetForm()
    } catch (err) {
      console.error('Save category error:', err)
      alert(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFormCancel = () => {
    setIsFormOpen(false)
    resetForm()
  }

  const handleAddSubcategory = () => {
    const sub = newSubcategoryInput.trim()
    if (sub && !formData.subcategories.includes(sub)) {
      setFormData(prev => ({
        ...prev,
        subcategories: [...prev.subcategories, sub],
      }))
      setNewSubcategoryInput('')
    }
  }

  const removeSubcategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index),
    }))
  }

  const handleUpdateSubcategories = async (category: GroceryCategory, subcategories: string[]) => {
    try {
      setSubmitting(true)
      const response = await categoriesApi.update(category.id, { subcategories })
      if (!response.success) {
        throw new Error(response.message || 'Failed to update subcategories')
      }
      await fetchCategories()
    } catch (err) {
      console.error('Update subcategories error:', err)
      alert(err instanceof Error ? err.message : 'Failed to update subcategories')
    } finally {
      setSubmitting(false)
      setEditingCategory(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar
        currentPage="categories"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <div className="lg:ml-64">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories Management</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your product categories, images, and subcategories
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <CategoriesTable
            categories={categories}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            onAdd={handleAddCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onUpdateSubcategories={handleUpdateSubcategories}
          />

          {loading && (
            <div className="mt-6 text-center text-gray-500 dark:text-gray-400">
              Loading categories...
            </div>
          )}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  placeholder="Optional description for this category"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category Images
                </label>
                <ImageUpload
                  images={formData.images}
                  onImagesChange={(images) => setFormData(prev => ({ ...prev, images }))}
                  folder="categories"
                  maxImages={5}
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subcategories
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubcategoryInput}
                    onChange={(e) => setNewSubcategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSubcategory()
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                    placeholder="Add subcategory and press Enter"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                    disabled={newSubcategoryInput.trim().length === 0 || submitting}
                  >
                    Add
                  </button>
                </div>

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

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleFormCancel}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
