import { Router } from 'express'
import { body } from 'express-validator'
import { submitContact } from '../controllers/contact.controller'
import { asyncHandler } from '../middleware/error.middleware'
import { handleValidationErrors } from '../middleware/validation.middleware'

const router = Router()

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 255 }),
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
    body('phone').optional().trim().isLength({ max: 50 }),
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 10000 }),
  ],
  handleValidationErrors,
  asyncHandler(submitContact)
)

export { router as contactRoutes }
