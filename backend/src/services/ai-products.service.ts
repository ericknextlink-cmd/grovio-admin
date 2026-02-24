import { ChatOpenAI } from '@langchain/openai'
import { createAdminClient } from '../config/supabase'
import { v4 as uuidv4 } from 'uuid'

/**
 * AI Products Service
 * Handles AI-generated products that need review and publishing
 */

export interface AIProduct {
  id: string
  name: string
  brand?: string
  description: string
  category_name: string
  subcategory?: string
  price: number
  currency: string
  quantity: number
  weight?: number
  volume?: number
  type?: string
  packaging?: string
  in_stock: boolean
  rating?: number
  reviews_count?: number
  images?: string[]
  generated_by: 'ai'
  status: 'draft' | 'published' | 'archived'
  created_at: string
  updated_at: string
  published_at?: string
}

export class AIProductsService {
  private model: ChatOpenAI
  private supabase

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    this.model = new ChatOpenAI({
      apiKey: apiKey || 'dummy',
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 3000,
    })

    this.supabase = createAdminClient()
  }

  /**
   * Generate AI products autonomously
   */
  async generateProducts(count: number = 10): Promise<{
    success: boolean
    products?: AIProduct[]
    error?: string
  }> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return {
          success: false,
          error: 'OpenAI API key not configured',
        }
      }

      // Get existing categories from database
      const { data: categories } = await this.supabase
        .from('categories')
        .select('name, subcategories')
        .limit(20)

      // Get sample products to understand structure (query runs for schema context)
      await this.supabase.from('products').select('*').limit(10)

      const categoriesList = categories?.map(c => c.name).join(', ') || 'Fruits & Vegetables, Dairy & Eggs, Meat & Seafood, Pantry, Beverages'
      const subcategoriesList = categories?.flatMap(c => c.subcategories || []).slice(0, 20).join(', ') || 'Fresh Fruits, Milk, Cheese, Beef, Chicken'

      const prompt = `You are a grocery product expert creating product suggestions for a Ghanaian grocery store.

**Available Categories:** ${categoriesList}
**Available Subcategories:** ${subcategoriesList}

**Task:** Generate ${count} realistic grocery products that would be sold in Ghana. Each product should be:
1. Realistic and culturally appropriate for Ghana
2. Include proper pricing in GHS (Ghana Cedis)
3. Have detailed descriptions
4. Include appropriate packaging/weight/volume information
5. Have realistic pricing (consider local market prices)

**Product Structure:**
- name: Product name (e.g., "Premium Basmati Rice")
- brand: Brand name (e.g., "Royal Chef" or null)
- description: Detailed 2-3 sentence description
- category_name: One of the available categories
- subcategory: One of the available subcategories
- price: Price in GHS (reasonable for Ghana market)
- currency: "GHS"
- quantity: Stock quantity (0-100)
- weight: Weight in kg (if applicable)
- volume: Volume in liters (if applicable)
- type: Type/variant (e.g., "Organic", "Premium", "Regular")
- packaging: Packaging type (e.g., "1kg Bag", "500ml Bottle")
- in_stock: true or false
- rating: Rating between 4.0 and 5.0
- reviews_count: Number of reviews (50-500)

**Important:** 
- Make products diverse across categories
- Use realistic Ghanaian product names and brands
- Prices should be realistic (e.g., rice: 25-60 GHS, milk: 12-25 GHS, chicken: 40-80 GHS per kg)
- Return ONLY valid JSON array, no markdown or extra text

Return a JSON array of products with this exact structure:
[
  {
    "name": "Product Name",
    "brand": "Brand Name" or null,
    "description": "Detailed description",
    "category_name": "Category",
    "subcategory": "Subcategory",
    "price": 25.99,
    "currency": "GHS",
    "quantity": 50,
    "weight": 1.0,
    "volume": null,
    "type": "Regular",
    "packaging": "1kg Bag",
    "in_stock": true,
    "rating": 4.5,
    "reviews_count": 120
  }
]`

      const response = await this.model.invoke(prompt)
      const content = response.content as string

      // Extract JSON from response (handle markdown code blocks)
      let jsonContent = content.trim()
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```\n?/g, '').trim()
      }

      // Validate JSON string before parsing
      if (!jsonContent || jsonContent.length > 100000) {
        throw new Error('Invalid or too large JSON content')
      }

      let products: Partial<AIProduct>[]
      try {
        const parsed = JSON.parse(jsonContent)
        // Validate parsed object structure - should be an array
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid JSON structure - expected array')
        }
        products = parsed
      } catch (parseError) {
        throw new Error(`Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }

      // Transform and save products
      const aiProducts: AIProduct[] = products.map((p) => {
        const id = uuidv4()
        return {
          id,
          name: p.name || 'Unnamed Product',
          brand: p.brand || null,
          description: p.description || '',
          category_name: p.category_name || 'Other',
          subcategory: p.subcategory || null,
          price: parseFloat(String(p.price || 0)),
          currency: p.currency || 'GHS',
          quantity: parseInt(String(p.quantity || 0)),
          weight: p.weight ? parseFloat(String(p.weight)) : null,
          volume: p.volume ? parseFloat(String(p.volume)) : null,
          type: p.type || null,
          packaging: p.packaging || null,
          in_stock: p.in_stock !== undefined ? Boolean(p.in_stock) : true,
          rating: p.rating ? parseFloat(String(p.rating)) : null,
          reviews_count: p.reviews_count ? parseInt(String(p.reviews_count)) : null,
          images: [],
          generated_by: 'ai',
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as AIProduct
      })

      // Save to database
      const savedProducts: AIProduct[] = []
      for (const product of aiProducts) {
        const { data, error } = await this.supabase
          .from('ai_products')
          .insert({
            id: product.id,
            name: product.name,
            brand: product.brand,
            description: product.description,
            category_name: product.category_name,
            subcategory: product.subcategory,
            price: product.price,
            currency: product.currency,
            quantity: product.quantity,
            weight: product.weight,
            volume: product.volume,
            type: product.type,
            packaging: product.packaging,
            in_stock: product.in_stock,
            rating: product.rating,
            reviews_count: product.reviews_count,
            images: product.images || [],
            generated_by: 'ai',
            status: 'draft',
          })
          .select()
          .single()

        if (!error && data) {
          savedProducts.push(data as AIProduct)
        }
      }

      return {
        success: true,
        products: savedProducts,
      }
    } catch (error) {
      console.error('Generate AI products error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate products',
      }
    }
  }

  /**
   * Get all AI products with filtering
   */
  async getAllProducts(filters: {
    page?: number
    limit?: number
    status?: 'draft' | 'published' | 'archived'
    category?: string
    search?: string
  } = {}): Promise<{
    success: boolean
    data?: AIProduct[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    error?: string
  }> {
    try {
      const page = filters.page || 1
      const limit = filters.limit || 20
      const offset = (page - 1) * limit

      let query = this.supabase
        .from('ai_products')
        .select('*', { count: 'exact' })

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.category) {
        query = query.eq('category_name', filters.category)
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`)
      }

      query = query.order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      const total = count || 0
      const totalPages = Math.ceil(total / limit)

      return {
        success: true,
        data: data as AIProduct[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }
    } catch (error) {
      console.error('Get AI products error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      }
    }
  }

  /**
   * Get AI product by ID
   */
  async getProductById(id: string): Promise<{
    success: boolean
    data?: AIProduct
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('ai_products')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        return {
          success: false,
          error: 'Product not found',
        }
      }

      return {
        success: true,
        data: data as AIProduct,
      }
    } catch (error) {
      console.error('Get AI product error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch product',
      }
    }
  }

  /**
   * Update AI product
   */
  async updateProduct(id: string, updates: Partial<AIProduct>): Promise<{
    success: boolean
    data?: AIProduct
    error?: string
  }> {
    try {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Remove fields that shouldn't be updated directly
      delete updateData.id
      delete updateData.created_at
      delete updateData.generated_by

      const { data, error } = await this.supabase
        .from('ai_products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Failed to update product',
        }
      }

      return {
        success: true,
        data: data as AIProduct,
      }
    } catch (error) {
      console.error('Update AI product error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update product',
      }
    }
  }

  /**
   * Delete AI product
   */
  async deleteProduct(id: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const { error } = await this.supabase
        .from('ai_products')
        .delete()
        .eq('id', id)

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Delete AI product error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete product',
      }
    }
  }

  /**
   * Publish AI product (move from draft to published)
   */
  async publishProduct(id: string): Promise<{
    success: boolean
    data?: AIProduct
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('ai_products')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Failed to publish product',
        }
      }

      return {
        success: true,
        data: data as AIProduct,
      }
    } catch (error) {
      console.error('Publish AI product error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish product',
      }
    }
  }

  /**
   * Unpublish AI product (move from published to draft)
   */
  async unpublishProduct(id: string): Promise<{
    success: boolean
    data?: AIProduct
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('ai_products')
        .update({
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Failed to unpublish product',
        }
      }

      return {
        success: true,
        data: data as AIProduct,
      }
    } catch (error) {
      console.error('Unpublish AI product error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unpublish product',
      }
    }
  }

  /**
   * Archive AI product
   */
  async archiveProduct(id: string): Promise<{
    success: boolean
    data?: AIProduct
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('ai_products')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Failed to archive product',
        }
      }

      return {
        success: true,
        data: data as AIProduct,
      }
    } catch (error) {
      console.error('Archive AI product error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to archive product',
      }
    }
  }
}

