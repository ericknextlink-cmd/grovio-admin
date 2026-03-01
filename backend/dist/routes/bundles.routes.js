"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bundlesRoutes = void 0;
const express_1 = require("express");
const bundles_controller_1 = require("../controllers/bundles.controller");
const adminAuth_middleware_1 = require("../middleware/adminAuth.middleware");
const optionalAuth_middleware_1 = require("../middleware/optionalAuth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
exports.bundlesRoutes = router;
const bundlesController = new bundles_controller_1.BundlesController();
// Validation rules
const getBundlesValidation = [
    (0, express_validator_1.query)('category')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Category must be between 1 and 100 characters'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('source')
        .optional()
        .isIn(['ai', 'admin'])
        .withMessage('Source must be ai or admin'),
    validation_middleware_1.handleValidationErrors,
];
const createManualBundleValidation = [
    (0, express_validator_1.body)('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ max: 200 })
        .withMessage('Title must be at most 200 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Description must be at most 2000 characters'),
    (0, express_validator_1.body)('category')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Category must be at most 100 characters'),
    (0, express_validator_1.body)('productIds')
        .isArray()
        .withMessage('productIds must be an array'),
    (0, express_validator_1.body)('productIds.*')
        .isUUID()
        .withMessage('Each product ID must be a valid UUID'),
    validation_middleware_1.handleValidationErrors,
];
const bundleIdValidation = [
    (0, express_validator_1.param)('bundleId')
        .trim()
        .notEmpty()
        .withMessage('Bundle ID is required'),
    validation_middleware_1.handleValidationErrors,
];
const generateBundlesValidation = [
    (0, express_validator_1.body)('count')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Count must be between 1 and 50'),
    (0, express_validator_1.body)('prompt')
        .optional()
        .isString()
        .isLength({ max: 2000 })
        .withMessage('Prompt must be at most 2000 characters'),
    (0, express_validator_1.body)('budgetMin')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Budget min must be a non-negative number'),
    (0, express_validator_1.body)('budgetMax')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Budget max must be a non-negative number'),
    (0, express_validator_1.body)('productsPerBundle')
        .optional()
        .isInt({ min: 2, max: 20 })
        .withMessage('Products per bundle must be between 2 and 20'),
    validation_middleware_1.handleValidationErrors,
];
// Public routes (optional auth for personalization)
/**
 * @route   GET /api/bundles
 * @desc    Get all product bundles (optionally filtered by category)
 * @access  Public (personalized if authenticated)
 */
router.get('/', optionalAuth_middleware_1.optionalAuth, getBundlesValidation, bundlesController.getBundles);
/**
 * @route   GET /api/bundles/personalized
 * @desc    Get personalized bundles based on user preferences
 * @access  Public (better with auth)
 */
router.get('/personalized', optionalAuth_middleware_1.optionalAuth, bundlesController.getPersonalizedBundles);
/**
 * @route   GET /api/bundles/:bundleId
 * @desc    Get bundle by ID
 * @access  Public
 */
router.get('/:bundleId', bundleIdValidation, bundlesController.getBundleById);
// Admin routes
router.use(adminAuth_middleware_1.authenticateAdmin);
/**
 * @route   POST /api/bundles
 * @desc    Create manual bundle (Admin only). Body: title, description?, category?, productIds.
 * @access  Admin
 */
router.post('/', createManualBundleValidation, bundlesController.createManualBundle);
/**
 * @route   POST /api/bundles/generate
 * @desc    Generate new AI bundles (Admin only)
 * @access  Admin
 */
router.post('/generate', generateBundlesValidation, bundlesController.generateBundles);
/**
 * @route   POST /api/bundles/refresh
 * @desc    Refresh all bundles with latest products (Admin only)
 * @access  Admin
 */
router.post('/refresh', bundlesController.refreshBundles);
