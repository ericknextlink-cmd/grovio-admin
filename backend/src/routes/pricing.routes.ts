import { Router } from 'express'
import { body } from 'express-validator'
import { PricingController } from '../controllers/pricing.controller'
import { authenticateAdmin } from '../middleware/adminAuth.middleware'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()
const pricingController = new PricingController()

const applyPricingValidation = [
  body('ranges')
    .isArray()
    .withMessage('ranges must be an array'),
  body('ranges.*.min_value')
    .isFloat({ min: 0 })
    .withMessage('min_value must be a non-negative number'),
  body('ranges.*.max_value')
    .isFloat({ min: 0 })
    .withMessage('max_value must be a non-negative number'),
  body('ranges.*.percentage')
    .isFloat({ min: 0 })
    .withMessage('percentage must be a non-negative number'),
  handleValidationErrors
]

router.use(authenticateAdmin)
router.get('/ranges', pricingController.getRanges)
router.post('/apply', applyPricingValidation, pricingController.applyPricing)

export { router as pricingRoutes }
