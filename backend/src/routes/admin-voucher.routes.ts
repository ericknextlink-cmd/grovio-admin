import { Router } from 'express'
import { body, param } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'
import { authenticateAdmin } from '../middleware/adminAuth.middleware'
import * as adminVoucherController from '../controllers/admin-voucher.controller'

const router = Router()

router.use(authenticateAdmin)

const createVoucherValidation = [
  body('code').trim().notEmpty().isLength({ max: 50 }),
  body('discount_type').isIn(['percentage', 'fixed']),
  body('discount_value').isFloat({ min: 0.01 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('image_type').optional().isIn(['regular', 'nss']),
  body('min_order_amount').optional().isFloat({ min: 0 }),
  body('valid_until').optional().isISO8601(),
  body('max_uses').optional().isInt({ min: 1 }),
  handleValidationErrors,
]

const assignVoucherValidation = [
  body('userId').trim().notEmpty(),
  body('voucherId').trim().notEmpty().isUUID(),
  handleValidationErrors,
]

router.get('/', adminVoucherController.listVouchers)
router.post('/', createVoucherValidation, adminVoucherController.createVoucher)
router.post('/assign', assignVoucherValidation, adminVoucherController.assignVoucher)
router.get('/users', adminVoucherController.listUsersForAssign)
router.get('/:id/preview-image', [param('id').isUUID()], handleValidationErrors, adminVoucherController.previewVoucherImage)

export { router as adminVoucherRoutes }
