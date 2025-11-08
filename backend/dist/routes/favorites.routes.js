"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.favoritesRoutes = void 0;
const express_1 = require("express");
const favorites_controller_1 = require("../controllers/favorites.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
exports.favoritesRoutes = router;
const favoritesController = new favorites_controller_1.FavoritesController();
// All favorites routes require user authentication
router.use(auth_middleware_1.authenticateToken);
// Get user's favorites
router.get('/', favoritesController.getFavorites);
// Add or remove item from favorites
router.post('/', [
    (0, express_validator_1.body)('product_id')
        .notEmpty()
        .withMessage('Product ID is required')
        .isUUID()
        .withMessage('Product ID must be a valid UUID'),
    (0, express_validator_1.body)('action')
        .notEmpty()
        .withMessage('Action is required')
        .isIn(['add', 'remove'])
        .withMessage('Action must be either "add" or "remove"'),
    validation_middleware_1.handleValidationErrors
], favoritesController.updateFavorites);
