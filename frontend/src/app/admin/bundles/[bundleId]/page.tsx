'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminSidebar from '@/components/AdminSidebar'
import { bundlesApi, productsApi, categoriesApi } from '@/lib/api'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Loader2,
  Edit,
  Package,
  X,
  Search,
  Check,
} from 'lucide-react'

interface BundleProduct {
  id: string
  name: string
  price: number
  quantity: number
}

interface Bundle {
  id: string
  bundleId: string
  title: string
  description: string
  category: string
  targetAudience: string
  badge?: string
  productIds: string[]
  products: BundleProduct[]
  originalPrice: number
  currentPrice: number
  savings?: number
  discountPercentage?: number
  createdAt: string
  generatedBy?: 'ai' | 'admin'
}

export default function AdminBundleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bundleId = (params?.bundleId as string) || ''
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editProductIds, setEditProductIds] = useState<string[]>([])
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  const fetchBundle = useCallback(async () => {
    if (!bundleId) return
    setLoading(true)
    try {
      const res = await bundlesApi.getById(bundleId)
      if (res.success && res.data) {
        const b = res.data as Bundle
        setBundle(b)
        setEditTitle(b.title)
        setEditDescription(b.description || '')
        setEditCategory(b.category || '')
        setEditProductIds(b.productIds || [])
      } else {
        toast.error('Bundle not found')
        router.push('/admin/bundles')
      }
    } catch {
      toast.error('Failed to load bundle')
      router.push('/admin/bundles')
    } finally {
      setLoading(false)
    }
  }, [bundleId, router])

  useEffect(() => {
    fetchBundle()
  }, [fetchBundle])

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    try {
      const res = await productsApi.getAll({ page: 1, limit: 500 })
      const list = Array.isArray(res?.data) ? res.data : (res as { data?: { data?: unknown[] } })?.data?.data
      const arr = Array.isArray(list) ? list : []
      setProducts(arr.map((p: { id: string; name: string; price: number }) => ({ id: p.id, name: p.name, price: p.price })))
    } catch {
      toast.error('Failed to load products')
    } finally {
      setProductsLoading(false)
    }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const res = await categoriesApi.getAll()
      if (res.success && res.data && Array.isArray(res.data)) {
        setCategories((res.data as Array<{ id: string; name: string }>).map((c) => ({ id: c.id, name: c.name })))
      }
    } catch {
      toast.error('Failed to load categories')
    }
  }, [])

  useEffect(() => {
    if (editOpen && products.length === 0) loadProducts()
  }, [editOpen, products.length, loadProducts])
  useEffect(() => {
    if (editOpen && categories.length === 0) loadCategories()
  }, [editOpen, categories.length, loadCategories])

  const filteredProducts = productSearch.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.trim().toLowerCase()))
    : products

  const toggleProduct = (id: string) => {
    setEditProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSaveEdit = async () => {
    if (!bundleId || editProductIds.length < 2) {
      toast.error('Select at least 2 products')
      return
    }
    setSaving(true)
    try {
      const res = await bundlesApi.update(bundleId, {
        title: editTitle.trim() || undefined,
        description: editDescription.trim() || undefined,
        category: editCategory.trim() || undefined,
        productIds: editProductIds,
      })
      if (res.success && res.data) {
        setBundle(res.data as Bundle)
        setEditOpen(false)
        toast.success('Bundle updated')
      } else {
        toast.error((res as { message?: string }).message || 'Failed to update bundle')
      }
    } catch {
      toast.error('Failed to update bundle')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!bundle) return null

  const selectedProducts = editProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as Array<{ id: string; name: string; price: number }>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar currentPage="bundles" isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <main className="lg:pl-64 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/admin/bundles"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to bundles
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{bundle.title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {bundle.bundleId} · {bundle.generatedBy === 'admin' ? 'Manual' : 'AI'}
                </p>
                {bundle.category && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                    {bundle.category}
                  </span>
                )}
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <Edit className="h-4 w-4" /> Edit
              </button>
            </div>

            {bundle.description && (
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Description</h2>
                <p className="text-gray-700 dark:text-gray-300">{bundle.description}</p>
              </div>
            )}

            <div className="p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" /> Items
              </h2>
              <ul className="space-y-2">
                {(bundle.products || []).map((p) => (
                  <li key={p.id} className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>{p.name}</span>
                    <span>×{p.quantity || 1} = ₵{((p.price || 0) * (p.quantity || 1)).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between font-semibold text-gray-900 dark:text-white">
                <span>Total</span>
                <span>₵{bundle.currentPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit bundle</h3>
              <button onClick={() => setEditOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  list="edit-categories"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                />
                <datalist id="edit-categories">
                  {categories.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Products ({editProductIds.length})</label>
                  <button
                    type="button"
                    onClick={() => { loadProducts(); setProductModalOpen(true) }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Change products
                  </button>
                </div>
                {selectedProducts.length > 0 ? (
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {selectedProducts.map((p) => (
                      <li key={p.id}>{p.name} — ₵{p.price.toFixed(2)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Select at least 2 products</p>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || editProductIds.length < 2}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product picker modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              />
              <button onClick={() => setProductModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {productsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredProducts.map((p) => {
                    const selected = editProductIds.includes(p.id)
                    return (
                      <li
                        key={p.id}
                        onClick={() => toggleProduct(p.id)}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer ${selected ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                        <span className="text-sm text-gray-500">₵{p.price.toFixed(2)}</span>
                        {selected && <Check className="h-4 w-4 text-blue-600" />}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500">
              Selected: {editProductIds.length}. Need at least 2.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
