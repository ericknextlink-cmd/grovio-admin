import { createAdminClient } from '../config/supabase'

export interface DashboardStats {
  // Products
  totalProducts: number
  inStockProducts: number
  outOfStockProducts: number
  lowStockProducts: number
  
  // Categories
  totalCategories: number
  
  // Orders
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
  
  // Transactions
  totalTransactions: number
  pendingTransactions: number
  completedTransactions: number
  failedTransactions: number
  
  // Revenue
  totalRevenue: number
  monthlyRevenue: number
  dailyRevenue: number
  
  // Growth
  orderGrowth: number // percentage
  revenueGrowth: number // percentage
  
  // Top performing
  topCategory: string | null
  topSellingProduct: string | null
}

export interface RecentActivity {
  id: string
  type: 'order' | 'product' | 'category' | 'transaction'
  action: string
  description: string
  timestamp: string
  metadata?: any
}

export interface SalesAnalytics {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  dailySales: Array<{
    date: string
    sales: number
    orders: number
  }>
  topProducts: Array<{
    productId: string
    productName: string
    totalSold: number
    revenue: number
  }>
  salesByCategory: Array<{
    category: string
    sales: number
    percentage: number
  }>
}

export interface LowStockAlert {
  productId: string
  productName: string
  currentStock: number
  category: string
  lastRestocked?: string
  urgency: 'low' | 'medium' | 'high'
}

export class DashboardService {
  private supabase = createAdminClient()

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [
        productStats,
        categoryStats,
        orderStats,
        transactionStats,
        revenueStats,
        growthStats
      ] = await Promise.all([
        this.getProductStats(),
        this.getCategoryStats(),
        this.getOrderStats(),
        this.getTransactionStats(),
        this.getRevenueStats(),
        this.getGrowthStats()
      ])

