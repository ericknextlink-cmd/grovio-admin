import { Request, Response } from 'express'
import { ProductsService } from '../services/products.service'
import { ApiResponse } from '../types/api.types'

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

      res.json({
        success: true,
        message: 'Products retrieved successfully',
        data: result.data,
        pagination: result.pagination
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Get all products error:', error)
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

      const product = await this.productsService.getProductById(id)

      if (!product) {
        res.status(404).json({
          success: false,
          message: 'Product not found'
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Product retrieved successfully',
        data: product
      } as ApiResponse<typeof product>)
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
      const updates = req.body

      const result = await this.productsService.updateProduct(id, updates)

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

      const result = await this.productsService.deleteProduct(id)

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
      const { quantity, inStock } = req.body

      const result = await this.productsService.updateStock(id, quantity, inStock)

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
