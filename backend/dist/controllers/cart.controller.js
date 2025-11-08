"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartController = void 0;
const cart_service_1 = require("../services/cart.service");
class CartController {
    constructor() {
        /**
         * Get user's cart
         */
        this.getCart = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'User not authenticated'
                    });
                    return;
                }
                const result = await this.cartService.getUserCart(userId);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: result.message,
                    data: result.data
                });
            }
            catch (error) {
                console.error('Get cart error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Add or remove item from cart
         */
        this.updateCart = async (req, res) => {
            try {
                const userId = req.user?.id;
                const { product_id, action, quantity } = req.body;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'User not authenticated'
                    });
                    return;
                }
                if (!product_id || !action) {
                    res.status(400).json({
                        success: false,
                        message: 'Product ID and action are required'
                    });
                    return;
                }
                if (action !== 'add' && action !== 'remove') {
                    res.status(400).json({
                        success: false,
                        message: 'Action must be either "add" or "remove"'
                    });
                    return;
                }
                let result;
                if (action === 'add') {
                    const qty = quantity || 1;
                    result = await this.cartService.addToCart(userId, product_id, qty);
                }
                else {
                    result = await this.cartService.removeFromCart(userId, product_id);
                }
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: result.message,
                    data: result.data
                });
            }
            catch (error) {
                console.error('Update cart error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Clear user's cart
         */
        this.clearCart = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'User not authenticated'
                    });
                    return;
                }
                const result = await this.cartService.clearCart(userId);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: result.message
                });
            }
            catch (error) {
                console.error('Clear cart error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        this.cartService = new cart_service_1.CartService();
    }
}
exports.CartController = CartController;
