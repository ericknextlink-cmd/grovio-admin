import { Request, Response } from 'express'
import { PricingService } from '../services/pricing.service'
import { ApiResponse } from '../types/api.types'

export class PricingController {
  private pricingService = new PricingService()

  getRanges = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ranges, total_products } = await this.pricingService.getRanges()
      res.json({
        success: true,
        message: 'Price ranges retrieved',
        data: { ranges, total_products }
      } as ApiResponse<{ ranges: typeof ranges; total_products: number }>)
    } catch (error) {
      console.error('Get pricing ranges error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to load price ranges'
      } as ApiResponse<null>)
    }
  }

  applyPricing = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ranges } = req.body as { ranges: Array<{ min_value: number; max_value: number; percentage: number }> }
      if (!Array.isArray(ranges) || ranges.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Request body must include ranges array with min_value, max_value, percentage'
        } as ApiResponse<null>)
        return
      }
      const result = await this.pricingService.applyPricing(ranges)
      res.json({
        success: true,
        message: `Pricing applied. ${result.updated} product(s) updated.`,
        data: result
      } as ApiResponse<typeof result>)
    } catch (error) {
      console.error('Apply pricing error:', error)
      res.status(500).json({
        success: false,
        message: 'Failed to apply pricing'
      } as ApiResponse<null>)
    }
  }
}
