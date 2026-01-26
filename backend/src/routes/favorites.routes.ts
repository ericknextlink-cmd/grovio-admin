import { Router } from 'express'
import { FavoritesController } from '../controllers/favorites.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { body } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()
const favoritesController = new FavoritesController()

// All favorites routes require user authentication
router.use(authenticateToken)

// Get user's favorites
router.get('/', favoritesController.getFavorites)

// Add or remove item from favorites
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
    handleValidationErrors
  ],
  favoritesController.updateFavorites
)

export { router as favoritesRoutes }

