import { Router } from 'express'
import { HealthController } from '../controllers/health.controller'
import { asyncHandler } from '../middleware/error.middleware'

const router = Router()
const healthController = new HealthController()

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', asyncHandler(healthController.checkHealth))

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with database connectivity
 * @access  Public
 */
router.get('/detailed', asyncHandler(healthController.checkDetailedHealth))

export { router as healthRoutes }
