import { createClient } from '../config/supabase'
import { generateToken } from '../utils/auth'

export class TokenService {

  /**
   * Generate and store email verification token
   */
  async generateEmailVerificationToken(userId: string, email: string, tokenType: 'signup' | 'recovery' | 'email_change' = 'signup'): Promise<{ success: boolean; token?: string; message: string; errors?: string[] }> {
    try {
      const supabase = createClient()
      
      // Generate 6-digit OTP
      const token = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 10) // 10 minutes expiry

      // Store token in database
      const { error } = await supabase
        .from('email_verification_tokens')
        .insert({
          user_id: userId,
          email,
          token,
          token_type: tokenType,
          expires_at: expiresAt.toISOString()
        })

      if (error) {
        return {
          success: false,
          message: 'Failed to generate verification token',
          errors: [error.message]
        }
      }

      return {
        success: true,
        token,
        message: 'Verification token generated successfully'
      }
    } catch (error) {
      console.error('Generate email verification token error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Failed to generate verification token']
      }
    }
  }

  /**
   * Verify email verification token
   */
  async verifyEmailVerificationToken(email: string, token: string, tokenType: 'signup' | 'recovery' | 'email_change' = 'signup'): Promise<{ success: boolean; userId?: string; message: string; errors?: string[] }> {
    try {
      const supabase = createClient()

      // Get token from database
      const { data: tokenData, error: tokenError } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .eq('email', email)
        .eq('token', token)
        .eq('token_type', tokenType)
        .eq('is_used', false)
        .single()

      if (tokenError || !tokenData) {
        return {
          success: false,
          message: 'Invalid or expired token',
          errors: ['Token not found']
        }
      }

      // Check if token is expired
      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)
      
      if (now > expiresAt) {
        return {
          success: false,
          message: 'Token has expired',
          errors: ['Please request a new verification code']
        }
      }

      // Mark token as used
      const { error: updateError } = await supabase
        .from('email_verification_tokens')
        .update({ is_used: true })
        .eq('id', tokenData.id)

      if (updateError) {
        return {
          success: false,
          message: 'Failed to verify token',
          errors: [updateError.message]
        }
      }

      return {
        success: true,
        userId: tokenData.user_id,
        message: 'Token verified successfully'
      }
    } catch (error) {
      console.error('Verify email verification token error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Token verification failed']
      }
    }
  }

  /**
   * Generate account recovery token
   */
  async generateRecoveryToken(email: string): Promise<{ success: boolean; token?: string; message: string; errors?: string[] }> {
    try {
      const supabase = createClient()
      
      const recoveryToken = generateToken(32)
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours expiry

      // Update deleted user record with recovery token
      const { error } = await supabase
        .from('deleted_users')
        .update({
          recovery_token: recoveryToken,
          recovery_expires_at: expiresAt.toISOString()
        })
        .eq('email', email)
        .eq('can_recover', true)

      if (error) {
        return {
          success: false,
          message: 'Failed to generate recovery token',
          errors: [error.message]
        }
      }

      return {
        success: true,
        token: recoveryToken,
        message: 'Recovery token generated successfully'
      }
    } catch (error) {
      console.error('Generate recovery token error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Failed to generate recovery token']
      }
    }
  }

  /**
   * Verify account recovery token
   */
  async verifyRecoveryToken(email: string, token: string): Promise<{ success: boolean; deletedUser?: unknown; message: string; errors?: string[] }> {
    try {
      const supabase = createClient()

      // Get deleted user record with recovery token
      const { data: deletedUser, error } = await supabase
        .from('deleted_users')
        .select('*')
        .eq('email', email)
        .eq('recovery_token', token)
        .eq('can_recover', true)
        .single()

      if (error || !deletedUser) {
        return {
          success: false,
          message: 'Invalid or expired recovery token',
          errors: ['Recovery token not found']
        }
      }

      // Check if token is expired
      const now = new Date()
      const expiresAt = new Date(deletedUser.recovery_expires_at)
      
      if (now > expiresAt) {
        return {
          success: false,
          message: 'Recovery token has expired',
          errors: ['Please request a new recovery link']
        }
      }

      return {
        success: true,
        deletedUser,
        message: 'Recovery token verified successfully'
      }
    } catch (error) {
      console.error('Verify recovery token error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Recovery token verification failed']
      }
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const supabase = createClient()
      const now = new Date().toISOString()

      // Clean up expired email verification tokens
      await supabase
        .from('email_verification_tokens')
        .delete()
        .lt('expires_at', now)

      // Clean up expired recovery tokens
      await supabase
        .from('deleted_users')
        .update({
          recovery_token: null,
          recovery_expires_at: null
        })
        .lt('recovery_expires_at', now)

    } catch (error) {
      console.error('Cleanup expired tokens error:', error)
    }
  }
}
