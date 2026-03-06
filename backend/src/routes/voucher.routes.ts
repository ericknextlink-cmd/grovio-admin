import { Router } from 'express'
import { body } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'
import { authenticateToken } from '../middleware/auth.middleware'
import * as voucherController from '../controllers/voucher.controller'

const router = Router()

const validateBody = [
  body('code').optional().trim().isLength({ max: 50 }),
  body('subtotal').optional().isFloat({ min: 0 }),
  handleValidationErrors,
]

router.use(authenticateToken)

router.post('/validate', validateBody, voucherController.validateVoucher)
router.get('/', voucherController.listMyVouchers)

export { router as voucherRoutes }
