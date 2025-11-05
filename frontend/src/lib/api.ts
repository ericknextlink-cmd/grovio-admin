/* eslint-disable @typescript-eslint/no-explicit-any */

export const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3002'

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

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        }
      }
    }

    try {
      const response = await fetch(url, config)
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
