import { Router } from 'express'
import { ProfileController, upload } from '../controllers/profile.controller'
import { authenticateToken, requireUser } from '../middleware/auth.middleware'
import { body } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'
import { asyncHandler } from '../middleware/error.middleware'

const router = Router()
const profileController = new ProfileController()

/**
 * @route   GET /api/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/', [
  authenticateToken,
  requireUser
], asyncHandler(profileController.getProfile))

/**
 * @route   PUT /api/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/', [
  authenticateToken,
  requireUser,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phoneNumber')
    .optional()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Phone number must be in international format (e.g., +233241234567)'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  body('preferences.familySize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Family size must be between 1 and 20'),
  body('preferences.language')
    .optional()
    .isIn(['en', 'tw', 'fr'])
    .withMessage('Language must be one of: en, tw, fr'),
  body('preferences.currency')
    .optional()
    .isIn(['GH₵', 'USD'])
    .withMessage('Currency must be one of: GH₵, USD'),
  handleValidationErrors
], asyncHandler(profileController.updateProfile))

/**
 * @route   POST /api/profile/picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/picture', [
  authenticateToken,
  requireUser,
  upload.single('profilePicture')
], asyncHandler(profileController.uploadProfilePicture))

/**
 * @route   DELETE /api/profile/picture
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete('/picture', [
  authenticateToken,
  requireUser
], asyncHandler(profileController.deleteProfilePicture))

export { router as profileRoutes }
