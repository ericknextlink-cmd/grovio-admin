import { Request, Response } from 'express'
import { CategoriesService } from '../services/categories.service'
import { ApiResponse } from '../types/api.types'

export class CategoriesController {
  private categoriesService: CategoriesService

  constructor() {
    this.categoriesService = new CategoriesService()
  }

  /**
   * Get all categories
   */
  getAllCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const { search } = req.query

      const categories = await this.categoriesService.getAllCategories(search as string)

      res.json({
        success: true,
        message: 'Categories retrieved successfully',
        data: categories
      } as ApiResponse<typeof categories>)
    } catch (error) {
      console.error('Get all categories error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Get category by ID
   */
  getCategoryById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const category = await this.categoriesService.getCategoryById(id)

      if (!category) {
        res.status(404).json({
          success: false,
          message: 'Category not found'
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Category retrieved successfully',
        data: category
      } as ApiResponse<typeof category>)
    } catch (error) {
      console.error('Get category by ID error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Create new category (Admin only)
   */
  createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryData = req.body

      const result = await this.categoriesService.createCategory(categoryData)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: result.data
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Create category error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Update category (Admin only)
   */
  updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const updates = req.body

      const result = await this.categoriesService.updateCategory(id, updates)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Category updated successfully',
        data: result.data
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Update category error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Delete category (Admin only)
   */
  deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const result = await this.categoriesService.deleteCategory(id)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Category deleted successfully'
      } as ApiResponse<null>)
    } catch (error) {
      console.error('Delete category error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Add subcategory to category (Admin only)
   */
  addSubcategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const { subcategory } = req.body

      if (!subcategory || typeof subcategory !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Subcategory name is required'
        } as ApiResponse<null>)
        return
      }

      const result = await this.categoriesService.addSubcategory(id, subcategory)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Subcategory added successfully',
        data: result.data
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Add subcategory error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Remove subcategory from category (Admin only)
   */
  removeSubcategory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const { subcategory } = req.body

      if (!subcategory || typeof subcategory !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Subcategory name is required'
        } as ApiResponse<null>)
        return
      }

      const result = await this.categoriesService.removeSubcategory(id, subcategory)

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Subcategory removed successfully',
        data: result.data
      } as ApiResponse<typeof result.data>)
    } catch (error) {
      console.error('Remove subcategory error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Get category statistics (Admin only)
   */
  getCategoryStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.categoriesService.getCategoryStats()

      res.json({
        success: true,
        message: 'Category statistics retrieved successfully',
        data: stats
      } as ApiResponse<typeof stats>)
    } catch (error) {
      console.error('Get category stats error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }
}
