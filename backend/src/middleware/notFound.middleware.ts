import { Request, Response } from 'express'

/**
 * 404 Not Found middleware
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    error: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: {
      health: 'GET /api/health',
      auth: {
        signup: 'POST /api/auth/signup',
        signin: 'POST /api/auth/signin',
        google: 'POST /api/auth/google',
        signout: 'POST /api/auth/signout',
        profile: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/me',
        refreshToken: 'POST /api/auth/refresh'
      }
    }
  })
}
