"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRoutes = void 0;
const express_1 = require("express");
const products_controller_1 = require("../controllers/products.controller");
const adminAuth_middleware_1 = require("../middleware/adminAuth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
exports.productsRoutes = router;
const productsController = new products_controller_1.ProductsController();
// Validation rules
const createProductValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty()
        .withMessage('Product name is required')
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
        .trim()
        .notEmpty()
        .withMessage('Category is required'),
    (0, express_validator_1.body)('subcategory')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Subcategory must not exceed 100 characters'),
    (0, express_validator_1.body)('price')
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('currency')
        .optional()
        .isIn(['GHS', 'USD', 'EUR', 'GBP'])
        .withMessage('Currency must be one of: GHS, USD, EUR, GBP'),
    (0, express_validator_1.body)('quantity')
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
    validation_middleware_1.handleValidationErrors
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
        .notEmpty()
        .withMessage('Category cannot be empty'),
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
    validation_middleware_1.handleValidationErrors
];
const updateStockValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('Product ID must be a valid UUID'),
    (0, express_validator_1.body)('quantity')
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),
    (0, express_validator_1.body)('inStock')
        .isBoolean()
        .withMessage('In stock must be a boolean'),
    validation_middleware_1.handleValidationErrors
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
    (0, express_validator_1.query)('sortBy')
        .optional()
        .isIn(['created_at', 'name', 'price', 'quantity'])
        .withMessage('Sort by must be one of: created_at, name, price, quantity'),
    (0, express_validator_1.query)('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
    (0, express_validator_1.query)('inStock')
        .optional()
        .isBoolean()
        .withMessage('In stock filter must be a boolean'),
    validation_middleware_1.handleValidationErrors
];
const productIdValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('Product ID must be a valid UUID'),
    validation_middleware_1.handleValidationErrors
];
// Public routes
router.get('/', getProductsValidation, productsController.getAllProducts);
router.get('/:id', productIdValidation, productsController.getProductById);
// Admin routes (require authentication)
router.use(adminAuth_middleware_1.authenticateAdmin);
router.post('/', createProductValidation, productsController.createProduct);
router.put('/:id', updateProductValidation, productsController.updateProduct);
router.delete('/:id', productIdValidation, productsController.deleteProduct);
router.patch('/:id/stock', updateStockValidation, productsController.updateStock);
router.get('/admin/stats', productsController.getProductStats);
