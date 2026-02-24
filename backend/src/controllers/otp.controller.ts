import { Request, Response } from 'express'
import { EmailService } from '../services/email.service'
import { TokenService } from '../services/token.service'
import { ApiResponse } from '../types/api.types'

export class OtpController {
  private emailService: EmailService
  private tokenService: TokenService

  constructor() {
    this.emailService = new EmailService()
    this.tokenService = new TokenService()
  }

  /**
   * Send email verification OTP
   */
  sendEmailOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body as { email?: string }

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          errors: ['Email address is missing']
        } as ApiResponse)
        return
      }

      const result = await this.emailService.sendVerificationEmail(email, {
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/verify`
      })

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Send email OTP controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while sending verification email']
      } as ApiResponse)
    }
  }

  /**
   * Verify email OTP
   */
  verifyEmailOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, token } = req.body

      if (!email || !token) {
        res.status(400).json({
          success: false,
          message: 'Email and OTP token are required',
          errors: ['Missing required fields']
        } as ApiResponse)
        return
      }

      const result = await this.emailService.verifyEmailOtp(email, token)

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            session: result.session
          }
        })
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Verify email OTP controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while verifying OTP']
      } as ApiResponse)
    }
  }

  /**
   * Verify email with token hash (PKCE flow)
   */
  verifyTokenHash = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token_hash, type = 'email' } = req.query

      if (!token_hash) {
        res.status(400).json({
          success: false,
          message: 'Token hash is required',
          errors: ['Missing token hash parameter']
        } as ApiResponse)
        return
      }

      const result = await this.emailService.verifyEmailWithTokenHash(
        token_hash as string,
        type as 'email' | 'recovery'
      )

      if (result.success) {
        // Redirect to success page or return JSON based on Accept header
        const acceptsJson = req.headers.accept?.includes('application/json')
        
        if (acceptsJson) {
          res.status(200).json({
            success: true,
            message: result.message,
            data: {
              session: result.session
            }
          })
        } else {
          // Redirect to frontend success page
          const redirectUrl = `${process.env.FRONTEND_URL}/auth/verified?success=true`
          res.redirect(redirectUrl)
        }
      } else {
        const acceptsJson = req.headers.accept?.includes('application/json')
        
        if (acceptsJson) {
          res.status(400).json(result)
        } else {
          // Redirect to frontend error page
          const redirectUrl = `${process.env.FRONTEND_URL}/auth/verified?success=false&error=${encodeURIComponent(result.message)}`
          res.redirect(redirectUrl)
        }
      }
    } catch (error) {
      console.error('Verify token hash controller error:', error)
      
      const acceptsJson = req.headers.accept?.includes('application/json')
      
      if (acceptsJson) {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          errors: ['Something went wrong while verifying token']
        } as ApiResponse)
      } else {
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/verified?success=false&error=Internal server error`
        res.redirect(redirectUrl)
      }
    }
  }

  /**
   * Send password reset email
   */
  sendPasswordResetOtp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
          errors: ['Email address is missing']
        } as ApiResponse)
        return
      }

      const result = await this.emailService.sendPasswordResetEmail(email, {
        emailRedirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`
      })

      if (result.success) {
        res.status(200).json(result)
      } else {
        res.status(400).json(result)
      }
    } catch (error) {
      console.error('Send password reset OTP controller error:', error)
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while sending password reset email']
      } as ApiResponse)
    }
  }
}
