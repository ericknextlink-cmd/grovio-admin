/* eslint-disable @typescript-eslint/no-explicit-any */

import { getAdminToken, getCookie } from './cookies'

// Get backend URL from environment variables
// In Next.js, client-side env vars must be prefixed with NEXT_PUBLIC_
const getBackendUrl = () => {
  // First try NEXT_PUBLIC_BACKEND_URL (available in browser)
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL
  }
  
  // Then try BACKEND_URL (server-side only)
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL
  }
  
  // Fallback: use deployed URL if in production, otherwise localhost
  if (typeof window !== 'undefined') {
    // In browser, use deployed URL or empty string (relative URLs)
    return process.env.NODE_ENV === 'production' 
      ? 'https://grovio-backend.onrender.com' 
      : ''
  }
  
  // Server-side fallback
  return ''
}

// export const API_BASE_URL = getBackendUrl()
export const API_BASE_URL = 'https://grovio-backend.onrender.com'
// export const API_BASE_URL = 'http://localhost:3001'

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  errors?: string[]
}

/**
 * Check if an endpoint requires admin authentication
 * Admin routes include: /api/admin/*, /api/dashboard/*, and write operations on /api/products, /api/categories, etc.
 */
function isAdminRoute(endpoint: string, method: string = 'GET'): boolean {
  // Admin-specific routes
  if (endpoint.includes('/api/admin/') || endpoint.includes('/api/dashboard/') || endpoint.includes('/api/pricing')) {
    return true
  }

  // All AI products routes are admin-only (including GET list/detail)
  if (endpoint.includes('/api/ai-products')) {
    return true
  }

  // Admin orders/transactions list (GET)
  if (endpoint.includes('/api/orders/admin')) {
    return true
  }
  
  // Write operations on products, categories, etc. require admin auth
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (writeMethods.includes(method.toUpperCase())) {
    if (
      endpoint.includes('/api/products') ||
      endpoint.includes('/api/categories') ||
      endpoint.includes('/api/orders') ||
      endpoint.includes('/api/transactions') ||
      endpoint.includes('/api/upload') ||
      endpoint.includes('/api/bundles')
    ) {
      return true
    }
  }
  
  return false
}

