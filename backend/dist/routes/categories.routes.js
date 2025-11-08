"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesRoutes = void 0;
const express_1 = require("express");
const categories_controller_1 = require("../controllers/categories.controller");
const adminAuth_middleware_1 = require("../middleware/adminAuth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
exports.categoriesRoutes = router;
const categoriesController = new categories_controller_1.CategoriesController();
// Validation rules
const createCategoryValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Category name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('slug')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Slug must be between 2 and 100 characters')
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    (0, express_validator_1.body)('icon')
        .optional()
        .isURL()
        .withMessage('Icon must be a valid URL'),
    (0, express_validator_1.body)('subcategories')
        .optional()
        .isArray()
        .withMessage('Subcategories must be an array'),
    (0, express_validator_1.body)('subcategories.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Each subcategory must be between 1 and 100 characters'),
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
const updateCategoryValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('Category ID must be a valid UUID'),
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Category name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('slug')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Slug must be between 2 and 100 characters')
        .matches(/^[a-z0-9-]+$/)
        .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    (0, express_validator_1.body)('icon')
        .optional()
        .isURL()
        .withMessage('Icon must be a valid URL'),
    (0, express_validator_1.body)('subcategories')
        .optional()
        .isArray()
        .withMessage('Subcategories must be an array'),
    (0, express_validator_1.body)('subcategories.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Each subcategory must be between 1 and 100 characters'),
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
const subcategoryValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('Category ID must be a valid UUID'),
    (0, express_validator_1.body)('subcategory')
        .trim()
        .notEmpty()
        .withMessage('Subcategory name is required')
        .isLength({ min: 1, max: 100 })
        .withMessage('Subcategory name must be between 1 and 100 characters'),
    validation_middleware_1.handleValidationErrors
];
const getCategoriesValidation = [
    (0, express_validator_1.query)('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters'),
    validation_middleware_1.handleValidationErrors
];
const categoryIdValidation = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('Category ID must be a valid UUID'),
    validation_middleware_1.handleValidationErrors
];
// Public routes
router.get('/', getCategoriesValidation, categoriesController.getAllCategories);
router.get('/:id', categoryIdValidation, categoriesController.getCategoryById);
// Admin routes (require authentication)
router.use(adminAuth_middleware_1.authenticateAdmin);
router.post('/', createCategoryValidation, categoriesController.createCategory);
router.put('/:id', updateCategoryValidation, categoriesController.updateCategory);
router.delete('/:id', categoryIdValidation, categoriesController.deleteCategory);
router.post('/:id/subcategories', subcategoryValidation, categoriesController.addSubcategory);
router.delete('/:id/subcategories', subcategoryValidation, categoriesController.removeSubcategory);
router.get('/admin/stats', categoriesController.getCategoryStats);
