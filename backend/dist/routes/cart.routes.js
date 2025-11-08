"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartRoutes = void 0;
const express_1 = require("express");
const cart_controller_1 = require("../controllers/cart.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
exports.cartRoutes = router;
const cartController = new cart_controller_1.CartController();
// All cart routes require user authentication
router.use(auth_middleware_1.authenticateToken);
// Get user's cart
router.get('/', cartController.getCart);
// Add or remove item from cart
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
    (0, express_validator_1.body)('quantity')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Quantity must be a positive integer'),
    validation_middleware_1.handleValidationErrors
], cartController.updateCart);
// Clear cart
router.delete('/', cartController.clearCart);
