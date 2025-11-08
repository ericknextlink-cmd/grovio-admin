"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoritesService = void 0;
const supabase_1 = require("../config/supabase");
class FavoritesService {
    constructor() {
        this.supabase = (0, supabase_1.createAdminClient)();
    }
    /**
     * Get user's favorites with product details
     */
    async getUserFavorites(userId) {
        try {
            // Get favorite items
            const { data: favorites, error: favoritesError } = await this.supabase
                .from('favorites')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (favoritesError) {
                console.error('Get favorites error:', favoritesError);
                return {
                    success: false,
                    message: 'Failed to fetch favorites'
                };
            }
            if (!favorites || favorites.length === 0) {
                return {
                    success: true,
                    message: 'No favorites found',
                    data: []
                };
            }
            // Get product IDs
            const productIds = favorites.map(item => item.product_id);
            // Fetch product details
            const { data: products, error: productsError } = await this.supabase
                .from('products')
                .select('*')
                .in('id', productIds);
            if (productsError) {
                console.error('Get products error:', productsError);
                return {
                    success: false,
                    message: 'Failed to fetch product details'
                };
            }
            // Combine favorites with product details
            const favoritesWithProducts = favorites.map(item => {
                const product = products?.find(p => p.id === item.product_id);
                return {
                    ...item,
                    product: product || null
                };
            });
            return {
                success: true,
                message: 'Favorites fetched successfully',
                data: favoritesWithProducts
            };
        }
        catch (error) {
            console.error('Get user favorites error:', error);
            return {
                success: false,
                message: 'Failed to fetch favorites'
            };
        }
    }
    /**
     * Add product to favorites
     */
    async addToFavorites(userId, productId) {
        try {
            // Check if product exists
            const { data: product, error: productError } = await this.supabase
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();
            if (productError || !product) {
                return {
                    success: false,
                    message: 'Product not found'
                };
            }
            // Check if already in favorites
            const { data: existing } = await this.supabase
                .from('favorites')
                .select('*')
                .eq('user_id', userId)
                .eq('product_id', productId)
                .single();
            if (existing) {
                return {
                    success: true,
                    message: 'Product already in favorites',
                    data: {
                        ...existing,
                        product
                    }
                };
            }
            // Insert new favorite
            const { data: newFavorite, error: insertError } = await this.supabase
                .from('favorites')
                .insert({
                user_id: userId,
                product_id: productId
            })
                .select()
                .single();
            if (insertError) {
                console.error('Add to favorites error:', insertError);
                return {
                    success: false,
                    message: 'Failed to add to favorites'
                };
            }
            return {
                success: true,
                message: 'Added to favorites successfully',
                data: {
                    ...newFavorite,
                    product
                }
            };
        }
        catch (error) {
            console.error('Add to favorites error:', error);
            return {
                success: false,
                message: 'Failed to add to favorites'
            };
        }
    }
    /**
     * Remove product from favorites
     */
    async removeFromFavorites(userId, productId) {
        try {
            const { error } = await this.supabase
                .from('favorites')
                .delete()
                .eq('user_id', userId)
                .eq('product_id', productId);
            if (error) {
                console.error('Remove from favorites error:', error);
                return {
                    success: false,
                    message: 'Failed to remove from favorites'
                };
            }
            return {
                success: true,
                message: 'Removed from favorites successfully'
            };
        }
        catch (error) {
            console.error('Remove from favorites error:', error);
            return {
                success: false,
                message: 'Failed to remove from favorites'
            };
        }
    }
    /**
     * Check if product is in favorites
     */
    async isFavorite(userId, productId) {
        try {
            const { data, error } = await this.supabase
                .from('favorites')
                .select('id')
                .eq('user_id', userId)
                .eq('product_id', productId)
                .single();
            return {
                success: true,
                isFavorite: !!data && !error
            };
        }
        catch (error) {
            return {
                success: false,
                isFavorite: false
            };
        }
    }
}
exports.FavoritesService = FavoritesService;
