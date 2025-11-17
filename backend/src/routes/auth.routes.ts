import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller'
import { authenticateToken, requireUser } from '../middleware/auth.middleware'
import { 
  validateSignup, 
  validateSignin, 
  validateGoogleAuth, 
  validateProfileUpdate,
  validateRefreshToken 
} from '../middleware/validation.middleware'
import { asyncHandler } from '../middleware/error.middleware'

const router = Router()
const authController = new AuthController()

router.post('/signup', validateSignup, asyncHandler(authController.signup))
router.post('/signin', validateSignin, asyncHandler(authController.signin))
router.get('/google', asyncHandler(authController.initiateGoogleAuth))
router.get('/google/callback', asyncHandler(authController.googleCallback))
router.post('/google/session', asyncHandler(authController.handleOAuthSession))
router.post('/google', validateGoogleAuth, asyncHandler(authController.googleAuth))
router.post('/signout', authenticateToken, asyncHandler(authController.signout))
router.get('/me', authenticateToken, requireUser, asyncHandler(authController.getProfile))
router.put('/me', authenticateToken, requireUser, validateProfileUpdate, asyncHandler(authController.updateProfile))
router.post('/refresh', validateRefreshToken, asyncHandler(authController.refreshToken))

export { router as authRoutes }
