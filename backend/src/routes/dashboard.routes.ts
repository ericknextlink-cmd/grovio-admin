import { Router } from 'express'
import { DashboardController } from '../controllers/dashboard.controller'
import { authenticateAdmin } from '../middleware/adminAuth.middleware'
import { query } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()
const dashboardController = new DashboardController()

// Validation rules
const getRecentActivitiesValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  handleValidationErrors
]

const getSalesAnalyticsValidation = [
  query('period')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Period must be between 1 and 365 days'),
  handleValidationErrors
]

const getLowStockAlertsValidation = [
  query('threshold')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Threshold must be between 0 and 100'),
  handleValidationErrors
]

// All dashboard routes require admin authentication
router.use(authenticateAdmin)

router.get('/stats', dashboardController.getDashboardStats)
router.get('/activities', getRecentActivitiesValidation, dashboardController.getRecentActivities)
router.get('/analytics', getSalesAnalyticsValidation, dashboardController.getSalesAnalytics)
router.get('/alerts', getLowStockAlertsValidation, dashboardController.getLowStockAlerts)

export { router as dashboardRoutes }
