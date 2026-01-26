import { Router } from 'express'
import { CartController } from '../controllers/cart.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { body } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()
const cartController = new CartController()

// All cart routes require user authentication
router.use(authenticateToken)

// Get user's cart
router.get('/', cartController.getCart)

// Add or remove item from cart
router.post('/',
  [
    body('product_id')
      .notEmpty()
      .withMessage('Product ID is required')
      .isUUID()
      .withMessage('Product ID must be a valid UUID'),
    body('action')
      .notEmpty()
      .withMessage('Action is required')
      .isIn(['add', 'remove'])
      .withMessage('Action must be either "add" or "remove"'),
    body('quantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    handleValidationErrors
  ],
  cartController.updateCart
)

// Clear cart
router.delete('/', cartController.clearCart)

export { router as cartRoutes }

