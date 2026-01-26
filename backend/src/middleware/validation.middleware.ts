import { Request, Response, NextFunction } from 'express'
import { body, validationResult } from 'express-validator'

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((error: any) => error.msg)
    })
  }

  next()
}

/**
 * Validation rules for user signup
 */
export const validateSignup = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('phoneNumber')
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Phone number must be in international format (e.g., +233241234567)'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  handleValidationErrors
]

/**
 * Validation rules for user signin
 */
export const validateSignin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
]

/**
 * Validation rules for Google auth
 */
export const validateGoogleAuth = [
  body('idToken')
    .notEmpty()
    .withMessage('Google ID token is required'),

  body('nonce')
    .optional()
    .isString()
    .withMessage('Nonce must be a string'),

  handleValidationErrors
]

/**
 * Validation rules for profile update
 */
export const validateProfileUpdate = [
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
    .isIn(['GHS', 'USD'])
    .withMessage('Currency must be one of: GHS, USD'),

  handleValidationErrors
]

/**
 * Validation rules for refresh token
 */
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),

  handleValidationErrors
]
