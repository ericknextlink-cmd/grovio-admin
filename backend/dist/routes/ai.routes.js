"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRoutes = void 0;
const express_1 = require("express");
const ai_controller_1 = require("../controllers/ai.controller");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const optionalAuth_middleware_1 = require("../middleware/optionalAuth.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.aiRoutes = router;
const aiController = new ai_controller_1.AIController();
// Validation rules
const chatValidation = [
    (0, express_validator_1.body)('message')
        .trim()
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters'),
    (0, express_validator_1.body)('role')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Role must not exceed 50 characters'),
    (0, express_validator_1.body)('familySize')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Family size must be between 1 and 20'),
    (0, express_validator_1.body)('budget')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Budget must be a positive number'),
    (0, express_validator_1.body)('threadId')
        .optional()
        .isUUID()
        .withMessage('Thread ID must be a valid UUID'),
    validation_middleware_1.handleValidationErrors
];
const recommendationsValidation = [
    (0, express_validator_1.body)('budget')
        .isFloat({ min: 1 })
        .withMessage('Budget is required and must be at least 1'),
    (0, express_validator_1.body)('familySize')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Family size must be between 1 and 20'),
    (0, express_validator_1.body)('role')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Role must not exceed 50 characters'),
    (0, express_validator_1.body)('preferences')
        .optional()
        .isArray()
        .withMessage('Preferences must be an array'),
    (0, express_validator_1.body)('preferences.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Each preference must be between 1 and 100 characters'),
    (0, express_validator_1.body)('categories')
        .optional()
        .isArray()
        .withMessage('Categories must be an array'),
    (0, express_validator_1.body)('categories.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Each category must be between 1 and 100 characters'),
    validation_middleware_1.handleValidationErrors
];
const searchValidation = [
    (0, express_validator_1.query)('query')
        .trim()
        .notEmpty()
        .withMessage('Search query is required')
        .isLength({ min: 1, max: 200 })
        .withMessage('Query must be between 1 and 200 characters'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50'),
    validation_middleware_1.handleValidationErrors
];
const budgetAnalysisValidation = [
    (0, express_validator_1.body)('budget')
        .isFloat({ min: 1 })
        .withMessage('Budget is required and must be at least 1'),
    (0, express_validator_1.body)('familySize')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Family size must be between 1 and 20'),
    (0, express_validator_1.body)('duration')
        .optional()
        .isIn(['day', 'week', 'month'])
        .withMessage('Duration must be one of: day, week, month'),
    validation_middleware_1.handleValidationErrors
];
const mealSuggestionsValidation = [
    (0, express_validator_1.body)('ingredients')
        .optional()
        .isArray()
        .withMessage('Ingredients must be an array'),
    (0, express_validator_1.body)('ingredients.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Each ingredient must be between 1 and 100 characters'),
    (0, express_validator_1.body)('mealType')
        .optional()
        .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'any'])
        .withMessage('Meal type must be one of: breakfast, lunch, dinner, snack, any'),
    (0, express_validator_1.body)('dietaryRestrictions')
        .optional()
        .isArray()
        .withMessage('Dietary restrictions must be an array'),
    (0, express_validator_1.body)('dietaryRestrictions.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Each dietary restriction must be between 1 and 100 characters'),
    (0, express_validator_1.body)('familySize')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Family size must be between 1 and 20'),
    validation_middleware_1.handleValidationErrors
];
// Public AI routes (work for both authenticated and anonymous users)
// Optional auth = better personalization for logged-in users
router.post('/chat', optionalAuth_middleware_1.optionalAuth, chatValidation, aiController.getChatResponse);
router.post('/recommendations', optionalAuth_middleware_1.optionalAuth, recommendationsValidation, aiController.getRecommendations);
router.get('/search', optionalAuth_middleware_1.optionalAuth, searchValidation, aiController.searchProducts);
router.post('/budget-analysis', optionalAuth_middleware_1.optionalAuth, budgetAnalysisValidation, aiController.getBudgetAnalysis);
router.post('/meal-suggestions', optionalAuth_middleware_1.optionalAuth, mealSuggestionsValidation, aiController.getMealSuggestions);
// Thread management routes (require full authentication)
router.get('/threads/:threadId', auth_middleware_1.authenticateToken, aiController.getConversationHistory);
router.get('/threads', auth_middleware_1.authenticateToken, aiController.getUserThreads);
router.delete('/threads/:threadId', auth_middleware_1.authenticateToken, aiController.deleteThread);
