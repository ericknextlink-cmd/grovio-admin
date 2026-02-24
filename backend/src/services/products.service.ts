import { createAdminClient } from '../config/supabase'

interface ServiceResult<T> {
  success: boolean
  message: string
  data?: T
  statusCode?: number
}

export interface Product {
  id: string
  name: string
  slug?: string
  brand?: string
  description?: string
  category?: string
  category_id?: string
  category_name: string
  subcategory?: string
  /** Cost from supplier; unchanged by pricing page */
  original_price?: number | null
  /** Selling price; updated when pricing ranges are applied */
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
  async createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResult<Product>> {
    try {
      // Generate slug from name
      const slug = this.generateSlug(productData.name)

      const payload: Record<string, unknown> = {
        ...productData,
        category: productData.category_name ?? productData.category,
        slug,
        currency: productData.currency || 'GHS'
      }
      if (payload.original_price !== undefined) {
        // Keep original_price as-is when provided (e.g. from supplier import)
      } else if (payload.price !== undefined) {
        payload.original_price = payload.price
      }
      const { data: product, error } = await this.supabase
        .from('products')
        .insert(payload)
        .select()
        .single()

      if (error) {
        const mapped = this.mapSupabaseError(error, 'Unable to create product. Please try again.')
        return {
          success: false,
          message: mapped.message,
          statusCode: mapped.statusCode
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
        message: 'Unable to create product. Please try again.'
      }
    }
  }

  /**
   * Update product
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<ServiceResult<Product>> {
    try {
      // If name is being updated, regenerate slug
      if (updates.name) {
        updates.slug = this.generateSlug(updates.name)
      }

      if (updates.category_name) {
        updates.category = updates.category_name
      }

      const { data: product, error } = await this.supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        const mapped = this.mapSupabaseError(error, 'Unable to update product. Please try again.')
        return {
          success: false,
          message: mapped.message,
          statusCode: mapped.statusCode
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
        message: 'Unable to update product. Please try again.'
      }
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<ServiceResult<null>> {
    try {
      const { error } = await this.supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) {
        const mapped = this.mapSupabaseError(error, 'Unable to delete product. Please try again.')
        return {
          success: false,
          message: mapped.message,
          statusCode: mapped.statusCode
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
        message: 'Unable to delete product. Please try again.'
      }
    }
  }

  /**
   * Update product stock
   */
  async updateStock(id: string, quantity: number, inStock: boolean): Promise<ServiceResult<Product>> {
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
        const mapped = this.mapSupabaseError(error, 'Unable to update stock. Please try again.')
        return {
          success: false,
          message: mapped.message,
          statusCode: mapped.statusCode
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
        message: 'Unable to update stock. Please try again.'
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
   * Bulk create/update products from supplier data (e.g. CSV/Excel).
   * - Products that already exist (same slug from name) are updated (price, original_price, brand, category).
   * - New products are inserted. No duplicates are created.
   */
  async createBulkProducts(
    items: Array<{ name: string; code?: string; unitPrice: number; category_name?: string }>
  ): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
    let created = 0
    let updated = 0
    const errors: string[] = []

    const slugs = items.map((item) => this.generateSlug(item.name))
    const uniqueSlugs = [...new Set(slugs)]

    const { data: existingRows } = await this.supabase
      .from('products')
      .select('id, slug')
      .in('slug', uniqueSlugs)

    const slugToId = new Map<string, string>()
    for (const row of existingRows ?? []) {
      const s = (row as { slug?: string }).slug
      if (s) slugToId.set(s, (row as { id: string }).id)
    }

    for (const item of items) {
      const slug = this.generateSlug(item.name)
      const category = item.category_name ?? 'General'
      const payload = {
        name: item.name,
        brand: item.code ?? '',
        category_name: category,
        category,
        original_price: item.unitPrice,
        price: item.unitPrice,
        currency: 'GHS',
        quantity: 0,
        in_stock: false,
        rating: 0,
        reviews_count: 0,
        images: [],
        slug
      }

      const existingId = slugToId.get(slug)
      if (existingId) {
        const { error } = await this.supabase
          .from('products')
          .update({
            name: item.name,
            brand: item.code ?? '',
            category_name: category,
            category,
            original_price: item.unitPrice,
            price: item.unitPrice
          })
          .eq('id', existingId)
        if (error) {
          errors.push(`${item.name}: ${error.message}`)
          continue
        }
        updated++
        continue
      }

      const { data: inserted, error } = await this.supabase.from('products').insert(payload).select('id').single()
      if (error) {
        errors.push(`${item.name}: ${error.message}`)
        continue
      }
      created++
      if (inserted?.id) slugToId.set(slug, inserted.id) // same slug later in batch will update this row
    }

    const failed = items.length - created - updated
    return { created, updated, failed, errors }
  }

  /**
   * Get all products for pricing (id, original_price, price). Used by pricing apply.
   */
  async getAllForPricing(): Promise<Array<{ id: string; original_price: number | null; price: number }>> {
    const { data, error } = await this.supabase
      .from('products')
      .select('id, original_price, price')
    if (error) throw error
    return (data ?? []).map((p: { id: string; original_price?: number | null; price: number }) => ({
      id: p.id,
      original_price: p.original_price ?? null,
      price: p.price
    }))
  }

  /**
   * Update selling price for a product (used after pricing apply).
   */
  async updateProductPrice(id: string, price: number): Promise<void> {
    const { error } = await this.supabase.from('products').update({ price }).eq('id', id)
    if (error) throw error
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

  private mapSupabaseError(error: unknown, defaultMessage: string): { message: string; statusCode?: number } {
    if (!error) {
      return { message: defaultMessage }
    }
    const e = error as { code?: string; details?: { code?: string }; message?: string }
    const code = e.code ?? e.details?.code
    const rawMessage = typeof e.message === 'string' ? e.message : ''

    if (code === '23505' || rawMessage.includes('duplicate key value')) {
      if (rawMessage.includes('products_slug_unique')) {
        return {
          message: "Can't create the same product twice. Please update the existing product instead.",
          statusCode: 409
        }
      }

      return {
        message: 'A record with these details already exists.',
        statusCode: 409
      }
    }

    return {
      message: defaultMessage
    }
  }
}
