import { Router } from 'express'
import { AIController } from '../controllers/ai.controller'
import { body, query } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.middleware'
import { authRateLimiter } from '../middleware/authRateLimit.middleware'

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
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('Thread ID must be a valid UUID'),
  body('guestId')
    .optional()
    .isUUID()
    .withMessage('Guest ID must be a valid UUID'),
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
  body('threadId')
    .optional({ values: 'null' })
    .isUUID()
    .withMessage('Thread ID must be a valid UUID'),
  body('familySize').optional().isInt({ min: 1, max: 20 }).withMessage('Family size must be 1-20'),
  body('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
  body('mealType').optional().isIn(['breakfast', 'lunch', 'dinner', 'all']).withMessage('Meal type must be breakfast, lunch, dinner, or all'),
  body('budgetMode').optional().isIn(['combined', 'per_meal']).withMessage('Budget mode must be combined or per_meal'),
  handleValidationErrors
]

// Chat and supplier-recommendations allow guests (optional auth); others require sign-in
router.post('/chat', optionalAuthenticateToken, authRateLimiter, chatValidation, aiController.getChatResponse)
router.post('/recommendations', optionalAuthenticateToken, authRateLimiter, recommendationsValidation, aiController.getRecommendations)
router.get('/search', optionalAuthenticateToken, authRateLimiter, searchValidation, aiController.searchProducts)
router.post('/budget-analysis', optionalAuthenticateToken, authRateLimiter, budgetAnalysisValidation, aiController.getBudgetAnalysis)
router.post('/meal-suggestions', optionalAuthenticateToken, authRateLimiter, mealSuggestionsValidation, aiController.getMealSuggestions)
router.post('/supplier-recommendations', optionalAuthenticateToken, authRateLimiter, supplierProductRecommendationsValidation, aiController.getSupplierProductRecommendations)

// Thread management routes
router.get('/threads/:threadId', authenticateToken, authRateLimiter, aiController.getConversationHistory)
router.get('/threads', authenticateToken, authRateLimiter, aiController.getUserThreads)
router.delete('/threads/:threadId', authenticateToken, authRateLimiter, aiController.deleteThread)

export { router as aiRoutes }
