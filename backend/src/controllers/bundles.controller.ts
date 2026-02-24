import { Request, Response } from 'express'
import { AIBundlesService } from '../services/ai-bundles.service'
import { ApiResponse } from '../types/api.types'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

export class BundlesController {
  private bundlesService: AIBundlesService

  constructor() {
    this.bundlesService = new AIBundlesService()
  }

  /**
   * Get all product bundles (paginated, optional filter by category/source)
   */
  getBundles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, limit, offset, page, source } = req.query
      const pageNum = page ? parseInt(page as string, 10) : 1
      const limitNum = limit ? parseInt(limit as string, 10) : 20
      const offsetNum = offset != null ? parseInt(offset as string, 10) : undefined

      const result = await this.bundlesService.getBundles({
        category: category as string,
        source: source as 'ai' | 'admin' | undefined,
        page: pageNum,
        limit: limitNum,
        offset: offsetNum,
      })

      if (result.success) {
        const payload: Record<string, unknown> = {
          success: true,
          message: 'Bundles retrieved successfully',
          data: result.data,
        }
        if (result.pagination) {
          payload.pagination = result.pagination
        }
        res.json(payload)
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to get bundles',
          errors: [result.error || 'Fetch failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Get bundles controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to get bundles'],
      } as ApiResponse)
    }
  }

  /**
   * Get personalized bundles for authenticated user
   */
  getPersonalizedBundles = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id

      if (!userId) {
        // Return general bundles for anonymous users
        return this.getBundles(req, res)
      }

      const result = await this.bundlesService.getPersonalizedBundles(userId)

      if (result.success) {
        res.json({
          success: true,
          message: 'Personalized bundles retrieved successfully',
          data: result.data,
        })
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to get personalized bundles',
          errors: [result.error || 'Fetch failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Get personalized bundles controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to get personalized bundles'],
      } as ApiResponse)
    }
  }

  /**
   * Get bundle by ID
   */
  getBundleById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { bundleId } = req.params
      const id = Array.isArray(bundleId) ? bundleId[0] : bundleId

      const result = await this.bundlesService.getBundleById(id)

      if (result.success) {
        res.json({
          success: true,
          message: 'Bundle retrieved successfully',
          data: result.data,
        })
      } else {
        res.status(404).json({
          success: false,
          message: result.error || 'Bundle not found',
          errors: [result.error || 'Not found'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Get bundle by ID controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to get bundle'],
      } as ApiResponse)
    }
  }

  /**
   * Generate new bundles (Admin only). Optional: prompt, budgetMin, budgetMax for AI-driven bundle content and price range.
   */
  generateBundles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { count = 20, prompt, budgetMin, budgetMax } = req.body

      const result = await this.bundlesService.generateBundles({
        count: typeof count === 'number' ? count : parseInt(String(count), 10) || 20,
        prompt: typeof prompt === 'string' ? prompt.trim() || undefined : undefined,
        budgetMin: typeof budgetMin === 'number' ? budgetMin : budgetMin != null ? parseFloat(String(budgetMin)) : undefined,
        budgetMax: typeof budgetMax === 'number' ? budgetMax : budgetMax != null ? parseFloat(String(budgetMax)) : undefined,
      })

      if (result.success && result.bundles) {
        // Save bundles to database
        let savedCount = 0
        for (const bundle of result.bundles) {
          const saveResult = await this.bundlesService.saveBundle(bundle)
          if (saveResult.success) {
            savedCount++
          }
        }

        res.json({
          success: true,
          message: `Generated and saved ${savedCount} bundles successfully`,
          data: {
            generated: result.bundles.length,
            saved: savedCount,
            bundles: result.bundles,
          },
        })
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to generate bundles',
          errors: [result.error || 'Generation failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Generate bundles controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to generate bundles'],
      } as ApiResponse)
    }
  }

  /**
   * Create manual bundle (Admin only). Body: title, description, category, productIds.
   */
  createManualBundle = async (req: Request, res: Response): Promise<void> => {
    try {
      const { title, description, category, productIds } = req.body as {
        title?: string
        description?: string
        category?: string
        productIds?: string[]
      }
      if (!title?.trim() || !Array.isArray(productIds)) {
        res.status(400).json({
          success: false,
          message: 'Title and productIds (array) are required',
        } as ApiResponse<null>)
        return
      }
      const result = await this.bundlesService.createManualBundle({
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        category: typeof category === 'string' ? category.trim() : 'General',
        productIds,
      })
      if (result.success && result.data) {
        res.status(201).json({
          success: true,
          message: 'Bundle created successfully',
          data: result.data,
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to create bundle',
        } as ApiResponse<null>)
      }
    } catch (error) {
      console.error('Create manual bundle error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      } as ApiResponse<null>)
    }
  }

  /**
   * Refresh all bundles (Admin only)
   */
  refreshBundles = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.bundlesService.refreshBundles()

      if (result.success) {
        res.json({
          success: true,
          message: `Bundles refreshed successfully. ${result.count} new bundles created.`,
          data: {
            count: result.count,
          },
        })
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to refresh bundles',
          errors: [result.error || 'Refresh failed'],
        } as ApiResponse)
      }
    } catch (error) {
      console.error('Refresh bundles controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to refresh bundles'],
      } as ApiResponse)
    }
  }
}

