"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpRoutes = void 0;
const express_1 = require("express");
const otp_controller_1 = require("../controllers/otp.controller");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
exports.otpRoutes = router;
const otpController = new otp_controller_1.OtpController();
/**
 * @route   POST /api/otp/send
 * @desc    Send email verification OTP
 * @access  Public
 */
router.post('/send', [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    (0, express_validator_1.body)('type')
        .optional()
        .isIn(['signup', 'recovery', 'email_change'])
        .withMessage('Type must be one of: signup, recovery, email_change'),
    validation_middleware_1.handleValidationErrors
], (0, error_middleware_1.asyncHandler)(otpController.sendEmailOtp));
/**
 * @route   POST /api/otp/verify
 * @desc    Verify email OTP
 * @access  Public
 */
router.post('/verify', [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    (0, express_validator_1.body)('token')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP token must be 6 digits'),
    validation_middleware_1.handleValidationErrors
], (0, error_middleware_1.asyncHandler)(otpController.verifyEmailOtp));
/**
 * @route   GET /api/otp/verify-hash
 * @desc    Verify email with token hash (PKCE flow)
 * @access  Public
 */
router.get('/verify-hash', (0, error_middleware_1.asyncHandler)(otpController.verifyTokenHash));
/**
 * @route   POST /api/otp/reset-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/reset-password', [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    validation_middleware_1.handleValidationErrors
], (0, error_middleware_1.asyncHandler)(otpController.sendPasswordResetOtp));
