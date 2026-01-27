import { Router } from 'express'
import { AIController } from '../controllers/ai.controller'
import { body, query } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'
import { optionalAuth } from '../middleware/optionalAuth.middleware'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()
const aiController = new AIController()

// Validation rules
const chatValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('role')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Role must not exceed 50 characters'),
  body('familySize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Family size must be between 1 and 20'),
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  body('threadId')
    .optional()
    .isUUID()
    .withMessage('Thread ID must be a valid UUID'),
  handleValidationErrors
]

const recommendationsValidation = [
  body('budget')
    .isFloat({ min: 1 })
    .withMessage('Budget is required and must be at least 1'),
  body('familySize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Family size must be between 1 and 20'),
  body('role')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Role must not exceed 50 characters'),
  body('preferences')
    .optional()
    .isArray()
    .withMessage('Preferences must be an array'),
  body('preferences.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each preference must be between 1 and 100 characters'),
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),
  body('categories.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each category must be between 1 and 100 characters'),
  handleValidationErrors
]

const searchValidation = [
  query('query')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Query must be between 1 and 200 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  handleValidationErrors
]

const budgetAnalysisValidation = [
  body('budget')
    .isFloat({ min: 1 })
    .withMessage('Budget is required and must be at least 1'),
  body('familySize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Family size must be between 1 and 20'),
  body('duration')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('Duration must be one of: day, week, month'),
  handleValidationErrors
]

const mealSuggestionsValidation = [
  body('ingredients')
    .optional()
    .isArray()
    .withMessage('Ingredients must be an array'),
  body('ingredients.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each ingredient must be between 1 and 100 characters'),
  body('mealType')
    .optional()
    .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'any'])
    .withMessage('Meal type must be one of: breakfast, lunch, dinner, snack, any'),
  body('dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Dietary restrictions must be an array'),
  body('dietaryRestrictions.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each dietary restriction must be between 1 and 100 characters'),
  body('familySize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Family size must be between 1 and 20'),
  handleValidationErrors
]

const supplierProductRecommendationsValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('products')
    .isArray({ min: 1 })
    .withMessage('Products array is required and must not be empty'),
  body('products.*.name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required'),
  body('products.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Product unit price must be a positive number'),
  body('products.*.code')
    .optional()
    .trim(),
  handleValidationErrors
]

// Public AI routes (work for both authenticated and anonymous users)
// Optional auth = better personalization for logged-in users
router.post('/chat', optionalAuth, chatValidation, aiController.getChatResponse)
router.post('/recommendations', optionalAuth, recommendationsValidation, aiController.getRecommendations)
router.get('/search', optionalAuth, searchValidation, aiController.searchProducts)
router.post('/budget-analysis', optionalAuth, budgetAnalysisValidation, aiController.getBudgetAnalysis)
router.post('/meal-suggestions', optionalAuth, mealSuggestionsValidation, aiController.getMealSuggestions)
router.post('/supplier-recommendations', optionalAuth, supplierProductRecommendationsValidation, aiController.getSupplierProductRecommendations)

// Thread management routes (require full authentication)
router.get('/threads/:threadId', authenticateToken, aiController.getConversationHistory)
router.get('/threads', authenticateToken, aiController.getUserThreads)
router.delete('/threads/:threadId', authenticateToken, aiController.deleteThread)

export { router as aiRoutes }
