import { Request, Response } from 'express'
import { CartService } from '../services/cart.service'
import { ApiResponse } from '../types/api.types'
import { AuthRequest } from '../middleware/auth.middleware'

export class CartController {
  private cartService: CartService

  constructor() {
    this.cartService = new CartService()
  }

  /**
   * Get user's cart
   */
  getCart = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        } as ApiResponse<null>)
        return
      }

      const result = await this.cartService.getUserCart(userId)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: result.message,
        data: result.data
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Get cart error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Add or remove item from cart
   */
  updateCart = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).user?.id
      const { product_id, action, quantity } = req.body

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        } as ApiResponse<null>)
        return
      }

      if (!product_id || !action) {
        res.status(400).json({
          success: false,
          message: 'Product ID and action are required'
        } as ApiResponse<null>)
        return
      }

      if (action !== 'add' && action !== 'remove') {
        res.status(400).json({
          success: false,
          message: 'Action must be either "add" or "remove"'
        } as ApiResponse<null>)
        return
      }

      let result

      if (action === 'add') {
        const qty = quantity || 1
        result = await this.cartService.addToCart(userId, product_id, qty)
      } else {
        result = await this.cartService.removeFromCart(userId, product_id)
      }

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: result.message,
        data: (result as ApiResponse<unknown>).data
      } as ApiResponse<unknown>)
    } catch (error) {
      console.error('Update cart error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Add multiple items to cart in one request (e.g. from AI assistant "Add all to cart").
   * Body: { items: [{ product_id: string, quantity: number }] }
   */
  addBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).user?.id
      const { items } = req.body as { items?: Array<{ product_id?: string; quantity?: number }> }

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse<null>)
        return
      }

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'items array is required and must be non-empty',
        } as ApiResponse<null>)
        return
      }

      const normalized = items
        .map((i) => ({
          product_id: String(i?.product_id ?? '').trim(),
          quantity: typeof i?.quantity === 'number' && i.quantity >= 1 ? Math.floor(i.quantity) : 1,
        }))
        .filter((i) => i.product_id.length > 0)

      if (normalized.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid items (product_id required)',
        } as ApiResponse<null>)
        return
      }

      const result = await this.cartService.addBatchToCart(userId, normalized)

      res.json({
        success: true,
        message: result.message,
        data: result.data,
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Add batch cart error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      } as ApiResponse<null>)
    }
  }

  /**
   * Clear user's cart
   */
  clearCart = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        } as ApiResponse<null>)
        return
      }

      const result = await this.cartService.clearCart(userId)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: result.message
      } as ApiResponse<null>)
    } catch (error) {
      console.error('Clear cart error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }
}

