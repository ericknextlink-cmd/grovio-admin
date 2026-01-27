import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service'
import { UserService } from '../services/user.service'
import { ApiResponse } from '../types/api.types'
import { SignupRequest, SigninRequest, GoogleAuthRequest } from '../types/auth'

export class AuthController {
  private authService: AuthService
  private userService: UserService

  constructor() {
    this.authService = new AuthService()
    this.userService = new UserService()
  }

  /**
   * User signup with email and password
   */
  signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const signupData: SignupRequest = req.body
      const result = await this.authService.signUp(signupData)

      if (result.success) {
        res.status(201).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Signup controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during signup']
      } as ApiResponse)
    }
  }

  /**
   * User signin with email and password
   */
  signin = async (req: Request, res: Response): Promise<void> => {
    try {
      const signinData: SigninRequest = req.body
      const result = await this.authService.signIn(signinData)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(401).json(result)
      }
    } catch (error) {
      console.error('Signin controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during signin']
      } as ApiResponse)
    }
  }

  /**
   * Initiate Google OAuth flow
   * Redirects directly to Google
   */
  initiateGoogleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      const redirectTo = req.query.redirectTo as string || '/'
      const result = await this.authService.initiateGoogleAuth(redirectTo, req, res)

      if (!result.success || !result.url) {
        res.status(500).json(result)
        return
      }

      console.log('Redirecting to Google OAuth')

      // Set redirect cookie if provided
      if (result.cookieName && result.cookieValue) {
        const isProduction = process.env.NODE_ENV === 'production'
        res.cookie(result.cookieName, result.cookieValue, {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? 'none' : 'lax',
          maxAge: 10 * 60 * 1000, // 10 minutes
          path: '/',
        })
      }

      // Redirect directly to Google OAuth URL
      res.redirect(result.url)
    } catch (error) {
      console.error('Initiate Google auth error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Failed to initiate Google authentication']
      } as ApiResponse)
    }
  }

  /**
   * Handle OAuth session from frontend (client-side OAuth flow)
   * Frontend exchanges code for session client-side, then sends session here
   */
  handleOAuthSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { session } = req.body

      if (!session) {
        res.status(400).json({
          success: false,
          message: 'Session data is required',
          errors: ['Please provide session data from Supabase']
        } as ApiResponse)
        return
      }

      const result = await this.authService.handleGoogleCallbackSession(session)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Handle OAuth session error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while processing OAuth session']
      } as ApiResponse)
    }
  }

  /**
   * Handle Google OAuth callback (server-side SSR flow with PKCE)
   * Exchanges authorization code for session using PKCE code verifier from cookies
   * Redirects to frontend with session cookies set
   */
  googleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const code = req.query.code as string
      const error = req.query.error as string
      const errorDescription = req.query.error_description as string
      
      // Determine frontend URL
      // Use FRONTEND_URL env var, or referer, or default to localhost:3000
      let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      
      // Clean up trailing slash
      if (frontendUrl.endsWith('/')) {
        frontendUrl = frontendUrl.slice(0, -1)
      }

      // Handle OAuth errors
      if (error) {
        console.error('Google OAuth error:', error, errorDescription)
        res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorDescription || error)}`)
        return
      }

      // Handle missing authorization code
      if (!code) {
        console.error('Missing authorization code')
        res.redirect(`${frontendUrl}/login?error=missing_code`)
        return
      }

      // Exchange code for session (server-side SSR flow with PKCE)
      console.log('Processing Google OAuth callback with code exchange...')
      const result = await this.authService.handleGoogleCallback(code, req, res)

      // Clear redirect cookie if it exists
      const cookieName = 'grovio_oauth_redirect'
      if (req.cookies?.[cookieName]) {
        res.clearCookie(cookieName, { path: '/' })
      }

      if (result.success && result.session) {
        console.log('OAuth callback successful, redirecting to frontend')
        
        // Redirect to the stored redirect path or dashboard
        const redirectPath = result.redirectTo || '/'
        
        // Ensure path starts with /
        const safePath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`
        
        res.redirect(`${frontendUrl}${safePath}`)
      } else {
        console.error('OAuth callback failed:', result.errors)
        res.redirect(`${frontendUrl}/login?error=auth_failed&message=${encodeURIComponent(result.message || 'Authentication failed')}`)
      }
    } catch (error) {
      console.error('Google callback error:', error)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      res.redirect(`${frontendUrl}/login?error=server_error`)
    }
  }

  /**
   * Google OAuth authentication (ID token method - legacy)
   */
  googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
      const googleData: GoogleAuthRequest = req.body
      const result = await this.authService.googleAuth(googleData)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(401).json(result)
      }
    } catch (error) {
      console.error('Google auth controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during Google authentication']
      } as ApiResponse)
    }
  }

  /**
   * User signout
   */
  signout = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.signOut(req)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(500).json(result)
      }
    } catch (error) {
      console.error('Signout controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during signout']
      } as ApiResponse)
    }
  }

  /**
   * Get current user profile
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
          errors: ['Please sign in']
        } as ApiResponse)
        return
      }

      const result = await this.userService.getUserProfile(userId)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(404).json(result)
      }
    } catch (error) {
      console.error('Get profile controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while fetching profile']
      } as ApiResponse)
    }
  }

  /**
   * Update user profile
   */
  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
          errors: ['Please sign in']
        } as ApiResponse)
        return
      }

      const updateData = req.body
      const result = await this.userService.updateUserProfile(userId, updateData)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Update profile controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while updating profile']
      } as ApiResponse)
    }
  }

  /**
   * Refresh access token
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required',
          errors: ['Missing refresh token']
        } as ApiResponse)
        return
      }

      const result = await this.authService.refreshToken(refreshToken)

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(401).json(result)
      }
    } catch (error) {
      console.error('Refresh token controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while refreshing token']
      } as ApiResponse)
    }
  }
}
