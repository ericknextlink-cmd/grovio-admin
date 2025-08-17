'use client'

import React, { useState } from 'react'
import { Search, Edit, Trash2, Plus, Tag, X } from 'lucide-react'
import { GroceryCategory } from '@/types/grocery'
import { cn } from '@/lib/utils'

interface CategoriesTableProps {
  categories: GroceryCategory[]
  onEdit: (category: GroceryCategory) => void
  onDelete: (category: GroceryCategory) => void
  onAdd: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export default function CategoriesTable({
  categories,
  onEdit,
  onDelete,
  onAdd,
  searchQuery,
  onSearchChange,
}: CategoriesTableProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editingSubcategories, setEditingSubcategories] = useState<string | null>(null)
  const [newSubcategory, setNewSubcategory] = useState('')

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.subcategories.some(sub => sub.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleDelete = (category: GroceryCategory) => {
    setShowDeleteConfirm(category.id)
  }

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      const category = categories.find(c => c.id === showDeleteConfirm)
      if (category) {
        onDelete(category)
      }
      setShowDeleteConfirm(null)
    }
  }

  const handleAddSubcategory = (categoryId: string) => {
    if (newSubcategory.trim()) {
      const category = categories.find(c => c.id === categoryId)
      if (category) {
        const updatedCategory = {
          ...category,
          subcategories: [...category.subcategories, newSubcategory.trim()]
        }
        onEdit(updatedCategory)
        setNewSubcategory('')
        setEditingSubcategories(null)
      }
    }
  }

  const handleRemoveSubcategory = (categoryId: string, subcategory: string) => {
    const category = categories.find(c => c.id === categoryId)
    if (category) {
      const updatedCategory = {
        ...category,
        subcategories: category.subcategories.filter(sub => sub !== subcategory)
      }
      onEdit(updatedCategory)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {/* <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Categories Management
          </h2> */}
        </div>
        
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search categories or subcategories..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Categories Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
          >
            {/* Category Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Tag className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {category.subcategories.length} subcategor{category.subcategories.length !== 1 ? 'ies' : 'y'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(category)}
                  className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Subcategories List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subcategories
                </h4>
                <button
                  onClick={() => setEditingSubcategories(editingSubcategories === category.id ? null : category.id)}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {editingSubcategories === category.id ? 'Cancel' : 'Add'}
                </button>
              </div>
              
              {/* Add Subcategory Form */}
              {editingSubcategories === category.id && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    placeholder="New subcategory"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubcategory(category.id)}
                  />
                  <button
                    onClick={() => handleAddSubcategory(category.id)}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Subcategories */}
              <div className="space-y-1">
                {category.subcategories.map((subcategory, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {subcategory}
                    </span>
                    <button
                      onClick={() => handleRemoveSubcategory(category.id, subcategory)}
                      className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {category.subcategories.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                    No subcategories
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <Tag className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No categories found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery 
              ? 'Try adjusting your search criteria'
              : 'Get started by adding your first category'
            }
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this category? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
