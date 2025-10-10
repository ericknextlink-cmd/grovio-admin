import { Router } from 'express'
import { ProductsController } from '../controllers/products.controller'
import { authenticateAdmin } from '../middleware/adminAuth.middleware'
import { body, param, query } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()
const productsController = new ProductsController()

// Validation rules
const createProductValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Brand must not exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('category_name')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Subcategory must not exceed 100 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('currency')
    .optional()
    .isIn(['GH₵', 'USD', 'EUR', 'GBP'])
    .withMessage('Currency must be one of: GH₵, USD, EUR, GBP'),
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  body('volume')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Volume must be a positive number'),
  body('type')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Type must not exceed 100 characters'),
  body('packaging')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Packaging must not exceed 100 characters'),
  body('in_stock')
    .optional()
    .isBoolean()
    .withMessage('In stock must be a boolean'),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  body('reviews_count')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Reviews count must be a non-negative integer'),
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

const updateProductValidation = [
  param('id')
    .isUUID()
    .withMessage('Product ID must be a valid UUID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Brand must not exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('category_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty'),
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Subcategory must not exceed 100 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('currency')
    .optional()
    .isIn(['GH₵', 'USD', 'EUR', 'GBP'])
    .withMessage('Currency must be one of: GH₵, USD, EUR, GBP'),
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  body('volume')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Volume must be a positive number'),
  body('type')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Type must not exceed 100 characters'),
  body('packaging')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Packaging must not exceed 100 characters'),
  body('in_stock')
    .optional()
    .isBoolean()
    .withMessage('In stock must be a boolean'),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  body('reviews_count')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Reviews count must be a non-negative integer'),
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

const updateStockValidation = [
  param('id')
    .isUUID()
    .withMessage('Product ID must be a valid UUID'),
  body('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('inStock')
    .isBoolean()
    .withMessage('In stock must be a boolean'),
  handleValidationErrors
]

const getProductsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['created_at', 'name', 'price', 'quantity'])
    .withMessage('Sort by must be one of: created_at, name, price, quantity'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('inStock')
    .optional()
    .isBoolean()
    .withMessage('In stock filter must be a boolean'),
  handleValidationErrors
]

const productIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Product ID must be a valid UUID'),
  handleValidationErrors
]

// Public routes
router.get('/', getProductsValidation, productsController.getAllProducts)
router.get('/:id', productIdValidation, productsController.getProductById)

// Admin routes (require authentication)
router.use(authenticateAdmin)

router.post('/', createProductValidation, productsController.createProduct)
router.put('/:id', updateProductValidation, productsController.updateProduct)
router.delete('/:id', productIdValidation, productsController.deleteProduct)
router.patch('/:id/stock', updateStockValidation, productsController.updateStock)
router.get('/admin/stats', productsController.getProductStats)

export { router as productsRoutes }
