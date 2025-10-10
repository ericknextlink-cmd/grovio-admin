import { Request, Response } from 'express'
import { AIService } from '../services/ai.service'
import { ApiResponse } from '../types/api.types'

export class AIController {
  private aiService: AIService

  constructor() {
    this.aiService = new AIService()
  }

  /**
   * Get AI chat response
   */
  getChatResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, role, familySize, budget } = req.body

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Message is required and must be a string'
        } as ApiResponse<null>)
        return
      }

      const response = await this.aiService.generateChatResponse({
        message,
        role,
        familySize,
        budget
      })

      res.json({
        success: true,
        message: 'AI response generated successfully',
        data: { message: response }
      } as ApiResponse<{ message: string }>)
    } catch (error) {
      console.error('AI chat response error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Get product recommendations
   */
  getRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        budget, 
        familySize = 1, 
        role = 'user',
        preferences = [],
        categories = []
      } = req.body

      if (!budget || typeof budget !== 'number' || budget <= 0) {
        res.status(400).json({
          success: false,
          message: 'Budget is required and must be a positive number'
        } as ApiResponse<null>)
        return
      }

      const recommendations = await this.aiService.generateRecommendations({
        budget,
        familySize,
        role,
        preferences,
        categories
      })

      res.json({
        success: true,
        message: 'Recommendations generated successfully',
        data: recommendations
      } as ApiResponse<typeof recommendations>)
    } catch (error) {
      console.error('AI recommendations error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Search products with AI
   */
  searchProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, limit = 10 } = req.query

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        } as ApiResponse<null>)
        return
      }

      const results = await this.aiService.searchProducts(
        query as string, 
        parseInt(limit as string)
      )

      res.json({
        success: true,
        message: 'Product search completed successfully',
        data: results
      } as ApiResponse<typeof results>)
    } catch (error) {
      console.error('AI product search error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Get budget analysis
   */
  getBudgetAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
      const { budget, familySize = 1, duration = 'week' } = req.body

      if (!budget || typeof budget !== 'number' || budget <= 0) {
        res.status(400).json({
          success: false,
          message: 'Budget is required and must be a positive number'
        } as ApiResponse<null>)
        return
      }

      const analysis = await this.aiService.analyzeBudget({
        budget,
        familySize,
        duration
      })

      res.json({
        success: true,
        message: 'Budget analysis completed successfully',
        data: analysis
      } as ApiResponse<typeof analysis>)
    } catch (error) {
      console.error('AI budget analysis error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }

  /**
   * Get meal suggestions
   */
  getMealSuggestions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        ingredients = [], 
        mealType = 'any',
        dietaryRestrictions = [],
        familySize = 1
      } = req.body

      const suggestions = await this.aiService.generateMealSuggestions({
        ingredients,
        mealType,
        dietaryRestrictions,
        familySize
      })

      res.json({
        success: true,
        message: 'Meal suggestions generated successfully',
        data: suggestions
      } as ApiResponse<typeof suggestions>)
    } catch (error) {
      console.error('AI meal suggestions error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      } as ApiResponse<null>)
    }
  }
}
