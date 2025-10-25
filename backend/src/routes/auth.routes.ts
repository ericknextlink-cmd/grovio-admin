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

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user with email and password
 * @access  Public
 */
router.post('/signup', validateSignup, asyncHandler(authController.signup))

/**
 * @route   POST /api/auth/signin
 * @desc    Sign in user with email and password
 * @access  Public
 */
router.post('/signin', validateSignin, asyncHandler(authController.signin))

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth flow (returns redirect URL)
 * @access  Public
 */
router.get('/google', asyncHandler(authController.initiateGoogleAuth))

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', asyncHandler(authController.googleCallback))

/**
 * @route   POST /api/auth/google
 * @desc    Authenticate user with Google OAuth (ID token method)
 * @access  Public
 */
router.post('/google', validateGoogleAuth, asyncHandler(authController.googleAuth))

/**
 * @route   POST /api/auth/signout
 * @desc    Sign out current user
 * @access  Private
 */
router.post('/signout', authenticateToken, asyncHandler(authController.signout))

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, requireUser, asyncHandler(authController.getProfile))

/**
 * @route   PUT /api/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticateToken, requireUser, validateProfileUpdate, asyncHandler(authController.updateProfile))

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validateRefreshToken, asyncHandler(authController.refreshToken))

export { router as authRoutes }
