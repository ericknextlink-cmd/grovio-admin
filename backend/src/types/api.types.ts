export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  errors?: string[]
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationResponse {
  currentPage: number
  totalPages: number
  totalItems: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface QueryParams {
  search?: string
  filter?: Record<string, any>
  pagination?: PaginationParams
}
