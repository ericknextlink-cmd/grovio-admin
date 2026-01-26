import { Router } from 'express'
import { OtpController } from '../controllers/otp.controller'
import { body } from 'express-validator'
import { handleValidationErrors } from '../middleware/validation.middleware'
import { asyncHandler } from '../middleware/error.middleware'

const router = Router()
const otpController = new OtpController()

/**
 * @route   POST /api/otp/send
 * @desc    Send email verification OTP
 * @access  Public
 */
router.post('/send', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('type')
    .optional()
    .isIn(['signup', 'recovery', 'email_change'])
    .withMessage('Type must be one of: signup, recovery, email_change'),
  handleValidationErrors
], asyncHandler(otpController.sendEmailOtp))

/**
 * @route   POST /api/otp/verify
 * @desc    Verify email OTP
 * @access  Public
 */
router.post('/verify', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('token')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP token must be 6 digits'),
  handleValidationErrors
], asyncHandler(otpController.verifyEmailOtp))

/**
 * @route   GET /api/otp/verify-hash
 * @desc    Verify email with token hash (PKCE flow)
 * @access  Public
 */
router.get('/verify-hash', asyncHandler(otpController.verifyTokenHash))

/**
 * @route   POST /api/otp/reset-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/reset-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors
], asyncHandler(otpController.sendPasswordResetOtp))

export { router as otpRoutes }
