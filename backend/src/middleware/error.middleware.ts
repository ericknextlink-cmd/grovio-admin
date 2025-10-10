import { Request, Response, NextFunction } from 'express'

export interface ApiError extends Error {
  statusCode?: number
  isOperational?: boolean
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = error

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation Error'
  } else if (error.name === 'CastError') {
    statusCode = 400
    message = 'Invalid data format'
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  // Log error for debugging
  console.error(`Error ${statusCode}: ${message}`)
  console.error(error.stack)

  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  res.status(statusCode).json({
    success: false,
    message: isDevelopment ? message : 'Something went wrong',
    ...(isDevelopment && { 
      error: error.message,
      stack: error.stack 
    })
  })
}

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Create custom API error
 */
export const createApiError = (message: string, statusCode: number = 500): ApiError => {
  const error: ApiError = new Error(message)
  error.statusCode = statusCode
  error.isOperational = true
  return error
}
