"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesService = void 0;
const supabase_1 = require("../config/supabase");
class CategoriesService {
    constructor() {
        this.supabase = (0, supabase_1.createAdminClient)();
    }
    /**
     * Get all categories with optional search
     */
    async getAllCategories(search) {
        try {
            let query = this.supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true });
            if (search) {
                query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
            }
            const { data: categories, error } = await query;
            if (error) {
                throw error;
            }
            return categories || [];
        }
        catch (error) {
            console.error('Get all categories error:', error);
            throw error;
        }
    }
    /**
     * Get category by ID
     */
    async getCategoryById(id) {
        try {
            const { data: category, error } = await this.supabase
                .from('categories')
                .select('*')
                .eq('id', id)
                .single();
            if (error || !category) {
                return null;
            }
            return category;
        }
        catch (error) {
            console.error('Get category by ID error:', error);
            return null;
        }
    }
    /**
     * Create new category
     */
    async createCategory(categoryData) {
        try {
            // Generate slug from name if not provided
            const slug = categoryData.slug || this.generateSlug(categoryData.name);
            // Check if category with same name or slug exists
            const { data: existing } = await this.supabase
                .from('categories')
                .select('id')
                .or(`name.eq.${categoryData.name},slug.eq.${slug}`)
                .single();
            if (existing) {
                return {
                    success: false,
                    message: 'Category with this name or slug already exists'
                };
            }
            const { data: category, error } = await this.supabase
                .from('categories')
                .insert({
                ...categoryData,
                slug,
                subcategories: categoryData.subcategories || []
            })
                .select()
                .single();
            if (error) {
                return {
                    success: false,
                    message: error.message
                };
            }
            return {
                success: true,
                message: 'Category created successfully',
                data: category
            };
        }
        catch (error) {
            console.error('Create category error:', error);
            return {
                success: false,
                message: 'Failed to create category'
            };
        }
    }
    /**
     * Update category
     */
    async updateCategory(id, updates) {
        try {
            // If name is being updated, regenerate slug
            if (updates.name) {
                updates.slug = this.generateSlug(updates.name);
            }
            const { data: category, error } = await this.supabase
                .from('categories')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) {
                return {
                    success: false,
                    message: error.message
                };
            }
            return {
                success: true,
                message: 'Category updated successfully',
                data: category
            };
        }
        catch (error) {
            console.error('Update category error:', error);
            return {
                success: false,
                message: 'Failed to update category'
            };
        }
    }
    /**
     * Delete category
     */
    async deleteCategory(id) {
        try {
            // Check if category has products
            const { count: productCount } = await this.supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('category_id', id);
            if (productCount && productCount > 0) {
                return {
                    success: false,
                    message: 'Cannot delete category that has products. Please move or delete products first.'
                };
            }
            const { error } = await this.supabase
                .from('categories')
                .delete()
                .eq('id', id);
            if (error) {
                return {
                    success: false,
                    message: error.message
                };
            }
            return {
                success: true,
                message: 'Category deleted successfully'
            };
        }
        catch (error) {
            console.error('Delete category error:', error);
            return {
                success: false,
                message: 'Failed to delete category'
            };
        }
    }
    /**
     * Add subcategory to category
     */
    async addSubcategory(categoryId, subcategory) {
        try {
            // Get current category
            const category = await this.getCategoryById(categoryId);
            if (!category) {
                return {
                    success: false,
                    message: 'Category not found'
                };
            }
            // Check if subcategory already exists
            if (category.subcategories.includes(subcategory)) {
                return {
                    success: false,
                    message: 'Subcategory already exists'
                };
            }
            // Add subcategory
            const updatedSubcategories = [...category.subcategories, subcategory];
            const { data: updatedCategory, error } = await this.supabase
                .from('categories')
                .update({ subcategories: updatedSubcategories })
                .eq('id', categoryId)
                .select()
                .single();
            if (error) {
                return {
                    success: false,
                    message: error.message
                };
            }
            return {
                success: true,
                message: 'Subcategory added successfully',
                data: updatedCategory
            };
        }
        catch (error) {
            console.error('Add subcategory error:', error);
            return {
                success: false,
                message: 'Failed to add subcategory'
            };
        }
    }
    /**
     * Remove subcategory from category
     */
    async removeSubcategory(categoryId, subcategory) {
        try {
            // Get current category
            const category = await this.getCategoryById(categoryId);
            if (!category) {
                return {
                    success: false,
                    message: 'Category not found'
                };
            }
            // Check if subcategory exists
            if (!category.subcategories.includes(subcategory)) {
                return {
                    success: false,
                    message: 'Subcategory not found'
                };
            }
            // Remove subcategory
            const updatedSubcategories = category.subcategories.filter(sub => sub !== subcategory);
            const { data: updatedCategory, error } = await this.supabase
                .from('categories')
                .update({ subcategories: updatedSubcategories })
                .eq('id', categoryId)
                .select()
                .single();
            if (error) {
                return {
                    success: false,
                    message: error.message
                };
            }
            return {
                success: true,
                message: 'Subcategory removed successfully',
                data: updatedCategory
            };
        }
        catch (error) {
            console.error('Remove subcategory error:', error);
            return {
                success: false,
                message: 'Failed to remove subcategory'
            };
        }
    }
    /**
     * Get category statistics
     */
    async getCategoryStats() {
        try {
            // Get total categories count
            const { count: totalCategories } = await this.supabase
                .from('categories')
                .select('*', { count: 'exact', head: true });
            // Get all categories with subcategories
            const { data: categories } = await this.supabase
                .from('categories')
                .select('subcategories');
            const totalSubcategories = categories?.reduce((sum, cat) => sum + (cat.subcategories?.length || 0), 0) || 0;
            // Get categories that have products
            const { data: categoriesWithProducts } = await this.supabase
                .from('products')
                .select('category_name')
                .not('category_name', 'is', null);
            const uniqueCategoriesWithProducts = new Set(categoriesWithProducts?.map(p => p.category_name) || []);
            const categoriesWithProductsCount = uniqueCategoriesWithProducts.size;
            // Get most popular category (by product count)
            const { data: categoryProductCounts } = await this.supabase
                .from('products')
                .select('category_name')
                .not('category_name', 'is', null);
            let mostPopularCategory = null;
            let averageProductsPerCategory = 0;
            if (categoryProductCounts && categoryProductCounts.length > 0) {
                const categoryCount = {};
                categoryProductCounts.forEach(product => {
                    const category = product.category_name;
                    categoryCount[category] = (categoryCount[category] || 0) + 1;
                });
                // Find most popular category
                mostPopularCategory = Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b);
                // Calculate average products per category
                const totalProducts = Object.values(categoryCount).reduce((sum, count) => sum + count, 0);
                const uniqueCategories = Object.keys(categoryCount).length;
                averageProductsPerCategory = uniqueCategories > 0 ? totalProducts / uniqueCategories : 0;
            }
            return {
                totalCategories: totalCategories || 0,
                totalSubcategories,
                categoriesWithProducts: categoriesWithProductsCount,
                mostPopularCategory,
                averageProductsPerCategory: Math.round(averageProductsPerCategory * 100) / 100
            };
        }
        catch (error) {
            console.error('Get category stats error:', error);
            return {
                totalCategories: 0,
                totalSubcategories: 0,
                categoriesWithProducts: 0,
                mostPopularCategory: null,
                averageProductsPerCategory: 0
            };
        }
    }
    /**
     * Generate slug from category name
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
}
exports.CategoriesService = CategoriesService;
