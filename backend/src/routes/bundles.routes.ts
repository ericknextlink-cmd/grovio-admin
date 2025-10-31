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

