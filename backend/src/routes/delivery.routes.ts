import { Router } from 'express'
import { DeliveryController } from '../controllers/delivery.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { authenticateAdmin } from '../middleware/adminAuth.middleware'
import { query } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()
const controller = new DeliveryController()

// Public (authenticated user) - calculate delivery fee for checkout
router.get(
  '/calculate',
  authenticateToken,
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid lat required'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid lng required'),
  ],
  handleValidationErrors,
  controller.calculate
)

// Admin - get/update delivery settings
router.get('/settings', authenticateAdmin, controller.getSettings)
router.put('/settings', authenticateAdmin, controller.updateSettings)

export const deliveryRoutes = router
