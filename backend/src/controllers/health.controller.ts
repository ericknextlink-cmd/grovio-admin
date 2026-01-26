import { Request, Response } from 'express'
import { HealthService } from '../services/health.service'

export class HealthController {
  private healthService: HealthService

  constructor() {
    this.healthService = new HealthService()
  }

  /**
   * Health check endpoint
   */
  checkHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthData = await this.healthService.getHealthStatus()
      res.status(200).json(healthData)
    } catch (error) {
      console.error('Health check error:', error)
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Detailed health check with database connectivity
   */
  checkDetailedHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthData = await this.healthService.getDetailedHealthStatus()
      
      const statusCode = healthData.database.connected ? 200 : 503
      res.status(statusCode).json(healthData)
    } catch (error) {
      console.error('Detailed health check error:', error)
      res.status(500).json({
        status: 'error',
        message: 'Detailed health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}
