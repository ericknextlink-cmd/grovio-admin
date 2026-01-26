import { Router } from 'express'
import { AccountController } from '../controllers/account.controller'
import { authenticateToken, requireUser } from '../middleware/auth.middleware'
import { body } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'
import { asyncHandler } from '../middleware/error.middleware'

const router = Router()
const accountController = new AccountController()

/**
 * @route   POST /api/account/check-email
 * @desc    Check email status (available, exists, deleted)
 * @access  Public
 */
router.post('/check-email', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
], asyncHandler(accountController.checkEmailStatus))

/**
 * @route   DELETE /api/account/delete
 * @desc    Soft delete user account
 * @access  Private
 */
router.delete('/delete', [
  authenticateToken,
  requireUser,
  body('reason')
    .optional()
    .isString()
    .withMessage('Deletion reason must be a string'),
  handleValidationErrors
], asyncHandler(accountController.deleteAccount))

/**
 * @route   POST /api/account/recovery/initiate
 * @desc    Initiate account recovery for deleted accounts
 * @access  Public
 */
router.post('/recovery/initiate', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
], asyncHandler(accountController.initiateRecovery))

/**
 * @route   POST /api/account/recovery/complete
 * @desc    Complete account recovery
 * @access  Public
 */
router.post('/recovery/complete', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('recoveryToken')
    .notEmpty()
    .withMessage('Recovery token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  handleValidationErrors
], asyncHandler(accountController.completeRecovery))

export { router as accountRoutes }