      return {
        ...productStats,
        ...categoryStats,
        ...orderStats,
        ...transactionStats,
        ...revenueStats,
        ...growthStats
      }
    } catch (error) {
      console.error('Get dashboard stats error:', error)
      throw error
    }
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = []

      // Get recent orders
      const { data: recentOrders } = await this.supabase
        .from('orders')
        .select('id, customer_name, status, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(Math.floor(limit / 2))

      recentOrders?.forEach(order => {
        activities.push({
          id: order.id,
          type: 'order',
          action: 'created',
          description: `New order from ${order.customer_name} for ₵${order.total_amount}`,
          timestamp: order.created_at
        })
      })

      // Get recent products
      const { data: recentProducts } = await this.supabase
        .from('products')
        .select('id, name, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(Math.floor(limit / 2))

      recentProducts?.forEach(product => {
        activities.push({
          id: product.id,
          type: 'product',
          action: 'updated',
          description: `Product "${product.name}" was updated`,
          timestamp: product.updated_at
        })
      })

      // Sort all activities by timestamp
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)
    } catch (error) {
      console.error('Get recent activities error:', error)
      return []
    }
  }

  /**
   * Get sales analytics
   */
  async getSalesAnalytics(days: number = 30): Promise<SalesAnalytics> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get completed orders within the period
      const { data: orders } = await this.supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          created_at,
          order_items (
            product_id,
            product_name,
            quantity,
            total_price
          )
        `)
        .eq('status', 'delivered')
        .gte('created_at', startDate.toISOString())

      if (!orders || orders.length === 0) {
        return {
          totalSales: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          dailySales: [],
          topProducts: [],
          salesByCategory: []
        }
      }

      // Calculate totals
      const totalSales = orders.reduce((sum, order) => sum + order.total_amount, 0)
      const totalOrders = orders.length
      const averageOrderValue = totalSales / totalOrders

      // Group sales by day
      const dailySalesMap = new Map<string, { sales: number; orders: number }>()
      
      orders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        const existing = dailySalesMap.get(date) || { sales: 0, orders: 0 }
        dailySalesMap.set(date, {
          sales: existing.sales + order.total_amount,
          orders: existing.orders + 1
        })
      })

      const dailySales = Array.from(dailySalesMap.entries()).map(([date, data]) => ({
        date,
        sales: data.sales,
        orders: data.orders
      })).sort((a, b) => a.date.localeCompare(b.date))

      // Calculate top products
      const productSalesMap = new Map<string, { name: string; totalSold: number; revenue: number }>()
      
      orders.forEach(order => {
        order.order_items?.forEach(item => {
          const existing = productSalesMap.get(item.product_id) || { 
            name: item.product_name, 
            totalSold: 0, 
            revenue: 0 
          }
          productSalesMap.set(item.product_id, {
            name: item.product_name,
            totalSold: existing.totalSold + item.quantity,
            revenue: existing.revenue + item.total_price
          })
        })
      })

      const topProducts = Array.from(productSalesMap.entries())
        .map(([productId, data]) => ({
          productId,
          productName: data.name,
          totalSold: data.totalSold,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Get sales by category (simplified - would need product category data)
      const salesByCategory: Array<{ category: string; sales: number; percentage: number }> = []

      return {
        totalSales: Math.round(totalSales * 100) / 100,
        totalOrders,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        dailySales,
        topProducts,
        salesByCategory
      }
    } catch (error) {
      console.error('Get sales analytics error:', error)
      return {
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        dailySales: [],
        topProducts: [],
        salesByCategory: []
      }
    }
  }

  /**
   * Get low stock alerts
   */
  async getLowStockAlerts(threshold: number = 10): Promise<LowStockAlert[]> {
    try {
      const { data: lowStockProducts } = await this.supabase
        .from('products')
        .select('id, name, quantity, category_name, updated_at')
        .lte('quantity', threshold)
        .eq('in_stock', true)
        .order('quantity', { ascending: true })

      if (!lowStockProducts) return []

      return lowStockProducts.map(product => ({
        productId: product.id,
        productName: product.name,
        currentStock: product.quantity,
        category: product.category_name,
        lastRestocked: product.updated_at,
        urgency: product.quantity === 0 ? 'high' : 
                product.quantity <= 3 ? 'medium' : 'low'
      }))
    } catch (error) {
      console.error('Get low stock alerts error:', error)
      return []
    }
  }

  /**
   * Private helper methods
   */
  private async getProductStats() {
    const { count: totalProducts } = await this.supabase
      .from('products')
      .select('*', { count: 'exact', head: true })

    const { count: inStockProducts } = await this.supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('in_stock', true)

    const { count: outOfStockProducts } = await this.supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('in_stock', false)

    const { count: lowStockProducts } = await this.supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lte('quantity', 10)

    return {
      totalProducts: totalProducts || 0,
      inStockProducts: inStockProducts || 0,
      outOfStockProducts: outOfStockProducts || 0,
      lowStockProducts: lowStockProducts || 0
    }
  }

  private async getCategoryStats() {
    const { count: totalCategories } = await this.supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })

    // Get top category by product count
    const { data: categoryData } = await this.supabase
      .from('products')
      .select('category_name')
      .not('category_name', 'is', null)

    let topCategory: string | null = null
    if (categoryData && categoryData.length > 0) {
      const categoryCount: { [key: string]: number } = {}
      categoryData.forEach(product => {
        const category = product.category_name
        categoryCount[category] = (categoryCount[category] || 0) + 1
      })

      topCategory = Object.keys(categoryCount).reduce((a, b) => 
        categoryCount[a] > categoryCount[b] ? a : b
      )
    }

    return {
      totalCategories: totalCategories || 0,
      topCategory
    }
  }

  private async getOrderStats() {
    const { count: totalOrders } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    const { count: pendingOrders } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: completedOrders } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'delivered')

    const { count: cancelledOrders } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')

    return {
      totalOrders: totalOrders || 0,
      pendingOrders: pendingOrders || 0,
      completedOrders: completedOrders || 0,
      cancelledOrders: cancelledOrders || 0
    }
  }

  private async getTransactionStats() {
    const { count: totalTransactions } = await this.supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })

    const { count: pendingTransactions } = await this.supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: completedTransactions } = await this.supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')

    const { count: failedTransactions } = await this.supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')

    return {
      totalTransactions: totalTransactions || 0,
      pendingTransactions: pendingTransactions || 0,
      completedTransactions: completedTransactions || 0,
      failedTransactions: failedTransactions || 0
    }
  }

  private async getRevenueStats() {
    // Total revenue from completed orders
    const { data: completedOrders } = await this.supabase
      .from('orders')
      .select('total_amount, created_at')
      .eq('status', 'delivered')

    let totalRevenue = 0
    let monthlyRevenue = 0
    let dailyRevenue = 0

    if (completedOrders && completedOrders.length > 0) {
      totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_amount, 0)

      // Calculate monthly revenue (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      monthlyRevenue = completedOrders
        .filter(order => new Date(order.created_at) >= thirtyDaysAgo)
        .reduce((sum, order) => sum + order.total_amount, 0)

      // Calculate daily revenue (today)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      dailyRevenue = completedOrders
        .filter(order => new Date(order.created_at) >= today)
        .reduce((sum, order) => sum + order.total_amount, 0)
    }

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      dailyRevenue: Math.round(dailyRevenue * 100) / 100
    }
  }

  private async getGrowthStats() {
    // Calculate growth percentages (simplified - comparing last 30 days vs previous 30 days)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Order growth
    const { count: recentOrders } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    const { count: previousOrders } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sixtyDaysAgo.toISOString())
      .lt('created_at', thirtyDaysAgo.toISOString())

    const orderGrowth = previousOrders && previousOrders > 0 
      ? ((recentOrders || 0) - previousOrders) / previousOrders * 100
      : 0

    // Revenue growth (simplified)
    const revenueGrowth = 0 // Would need more complex calculation

    // Get top selling product
    const { data: topProduct } = await this.supabase
      .from('order_items')
      .select('product_name, quantity')
      .order('quantity', { ascending: false })
      .limit(1)

    const topSellingProduct = topProduct && topProduct.length > 0 
      ? topProduct[0].product_name 
      : null

    return {
      orderGrowth: Math.round(orderGrowth * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      topSellingProduct
    }
  }
}
