"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsController = void 0;
const products_service_1 = require("../services/products.service");
class ProductsController {
    constructor() {
        /**
         * Get all products with optional filtering
         */
        this.getAllProducts = async (req, res) => {
            try {
                const { page = '1', limit = '20', category, subcategory, search, inStock, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
                const filters = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    category: category,
                    subcategory: subcategory,
                    search: search,
                    inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
                    sortBy: sortBy,
                    sortOrder: sortOrder
                };
                const result = await this.productsService.getAllProducts(filters);
                res.json({
                    success: true,
                    message: 'Products retrieved successfully',
                    data: result.data,
                    pagination: result.pagination
                });
            }
            catch (error) {
                console.error('Get all products error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Get product by ID
         */
        this.getProductById = async (req, res) => {
            try {
                const { id } = req.params;
                const product = await this.productsService.getProductById(id);
                if (!product) {
                    res.status(404).json({
                        success: false,
                        message: 'Product not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Product retrieved successfully',
                    data: product
                });
            }
            catch (error) {
                console.error('Get product by ID error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Create new product (Admin only)
         */
        this.createProduct = async (req, res) => {
            try {
                const productData = req.body;
                const result = await this.productsService.createProduct(productData);
                if (!result.success) {
                    res.status(result.statusCode ?? 400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.status(201).json({
                    success: true,
                    message: 'Product created successfully',
                    data: result.data
                });
            }
            catch (error) {
                console.error('Create product error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Update product (Admin only)
         */
        this.updateProduct = async (req, res) => {
            try {
                const { id } = req.params;
                const updates = req.body;
                const result = await this.productsService.updateProduct(id, updates);
                if (!result.success) {
                    res.status(result.statusCode ?? 400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Product updated successfully',
                    data: result.data
                });
            }
            catch (error) {
                console.error('Update product error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Delete product (Admin only)
         */
        this.deleteProduct = async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.productsService.deleteProduct(id);
                if (!result.success) {
                    res.status(result.statusCode ?? 400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Product deleted successfully'
                });
            }
            catch (error) {
                console.error('Delete product error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Update product stock (Admin only)
         */
        this.updateStock = async (req, res) => {
            try {
                const { id } = req.params;
                const { quantity, inStock } = req.body;
                const result = await this.productsService.updateStock(id, quantity, inStock);
                if (!result.success) {
                    res.status(result.statusCode ?? 400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Stock updated successfully',
                    data: result.data
                });
            }
            catch (error) {
                console.error('Update stock error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Get product statistics (Admin only)
         */
        this.getProductStats = async (req, res) => {
            try {
                const stats = await this.productsService.getProductStats();
                res.json({
                    success: true,
                    message: 'Product statistics retrieved successfully',
                    data: stats
                });
            }
            catch (error) {
                console.error('Get product stats error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        this.productsService = new products_service_1.ProductsService();
    }
}
exports.ProductsController = ProductsController;
