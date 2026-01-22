'use client'

import React, { useState } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { FileText, Loader2, Package } from 'lucide-react'
import * as XLSX from 'xlsx'

interface SupplierProduct {
  code: string
  name: string
  unitPrice: number
  rowNumber?: number
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

export default function SupplierProductsPage() {
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [products, setProducts] = useState<SupplierProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
              <div className="flex items-center gap-4">
                <label htmlFor="file-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Products ({products.length})
                  </h2>
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
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {products.map((product, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
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
                        </tr>
                      ))}
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
    </div>
  )
}
