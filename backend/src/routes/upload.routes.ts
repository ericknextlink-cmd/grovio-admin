import { Router } from 'express'
import { UploadController, upload } from '../controllers/upload.controller'
import { authenticateAdmin } from '../middleware/adminAuth.middleware'
import { body } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()
const uploadController = new UploadController()

// All upload routes require admin authentication
router.use(authenticateAdmin)

// Upload single image (multipart/form-data with file)
router.post('/single/file', 
  upload.single('image'),
  uploadController.uploadSingle
)

// Upload single image (JSON with base64)
router.post('/single/base64',
  [
    body('image').notEmpty().withMessage('Image is required'),
    body('folder').optional().isIn(['products', 'categories']).withMessage('Folder must be either "products" or "categories"'),
    handleValidationErrors
  ],
  uploadController.uploadSingle
)

// Upload multiple images (multipart/form-data with files)
router.post('/multiple/files',
  upload.array('images', 10), // Max 10 files
  uploadController.uploadMultiple
)

// Upload multiple images (JSON with base64 array)
router.post('/multiple/base64',
  [
    body('images').isArray().withMessage('Images must be an array'),
    body('images.*').notEmpty().withMessage('Each image must be provided'),
    body('folder').optional().isIn(['products', 'categories']).withMessage('Folder must be either "products" or "categories"'),
    handleValidationErrors
  ],
  uploadController.uploadMultiple
)

// Delete image
router.delete('/',
  [
    body('path').notEmpty().withMessage('Image path is required'),
    handleValidationErrors
  ],
  uploadController.deleteImage
)

export { router as uploadRoutes }

