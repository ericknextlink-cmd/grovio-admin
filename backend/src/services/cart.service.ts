import { createAdminClient } from '../config/supabase'

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface CartItemWithProduct extends CartItem {
  product: Record<string, unknown> // Product details from products table
}

export class CartService {
  private supabase = createAdminClient()

  /**
   * Get user's cart with product details
   */
  async getUserCart(userId: string): Promise<{
    success: boolean
    message: string
    data?: CartItemWithProduct[]
  }> {
    try {
      // Get cart items
      const { data: cartItems, error: cartError } = await this.supabase
        .from('cart')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (cartError) {
        console.error('Get cart error:', cartError)
        return {
          success: false,
          message: 'Failed to fetch cart'
        }
      }

      if (!cartItems || cartItems.length === 0) {
        return {
          success: true,
          message: 'Cart is empty',
          data: []
        }
      }

      // Get product IDs
      const productIds = cartItems.map(item => item.product_id)

      // Fetch product details
      const { data: products, error: productsError } = await this.supabase
        .from('products')
        .select('*')
        .in('id', productIds)

      if (productsError) {
        console.error('Get products error:', productsError)
        return {
          success: false,
          message: 'Failed to fetch product details'
        }
      }

      // Combine cart items with product details
      const cartWithProducts: CartItemWithProduct[] = cartItems.map(item => {
        const product = products?.find(p => p.id === item.product_id)
        return {
          ...item,
          product: product || null
        }
      })

      return {
        success: true,
        message: 'Cart fetched successfully',
        data: cartWithProducts
      }
    } catch (error) {
      console.error('Get user cart error:', error)
      return {
        success: false,
        message: 'Failed to fetch cart'
      }
    }
  }

  /**
   * Add product to cart
   */
  async addToCart(
    userId: string,
    productId: string,
    quantity: number = 1
  ): Promise<{
    success: boolean
    message: string
    data?: CartItemWithProduct
  }> {
    try {
      // Check if product exists
      const { data: product, error: productError } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (productError || !product) {
        return {
          success: false,
          message: 'Product not found'
        }
      }

      // Check if item already in cart
      const { data: existingItem } = await this.supabase
        .from('cart')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single()

      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity
        const { data: updatedItem, error: updateError } = await this.supabase
          .from('cart')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id)
          .select()
          .single()

        if (updateError) {
          return {
            success: false,
            message: 'Failed to update cart'
          }
        }

        return {
          success: true,
          message: 'Cart updated successfully',
          data: {
            ...updatedItem,
            product
          }
        }
      }

      // Insert new item
      const { data: newItem, error: insertError } = await this.supabase
        .from('cart')
        .insert({
          user_id: userId,
          product_id: productId,
          quantity
        })
        .select()
        .single()

      if (insertError) {
        console.error('Add to cart error:', insertError)
        return {
          success: false,
          message: 'Failed to add item to cart'
        }
      }

      return {
        success: true,
        message: 'Item added to cart successfully',
        data: {
          ...newItem,
          product
        }
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      return {
        success: false,
        message: 'Failed to add item to cart'
      }
    }
  }

  /**
   * Remove product from cart
   */
  async removeFromCart(
    userId: string,
    productId: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { error } = await this.supabase
        .from('cart')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId)

      if (error) {
        console.error('Remove from cart error:', error)
        return {
          success: false,
          message: 'Failed to remove item from cart'
        }
      }

      return {
        success: true,
        message: 'Item removed from cart successfully'
      }
    } catch (error) {
      console.error('Remove from cart error:', error)
      return {
        success: false,
        message: 'Failed to remove item from cart'
      }
    }
  }

  /**
   * Update cart item quantity
   */
  async updateQuantity(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<{
    success: boolean
    message: string
    data?: CartItemWithProduct
  }> {
    try {
      if (quantity <= 0) {
        // If quantity is 0 or less, remove item
        return this.removeFromCart(userId, productId)
      }

      const { data: updatedItem, error } = await this.supabase
        .from('cart')
        .update({ quantity })
        .eq('user_id', userId)
        .eq('product_id', productId)
        .select()
        .single()

      if (error) {
        console.error('Update quantity error:', error)
        return {
          success: false,
          message: 'Failed to update quantity'
        }
      }

      // Get product details
      const { data: product } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      return {
        success: true,
        message: 'Quantity updated successfully',
        data: {
          ...updatedItem,
          product: product || null
        }
      }
    } catch (error) {
      console.error('Update quantity error:', error)
      return {
        success: false,
        message: 'Failed to update quantity'
      }
    }
  }

  /**
   * Clear user's cart
   */
  async clearCart(userId: string): Promise<{
    success: boolean
    message: string
  }> {
    try {
      const { error } = await this.supabase
        .from('cart')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('Clear cart error:', error)
        return {
          success: false,
          message: 'Failed to clear cart'
        }
      }

      return {
        success: true,
        message: 'Cart cleared successfully'
      }
    } catch (error) {
      console.error('Clear cart error:', error)
      return {
        success: false,
        message: 'Failed to clear cart'
      }
    }
  }
}

