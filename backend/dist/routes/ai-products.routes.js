"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProductsRoutes = void 0;
const express_1 = require("express");
const ai_products_controller_1 = require("../controllers/ai-products.controller");
const adminAuth_middleware_1 = require("../middleware/adminAuth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
exports.aiProductsRoutes = router;
const aiProductsController = new ai_products_controller_1.AIProductsController();
// Validation rules
const generateProductsValidation = [
    (0, express_validator_1.body)('count')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Count must be between 1 and 50'),
    validation_middleware_1.handleValidationErrors,
];
const getProductsValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['draft', 'published', 'archived'])
        .withMessage('Status must be one of: draft, published, archived'),
    (0, express_validator_1.query)('category')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Category must be between 1 and 100 characters'),
    (0, express_validator_1.query)('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Search query must be between 1 and 200 characters'),
    validation_middleware_1.handleValidationErrors,
];
const productIdValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('Product ID must be a valid UUID'),
    validation_middleware_1.handleValidationErrors,
];
const updateProductValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('Product ID must be a valid UUID'),
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Product name must be between 2 and 200 characters'),
    (0, express_validator_1.body)('brand')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Brand must not exceed 100 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1000 characters'),
    (0, express_validator_1.body)('category_name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Category must be between 1 and 100 characters'),
    (0, express_validator_1.body)('subcategory')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Subcategory must not exceed 100 characters'),
    (0, express_validator_1.body)('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('currency')
        .optional()
        .isIn(['GHS', 'USD', 'EUR', 'GBP'])
        .withMessage('Currency must be one of: GHS, USD, EUR, GBP'),
    (0, express_validator_1.body)('quantity')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),
    (0, express_validator_1.body)('weight')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Weight must be a positive number'),
    (0, express_validator_1.body)('volume')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Volume must be a positive number'),
    (0, express_validator_1.body)('type')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Type must not exceed 100 characters'),
    (0, express_validator_1.body)('packaging')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Packaging must not exceed 100 characters'),
    (0, express_validator_1.body)('in_stock')
        .optional()
        .isBoolean()
        .withMessage('In stock must be a boolean'),
    (0, express_validator_1.body)('rating')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('Rating must be between 0 and 5'),
    (0, express_validator_1.body)('reviews_count')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Reviews count must be a non-negative integer'),
    (0, express_validator_1.body)('images')
        .optional()
        .isArray()
        .withMessage('Images must be an array'),
    (0, express_validator_1.body)('images.*')
        .optional()
        .isURL()
        .withMessage('Each image must be a valid URL'),
    validation_middleware_1.handleValidationErrors,
];
// All routes require admin authentication
router.use(adminAuth_middleware_1.authenticateAdmin);
/**
 * @route   POST /api/ai-products/generate
 * @desc    Generate new AI products (Admin only)
 * @access  Admin
 */
router.post('/generate', generateProductsValidation, aiProductsController.generateProducts);
/**
 * @route   GET /api/ai-products
 * @desc    Get all AI products with filtering (Admin only)
 * @access  Admin
 */
router.get('/', getProductsValidation, aiProductsController.getAllProducts);
/**
 * @route   GET /api/ai-products/:id
 * @desc    Get AI product by ID (Admin only)
 * @access  Admin
 */
router.get('/:id', productIdValidation, aiProductsController.getProductById);
/**
 * @route   PUT /api/ai-products/:id
 * @desc    Update AI product (Admin only)
 * @access  Admin
 */
router.put('/:id', updateProductValidation, aiProductsController.updateProduct);
/**
 * @route   DELETE /api/ai-products/:id
 * @desc    Delete AI product (Admin only)
 * @access  Admin
 */
router.delete('/:id', productIdValidation, aiProductsController.deleteProduct);
/**
 * @route   POST /api/ai-products/:id/publish
 * @desc    Publish AI product (Admin only)
 * @access  Admin
 */
router.post('/:id/publish', productIdValidation, aiProductsController.publishProduct);
/**
 * @route   POST /api/ai-products/:id/unpublish
 * @desc    Unpublish AI product (Admin only)
 * @access  Admin
 */
router.post('/:id/unpublish', productIdValidation, aiProductsController.unpublishProduct);
/**
 * @route   POST /api/ai-products/:id/archive
 * @desc    Archive AI product (Admin only)
 * @access  Admin
 */
router.post('/:id/archive', productIdValidation, aiProductsController.archiveProduct);
