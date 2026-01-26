"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesController = void 0;
const categories_service_1 = require("../services/categories.service");
class CategoriesController {
    constructor() {
        /**
         * Get all categories
         */
        this.getAllCategories = async (req, res) => {
            try {
                const { search } = req.query;
                const categories = await this.categoriesService.getAllCategories(search);
                res.json({
                    success: true,
                    message: 'Categories retrieved successfully',
                    data: categories
                });
            }
            catch (error) {
                console.error('Get all categories error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Get category by ID
         */
        this.getCategoryById = async (req, res) => {
            try {
                const { id } = req.params;
                const categoryId = Array.isArray(id) ? id[0] : id;
                const category = await this.categoriesService.getCategoryById(categoryId);
                if (!category) {
                    res.status(404).json({
                        success: false,
                        message: 'Category not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Category retrieved successfully',
                    data: category
                });
            }
            catch (error) {
                console.error('Get category by ID error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Create new category (Admin only)
         */
        this.createCategory = async (req, res) => {
            try {
                const categoryData = req.body;
                const result = await this.categoriesService.createCategory(categoryData);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.status(201).json({
                    success: true,
                    message: 'Category created successfully',
                    data: result.data
                });
            }
            catch (error) {
                console.error('Create category error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Update category (Admin only)
         */
        this.updateCategory = async (req, res) => {
            try {
                const { id } = req.params;
                const categoryId = Array.isArray(id) ? id[0] : id;
                const updates = req.body;
                const result = await this.categoriesService.updateCategory(categoryId, updates);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Category updated successfully',
                    data: result.data
                });
            }
            catch (error) {
                console.error('Update category error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Delete category (Admin only)
         */
        this.deleteCategory = async (req, res) => {
            try {
                const { id } = req.params;
                const categoryId = Array.isArray(id) ? id[0] : id;
                const result = await this.categoriesService.deleteCategory(categoryId);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Category deleted successfully'
                });
            }
            catch (error) {
                console.error('Delete category error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Add subcategory to category (Admin only)
         */
        this.addSubcategory = async (req, res) => {
            try {
                const { id } = req.params;
                const categoryId = Array.isArray(id) ? id[0] : id;
                const { subcategory } = req.body;
                if (!subcategory || typeof subcategory !== 'string') {
                    res.status(400).json({
                        success: false,
                        message: 'Subcategory name is required'
                    });
                    return;
                }
                const result = await this.categoriesService.addSubcategory(categoryId, subcategory);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Subcategory added successfully',
                    data: result.data
                });
            }
            catch (error) {
                console.error('Add subcategory error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Remove subcategory from category (Admin only)
         */
        this.removeSubcategory = async (req, res) => {
            try {
                const { id } = req.params;
                const categoryId = Array.isArray(id) ? id[0] : id;
                const { subcategory } = req.body;
                if (!subcategory || typeof subcategory !== 'string') {
                    res.status(400).json({
                        success: false,
                        message: 'Subcategory name is required'
                    });
                    return;
                }
                const result = await this.categoriesService.removeSubcategory(categoryId, subcategory);
                if (!result.success) {
                    res.status(400).json({
                        success: false,
                        message: result.message
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Subcategory removed successfully',
                    data: result.data
                });
            }
            catch (error) {
                console.error('Remove subcategory error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        /**
         * Get category statistics (Admin only)
         */
        this.getCategoryStats = async (req, res) => {
            try {
                const stats = await this.categoriesService.getCategoryStats();
                res.json({
                    success: true,
                    message: 'Category statistics retrieved successfully',
                    data: stats
                });
            }
            catch (error) {
                console.error('Get category stats error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error'
                });
            }
        };
        this.categoriesService = new categories_service_1.CategoriesService();
    }
}
exports.CategoriesController = CategoriesController;
