import { Router } from 'express'
import { CategoriesController } from '../controllers/categories.controller'
import { authenticateAdmin } from '../middleware/adminAuth.middleware'
import { body, param, query } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()
const categoriesController = new CategoriesController()

// Validation rules
const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('slug')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Slug must be between 2 and 100 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('icon')
    .optional()
    .isURL()
    .withMessage('Icon must be a valid URL'),
  body('subcategories')
    .optional()
    .isArray()
    .withMessage('Subcategories must be an array'),
  body('subcategories.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each subcategory must be between 1 and 100 characters'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),
  handleValidationErrors
]

const updateCategoryValidation = [
  param('id')
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('slug')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Slug must be between 2 and 100 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('icon')
    .optional()
    .isURL()
    .withMessage('Icon must be a valid URL'),
  body('subcategories')
    .optional()
    .isArray()
    .withMessage('Subcategories must be an array'),
  body('subcategories.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each subcategory must be between 1 and 100 characters'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),
  handleValidationErrors
]

const subcategoryValidation = [
  param('id')
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  body('subcategory')
    .trim()
    .notEmpty()
    .withMessage('Subcategory name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Subcategory name must be between 1 and 100 characters'),
  handleValidationErrors
]

const getCategoriesValidation = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  handleValidationErrors
]

const categoryIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  handleValidationErrors
]

// Public routes
router.get('/', getCategoriesValidation, categoriesController.getAllCategories)
router.get('/:id', categoryIdValidation, categoriesController.getCategoryById)

// Admin routes (require authentication)
router.use(authenticateAdmin)

router.post('/', createCategoryValidation, categoriesController.createCategory)
router.put('/:id', updateCategoryValidation, categoriesController.updateCategory)
router.delete('/:id', categoryIdValidation, categoriesController.deleteCategory)
router.post('/:id/subcategories', subcategoryValidation, categoriesController.addSubcategory)
router.delete('/:id/subcategories', subcategoryValidation, categoriesController.removeSubcategory)
router.get('/admin/stats', categoriesController.getCategoryStats)

export { router as categoriesRoutes }
