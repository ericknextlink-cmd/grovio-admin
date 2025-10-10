"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
exports.authRoutes = router;
const authController = new auth_controller_1.AuthController();
/**
 * @route   POST /api/auth/signup
 * @desc    Register new user with email and password
 * @access  Public
 */
router.post('/signup', validation_middleware_1.validateSignup, (0, error_middleware_1.asyncHandler)(authController.signup));
/**
 * @route   POST /api/auth/signin
 * @desc    Sign in user with email and password
 * @access  Public
 */
router.post('/signin', validation_middleware_1.validateSignin, (0, error_middleware_1.asyncHandler)(authController.signin));
/**
 * @route   POST /api/auth/google
 * @desc    Authenticate user with Google OAuth
 * @access  Public
 */
router.post('/google', validation_middleware_1.validateGoogleAuth, (0, error_middleware_1.asyncHandler)(authController.googleAuth));
/**
 * @route   POST /api/auth/signout
 * @desc    Sign out current user
 * @access  Private
 */
router.post('/signout', auth_middleware_1.authenticateToken, (0, error_middleware_1.asyncHandler)(authController.signout));
/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', auth_middleware_1.authenticateToken, auth_middleware_1.requireUser, (0, error_middleware_1.asyncHandler)(authController.getProfile));
/**
 * @route   PUT /api/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', auth_middleware_1.authenticateToken, auth_middleware_1.requireUser, validation_middleware_1.validateProfileUpdate, (0, error_middleware_1.asyncHandler)(authController.updateProfile));
/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validation_middleware_1.validateRefreshToken, (0, error_middleware_1.asyncHandler)(authController.refreshToken));
