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
   * Google OAuth authentication
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
