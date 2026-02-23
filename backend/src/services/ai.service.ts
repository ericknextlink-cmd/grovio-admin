import { createAdminClient } from '../config/supabase'

export interface ChatRequest {
  message: string
  role?: string
  familySize?: number
  budget?: number
}

export interface RecommendationRequest {
  budget: number
  familySize: number
  role: string
  preferences: string[]
  categories: string[]
}

export interface BudgetAnalysisRequest {
  budget: number
  familySize: number
  duration: 'day' | 'week' | 'month'
}

export interface MealSuggestionsRequest {
  ingredients: string[]
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any'
  dietaryRestrictions: string[]
  familySize: number
}

export interface ProductRecommendation {
  id: string
  name: string
  price: number
  quantity: number
  category: string
  subcategory?: string
  images: string[]
  rating: number
  inStock: boolean
  subtotal: number
}

export interface RecommendationResponse {
  items: ProductRecommendation[]
  total: number
  savings: number
  rationale: string
  budgetUtilization: number // percentage
}

export interface BudgetAnalysis {
  recommendedAllocation: {
    essentials: number
    proteins: number
    vegetables: number
    grains: number
    other: number
  }
  estimatedMeals: number
  costPerMeal: number
  suggestions: string[]
  warnings: string[]
}

export interface MealSuggestion {
  name: string
  description: string
  ingredients: string[]
  estimatedCost: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  cookingTime: number // minutes
}

export class AIService {
  private supabase = createAdminClient()

  /**
   * Generate AI chat response
   */
  async generateChatResponse(request: ChatRequest): Promise<string> {
    try {
      const { message, role, familySize, budget } = request

      // Check for greetings
      const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|what's up|how are you|what do you do|help|start)/i.test(message.trim())
      
      if (isGreeting) {
        return this.generateGreetingResponse()
      }

      // Extract budget from message if not provided
      const extractedBudget = budget ?? this.extractBudgetFromMessage(message)

      // Generate response based on message content
      if (this.isBudgetQuery(message) && extractedBudget) {
        const recommendations = await this.generateRecommendations({
          budget: extractedBudget,
          familySize: familySize || 1,
          role: role || 'user',
          preferences: [],
          categories: []
        })

        return this.formatRecommendationsAsChat(recommendations, extractedBudget)
      }

      if (this.isProductQuery(message)) {
        const products = await this.searchProducts(message, 5)
        return this.formatProductSearchAsChat(products, message)
      }

      // Default helpful response
      return this.generateHelpfulResponse(message)
    } catch (error) {
      console.error('Generate chat response error:', error)
      return "I'm sorry, I encountered an error while processing your request. Please try again."
    }
  }

