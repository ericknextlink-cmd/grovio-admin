import { Request, Response } from 'express'
import { ProductsService, Product } from '../services/products.service'
import { ApiResponse } from '../types/api.types'

/** Ensure value is JSON-serializable (BigInt -> number, etc.) to avoid 500 on res.json() */
function toJsonSafe<T>(value: T): T {
  if (typeof value === 'bigint') return Number(value) as T
  if (Array.isArray(value)) return value.map(toJsonSafe) as T
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = toJsonSafe(v)
    }
    return out as T
  }
  return value
}

export class ProductsController {
  private productsService: ProductsService

  constructor() {
    this.productsService = new ProductsService()
  }

  /**
   * Get all products with optional filtering
   */
  getAllProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '20',
        category,
        subcategory,
        search,
        inStock,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query

      const filters = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        category: category as string,
        subcategory: subcategory as string,
        search: search as string,
        inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      }

      const result = await this.productsService.getAllProducts(filters)
      const data = (result.data ?? []).map((p: Product) => {
        const { original_price: _, ...rest } = p
        return toJsonSafe(rest) as Omit<Product, 'original_price'>
      })
      const pagination = result.pagination
      const safePagination = pagination
        ? {
            page: Number(pagination.page),
            limit: Number(pagination.limit),
            total: Number(pagination.total),
            totalPages: Number(pagination.totalPages)
          }
        : undefined
      res.json({
        success: true,
        message: 'Products retrieved successfully',
        data,
        pagination: safePagination
      } as ApiResponse<typeof data>)
    } catch (error) {
      const err = error as Error & { message?: string }
      console.error('Get all products error:', err?.message ?? String(error), (error as Error)?.stack)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Get product by ID
   */
  getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const productId = Array.isArray(id) ? id[0] : id

      const product = await this.productsService.getProductById(productId)

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found'
        } as ApiResponse<null>)
        return
      }
      const { original_price: _, ...productWithoutOriginalPrice } = product
      res.json({
        success: true,
        message: 'Product retrieved successfully',
        data: productWithoutOriginalPrice
      } as ApiResponse<typeof productWithoutOriginalPrice>)
    } catch (error) {
      console.error('Get product by ID error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Create new product (Admin only)
   */
  createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const productData = req.body

      const result = await this.productsService.createProduct(productData)

      if (!result.success) {
        res.status(result.statusCode ?? 400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: result.data
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Create product error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Update product (Admin only)
   */
  updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const productId = Array.isArray(id) ? id[0] : id
      const updates = req.body

      const result = await this.productsService.updateProduct(productId, updates)

      if (!result.success) {
        res.status(result.statusCode ?? 400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: result.data
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Update product error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Delete product (Admin only)
   */
  deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const productId = Array.isArray(id) ? id[0] : id

      const result = await this.productsService.deleteProduct(productId)

      if (!result.success) {
        res.status(result.statusCode ?? 400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Product deleted successfully'
      } as ApiResponse<null>)
    } catch (error) {
      console.error('Delete product error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Update product stock (Admin only)
   */
  updateStock = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const productId = Array.isArray(id) ? id[0] : id
      const { quantity, inStock } = req.body

      const result = await this.productsService.updateStock(productId, quantity, inStock)

      if (!result.success) {
        res.status(result.statusCode ?? 400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Stock updated successfully',
        data: result.data
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Update stock error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Batch update stock/quantity for multiple products (Admin only). One request instead of N.
   */
  batchUpdateStock = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productIds, action, quantity } = req.body as {
        productIds: string[]
        action: 'in_stock' | 'out_of_stock' | 'set_quantity'
        quantity?: number
      }
      const result = await this.productsService.batchUpdateStock(productIds, action, quantity)
      if (!result.success) {
        res.status(result.statusCode ?? 400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }
      res.json({
        success: true,
        message: result.message,
        data: { updated: result.updated }
      } as ApiResponse<{ updated: number }>)
    } catch (error) {
      console.error('Batch update stock error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Bulk create products from supplier import (Admin only). Match by name + original_price; only insert if not exists.
   * Recommended: send up to 100 products per request; frontend chunks and calls multiple times.
   */
  createBulkProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { products: items } = req.body as { products: Array<{ name: string; code?: string; unitPrice: number; category_name?: string }> }
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Request body must include products array with name and unitPrice'
        } as ApiResponse<null>)
        return
      }
      const result = await this.productsService.createBulkProducts(items)
      const parts = [
        result.created ? `${result.created} created` : '',
        result.skipped ? `${result.skipped} skipped (already in DB)` : '',
        result.failed ? `${result.failed} failed` : ''
      ].filter(Boolean)
      res.status(201).json({
        success: true,
        message: parts.length ? parts.join(', ') + '.' : 'No changes.',
        data: result
      } as ApiResponse<typeof result>)
    } catch (error) {
      console.error('Bulk create products error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Get product statistics (Admin only)
   */
  getProductStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.productsService.getProductStats()

      res.json({
        success: true,
        message: 'Product statistics retrieved successfully',
        data: stats
      } as ApiResponse<typeof stats>)
    } catch (error) {
      console.error('Get product stats error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }
}
