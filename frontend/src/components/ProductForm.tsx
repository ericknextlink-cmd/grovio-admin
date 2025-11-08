/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { X, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GroceryProduct, GroceryCategory } from '@/types/grocery'
import ImageUpload from './ImageUpload'

interface ProductFormProps {
  product?: GroceryProduct
  categories: GroceryCategory[]
  onSubmit: (product: Omit<GroceryProduct, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  isOpen: boolean
}

const initialFormData = {
  name: '',
  brand: '',
  description: '',
  category: '',
  subcategory: '',
  price: 0,
  currency: 'GHS',
  quantity: 0,
  weight: undefined as number | undefined,
  volume: undefined as number | undefined,
  type: '',
  packaging: '',
  inStock: true,
  rating: 0,
  reviews: 0,
  images: [] as string[],
}

const FORM_DRAFT_STORAGE_KEY = 'admin_product_form_draft'

export default function ProductForm({
  product,
  categories,
  onSubmit,
  onCancel,
  isOpen
}: ProductFormProps) {
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasRestoredDraftRef = useRef(false)

  const clearFormDraft = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.removeItem(FORM_DRAFT_STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear product form draft', error)
    }
  }, [])

  const restoreDraftIfAvailable = useCallback(() => {
    if (typeof window === 'undefined') return
    if (hasRestoredDraftRef.current) return
    try {
      const cached = window.sessionStorage.getItem(FORM_DRAFT_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        setFormData(prev => ({
          ...prev,
          ...parsed,
        }))
        hasRestoredDraftRef.current = true
      }
    } catch (error) {
      console.warn('Failed to restore product form draft', error)
    }
  }, [])

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        brand: product.brand,
        description: product.description,
        category: product.category,
        subcategory: product.subcategory,
        price: product.price,
        currency: product.currency,
        quantity: product.quantity,
        weight: product.weight,
        volume: product.volume,
        type: product.type,
        packaging: product.packaging,
        inStock: product.inStock,
        rating: product.rating,
        reviews: product.reviews,
        images: product.images,
      })
    } else {
      setFormData(initialFormData)
    }
    setErrors({})
    hasRestoredDraftRef.current = false
  }, [product])

  useEffect(() => {
    if (!isOpen || product) return
    restoreDraftIfAvailable()
  }, [isOpen, product, restoreDraftIfAvailable])

  useEffect(() => {
    if (product || !isOpen) return
    if (typeof window === 'undefined') return

    try {
      window.sessionStorage.setItem(FORM_DRAFT_STORAGE_KEY, JSON.stringify(formData))
    } catch (error) {
      console.warn('Failed to cache product form draft', error)
    }
  }, [formData, product, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Product name is required'
    if (!formData.brand.trim()) newErrors.brand = 'Brand is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.category) newErrors.category = 'Category is required'
    if (!formData.subcategory) newErrors.subcategory = 'Subcategory is required'
    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0'
    if (formData.quantity < 0) newErrors.quantity = 'Quantity cannot be negative'
    if (formData.weight !== undefined && formData.weight <= 0) {
      newErrors.weight = 'Weight must be greater than 0'
    }
    if (formData.volume !== undefined && formData.volume <= 0) {
      newErrors.volume = 'Volume must be greater than 0'
    }
    if (formData.images.length === 0) newErrors.images = 'At least one image is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      handleCancel()
    } catch (error) {
      console.error('Error submitting product:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (!product) {
      clearFormDraft()
    }
    onCancel()
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const selectedCategory = categories.find(cat => cat.name === formData.category)
  const availableSubcategories = selectedCategory?.subcategories || []

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600",
                  "dark:bg-gray-800 dark:text-white"
                )}
                placeholder="Enter product name"
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Brand *
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  errors.brand ? "border-red-500" : "border-gray-300 dark:border-gray-600",
                  "dark:bg-gray-800 dark:text-white"
                )}
                placeholder="Enter brand name"
              />
              {errors.brand && <p className="text-sm text-red-500">{errors.brand}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={cn(
                "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                errors.description ? "border-red-500" : "border-gray-300 dark:border-gray-600",
                "dark:bg-gray-800 dark:text-white"
              )}
              placeholder="Enter product description"
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* Category and Subcategory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => {
                  handleInputChange('category', e.target.value)
                  handleInputChange('subcategory', '')
                }}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  errors.category ? "border-red-500" : "border-gray-300 dark:border-gray-600",
                  "dark:bg-gray-800 dark:text-white"
                )}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Subcategory *
              </label>
              <select
                value={formData.subcategory}
                onChange={(e) => handleInputChange('subcategory', e.target.value)}
                disabled={!formData.category}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  errors.subcategory ? "border-red-500" : "border-gray-300 dark:border-gray-600",
                  "dark:bg-gray-800 dark:text-white",
                  !formData.category && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="">Select subcategory</option>
                {availableSubcategories.map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
              {errors.subcategory && <p className="text-sm text-red-500">{errors.subcategory}</p>}
            </div>
          </div>

          {/* Price and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  errors.price ? "border-red-500" : "border-gray-300 dark:border-gray-600",
                  "dark:bg-gray-800 dark:text-white"
                )}
                placeholder="0.00"
              />
              {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              >
                <option value="GHS">GHS (₵)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantity *
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  errors.quantity ? "border-red-500" : "border-gray-300 dark:border-gray-600",
                  "dark:bg-gray-800 dark:text-white"
                )}
                placeholder="0"
              />
              {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
            </div>
          </div>

          {/* Weight and Volume */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.weight || ''}
                onChange={(e) => handleInputChange('weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  errors.weight ? "border-red-500" : "border-gray-300 dark:border-gray-600",
                  "dark:bg-gray-800 dark:text-white"
                )}
                placeholder="0.0"
              />
              {errors.weight && <p className="text-sm text-red-500">{errors.weight}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Volume (L)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.volume || ''}
                onChange={(e) => handleInputChange('volume', e.target.value ? parseFloat(e.target.value) : undefined)}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  errors.volume ? "border-red-500" : "border-gray-300 dark:border-gray-600",
                  "dark:bg-gray-800 dark:text-white"
                )}
                placeholder="0.0"
              />
              {errors.volume && <p className="text-sm text-red-500">{errors.volume}</p>}
            </div>
          </div>

          {/* Type and Packaging */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type
              </label>
              <input
                type="text"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                placeholder="e.g., Organic, Regular, Premium"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Packaging
              </label>
              <input
                type="text"
                value={formData.packaging}
                onChange={(e) => handleInputChange('packaging', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                placeholder="e.g., Bottle, Bag, Box"
              />
            </div>
          </div>

          {/* Stock and Rating */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.inStock}
                  onChange={(e) => handleInputChange('inStock', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  In Stock
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rating
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formData.rating}
                onChange={(e) => handleInputChange('rating', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                placeholder="0.0"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reviews Count
              </label>
              <input
                type="number"
                min="0"
                value={formData.reviews}
                onChange={(e) => handleInputChange('reviews', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                placeholder="0"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Product Images *
            </label>
            <ImageUpload
              images={formData.images}
              onImagesChange={(images) => handleInputChange('images', images)}
              maxImages={10}
            />
            {errors.images && <p className="text-sm text-red-500">{errors.images}</p>}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {product ? 'Update Product' : 'Add Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