  /**
   * Generate product recommendations
   */
  async generateRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    try {
      const { budget, familySize, role, preferences, categories } = request

      // Get products from database
      let query = this.supabase
        .from('products')
        .select('*')
        .eq('in_stock', true)
        .order('price', { ascending: true })

      // Filter by categories if specified
      if (categories.length > 0) {
        query = query.in('category_name', categories)
      }

      const { data: products } = await query

      if (!products || products.length === 0) {
        return {
          items: [],
          total: 0,
          savings: 0,
          rationale: 'No products found matching your criteria.',
          budgetUtilization: 0
        }
      }

      // Generate recommendations using budget-based algorithm
      const recommendations = this.generateBudgetBasedRecommendations(
        products,
        budget,
        familySize,
        role,
        preferences
      )

      const total = recommendations.reduce((sum, item) => sum + item.subtotal, 0)
      const budgetUtilization = (total / budget) * 100

      return {
        items: recommendations,
        total: Math.round(total * 100) / 100,
        savings: Math.max(0, budget - total),
        rationale: this.generateRationale(familySize, role, recommendations.length),
        budgetUtilization: Math.round(budgetUtilization * 100) / 100
      }
    } catch (error) {
      console.error('Generate recommendations error:', error)
      return {
        items: [],
        total: 0,
        savings: 0,
        rationale: 'Error generating recommendations.',
        budgetUtilization: 0
      }
    }
  }

  /**
   * Search products with AI-enhanced matching
   */
  async searchProducts(query: string, limit: number = 10): Promise<ProductRecommendation[]> {
    try {
      const { data: products } = await this.supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%,category_name.ilike.%${query}%`)
        .eq('in_stock', true)
        .limit(limit)

      if (!products) return []

      return products.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        category: product.category_name,
        subcategory: product.subcategory,
        images: product.images || [],
        rating: product.rating,
        inStock: product.in_stock,
        subtotal: product.price
      }))
    } catch (error) {
      console.error('Search products error:', error)
      return []
    }
  }

  /**
   * Analyze budget and provide insights
   */
  async analyzeBudget(request: BudgetAnalysisRequest): Promise<BudgetAnalysis> {
    try {
      const { budget, familySize, duration } = request

      // Calculate recommended allocation percentages
      const recommendedAllocation = {
        essentials: Math.round(budget * 0.4), // 40% for essentials (rice, oil, etc.)
        proteins: Math.round(budget * 0.25),  // 25% for proteins
        vegetables: Math.round(budget * 0.20), // 20% for vegetables
        grains: Math.round(budget * 0.10),    // 10% for grains
        other: Math.round(budget * 0.05)      // 5% for other items
      }

      // Estimate meals based on budget and family size
      const costPerMealPerPerson = this.estimateCostPerMeal(duration)
      const totalMealCost = costPerMealPerPerson * familySize
      const estimatedMeals = Math.floor(budget / totalMealCost)

      // Generate suggestions and warnings
      const suggestions = this.generateBudgetSuggestions(budget, familySize, duration)
      const warnings = this.generateBudgetWarnings(budget, familySize, duration)

      return {
        recommendedAllocation,
        estimatedMeals,
        costPerMeal: Math.round(totalMealCost * 100) / 100,
        suggestions,
        warnings
      }
    } catch (error) {
      console.error('Analyze budget error:', error)
      return {
        recommendedAllocation: { essentials: 0, proteins: 0, vegetables: 0, grains: 0, other: 0 },
        estimatedMeals: 0,
        costPerMeal: 0,
        suggestions: ['Error analyzing budget. Please try again.'],
        warnings: []
      }
    }
  }

  /**
   * Generate meal suggestions
   */
  async generateMealSuggestions(request: MealSuggestionsRequest): Promise<MealSuggestion[]> {
    try {
      const { ingredients, mealType, familySize } = request

      // This is a simplified implementation
      // In a real-world scenario, you'd use a more sophisticated AI model
      const mealSuggestions: MealSuggestion[] = []

      // Get products that match ingredients
      if (ingredients.length > 0) {
        const { data: matchingProducts } = await this.supabase
          .from('products')
          .select('*')
          .or(ingredients.map(ing => `name.ilike.%${ing}%`).join(','))
          .eq('in_stock', true)

        if (matchingProducts && matchingProducts.length > 0) {
          // Generate simple meal suggestions based on available ingredients
          const meals = this.generateSimpleMeals(matchingProducts, mealType, familySize)
          mealSuggestions.push(...meals)
        }
      }

      // Add some default suggestions if no specific ingredients provided
      if (mealSuggestions.length === 0) {
        mealSuggestions.push(...this.getDefaultMealSuggestions(mealType, familySize))
      }

      return mealSuggestions.slice(0, 5) // Return top 5 suggestions
    } catch (error) {
      console.error('Generate meal suggestions error:', error)
      return []
    }
  }

  /**
   * Private helper methods
   */
  private generateGreetingResponse(): string {
    return `**Hello! I'm your Grovio shopping assistant.** 🛒

I can help you with:
• **Budget shopping lists** - Tell me your budget and household size
• **Product recommendations** - Ask for specific items or categories  
• **Meal planning** - Get suggestions based on your needs

**What would you like help with today?**`
  }

  private extractBudgetFromMessage(message: string): number | undefined {
    const match = message.match(/(\d+[\.,]?\d*)/)
    return match ? parseFloat(match[1].replace(',', '')) : undefined
  }

  private isBudgetQuery(message: string): boolean {
    return /budget|cheap|afford|within|spend|money/i.test(message)
  }

  private isProductQuery(message: string): boolean {
    return /find|search|look for|need|want|buy/i.test(message)
  }

  private generateBudgetBasedRecommendations(
    products: Array<{ category_name?: string; price?: number; name?: string; [key: string]: unknown }>,
    budget: number,
    _familySize: number,
    _role: string,
    _preferences: string[]
  ): ProductRecommendation[] {
    const priorityCategories = [
      'grains', 'flour', 'oils', 'cereals', 'meat', 'vegetables',
      'seasonings', 'pasta', 'canned', 'beverages'
    ]

    const recommendations: ProductRecommendation[] = []
    let remainingBudget = budget

    const sortedProducts = [...products].sort((a, b) => {
      const aPriority = priorityCategories.indexOf((a.category_name ?? '').toLowerCase())
      const bPriority = priorityCategories.indexOf((b.category_name ?? '').toLowerCase())
      
      if (aPriority !== bPriority) {
        return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority)
      }
      
      return (a.price ?? 0) - (b.price ?? 0)
    })

    for (const product of sortedProducts) {
      if (remainingBudget <= 0) break
      const price = Number(product.price ?? 0)
      const quantity = Math.min(
        Math.floor(remainingBudget / price),
        price <= 10 ? 2 : 1
      )

      if (quantity > 0) {
        const subtotal = quantity * price

        recommendations.push({
          id: String((product as { id?: string }).id ?? ''),
          name: String(product.name ?? ''),
          price,
          quantity,
          category: String(product.category_name ?? ''),
          subcategory: (product as { subcategory?: string }).subcategory,
          images: ((product as { images?: unknown[] }).images ?? []) as string[],
          rating: (product as { rating?: number }).rating ?? 0,
          inStock: (product as { in_stock?: boolean }).in_stock ?? true,
          subtotal
        })

        remainingBudget -= subtotal
      }
    }

    return recommendations
  }

  private generateRationale(familySize: number, role: string, itemCount: number): string {
    return `Optimized a budget-friendly basket for a ${role} (family size ${familySize}). Selected ${itemCount} essential items prioritizing staples, proteins, and fresh produce to maximize nutritional value within your budget.`
  }

  private formatRecommendationsAsChat(recommendations: RecommendationResponse, budget: number): string {
    if (recommendations.items.length === 0) {
      return "I couldn't find suitable products within your budget. Please try with a higher budget amount."
    }

    const itemsList = recommendations.items
      .map(item => `• ${item.name} x${item.quantity} - ₵${item.subtotal.toFixed(2)}`)
      .join('\n')

    return `**Recommended Basket** (Budget: ₵${budget.toFixed(2)}):

${itemsList}

**Total: ₵${recommendations.total.toFixed(2)}**
**Savings: ₵${recommendations.savings.toFixed(2)}**

**Reasoning:** ${recommendations.rationale}`
  }

  private formatProductSearchAsChat(products: ProductRecommendation[], query: string): string {
    if (products.length === 0) {
      return `I couldn't find any products matching "${query}". Try searching for different terms or check our categories.`
    }

    const productsList = products
      .map(product => `• ${product.name} - ₵${product.price.toFixed(2)}`)
      .join('\n')

    return `**Matching Items for "${query}":**

${productsList}

**Tell me your budget to generate a complete shopping list.**`
  }

  private generateHelpfulResponse(_message: string): string {
    return `I can help you with grocery recommendations and budget planning. Here are some things you can ask me:

• "I have ₵50 for groceries" - Get budget recommendations
• "Find rice products" - Search for specific items
• "Meal ideas for family of 4" - Get meal suggestions

**What would you like help with?**`
  }

  private estimateCostPerMeal(duration: 'day' | 'week' | 'month'): number {
    // Estimated cost per meal per person in Ghana Cedis
    const baseCost = 8 // ₵8 per meal per person
    
    switch (duration) {
      case 'day': return baseCost * 3 // 3 meals per day
      case 'week': return baseCost * 21 // 21 meals per week
      case 'month': return baseCost * 90 // 90 meals per month
      default: return baseCost * 21
    }
  }

  private generateBudgetSuggestions(budget: number, familySize: number, _duration: string): string[] {
    const suggestions: string[] = []

    if (budget < 50 * familySize) {
      suggestions.push('Focus on staples like rice, flour, and cooking oil for maximum value')
      suggestions.push('Buy in bulk when possible to save money')
    }

    if (budget >= 100 * familySize) {
      suggestions.push('Include fresh proteins like chicken or fish')
      suggestions.push('Add variety with seasonal vegetables and fruits')
    }

    suggestions.push('Plan meals in advance to avoid food waste')
    suggestions.push('Compare prices across different brands')

    return suggestions
  }

  private generateBudgetWarnings(budget: number, familySize: number, _duration: string): string[] {
    const warnings: string[] = []

    const minimumBudget = familySize * (_duration === 'day' ? 25 : _duration === 'week' ? 150 : 600)

    if (budget < minimumBudget) {
      warnings.push(`Budget may be insufficient for ${_duration}ly groceries for ${familySize} people`)
      warnings.push('Consider prioritizing essential nutrients')
    }

    return warnings
  }

  private generateSimpleMeals(products: Array<{ name?: string; [key: string]: unknown }>, mealType: string, familySize: number): MealSuggestion[] {
    const meals: MealSuggestion[] = []

    if (products.some(p => (p.name ?? '').toLowerCase().includes('rice'))) {
      meals.push({
        name: 'Jollof Rice',
        description: 'Traditional Ghanaian rice dish with vegetables and spices',
        ingredients: ['Rice', 'Tomatoes', 'Onions', 'Spices'],
        estimatedCost: 25 * familySize,
        servings: familySize,
        difficulty: 'medium',
        cookingTime: 45
      })
    }

    return meals
  }

  private getDefaultMealSuggestions(mealType: string, familySize: number): MealSuggestion[] {
    const defaultMeals: MealSuggestion[] = [
      {
        name: 'Rice and Stew',
        description: 'Simple rice with tomato stew',
        ingredients: ['Rice', 'Tomatoes', 'Onions', 'Oil'],
        estimatedCost: 20 * familySize,
        servings: familySize,
        difficulty: 'easy',
        cookingTime: 30
      },
      {
        name: 'Pasta with Vegetables',
        description: 'Quick pasta dish with mixed vegetables',
        ingredients: ['Pasta', 'Mixed Vegetables', 'Oil'],
        estimatedCost: 18 * familySize,
        servings: familySize,
        difficulty: 'easy',
        cookingTime: 20
      }
    ]

    return defaultMeals
  }
}
