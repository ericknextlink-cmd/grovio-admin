import { Request, Response } from 'express'
import { AIProductsService } from '../services/ai-products.service'
import { ApiResponse } from '../types/api.types'

export class AIProductsController {
  private aiProductsService: AIProductsService

  constructor() {
    this.aiProductsService = new AIProductsService()
  }

  /**
   * Generate AI products
   */
  generateProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { count = 10 } = req.body

      const result = await this.aiProductsService.generateProducts(parseInt(count))

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to generate products',
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: `Successfully generated ${result.products?.length || 0} products`,
        data: result.products,
      } as ApiResponse<typeof result.products>)
    } catch (error) {
      console.error('Generate AI products error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      } as ApiResponse<null>)
    }
  }

  /**
   * Get all AI products
   */
  getAllProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = '1',
        limit = '20',
        status,
        category,
        search,
      } = req.query

      const filters = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as 'draft' | 'published' | 'archived' | undefined,
        category: category as string | undefined,
        search: search as string | undefined,
      }

      const result = await this.aiProductsService.getAllProducts(filters)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to fetch products',
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Products retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Get AI products error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      } as ApiResponse<null>)
    }
  }

  /**
   * Get AI product by ID
   */
  getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const productId = Array.isArray(id) ? id[0] : id

      const result = await this.aiProductsService.getProductById(productId)

      if (!result.success || !result.data) {
        res.status(404).json({
          success: false,
          message: result.error || 'Product not found',
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Product retrieved successfully',
        data: result.data,
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Get AI product by ID error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      } as ApiResponse<null>)
    }
  }

  /**
   * Update AI product
   */
  updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const productId = Array.isArray(id) ? id[0] : id
      const updates = req.body

      const result = await this.aiProductsService.updateProduct(productId, updates)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to update product',
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: result.data,
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Update AI product error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      } as ApiResponse<null>)
    }
  }

  /**
   * Delete AI product
   */
  deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const productId = Array.isArray(id) ? id[0] : id

      const result = await this.aiProductsService.deleteProduct(productId)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to delete product',
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Product deleted successfully',
      } as ApiResponse<null>)
    } catch (error) {
      console.error('Delete AI product error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      } as ApiResponse<null>)
    }
  }

  /**
   * Publish AI product
   */
  publishProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const productId = Array.isArray(id) ? id[0] : id

      const result = await this.aiProductsService.publishProduct(productId)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to publish product',
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Product published successfully',
        data: result.data,
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Publish AI product error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      } as ApiResponse<null>)
    }
  }

  /**
   * Unpublish AI product
   */
  unpublishProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const productId = Array.isArray(id) ? id[0] : id

      const result = await this.aiProductsService.unpublishProduct(productId)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to unpublish product',
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Product unpublished successfully',
        data: result.data,
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Unpublish AI product error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      } as ApiResponse<null>)
    }
  }

  /**
   * Archive AI product
   */
  archiveProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const productId = Array.isArray(id) ? id[0] : id

      const result = await this.aiProductsService.archiveProduct(productId)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to archive product',
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Product archived successfully',
        data: result.data,
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Archive AI product error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      } as ApiResponse<null>)
    }
  }
}

