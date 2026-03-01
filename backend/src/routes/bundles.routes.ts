import { Router } from 'express'
import { BundlesController } from '../controllers/bundles.controller'
import { authenticateAdmin } from '../middleware/adminAuth.middleware'
import { optionalAuth } from '../middleware/optionalAuth.middleware'
import { body, query, param } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()
const bundlesController = new BundlesController()

// Validation rules
const getBundlesValidation = [
  query('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category must be between 1 and 100 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('source')
    .optional()
    .isIn(['ai', 'admin'])
    .withMessage('Source must be ai or admin'),
  handleValidationErrors,
]

const createManualBundleValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must be at most 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be at most 2000 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be at most 100 characters'),
  body('productIds')
    .isArray()
    .withMessage('productIds must be an array'),
  body('productIds.*')
    .isUUID()
    .withMessage('Each product ID must be a valid UUID'),
  handleValidationErrors,
]

const bundleIdValidation = [
  param('bundleId')
    .trim()
    .notEmpty()
    .withMessage('Bundle ID is required'),
  handleValidationErrors,
]

const generateBundlesValidation = [
  body('count')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Count must be between 1 and 50'),
  body('prompt')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Prompt must be at most 2000 characters'),
  body('budgetMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget min must be a non-negative number'),
  body('budgetMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget max must be a non-negative number'),
  body('productsPerBundle')
    .optional()
    .isInt({ min: 2, max: 20 })
    .withMessage('Products per bundle must be between 2 and 20'),
  handleValidationErrors,
]

// Public routes (optional auth for personalization)

/**
 * @route   GET /api/bundles
 * @desc    Get all product bundles (optionally filtered by category)
 * @access  Public (personalized if authenticated)
 */
router.get('/', optionalAuth, getBundlesValidation, bundlesController.getBundles)

/**
 * @route   GET /api/bundles/personalized
 * @desc    Get personalized bundles based on user preferences
 * @access  Public (better with auth)
 */
router.get('/personalized', optionalAuth, bundlesController.getPersonalizedBundles)

/**
 * @route   GET /api/bundles/:bundleId
 * @desc    Get bundle by ID
 * @access  Public
 */
router.get('/:bundleId', bundleIdValidation, bundlesController.getBundleById)

// Admin routes
router.use(authenticateAdmin)

/**
 * @route   POST /api/bundles
 * @desc    Create manual bundle (Admin only). Body: title, description?, category?, productIds.
 * @access  Admin
 */
router.post('/', createManualBundleValidation, bundlesController.createManualBundle)

/**
 * @route   POST /api/bundles/generate
 * @desc    Generate new AI bundles (Admin only)
 * @access  Admin
 */
router.post('/generate', generateBundlesValidation, bundlesController.generateBundles)

/**
 * @route   POST /api/bundles/refresh
 * @desc    Refresh all bundles with latest products (Admin only)
 * @access  Admin
 */
router.post('/refresh', bundlesController.refreshBundles)

export { router as bundlesRoutes }

