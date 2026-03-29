"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRoutes = void 0;
const express_1 = require("express");
const ai_controller_1 = require("../controllers/ai.controller");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const authRateLimit_middleware_1 = require("../middleware/authRateLimit.middleware");
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
        .optional({ values: 'null' })
        .isUUID()
        .withMessage('Thread ID must be a valid UUID'),
    (0, express_validator_1.body)('guestId')
        .optional()
        .isUUID()
        .withMessage('Guest ID must be a valid UUID'),
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
const supplierProductRecommendationsValidation = [
    (0, express_validator_1.body)('message')
        .trim()
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 1, max: 2000 })
        .withMessage('Message must be between 1 and 2000 characters'),
    (0, express_validator_1.body)('threadId')
        .optional({ values: 'null' })
        .isUUID()
        .withMessage('Thread ID must be a valid UUID'),
    (0, express_validator_1.body)('familySize').optional().isInt({ min: 1, max: 20 }).withMessage('Family size must be 1-20'),
    (0, express_validator_1.body)('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
    (0, express_validator_1.body)('mealType').optional().isIn(['breakfast', 'lunch', 'dinner', 'all']).withMessage('Meal type must be breakfast, lunch, dinner, or all'),
    (0, express_validator_1.body)('budgetMode').optional().isIn(['combined', 'per_meal']).withMessage('Budget mode must be combined or per_meal'),
    validation_middleware_1.handleValidationErrors
];
// Chat and supplier-recommendations allow guests (optional auth); others require sign-in
router.post('/chat', auth_middleware_1.optionalAuthenticateToken, authRateLimit_middleware_1.authRateLimiter, chatValidation, aiController.getChatResponse);
router.post('/recommendations', auth_middleware_1.optionalAuthenticateToken, authRateLimit_middleware_1.authRateLimiter, recommendationsValidation, aiController.getRecommendations);
router.get('/search', auth_middleware_1.optionalAuthenticateToken, authRateLimit_middleware_1.authRateLimiter, searchValidation, aiController.searchProducts);
router.post('/budget-analysis', auth_middleware_1.optionalAuthenticateToken, authRateLimit_middleware_1.authRateLimiter, budgetAnalysisValidation, aiController.getBudgetAnalysis);
router.post('/meal-suggestions', auth_middleware_1.optionalAuthenticateToken, authRateLimit_middleware_1.authRateLimiter, mealSuggestionsValidation, aiController.getMealSuggestions);
router.post('/supplier-recommendations', auth_middleware_1.optionalAuthenticateToken, authRateLimit_middleware_1.authRateLimiter, supplierProductRecommendationsValidation, aiController.getSupplierProductRecommendations);
// Thread management routes
router.get('/threads/:threadId', auth_middleware_1.authenticateToken, authRateLimit_middleware_1.authRateLimiter, aiController.getConversationHistory);
router.get('/threads', auth_middleware_1.authenticateToken, authRateLimit_middleware_1.authRateLimiter, aiController.getUserThreads);
router.delete('/threads/:threadId', auth_middleware_1.authenticateToken, authRateLimit_middleware_1.authRateLimiter, aiController.deleteThread);
