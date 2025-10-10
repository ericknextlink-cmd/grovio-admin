import { createClient } from '../config/supabase'

export class HealthService {

  /**
   * Get basic health status
   */
  async getHealthStatus() {
    const timestamp = new Date().toISOString()
    const uptime = process.uptime()

    return {
      status: 'healthy',
      message: 'Grovio Backend Server is running',
      timestamp,
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  }

  /**
   * Get detailed health status including database connectivity
   */
  async getDetailedHealthStatus() {
    const timestamp = new Date().toISOString()
    const uptime = process.uptime()
    
    let databaseStatus = {
      connected: false,
      responseTime: 0,
      error: null as string | null
    }

    // Test database connectivity
    try {
      const startTime = Date.now()
      const supabase = createClient()
      
      // Simple query to test connection
      const { error } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      const responseTime = Date.now() - startTime

      if (error) {
        databaseStatus = {
          connected: false,
          responseTime,
          error: error.message
        }
      } else {
        databaseStatus = {
          connected: true,
          responseTime,
          error: null
        }
      }
    } catch (error) {
      databaseStatus = {
        connected: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown database error'
      }
    }

    return {
      status: databaseStatus.connected ? 'healthy' : 'degraded',
      message: 'Grovio Backend Server Health Check',
      timestamp,
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: databaseStatus,
      services: {
        auth: 'operational',
        api: 'operational',
        supabase: databaseStatus.connected ? 'operational' : 'degraded'
      }
    }
  }
}
