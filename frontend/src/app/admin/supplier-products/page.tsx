'use client'

import React, { useState, useMemo } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { FileText, Loader2, Package, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Percent, DollarSign, ChevronsDown, ChevronsUp, Sparkles, X, CopyMinus } from 'lucide-react'
import * as XLSX from 'xlsx'
import { aiApi, productsApi } from '@/lib/api'
import { inferCategoryFromProductName } from '@/lib/category-inference'
import { toast } from 'sonner'

interface SupplierProduct {
  code: string
  name: string
  unitPrice: number
  rowNumber?: number
  markupPrice?: number
  markupPercentage?: number
}

const AVAILABLE_FILES = [
  {
    name: 'Excel File',
    path: '/tinywow_GROVIOpdf_87292333.xlsx',
    type: 'excel' as const
  },
  {
    name: 'CSV File',
    path: '/tinywow_GROVIOpdf_87292333_87302970-Table003 (Page 1).csv',
    type: 'csv' as const
  }
]

const CATEGORIES = [
  'oil',
  'rice',
  'sardine',
  'mackerel',
  'milk',
  'spaghetti',
  'biscuits',
  'pepper',
  'mayo',
  'cube',
  'sugar',
  'corn flakes'
] as const

type SortField = 'name' | 'price' | 'none'
type SortDirection = 'asc' | 'desc'

