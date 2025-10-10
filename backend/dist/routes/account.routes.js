"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountRoutes = void 0;
const express_1 = require("express");
const account_controller_1 = require("../controllers/account.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
exports.accountRoutes = router;
const accountController = new account_controller_1.AccountController();
/**
 * @route   POST /api/account/check-email
 * @desc    Check email status (available, exists, deleted)
 * @access  Public
 */
router.post('/check-email', [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    validation_middleware_1.handleValidationErrors
], (0, error_middleware_1.asyncHandler)(accountController.checkEmailStatus));
/**
 * @route   DELETE /api/account/delete
 * @desc    Soft delete user account
 * @access  Private
 */
router.delete('/delete', [
    auth_middleware_1.authenticateToken,
    auth_middleware_1.requireUser,
    (0, express_validator_1.body)('reason')
        .optional()
        .isString()
        .withMessage('Deletion reason must be a string'),
    validation_middleware_1.handleValidationErrors
], (0, error_middleware_1.asyncHandler)(accountController.deleteAccount));
/**
 * @route   POST /api/account/recovery/initiate
 * @desc    Initiate account recovery for deleted accounts
 * @access  Public
 */
router.post('/recovery/initiate', [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    validation_middleware_1.handleValidationErrors
], (0, error_middleware_1.asyncHandler)(accountController.initiateRecovery));
/**
 * @route   POST /api/account/recovery/complete
 * @desc    Complete account recovery
 * @access  Public
 */
router.post('/recovery/complete', [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    (0, express_validator_1.body)('recoveryToken')
        .notEmpty()
        .withMessage('Recovery token is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    validation_middleware_1.handleValidationErrors
], (0, error_middleware_1.asyncHandler)(accountController.completeRecovery));
