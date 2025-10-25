"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRoutes = void 0;
const express_1 = require("express");
const profile_controller_1 = require("../controllers/profile.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
exports.profileRoutes = router;
const profileController = new profile_controller_1.ProfileController();
/**
 * @route   GET /api/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/', [
    auth_middleware_1.authenticateToken,
    auth_middleware_1.requireUser
], (0, error_middleware_1.asyncHandler)(profileController.getProfile));
/**
 * @route   PUT /api/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/', [
    auth_middleware_1.authenticateToken,
    auth_middleware_1.requireUser,
    (0, express_validator_1.body)('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('phoneNumber')
        .optional()
        .matches(/^\+[1-9]\d{1,14}$/)
        .withMessage('Phone number must be in international format (e.g., +233241234567)'),
    (0, express_validator_1.body)('preferences')
        .optional()
        .isObject()
        .withMessage('Preferences must be an object'),
    (0, express_validator_1.body)('preferences.familySize')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Family size must be between 1 and 20'),
    (0, express_validator_1.body)('preferences.language')
        .optional()
        .isIn(['en', 'tw', 'fr'])
        .withMessage('Language must be one of: en, tw, fr'),
    (0, express_validator_1.body)('preferences.currency')
        .optional()
        .isIn(['GHS', 'USD'])
        .withMessage('Currency must be one of: GHS, USD'),
    validation_middleware_1.handleValidationErrors
], (0, error_middleware_1.asyncHandler)(profileController.updateProfile));
/**
 * @route   POST /api/profile/picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/picture', [
    auth_middleware_1.authenticateToken,
    auth_middleware_1.requireUser,
    profile_controller_1.upload.single('profilePicture')
], (0, error_middleware_1.asyncHandler)(profileController.uploadProfilePicture));
/**
 * @route   DELETE /api/profile/picture
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete('/picture', [
    auth_middleware_1.authenticateToken,
    auth_middleware_1.requireUser
], (0, error_middleware_1.asyncHandler)(profileController.deleteProfilePicture));
