import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { AIEnhancedService } from '../services/ai-enhanced.service'
import { ApiResponse } from '../types/api.types'
import { createAdminClient } from '../config/supabase'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

export class AIController {
  private aiService: AIEnhancedService

  constructor() {
    this.aiService = new AIEnhancedService()
  }

  /**
   * Enhanced AI chat with thread support and RAG
   */
  getChatResponse = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { message, role, familySize, budget, threadId, guestId } = req.body
      const userId = req.user?.id

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Message is required and must be a string',
          errors: ['Invalid message format']
        } as ApiResponse<null>)
        return
      }

      // Guests use a stable UUID (from client) or a new one; never store literal 'anonymous'
      const effectiveUserId = userId || guestId || uuidv4()

      // Extract user token from Authorization header for RLS compliance
      const authHeader = req.headers.authorization
      const userToken = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : undefined

      const result = await this.aiService.chat(message, effectiveUserId, {
        role,
        familySize,
        budget,
        threadId,
        userToken, // Pass token to respect RLS policies
      })

      if (result.success) {
        res.json({
          success: true,
          message: 'AI response generated successfully',
          data: {
            message: result.message,
            threadId: result.threadId,
            ...(result.products && result.products.length > 0 && { products: result.products }),
          },
        } as ApiResponse<{ message: string; threadId: string; products?: Array<{ id: string; name: string; price: number; quantity: number; reason: string }> }>)
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to generate AI response',
          errors: [result.error || 'AI service error'],
        } as ApiResponse<null>)
      }
    } catch (error) {
      console.error('AI chat response error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong'],
      } as ApiResponse<null>)
    }
  }

  /**
   * Enhanced product recommendations with database RAG
   */
  getRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { 
        budget, 
        familySize = 1, 
        role,
        preferences = [],
        categories = [],
        guestId: bodyGuestId
      } = req.body
      const userId = req.user?.id || bodyGuestId || uuidv4()

      if (!budget || typeof budget !== 'number' || budget <= 0) {
        res.status(400).json({
          success: false,
          message: 'Budget is required and must be a positive number',
          errors: ['Invalid budget value']
        } as ApiResponse<null>)
        return
      }

      // Extract user token from Authorization header for RLS compliance
      const authHeader = req.headers.authorization
      const userToken = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : undefined

      const result = await this.aiService.getRecommendations({
        userId,
        budget,
        familySize,
        role,
        preferences,
        preferred_categories: categories,
      }, userToken) // Pass token to respect RLS policies

      if (result.success) {
        res.json({
          success: true,
          message: 'Recommendations generated successfully',
          data: result.data,
        } as ApiResponse<typeof result.data>)
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to generate recommendations',
          errors: [result.error || 'Recommendation error'],
        } as ApiResponse<null>)
      }
    } catch (error) {
      console.error('AI recommendations error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong'],
      } as ApiResponse<null>)
    }
  }

  /**
   * Enhanced AI-powered product search
   */
  searchProducts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { query, limit = 10, guestId: queryGuestId } = req.query
      const userId = req.user?.id || (typeof queryGuestId === 'string' ? queryGuestId : undefined) || uuidv4()

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search query is required',
          errors: ['Missing or invalid query parameter']
        } as ApiResponse<null>)
        return
      }

      // Extract user token from Authorization header for RLS compliance
      const authHeader = req.headers.authorization
      const userToken = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : undefined

      const result = await this.aiService.searchProducts(
        query as string,
        userId,
        parseInt(limit as string, 10),
        userToken // Pass token to respect RLS policies
      )

      if (result.success) {
        res.json({
          success: true,
          message: 'Product search completed successfully',
          data: result.data,
        } as ApiResponse<typeof result.data>)
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Search failed',
          errors: [result.error || 'Search error'],
        } as ApiResponse<null>)
      }
    } catch (error) {
      console.error('AI product search error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong'],
      } as ApiResponse<null>)
    }
  }

  /**
   * Enhanced budget analysis with AI insights
   */
  getBudgetAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { budget, familySize = 1, duration = 'week' } = req.body
      const userId = req.user?.id || 'anonymous'

      if (!budget || typeof budget !== 'number' || budget <= 0) {
        res.status(400).json({
          success: false,
          message: 'Budget is required and must be a positive number',
          errors: ['Invalid budget value']
        } as ApiResponse<null>)
        return
      }

      if (!['day', 'week', 'month'].includes(duration)) {
        res.status(400).json({
          success: false,
          message: 'Duration must be one of: day, week, month',
          errors: ['Invalid duration']
        } as ApiResponse<null>)
        return
      }

      // Extract user token from Authorization header for RLS compliance
      const authHeader = req.headers.authorization
      const userToken = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : undefined

      const result = await this.aiService.analyzeBudget(
        budget,
        familySize,
        duration as 'day' | 'week' | 'month',
        userId,
        userToken // Pass token to respect RLS policies
      )

      if (result.success) {
        res.json({
          success: true,
          message: 'Budget analysis completed successfully',
          data: result.data,
        } as ApiResponse<typeof result.data>)
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Analysis failed',
          errors: [result.error || 'Analysis error'],
        } as ApiResponse<null>)
      }
    } catch (error) {
      console.error('AI budget analysis error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong'],
      } as ApiResponse<null>)
    }
  }

  /**
   * Enhanced meal suggestions with cultural context
   */
  getMealSuggestions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { 
        ingredients = [], 
        mealType = 'any',
        dietaryRestrictions = [],
        familySize = 1,
        guestId: mealGuestId
      } = req.body
      const userId = req.user?.id || mealGuestId || uuidv4()

      // Extract user token from Authorization header for RLS compliance
      const authHeader = req.headers.authorization
      const userToken = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : undefined

      const result = await this.aiService.getMealSuggestions(
        ingredients,
        mealType,
        dietaryRestrictions,
        familySize,
        userId,
        userToken // Pass token to respect RLS policies
      )

      if (result.success) {
        res.json({
          success: true,
          message: 'Meal suggestions generated successfully',
          data: result.data,
        } as ApiResponse<typeof result.data>)
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to generate meal suggestions',
          errors: [result.error || 'Meal suggestion error'],
        } as ApiResponse<null>)
      }
    } catch (error) {
      console.error('AI meal suggestions error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong'],
      } as ApiResponse<null>)
    }
  }

  /**
   * Get user's conversation history
   */
  getConversationHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { threadId } = req.params
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in to view conversation history'],
        } as ApiResponse<null>)
        return
      }

      if (!threadId) {
        res.status(400).json({
          success: false,
          message: 'Thread ID is required',
          errors: ['Missing thread ID'],
        } as ApiResponse<null>)
        return
      }

      // Use admin client to access threads (respects user_id filter for security)
      const adminSupabase = createAdminClient()
      const { data: thread, error } = await adminSupabase
        .from('ai_conversation_threads')
        .select('*')
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .single()

      if (error || !thread) {
        res.status(404).json({
          success: false,
          message: 'Conversation thread not found',
          errors: ['Thread does not exist or access denied'],
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Conversation history retrieved successfully',
        data: {
          threadId: thread.thread_id,
          messages: thread.messages,
          createdAt: thread.created_at,
          updatedAt: thread.updated_at,
        },
      })
    } catch (error) {
      console.error('Get conversation history error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to retrieve history'],
      } as ApiResponse<null>)
    }
  }

  /**
   * Get all user's conversation threads
   */
  getUserThreads = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in to view threads'],
        } as ApiResponse<null>)
        return
      }

      // Use admin client to access threads (respects user_id filter for security)
      const adminSupabase = createAdminClient()
      const { data: threads, error } = await adminSupabase
        .from('ai_conversation_threads')
        .select('thread_id, context, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to fetch threads',
          errors: [error.message],
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Conversation threads retrieved successfully',
        data: threads || [],
      })
    } catch (error) {
      console.error('Get user threads error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to retrieve threads'],
      } as ApiResponse<null>)
    }
  }

  /**
   * Delete a conversation thread
   */
  deleteThread = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { threadId } = req.params
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          errors: ['Please sign in'],
        } as ApiResponse<null>)
        return
      }

      // Use admin client to delete thread (respects user_id filter for security)
      const adminSupabase = createAdminClient()
      const { error } = await adminSupabase
        .from('ai_conversation_threads')
        .delete()
        .eq('thread_id', threadId)
        .eq('user_id', userId)

      if (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to delete thread',
          errors: [error.message],
        } as ApiResponse<null>)
        return
      }

      res.json({
        success: true,
        message: 'Conversation thread deleted successfully',
      })
    } catch (error) {
      console.error('Delete thread error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to delete thread'],
      } as ApiResponse<null>)
    }
  }

  /**
   * AI recommendations for supplier products
   * Fetches ALL products from database for complete catalog access
   */
  getSupplierProductRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { message, familySize, budget, mealType, budgetMode } = req.body

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Message is required and must be a string',
          errors: ['Invalid message format']
        } as ApiResponse<null>)
        return
      }

      // Fetch ALL products from database directly (not just frontend's paginated subset)
      const adminSupabase = createAdminClient()
      const { data: allProducts, error } = await adminSupabase
        .from('products')
        .select('id, name, price, category_name, in_stock')
        .order('category_name')

      console.log('DEBUG: Raw products from DB:', allProducts?.length || 0, 'products')
      console.log('DEBUG: First few products:', allProducts?.slice(0, 3))

      if (error) {
        console.error('Error fetching products:', error)
        res.status(500).json({
          success: false,
          message: 'Failed to fetch products from database',
          errors: [error.message]
        } as ApiResponse<null>)
        return
      }

      // Use ALL products (ignoring in_stock for now since products were created without quantity)
      const availableProducts = allProducts || []
      console.log('DEBUG: Available products:', availableProducts.length)

      if (!availableProducts || availableProducts.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No products available in catalog',
          errors: ['Empty product catalog']
        } as ApiResponse<null>)
        return
      }

      // Map to supplier product format
      const supplierProducts = availableProducts.map((p) => ({
        code: p.id,
        name: p.name,
        unitPrice: p.price,
        category: p.category_name,
        inStock: p.in_stock
      }))

      const userId = req.user?.id || 'admin'

      // Extract from prompt as a fallback so we always pass explicit values when present.
      const numberWords: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      }
      const familyDigitMatch = String(message).match(/family\s+of\s+(\d+)|family\s+size\s+(\d+)|(\d+)\s+people|(\d+)\s+persons?/i)
      const familyWordEntry = Object.entries(numberWords).find(([w]) =>
        new RegExp(`family\\s+of\\s+${w}|${w}\\s+people|${w}\\s+persons?`, 'i').test(String(message))
      )
      const parsedFamilySize = familyDigitMatch
        ? parseInt(familyDigitMatch[1] || familyDigitMatch[2] || familyDigitMatch[3] || familyDigitMatch[4] || '0', 10)
        : familyWordEntry?.[1]
      const effectiveFamilySize = (typeof familySize === 'number' ? familySize : parsedFamilySize) || undefined

      const budgetMatch =
        String(message).match(/budget\s*(?:of|is|:)?\s*₵?\s*(\d+(?:\.\d+)?)/i) ||
        String(message).match(/under\s*₵?\s*(\d+(?:\.\d+)?)/i) ||
        String(message).match(/(?:₵|ghs?\s*)\s*(\d+(?:\.\d+)?)/i) ||
        String(message).match(/(\d+(?:\.\d+)?)\s*(?:cedis?|ghs)\b/i)
      const parsedBudget = budgetMatch ? parseFloat(budgetMatch[1]) : undefined
      const effectiveBudget = typeof budget === 'number' ? budget : parsedBudget

      const result = await this.aiService.chatWithSupplierProducts(
        message,
        supplierProducts,
        userId,
        {
          familySize: effectiveFamilySize,
          budget: effectiveBudget,
          mealType: mealType === 'breakfast' || mealType === 'lunch' || mealType === 'dinner' || mealType === 'all' ? mealType : undefined,
          budgetMode: budgetMode === 'combined' || budgetMode === 'per_meal' ? budgetMode : undefined,
        }
      )

      if (result.success) {
        res.json({
          success: true,
          message: 'AI recommendations generated successfully',
          data: {
            response: result.message,
            recommendedProducts: result.recommendedProducts || [],
            allRecommendedProducts: result.recommendedProducts || [],
          },
        } as ApiResponse<{ 
          response: string; 
          recommendedProducts: Array<{id: string, name: string, price: number, quantity: number}>;
          allRecommendedProducts?: Array<{
            id: string;
            name: string;
            price: number;
            quantity: number;
            isInFinalList?: boolean;
            deliberationReason?: string;
            category?: string;
          }>;
        }>)
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to generate recommendations',
          errors: [result.error || 'AI service error'],
        } as ApiResponse<null>)
      }
    } catch (error) {
      console.error('Supplier product recommendations error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong'],
      } as ApiResponse<null>)
    }
  }
}