export default function SupplierProductsPage() {
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [products, setProducts] = useState<SupplierProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('none')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [individualMarkupInputs, setIndividualMarkupInputs] = useState<Record<string, string>>({})
  const [bulkMarkupPercentage, setBulkMarkupPercentage] = useState<string>('')
  const [priceRangeMin, setPriceRangeMin] = useState<string>('')
  const [priceRangeMax, setPriceRangeMax] = useState<string>('')
  const [usePriceRange, setUsePriceRange] = useState<boolean>(false)
  const [priceRangeMarkupPercentage, setPriceRangeMarkupPercentage] = useState<string>('')
  const [showAIRecommendationModal, setShowAIRecommendationModal] = useState<boolean>(false)
  const [aiPrompt, setAiPrompt] = useState<string>('')
  const [aiLoading, setAiLoading] = useState<boolean>(false)
  const [aiResponse, setAiResponse] = useState<string>('')
  const [addToDbLoading, setAddToDbLoading] = useState<boolean>(false)
  const [hideDuplicates, setHideDuplicates] = useState<boolean>(false)

  const parseCSV = async (filePath: string): Promise<SupplierProduct[]> => {
    try {
      const response = await fetch(filePath)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`)
      }
      
      const text = await response.text()
      const lines = text.split('\n').filter(line => line.trim())
      const products: SupplierProduct[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line.trim()) continue
        
        const columns = line.split(';')
        
        if (columns.length >= 4) {
          const code = (columns[1] || '').trim()
          const name = (columns[2] || '').trim()
          const priceStr = (columns[3] || '0').trim().replace(/,/g, '')
          const price = parseFloat(priceStr)
          
          if (name && name !== 'Product name' && !isNaN(price) && price > 0) {
            products.push({
              code,
              name,
              unitPrice: price,
              rowNumber: i + 1
            })
          }
        }
      }
      
      return products
    } catch (err) {
      throw new Error(`Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const parseExcel = async (filePath: string): Promise<SupplierProduct[]> => {
    try {
      const response = await fetch(filePath)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      if (workbook.SheetNames.length === 0) {
        throw new Error('Excel file has no sheets')
      }
      
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][]
      
      const products: SupplierProduct[] = []
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        
        if (row && Array.isArray(row) && row.length >= 4) {
          const code = String(row[1] || '').trim()
          const name = String(row[2] || '').trim()
          const priceStr = String(row[3] || '0').trim().replace(/,/g, '')
          const price = parseFloat(priceStr)
          
          if (name && name !== 'Product name' && !isNaN(price) && price > 0) {
            products.push({
              code,
              name,
              unitPrice: price,
              rowNumber: i + 1
            })
          }
        }
      }
      
      return products
    } catch (err) {
      throw new Error(`Failed to parse Excel: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleFileSelect = async (filePath: string) => {
    if (!filePath) {
      setProducts([])
      setError(null)
      setSearchQuery('')
      setSelectedCategory('')
      setSortField('none')
      setExpandedRows(new Set())
      setIndividualMarkupInputs({})
      setBulkMarkupPercentage('')
      setPriceRangeMin('')
      setPriceRangeMax('')
      setUsePriceRange(false)
      setPriceRangeMarkupPercentage('')
      return
    }

    setLoading(true)
    setError(null)
    setSelectedFile(filePath)

    try {
      const fileInfo = AVAILABLE_FILES.find(f => f.path === filePath)
      
      if (!fileInfo) {
        throw new Error('File not found')
      }

      let parsedProducts: SupplierProduct[]
      
      if (fileInfo.type === 'csv') {
        parsedProducts = await parseCSV(filePath)
      } else {
        parsedProducts = await parseExcel(filePath)
      }

      setProducts(parsedProducts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const createCategoryRegex = (category: string): RegExp => {
    const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const normalizedCategory = escapedCategory.replace(/\s+/g, '[\\s\\-]*')
    return new RegExp(normalizedCategory, 'i')
  }

  const calculateMarkup = (price: number, percentage: number): number => {
    return price * (1 + percentage / 100)
  }

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products]

    if (searchQuery.trim()) {
      const searchRegex = new RegExp(searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filtered = filtered.filter(product => 
        searchRegex.test(product.name) || 
        searchRegex.test(product.code || '')
      )
    }

    if (selectedCategory) {
      const categoryRegex = createCategoryRegex(selectedCategory)
      filtered = filtered.filter(product => 
        categoryRegex.test(product.name)
      )
    }

    if (usePriceRange) {
      const minPrice = priceRangeMin ? parseFloat(priceRangeMin) : 0
      const maxPrice = priceRangeMax ? parseFloat(priceRangeMax) : Infinity
      filtered = filtered.filter(product => 
        product.unitPrice >= minPrice && product.unitPrice <= maxPrice
      )
    }

    if (sortField !== 'none') {
      filtered.sort((a, b) => {
        if (sortField === 'name') {
          const comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          return sortDirection === 'asc' ? comparison : -comparison
        } else if (sortField === 'price') {
          const comparison = a.unitPrice - b.unitPrice
          return sortDirection === 'asc' ? comparison : -comparison
        }
        return 0
      })
    }

    return filtered
  }, [products, searchQuery, selectedCategory, sortField, sortDirection, usePriceRange, priceRangeMin, priceRangeMax])

  const productsWithMarkup = useMemo(() => {
    return filteredAndSortedProducts.map(product => {
      const productKey = `${product.code}-${product.rowNumber}`
      let markupPercentage: number | undefined
      let markupPrice: number | undefined

      if (bulkMarkupPercentage) {
        const bulkPercentage = parseFloat(bulkMarkupPercentage)
        if (!isNaN(bulkPercentage) && bulkPercentage >= 0) {
          markupPercentage = bulkPercentage
          markupPrice = calculateMarkup(product.unitPrice, bulkPercentage)
        }
      } else if (usePriceRange && priceRangeMarkupPercentage) {
        const rangePercentage = parseFloat(priceRangeMarkupPercentage)
        const minPrice = priceRangeMin ? parseFloat(priceRangeMin) : 0
        const maxPrice = priceRangeMax ? parseFloat(priceRangeMax) : Infinity
        
        if (!isNaN(rangePercentage) && rangePercentage >= 0 && 
            product.unitPrice >= minPrice && product.unitPrice <= maxPrice) {
          markupPercentage = rangePercentage
          markupPrice = calculateMarkup(product.unitPrice, rangePercentage)
        }
      } else if (individualMarkupInputs[productKey]) {
        const individualPercentage = parseFloat(individualMarkupInputs[productKey])
        if (!isNaN(individualPercentage) && individualPercentage >= 0) {
          markupPercentage = individualPercentage
          markupPrice = calculateMarkup(product.unitPrice, individualPercentage)
        }
      } else if (product.markupPercentage !== undefined) {
        markupPercentage = product.markupPercentage
        markupPrice = product.markupPrice
      }

      return {
        ...product,
        markupPercentage,
        markupPrice
      }
    })
  }, [filteredAndSortedProducts, bulkMarkupPercentage, individualMarkupInputs, usePriceRange, priceRangeMarkupPercentage, priceRangeMin, priceRangeMax])

  /** Duplicate = same name + same unitPrice. Keeps first occurrence. */
  const displayProducts = useMemo(() => {
    if (!hideDuplicates) return productsWithMarkup
    const seen = new Set<string>()
    return productsWithMarkup.filter((p) => {
      const key = `${(p.name || '').trim()}|${Number(p.unitPrice)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [productsWithMarkup, hideDuplicates])

  const duplicateCount = productsWithMarkup.length - displayProducts.length

  const toggleRowExpansion = (productKey: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(productKey)) {
      newExpanded.delete(productKey)
    } else {
      newExpanded.add(productKey)
    }
    setExpandedRows(newExpanded)
  }

  const expandAll = () => {
    const allKeys = new Set(displayProducts.map(product => `${product.code}-${product.rowNumber}`))
    setExpandedRows(allKeys)
  }

  const collapseAll = () => {
    setExpandedRows(new Set())
  }

  const handleIndividualMarkupInput = (productKey: string, value: string) => {
    setIndividualMarkupInputs(prev => {
      const newInputs = { ...prev }
      if (value === '') {
        delete newInputs[productKey]
      } else {
        newInputs[productKey] = value
      }
      return newInputs
    })
  }

  const applyIndividualMarkup = (productKey: string) => {
    const inputValue = individualMarkupInputs[productKey]
    if (!inputValue) return

    const percentageNum = parseFloat(inputValue)
    if (isNaN(percentageNum) || percentageNum < 0) {
      return
    }

    const product = products.find(p => `${p.code}-${p.rowNumber}` === productKey)
    if (!product) return

    const updatedProducts = products.map(p => {
      if (p.code === product.code && p.rowNumber === product.rowNumber) {
        return {
          ...p,
          markupPercentage: percentageNum,
          markupPrice: calculateMarkup(p.unitPrice, percentageNum)
        }
      }
      return p
    })
    setProducts(updatedProducts)
  }

  const handleBulkMarkup = () => {
    const percentage = parseFloat(bulkMarkupPercentage)
    if (isNaN(percentage) || percentage < 0) {
      return
    }

    const updatedProducts = products.map(product => ({
      ...product,
      markupPercentage: percentage,
      markupPrice: calculateMarkup(product.unitPrice, percentage)
    }))
    setProducts(updatedProducts)
    setBulkMarkupPercentage('')
  }

  const handlePriceRangeMarkup = () => {
    const percentageNum = parseFloat(priceRangeMarkupPercentage)
    if (isNaN(percentageNum) || percentageNum < 0) {
      return
    }

    const minPrice = priceRangeMin ? parseFloat(priceRangeMin) : 0
    const maxPrice = priceRangeMax ? parseFloat(priceRangeMax) : Infinity

    const updatedProducts = products.map(product => {
      if (product.unitPrice >= minPrice && product.unitPrice <= maxPrice) {
        return {
          ...product,
          markupPercentage: percentageNum,
          markupPrice: calculateMarkup(product.unitPrice, percentageNum)
        }
      }
      return product
    })
    setProducts(updatedProducts)
    setPriceRangeMarkupPercentage('')
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />
  }

  const BULK_CHUNK_SIZE = 100

  const handleAddAllToDatabase = async () => {
    if (products.length === 0) {
      toast.error('Load products from a file first')
      return
    }
    setAddToDbLoading(true)
    try {
      const payload = products.map((p) => ({
        name: p.name,
        code: p.code,
        unitPrice: p.unitPrice,
        category_name: selectedCategory || inferCategoryFromProductName(p.name) || CATEGORIES[0]
      }))
      let totalCreated = 0
      let totalSkipped = 0
      let totalFailed = 0
      const allErrors: string[] = []
      for (let i = 0; i < payload.length; i += BULK_CHUNK_SIZE) {
        const chunk = payload.slice(i, i + BULK_CHUNK_SIZE)
        const res = await productsApi.bulkCreate(chunk)
        if (res.success && res.data) {
          const data = res.data as { created: number; skipped?: number; updated?: number; failed: number; errors?: string[] }
          totalCreated += data.created ?? 0
          totalSkipped += data.skipped ?? data.updated ?? 0
          totalFailed += data.failed ?? 0
          if (Array.isArray(data.errors)) allErrors.push(...data.errors)
        } else {
          totalFailed += chunk.length
          if (res.message) allErrors.push(res.message)
        }
      }
      const parts = [
        totalCreated ? `${totalCreated} added` : '',
        totalSkipped ? `${totalSkipped} skipped (already in DB)` : '',
        totalFailed ? `${totalFailed} failed` : ''
      ].filter(Boolean)
      toast.success(parts.length ? parts.join(', ') + '.' : 'No new products.')

      const isDuplicateOrUniqueError = (msg: string) => {
        const lower = msg.toLowerCase()
        return lower.includes('duplicate') || lower.includes('unique constraint') || lower.includes('already exists') || /violates unique constraint/i.test(msg)
      }
      const otherErrors = allErrors.filter((e) => !isDuplicateOrUniqueError(e))
      if (otherErrors.length > 0) {
        otherErrors.slice(0, 3).forEach((err: string) => toast.error(err))
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      const isDup = /duplicate|unique constraint|unique index|already exists|violates unique/i.test(errMsg)
      if (isDup) {
        toast.info('Products are already in the database; no duplicate entries added.')
      } else {
        toast.error('Failed to add products to database')
      }
    } finally {
      setAddToDbLoading(false)
    }
  }

  const handleAIRecommendation = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    if (products.length === 0) {
      toast.error('Please load products first')
      return
    }

    setAiLoading(true)
    setAiResponse('')

    try {
      const supplierProducts = products.map(p => ({
        code: p.code,
        name: p.name,
        unitPrice: p.unitPrice
      }))

      const result = await aiApi.getSupplierRecommendations(aiPrompt, supplierProducts)

      if (result.success && result.data?.response) {
        setAiResponse(result.data.response)
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar 
        currentPage="supplier-products" 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      
      <main className="lg:pl-64">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-8 w-8" />
                Supplier Products
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Load and compare products from Excel or CSV files
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button
                  onClick={handleAddAllToDatabase}
                  disabled={products.length === 0 || addToDbLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addToDbLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                  Add all to database
                </button>
                <button
                  onClick={() => setShowAIRecommendationModal(true)}
                  disabled={products.length === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-4 w-4" />
                  AI Recommendation
                </button>
                <div className="flex items-center gap-4 flex-1">
                  <label htmlFor="file-select" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Select File:
                  </label>
                  <select
                    id="file-select"
                    value={selectedFile}
                    onChange={(e) => handleFileSelect(e.target.value)}
                    className="flex-1 max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Select a file --</option>
                    {AVAILABLE_FILES.map((file) => (
                      <option key={file.path} value={file.path}>
                        {file.name} ({file.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
              )}

              {loading && (
                <div className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading products...</span>
                </div>
              )}

              {products.length > 0 && !loading && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    Loaded {products.length} products successfully
                  </p>
                </div>
              )}
            </div>

            {products.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Products
                      {hideDuplicates ? (
                        <span className="text-base font-normal text-gray-600 dark:text-gray-400">
                          — {displayProducts.length} unique, {duplicateCount} duplicates hidden ({productsWithMarkup.length} total)
                        </span>
                      ) : (
                        <span className="text-base font-normal text-gray-600 dark:text-gray-400">
                          ({productsWithMarkup.length} of {products.length} from file)
                        </span>
                      )}
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setHideDuplicates((prev) => !prev)}
                        className={`px-3 py-2 text-sm border rounded-lg transition-colors flex items-center gap-2 ${
                          hideDuplicates
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                        title="Duplicate = same name + same price"
                      >
                        <CopyMinus className="h-4 w-4" />
                        {hideDuplicates ? 'Show all (include duplicates)' : 'Hide duplicates (name + price)'}
                      </button>
                      <button
                        onClick={expandAll}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                      >
                        <ChevronsDown className="h-4 w-4" />
                        Expand All
                      </button>
                      <button
                        onClick={collapseAll}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                      >
                        <ChevronsUp className="h-4 w-4" />
                        Collapse All
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search products by name or code..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="relative">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none min-w-[180px]"
                        >
                          <option value="">All Categories</option>
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSort('name')}
                          className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
                            sortField === 'name'
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          <span>Name</span>
                          {getSortIcon('name')}
                        </button>
                        <button
                          onClick={() => handleSort('price')}
                          className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
                            sortField === 'price'
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          <span>Price</span>
                          {getSortIcon('price')}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          Bulk Markup:
                        </label>
                        <div className="relative flex-1 max-w-[200px]">
                          <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Percentage"
                            value={bulkMarkupPercentage}
                            onChange={(e) => setBulkMarkupPercentage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleBulkMarkup()
                              }
                            }}
                            className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={handleBulkMarkup}
                          disabled={!bulkMarkupPercentage || isNaN(parseFloat(bulkMarkupPercentage)) || parseFloat(bulkMarkupPercentage) < 0}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <DollarSign className="h-4 w-4" />
                          Apply Markup
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          Price Range:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Min"
                            value={priceRangeMin}
                            onChange={(e) => setPriceRangeMin(e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            step="0.01"
                          />
                          <span className="text-gray-500 dark:text-gray-400">-</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={priceRangeMax}
                            onChange={(e) => setPriceRangeMax(e.target.value)}
                            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (usePriceRange) {
                              setUsePriceRange(false)
                              setPriceRangeMin('')
                              setPriceRangeMax('')
                              setPriceRangeMarkupPercentage('')
                            } else {
                              setUsePriceRange(true)
                            }
                          }}
                          className={`px-4 py-2 border rounded-lg transition-colors ${
                            usePriceRange
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {usePriceRange ? 'Clear' : 'Filter'}
                        </button>
                        {usePriceRange && (
                          <>
                            <div className="relative">
                              <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="%"
                                value={priceRangeMarkupPercentage}
                                onChange={(e) => setPriceRangeMarkupPercentage(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handlePriceRangeMarkup()
                                  }
                                }}
                                className="w-20 pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <button
                              onClick={handlePriceRangeMarkup}
                              disabled={!priceRangeMarkupPercentage || isNaN(parseFloat(priceRangeMarkupPercentage)) || parseFloat(priceRangeMarkupPercentage) < 0}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <DollarSign className="h-4 w-4" />
                              Markup Range
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Row
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Product Name
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Unit Price (₵)
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Markup Price (₵)
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {displayProducts.length > 0 ? (
                        displayProducts.map((product, index) => {
                          const productKey = `${product.code}-${product.rowNumber}`
                          const isExpanded = expandedRows.has(productKey)
                          const currentMarkupInput = individualMarkupInputs[productKey] ?? (product.markupPercentage?.toString() ?? '')
                          
                          return (
                            <React.Fragment key={productKey}>
                              <tr 
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                onClick={() => toggleRowExpansion(productKey)}
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                  {product.rowNumber || index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                  {product.code || '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                  {product.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                                  ₵{product.unitPrice.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600 dark:text-green-400">
                                  {product.markupPrice ? (
                                    <>
                                      ₵{product.markupPrice.toFixed(2)}
                                      {product.markupPercentage && (
                                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                          (+{product.markupPercentage.toFixed(1)}%)
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-500">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center">
                                    {isExpanded ? (
                                      <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-gray-50 dark:bg-gray-700/30">
                                  <td colSpan={6} className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                        Markup Percentage:
                                      </label>
                                      <div className="relative flex-1 max-w-[200px]">
                                        <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="Enter percentage"
                                          value={currentMarkupInput}
                                          onChange={(e) => {
                                            e.stopPropagation()
                                            handleIndividualMarkupInput(productKey, e.target.value)
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.stopPropagation()
                                              applyIndividualMarkup(productKey)
                                            }
                                          }}
                                          className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          applyIndividualMarkup(productKey)
                                        }}
                                        disabled={!currentMarkupInput || isNaN(parseFloat(currentMarkupInput)) || parseFloat(currentMarkupInput) < 0}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <DollarSign className="h-4 w-4" />
                                        Apply Markup
                                      </button>
                                      {product.markupPrice && (
                                        <div className="ml-auto text-sm">
                                          <span className="text-gray-600 dark:text-gray-400">Original: </span>
                                          <span className="font-medium text-gray-900 dark:text-white">₵{product.unitPrice.toFixed(2)}</span>
                                          <span className="mx-2 text-gray-400">→</span>
                                          <span className="text-gray-600 dark:text-gray-400">Markup: </span>
                                          <span className="font-medium text-green-600 dark:text-green-400">₵{product.markupPrice.toFixed(2)}</span>
                                          <span className="ml-2 text-gray-500 dark:text-gray-400">
                                            (+₵{(product.markupPrice - product.unitPrice).toFixed(2)})
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">
                              {hideDuplicates && productsWithMarkup.length > 0
                                ? "All rows are duplicates (name + price). Click 'Show all' to see them."
                                : searchQuery || selectedCategory
                                  ? 'No products match your search or filter criteria'
                                  : 'No products found'}
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {products.length === 0 && !loading && selectedFile && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No products found in the selected file</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* AI Recommendation Modal */}
      {showAIRecommendationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  AI Product Recommendations
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowAIRecommendationModal(false)
                  setAiPrompt('')
                  setAiResponse('')
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter your requirements or question:
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Recommend the best products for a family of 4 with a budget of ₵500, or What are the best value products in the rice category?"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              <button
                onClick={handleAIRecommendation}
                disabled={!aiPrompt.trim() || aiLoading || products.length === 0}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Getting Recommendations...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Get AI Recommendations
                  </>
                )}
              </button>

              {aiResponse && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    AI Recommendations:
                  </h3>
                  <div className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                    {aiResponse.split('\n').map((line, index) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <p key={index} className="font-semibold text-base mb-2 mt-3 first:mt-0">
                            {line.replace(/\*\*/g, '')}
                          </p>
                        )
                      }
                      if (line.startsWith('- ') || line.startsWith('• ')) {
                        return (
                          <p key={index} className="ml-4 mb-1">
                            {line}
                          </p>
                        )
                      }
                      if (line.trim() === '') {
                        return <br key={index} />
                      }
                      return (
                        <p key={index} className="mb-2">
                          {line}
                        </p>
                      )
                    })}
                  </div>
                </div>
              )}

              {products.length === 0 && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    Please load products from a file first to get AI recommendations.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
