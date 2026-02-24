import { Request, Response } from 'express'
import { FavoritesService } from '../services/favorites.service'
import { ApiResponse } from '../types/api.types'
import { AuthRequest } from '../middleware/auth.middleware'

export class FavoritesController {
  private favoritesService: FavoritesService

  constructor() {
    this.favoritesService = new FavoritesService()
  }

  /**
   * Get user's favorites
   */
  getFavorites = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        } as ApiResponse<null>)
        return
      }

      const result = await this.favoritesService.getUserFavorites(userId)

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
      console.error('Get favorites error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Add or remove item from favorites
   */
  updateFavorites = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthRequest).user?.id
      const { product_id, action } = req.body

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
        result = await this.favoritesService.addToFavorites(userId, product_id)
      } else {
        result = await this.favoritesService.removeFromFavorites(userId, product_id)
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
      console.error('Update favorites error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }
}

