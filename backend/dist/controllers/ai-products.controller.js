"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIProductsController = void 0;
const ai_products_service_1 = require("../services/ai-products.service");
class AIProductsController {
    constructor() {
        /**
         * Generate AI products
         */
        this.generateProducts = async (req, res) => {
            try {
                const { count = 10 } = req.body;
                const result = await this.aiProductsService.generateProducts(parseInt(count));
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.error || 'Failed to generate products',
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: `Successfully generated ${result.products?.length || 0} products`,
                    data: result.products,
                });
            }
            catch (error) {
                console.error('Generate AI products error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                });
            }
        };
        /**
         * Get all AI products
         */
        this.getAllProducts = async (req, res) => {
            try {
                const { page = '1', limit = '20', status, category, search, } = req.query;
                const filters = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    status: status,
                    category: category,
                    search: search,
                };
                const result = await this.aiProductsService.getAllProducts(filters);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.error || 'Failed to fetch products',
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Products retrieved successfully',
                    data: result.data,
                    pagination: result.pagination,
                });
            }
            catch (error) {
                console.error('Get AI products error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                });
            }
        };
        /**
         * Get AI product by ID
         */
        this.getProductById = async (req, res) => {
            try {
                const { id } = req.params;
                const productId = Array.isArray(id) ? id[0] : id;
                const result = await this.aiProductsService.getProductById(productId);
                if (!result.success || !result.data) {
                    res.status(404).json({
                        success: false,
                        message: result.error || 'Product not found',
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Product retrieved successfully',
                    data: result.data,
                });
            }
            catch (error) {
                console.error('Get AI product by ID error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                });
            }
        };
        /**
         * Update AI product
         */
        this.updateProduct = async (req, res) => {
            try {
                const { id } = req.params;
                const productId = Array.isArray(id) ? id[0] : id;
                const updates = req.body;
                const result = await this.aiProductsService.updateProduct(productId, updates);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.error || 'Failed to update product',
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Product updated successfully',
                    data: result.data,
                });
            }
            catch (error) {
                console.error('Update AI product error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                });
            }
        };
        /**
         * Delete AI product
         */
        this.deleteProduct = async (req, res) => {
            try {
                const { id } = req.params;
                const productId = Array.isArray(id) ? id[0] : id;
                const result = await this.aiProductsService.deleteProduct(productId);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.error || 'Failed to delete product',
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Product deleted successfully',
                });
            }
            catch (error) {
                console.error('Delete AI product error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                });
            }
        };
        /**
         * Publish AI product
         */
        this.publishProduct = async (req, res) => {
            try {
                const { id } = req.params;
                const productId = Array.isArray(id) ? id[0] : id;
                const result = await this.aiProductsService.publishProduct(productId);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.error || 'Failed to publish product',
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Product published successfully',
                    data: result.data,
                });
            }
            catch (error) {
                console.error('Publish AI product error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                });
            }
        };
        /**
         * Unpublish AI product
         */
        this.unpublishProduct = async (req, res) => {
            try {
                const { id } = req.params;
                const productId = Array.isArray(id) ? id[0] : id;
                const result = await this.aiProductsService.unpublishProduct(productId);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.error || 'Failed to unpublish product',
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Product unpublished successfully',
                    data: result.data,
                });
            }
            catch (error) {
                console.error('Unpublish AI product error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                });
            }
        };
        /**
         * Archive AI product
         */
        this.archiveProduct = async (req, res) => {
            try {
                const { id } = req.params;
                const productId = Array.isArray(id) ? id[0] : id;
                const result = await this.aiProductsService.archiveProduct(productId);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.error || 'Failed to archive product',
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Product archived successfully',
                    data: result.data,
                });
            }
            catch (error) {
                console.error('Archive AI product error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                });
            }
        };
        this.aiProductsService = new ai_products_service_1.AIProductsService();
    }
}
exports.AIProductsController = AIProductsController;
