import { Router } from 'express'
import { UserPreferencesController } from '../controllers/user-preferences.controller'
import { authenticateToken } from '../middleware/auth.middleware'
import { body } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()
const preferencesController = new UserPreferencesController()

// Validation rules
const savePreferencesValidation = [
  body('familySize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Family size must be between 1 and 20'),
  body('role')
    .optional()
    .trim()
    .isIn(['parent', 'student', 'professional', 'senior', 'other'])
    .withMessage('Role must be one of: parent, student, professional, senior, other'),
  body('dietaryRestrictions')
    .optional()
    .isArray()
    .withMessage('Dietary restrictions must be an array'),
  body('cuisinePreferences')
    .optional()
    .isArray()
    .withMessage('Cuisine preferences must be an array'),
  body('budgetRange')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Budget range must not exceed 100 characters'),
  body('shoppingFrequency')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Shopping frequency must not exceed 50 characters'),
  body('cookingFrequency')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Cooking frequency must not exceed 50 characters'),
  body('cookingSkill')
    .optional()
    .trim()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Cooking skill must be one of: beginner, intermediate, advanced, expert'),
  body('mealPlanning')
    .optional()
    .isBoolean()
    .withMessage('Meal planning must be a boolean'),
  body('favoriteIngredients')
    .optional()
    .isArray()
    .withMessage('Favorite ingredients must be an array'),
  body('allergies')
    .optional()
    .isArray()
    .withMessage('Allergies must be an array'),
  handleValidationErrors,
]

// All routes require authentication
router.use(authenticateToken)

/**
 * @route   POST /api/users/preferences
 * @desc    Save or update user preferences from onboarding
 * @access  Private
 */
router.post('/preferences', savePreferencesValidation, preferencesController.savePreferences)

/**
 * @route   GET /api/users/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/preferences', preferencesController.getPreferences)

/**
 * @route   PUT /api/users/preferences
 * @desc    Update specific preference fields
 * @access  Private
 */
router.put('/preferences', savePreferencesValidation, preferencesController.updatePreferences)

/**
 * @route   GET /api/users/onboarding-status
 * @desc    Check if user has completed onboarding
 * @access  Private
 */
router.get('/onboarding-status', preferencesController.checkOnboardingStatus)

export { router as userPreferencesRoutes }

