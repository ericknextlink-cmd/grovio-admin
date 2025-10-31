"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userPreferencesRoutes = void 0;
const express_1 = require("express");
const user_preferences_controller_1 = require("../controllers/user-preferences.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
exports.userPreferencesRoutes = router;
const preferencesController = new user_preferences_controller_1.UserPreferencesController();
// Validation rules
const savePreferencesValidation = [
    (0, express_validator_1.body)('familySize')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Family size must be between 1 and 20'),
    (0, express_validator_1.body)('role')
        .optional()
        .trim()
        .isIn(['parent', 'student', 'professional', 'senior', 'other'])
        .withMessage('Role must be one of: parent, student, professional, senior, other'),
    (0, express_validator_1.body)('dietaryRestrictions')
        .optional()
        .isArray()
        .withMessage('Dietary restrictions must be an array'),
    (0, express_validator_1.body)('cuisinePreferences')
        .optional()
        .isArray()
        .withMessage('Cuisine preferences must be an array'),
    (0, express_validator_1.body)('budgetRange')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Budget range must not exceed 100 characters'),
    (0, express_validator_1.body)('shoppingFrequency')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Shopping frequency must not exceed 50 characters'),
    (0, express_validator_1.body)('cookingFrequency')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Cooking frequency must not exceed 50 characters'),
    (0, express_validator_1.body)('cookingSkill')
        .optional()
        .trim()
        .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
        .withMessage('Cooking skill must be one of: beginner, intermediate, advanced, expert'),
    (0, express_validator_1.body)('mealPlanning')
        .optional()
        .isBoolean()
        .withMessage('Meal planning must be a boolean'),
    (0, express_validator_1.body)('favoriteIngredients')
        .optional()
        .isArray()
        .withMessage('Favorite ingredients must be an array'),
    (0, express_validator_1.body)('allergies')
        .optional()
        .isArray()
        .withMessage('Allergies must be an array'),
    validation_middleware_1.handleValidationErrors,
];
// All routes require authentication
router.use(auth_middleware_1.authenticateToken);
/**
 * @route   POST /api/users/preferences
 * @desc    Save or update user preferences from onboarding
 * @access  Private
 */
router.post('/preferences', savePreferencesValidation, preferencesController.savePreferences);
/**
 * @route   GET /api/users/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/preferences', preferencesController.getPreferences);
/**
 * @route   PUT /api/users/preferences
 * @desc    Update specific preference fields
 * @access  Private
 */
router.put('/preferences', savePreferencesValidation, preferencesController.updatePreferences);
/**
 * @route   GET /api/users/onboarding-status
 * @desc    Check if user has completed onboarding
 * @access  Private
 */
router.get('/onboarding-status', preferencesController.checkOnboardingStatus);
