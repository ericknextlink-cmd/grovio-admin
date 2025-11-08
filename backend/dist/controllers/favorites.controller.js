"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoritesController = void 0;
const favorites_service_1 = require("../services/favorites.service");
class FavoritesController {
    constructor() {
        /**
         * Get user's favorites
         */
        this.getFavorites = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'User not authenticated'
                    });
                    return;
                }
                const result = await this.favoritesService.getUserFavorites(userId);
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
                console.error('Get favorites error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Add or remove item from favorites
         */
        this.updateFavorites = async (req, res) => {
            try {
                const userId = req.user?.id;
                const { product_id, action } = req.body;
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
                    result = await this.favoritesService.addToFavorites(userId, product_id);
                }
                else {
                    result = await this.favoritesService.removeFromFavorites(userId, product_id);
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
                console.error('Update favorites error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        this.favoritesService = new favorites_service_1.FavoritesService();
    }
}
exports.FavoritesController = FavoritesController;
