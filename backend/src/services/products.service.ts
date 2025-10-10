import { createAdminClient } from '../config/supabase'

export interface Product {
  id: string
  name: string
  slug?: string
  brand?: string
  description?: string
  category_id?: string
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
  rating: number
  reviews_count: number
  images: string[]
  created_at: string
  updated_at: string
}

export interface ProductFilters {
  page: number
  limit: number
  category?: string
  subcategory?: string
  search?: string
  inStock?: boolean
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface ProductStats {
  totalProducts: number
  inStock: number
  outOfStock: number
  categories: number
  averagePrice: number
  totalValue: number
  lowStockProducts: number
}

export class ProductsService {
  private supabase = createAdminClient()

  /**
   * Get all products with filtering and pagination
   */
  async getAllProducts(filters: ProductFilters): Promise<{
    data: Product[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    try {
      let query = this.supabase
        .from('products')
        .select('*', { count: 'exact' })

      // Apply filters
      if (filters.category) {
        query = query.eq('category_name', filters.category)
      }

      if (filters.subcategory) {
        query = query.eq('subcategory', filters.subcategory)
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters.inStock !== undefined) {
        query = query.eq('in_stock', filters.inStock)
      }

      // Apply sorting
      const sortColumn = filters.sortBy === 'created_at' ? 'created_at' : 
                        filters.sortBy === 'name' ? 'name' :
                        filters.sortBy === 'price' ? 'price' :
                        filters.sortBy === 'quantity' ? 'quantity' :
                        'created_at'

      query = query.order(sortColumn, { ascending: filters.sortOrder === 'asc' })

      // Apply pagination
      const from = (filters.page - 1) * filters.limit
      const to = from + filters.limit - 1

      query = query.range(from, to)

      const { data: products, error, count } = await query

      if (error) {
        throw error
      }

      const totalPages = Math.ceil((count || 0) / filters.limit)

      return {
        data: products || [],
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: count || 0,
          totalPages
        }
      }
    } catch (error) {
      console.error('Get all products error:', error)
      throw error
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product | null> {
    try {
      const { data: product, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !product) {
        return null
      }

      return product
    } catch (error) {
      console.error('Get product by ID error:', error)
      return null
    }
  }

  /**
   * Create new product
   */
  async createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<{
    success: boolean
    message: string
    data?: Product
  }> {
    try {
      // Generate slug from name
      const slug = this.generateSlug(productData.name)

      const { data: product, error } = await this.supabase
        .from('products')
        .insert({
          ...productData,
          slug,
          currency: productData.currency || 'GH₵'
        })
        .select()
        .single()

      if (error) {
        return {
          success: false,
          message: error.message
        }
      }

      return {
        success: true,
        message: 'Product created successfully',
        data: product
      }
    } catch (error) {
      console.error('Create product error:', error)
      return {
        success: false,
        message: 'Failed to create product'
      }
    }
  }

  /**
   * Update product
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<{
    success: boolean
    message: string
    data?: Product
  }> {
    try {
      // If name is being updated, regenerate slug
      if (updates.name) {
        updates.slug = this.generateSlug(updates.name)
      }

      const { data: product, error } = await this.supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          message: error.message
        }
      }

      return {
        success: true,
        message: 'Product updated successfully',
        data: product
      }
    } catch (error) {
      console.error('Update product error:', error)
      return {
        success: false,
        message: 'Failed to update product'
      }
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { error } = await this.supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) {
        return {
          success: false,
          message: error.message
        }
      }

      return {
        success: true,
        message: 'Product deleted successfully'
      }
    } catch (error) {
      console.error('Delete product error:', error)
      return {
        success: false,
        message: 'Failed to delete product'
      }
    }
  }

  /**
   * Update product stock
   */
  async updateStock(id: string, quantity: number, inStock: boolean): Promise<{
    success: boolean
    message: string
    data?: Product
  }> {
    try {
      const { data: product, error } = await this.supabase
        .from('products')
        .update({ 
          quantity,
          in_stock: inStock
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          message: error.message
        }
      }

      return {
        success: true,
        message: 'Stock updated successfully',
        data: product
      }
    } catch (error) {
      console.error('Update stock error:', error)
      return {
        success: false,
        message: 'Failed to update stock'
      }
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<ProductStats> {
    try {
      // Get total products count
      const { count: totalProducts } = await this.supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      // Get in stock count
      const { count: inStock } = await this.supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('in_stock', true)

      // Get out of stock count
      const { count: outOfStock } = await this.supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('in_stock', false)

      // Get categories count
      const { count: categories } = await this.supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })

      // Get low stock products (quantity < 10)
      const { count: lowStockProducts } = await this.supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('quantity', 10)

      // Get average price and total value
      const { data: priceStats } = await this.supabase
        .from('products')
        .select('price, quantity')

      let averagePrice = 0
      let totalValue = 0

      if (priceStats && priceStats.length > 0) {
        const totalPrice = priceStats.reduce((sum, product) => sum + product.price, 0)
        averagePrice = totalPrice / priceStats.length

        totalValue = priceStats.reduce((sum, product) => sum + (product.price * product.quantity), 0)
      }

      return {
        totalProducts: totalProducts || 0,
        inStock: inStock || 0,
        outOfStock: outOfStock || 0,
        categories: categories || 0,
        averagePrice: Math.round(averagePrice * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        lowStockProducts: lowStockProducts || 0
      }
    } catch (error) {
      console.error('Get product stats error:', error)
      return {
        totalProducts: 0,
        inStock: 0,
        outOfStock: 0,
        categories: 0,
        averagePrice: 0,
        totalValue: 0,
        lowStockProducts: 0
      }
    }
  }

  /**
   * Generate slug from product name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
