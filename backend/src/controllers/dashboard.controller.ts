import { Request, Response } from 'express'
import { DashboardService } from '../services/dashboard.service'
import { ApiResponse } from '../types/api.types'

export class DashboardController {
  private dashboardService: DashboardService

  constructor() {
    this.dashboardService = new DashboardService()
  }

  /**
   * Get comprehensive admin dashboard statistics
   */
  getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.dashboardService.getDashboardStats()

      res.json({
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: stats
      } as ApiResponse<typeof stats>)
    } catch (error) {
      console.error('Get dashboard stats error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Get recent activities for admin dashboard
   */
  getRecentActivities = async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit = '10' } = req.query
      
      const activities = await this.dashboardService.getRecentActivities(parseInt(limit as string))

      res.json({
        success: true,
        message: 'Recent activities retrieved successfully',
        data: activities
      } as ApiResponse<typeof activities>)
    } catch (error) {
      console.error('Get recent activities error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Get sales analytics for admin dashboard
   */
  getSalesAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { period = '30' } = req.query // days
      
      const analytics = await this.dashboardService.getSalesAnalytics(parseInt(period as string))

      res.json({
        success: true,
        message: 'Sales analytics retrieved successfully',
        data: analytics
      } as ApiResponse<typeof analytics>)
    } catch (error) {
      console.error('Get sales analytics error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Get low stock alerts
   */
  getLowStockAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { threshold = '10' } = req.query
      
      const alerts = await this.dashboardService.getLowStockAlerts(parseInt(threshold as string))

      res.json({
        success: true,
        message: 'Low stock alerts retrieved successfully',
        data: alerts
      } as ApiResponse<typeof alerts>)
    } catch (error) {
      console.error('Get low stock alerts error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }
}
