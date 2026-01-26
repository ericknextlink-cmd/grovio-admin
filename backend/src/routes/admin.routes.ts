import { Router } from 'express'
import { AdminController } from '../controllers/admin.controller'
import { authenticateAdmin, requireSuperAdmin } from '../middleware/adminAuth.middleware'
import { body } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()
const adminController = new AdminController()

// Validation rules
const loginValidation = [
  body('usernameOrEmail')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Username or email must be between 3 and 255 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
]

const updateProfileValidation = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  handleValidationErrors
]

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors
]

// Public routes
router.post('/login', loginValidation, adminController.login)

// Refresh token route (requires authentication but needs special handling)
router.post('/refresh', authenticateAdmin, adminController.refreshToken)

// Protected routes (require admin authentication)
router.use(authenticateAdmin)

router.get('/profile', adminController.getProfile)
router.put('/profile', updateProfileValidation, adminController.updateProfile)
router.post('/change-password', changePasswordValidation, adminController.changePassword)
router.post('/logout', adminController.logout)

export { router as adminRoutes }
