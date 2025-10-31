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