class ApiClient {
  private baseUrl: string
  private refreshingToken: boolean = false
  private refreshPromise: Promise<string | null> | null = null

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
  }

  /**
   * Refresh admin token
   */
  private async refreshAdminToken(): Promise<string | null> {
    // If already refreshing, return the existing promise
    if (this.refreshingToken && this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshingToken = true
    this.refreshPromise = this._doRefreshToken()
    
    try {
      const token = await this.refreshPromise
      return token
    } finally {
      this.refreshingToken = false
      this.refreshPromise = null
    }
  }

  private async _doRefreshToken(): Promise<string | null> {
    try {
      const currentToken = getAdminToken()
      if (!currentToken) return null

      const response = await fetch(`${this.baseUrl}/api/admin/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
      })

      if (!response.ok) {
        // If refresh fails, clear tokens
        if (typeof window !== 'undefined') {
          const { clearAdminCookies } = await import('./cookies')
          clearAdminCookies()
        }
        return null
      }

      const data = await response.json()
      if (data.success && data.data?.token) {
        // Token is set via cookie by the server, but we also get it in response
        return data.data.token
      }

      return null
    } catch (error) {
      console.error('Token refresh error:', error)
      return null
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    const method = options.method || 'GET'
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies in all requests
    }

    // Add auth token if available
    // Check cookies first, then fallback to localStorage for backward compatibility
    if (typeof window !== 'undefined') {
      const needsAdminAuth = isAdminRoute(endpoint, method)
      
      if (needsAdminAuth) {
        // Try cookie first, then localStorage as fallback
        let token = getAdminToken()
        if (!token) {
          token = localStorage.getItem('admin_token')
        }
        
        if (token) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`,
          }
        }
      } else {
        // Regular user auth token
        const authToken = getCookie('auth_token') || 
                         localStorage.getItem('auth_token') || 
                         sessionStorage.getItem('auth_token')
        
        if (authToken) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${authToken}`,
          }
        }
      }
    }

    try {
      const response = await fetch(url, config)
      
      // If 401 and admin route, try to refresh token
      if (response.status === 401 && typeof window !== 'undefined' && isAdminRoute(endpoint, method)) {
        const newToken = await this.refreshAdminToken()
        
        if (newToken) {
          // Retry request with new token
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          }
          const retryResponse = await fetch(url, config)
          const retryData = await retryResponse.json()
          
          if (!retryResponse.ok) {
            return {
              success: false,
              message: retryData.message || 'Request failed',
              errors: retryData.errors || [],
            } as ApiResponse<T>
          }
          
          return retryData as ApiResponse<T>
        } else {
          // Refresh failed, redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/signin'
          }
        }
      }
      
      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Request failed',
          errors: data.errors || [],
        } as ApiResponse<T>
      }

      return data as ApiResponse<T>
    } catch (error) {
      console.error('API request error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error occurred',
        errors: ['Failed to connect to the server'],
      } as ApiResponse<T>
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value))
        }
      })
      url += `?${searchParams.toString()}`
    }
    return this.request<T>(url, { method: 'GET' })
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Products API
export const productsApi = {
  getAll: (params?: {
    page?: number
    limit?: number
    category?: string
    subcategory?: string
    search?: string
    inStock?: boolean
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) => apiClient.get<any>('/api/products', params),

  getById: (id: string) => apiClient.get<any>(`/api/products/${id}`),

  create: (data: any) => apiClient.post<any>('/api/products', data),

  bulkCreate: (products: Array<{ name: string; code?: string; unitPrice: number; category_name?: string }>) =>
    apiClient.post<any>('/api/products/bulk', { products }),

  update: (id: string, data: any) => apiClient.put<any>(`/api/products/${id}`, data),

  delete: (id: string) => apiClient.delete<any>(`/api/products/${id}`),

  updateStock: (id: string, quantity: number, inStock: boolean) =>
    apiClient.patch<any>(`/api/products/${id}/stock`, { quantity, inStock }),

  getStats: () => apiClient.get<any>('/api/products/admin/stats'),
}

// AI Products API
export const aiProductsApi = {
  generate: (count?: number) => apiClient.post<any>('/api/ai-products/generate', { count }),

  getAll: (params?: {
    page?: number
    limit?: number
    status?: 'draft' | 'published' | 'archived'
    category?: string
    search?: string
  }) => apiClient.get<any>('/api/ai-products', params),

  getById: (id: string) => apiClient.get<any>(`/api/ai-products/${id}`),

  update: (id: string, data: any) => apiClient.put<any>(`/api/ai-products/${id}`, data),

  delete: (id: string) => apiClient.delete<any>(`/api/ai-products/${id}`),

  publish: (id: string) => apiClient.post<any>(`/api/ai-products/${id}/publish`),

  unpublish: (id: string) => apiClient.post<any>(`/api/ai-products/${id}/unpublish`),

  archive: (id: string) => apiClient.post<any>(`/api/ai-products/${id}/archive`),
}

// Dashboard API
export const dashboardApi = {
  getStats: () => apiClient.get<any>('/api/dashboard/stats'),
  getActivities: (limit?: number) => apiClient.get<any>('/api/dashboard/activities', { limit }),
  getAnalytics: (period?: number) => apiClient.get<any>('/api/dashboard/analytics', { period }),
  getAlerts: (threshold?: number) => apiClient.get<any>('/api/dashboard/alerts', { threshold }),
}

// Admin orders & transactions (live DB)
export const ordersApi = {
  getAdminOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<{ data: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>('/api/orders/admin/orders', params),
  getAdminTransactions: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<{ data: unknown[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>('/api/orders/admin/transactions', params),
  updateOrderStatus: (orderId: string, status: string, reason?: string) =>
    apiClient.put<any>(`/api/orders/${orderId}/status`, { status, reason }),
}

// Categories API
export const categoriesApi = {
  getAll: (params?: {
    search?: string
  }) => apiClient.get<any>('/api/categories', params),

  getById: (id: string) => apiClient.get<any>(`/api/categories/${id}`),

  create: (data: any) => apiClient.post<any>('/api/categories', data),

  update: (id: string, data: any) => apiClient.put<any>(`/api/categories/${id}`, data),

  delete: (id: string) => apiClient.delete<any>(`/api/categories/${id}`),
}

// Bundles API (GET public; generate/refresh/create admin)
export const bundlesApi = {
  getAll: (params?: { category?: string; source?: 'ai' | 'admin'; page?: number; limit?: number; offset?: number }) =>
    apiClient.get<any>('/api/bundles', params),
  getById: (bundleId: string) => apiClient.get<any>(`/api/bundles/${bundleId}`),
  createManual: (body: { title: string; description?: string; category?: string; productIds: string[] }) =>
    apiClient.post<any>('/api/bundles', body),
  generate: (body: { count?: number; prompt?: string; budgetMin?: number; budgetMax?: number; productsPerBundle?: number }) =>
    apiClient.post<any>('/api/bundles/generate', body),
  refresh: () => apiClient.post<any>('/api/bundles/refresh'),
}

// Admin vouchers (create, list, assign, preview image)
export const adminVouchersApi = {
  list: () => apiClient.get<Array<{
    id: string
    code: string
    discount_type: string
    discount_value: number
    description: string | null
    image_type: string | null
    min_order_amount: number
    valid_from: string
    valid_until: string | null
    max_uses: number | null
    use_count: number
    created_at: string
  }>>('/api/admin/vouchers'),

  create: (body: {
    code: string
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    description?: string
    image_type?: 'regular' | 'nss'
    min_order_amount?: number
    valid_until?: string
    max_uses?: number
  }) => apiClient.post<{ id: string; code: string }>('/api/admin/vouchers', body),

  update: (voucherId: string, body: {
    code?: string
    discount_type?: 'percentage' | 'fixed'
    discount_value?: number
    description?: string | null
    image_type?: 'regular' | 'nss' | null
    min_order_amount?: number
    valid_until?: string | null
    max_uses?: number | null
  }) => apiClient.put<{ id: string; code: string }>(`/api/admin/vouchers/${voucherId}`, body),

  assign: (userId: string, voucherId: string) =>
    apiClient.post<{ ok: boolean }>('/api/admin/vouchers/assign', { userId, voucherId }),

  listUsers: () => apiClient.get<Array<{ id: string; email: string; name: string }>>('/api/admin/vouchers/users'),

  listAssignments: (voucherId?: string) =>
    apiClient.get<Array<{
      id: string
      voucher_id: string
      user_id: string
      used_at: string | null
      created_at: string
      user_email: string | null
      user_name: string | null
    }>>('/api/admin/vouchers/assignments', voucherId ? { voucherId } : undefined),

  revokeAssignment: (assignmentId: string) =>
    apiClient.delete<{ ok: boolean }>(`/api/admin/vouchers/assignments/${assignmentId}`),

  listTemplates: () =>
    apiClient.get<{
      bucket: string
      prefix: string
      files: Array<{ name: string; id: string | null; updated_at: string | null; created_at: string | null }>
    }>('/api/admin/vouchers/templates'),

  getPreviewImageUrl: (voucherId: string, imageType: 'regular' | 'nss', userName?: string, expiryText?: string): string => {
    const params = new URLSearchParams({ imageType })
    if (userName) params.set('userName', userName)
    if (expiryText) params.set('expiryText', expiryText)
    return `${API_BASE_URL}/api/admin/vouchers/${voucherId}/preview-image?${params.toString()}`
  },

  fetchPreviewImageBlobUrl: async (
    voucherId: string,
    imageType: 'regular' | 'nss',
    userName?: string,
    expiryText?: string,
    templateName?: string
  ): Promise<string> => {
    const params = new URLSearchParams({ imageType })
    if (userName) params.set('userName', userName)
    if (expiryText) params.set('expiryText', expiryText)
    if (templateName) params.set('templateName', templateName)
    const url = `${API_BASE_URL}/api/admin/vouchers/${voucherId}/preview-image?${params.toString()}`
    const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || document.cookie.match(/admin_token=([^;]+)/)?.[1]) : ''
    const res = await fetch(url, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Failed to load preview image')
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },
}

// Pricing API (admin)
export const pricingApi = {
  getRanges: () => apiClient.get<any>('/api/pricing/ranges'),
  applyPricing: (ranges: Array<{ min_value: number; max_value: number; percentage: number }>) =>
    apiClient.post<any>('/api/pricing/apply', { ranges }),
  applyDiscounts: (ranges: Array<{ min_value: number; max_value: number; percentage: number }>) =>
    apiClient.post<any>('/api/pricing/apply-discounts', { ranges }),
  applyBundleMarkup: (percentage: number) =>
    apiClient.post<any>('/api/pricing/apply-bundle-markup', { percentage }),
}

// AI API - Uses local proxy route to mask backend and handle auth
export const aiApi = {
  getSupplierRecommendations: (payload: {
    message: string
    familySize?: number
    budget?: number
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'all'
    budgetMode?: 'combined' | 'per_meal'
  }) =>
    apiClient.post<{
      response: string
      recommendedProducts: Array<{id: string, name: string, price: number, quantity: number}>
      allRecommendedProducts?: Array<{
        id: string
        name: string
        price: number
        quantity: number
        image?: string
        category?: string
        deliberationReason?: string
        isInFinalList?: boolean
      }>
    }>('/api/ai/supplier-recommendations', payload),
}
