import { createClient } from '../config/supabase'

export class EmailService {

  /**
   * Send email verification OTP
   */
  async sendVerificationEmail(email: string, options?: { emailRedirectTo?: string }): Promise<{ success: boolean; message: string; errors?: string[] }> {
    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: options?.emailRedirectTo
        }
      })

      if (error) {
        return {
          success: false,
          message: 'Failed to send verification email',
          errors: [error.message]
        }
      }

      return {
        success: true,
        message: 'Verification email sent successfully'
      }
    } catch (error) {
      console.error('Send verification email error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Failed to send verification email']
      }
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, options?: { emailRedirectTo?: string }): Promise<{ success: boolean; message: string; errors?: string[] }> {
    try {
      const supabase = createClient()

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: options?.emailRedirectTo
      })

      if (error) {
        return {
          success: false,
          message: 'Failed to send password reset email',
          errors: [error.message]
        }
      }

      return {
        success: true,
        message: 'Password reset email sent successfully'
      }
    } catch (error) {
      console.error('Send password reset email error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Failed to send password reset email']
      }
    }
  }

  /**
   * Verify email OTP
   */
  async verifyEmailOtp(email: string, token: string): Promise<{ success: boolean; message: string; session?: unknown; errors?: string[] }> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      })

      if (error) {
        return {
          success: false,
          message: 'OTP verification failed',
          errors: [error.message]
        }
      }

      return {
        success: true,
        message: 'Email verified successfully',
        session: data.session
      }
    } catch (error) {
      console.error('Verify email OTP error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['OTP verification failed']
      }
    }
  }

  /**
   * Verify email with token hash (PKCE flow)
   */
  async verifyEmailWithTokenHash(tokenHash: string, type: 'email' | 'recovery' = 'email'): Promise<{ success: boolean; message: string; session?: unknown; errors?: string[] }> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type
      })

      if (error) {
        return {
          success: false,
          message: 'Token verification failed',
          errors: [error.message]
        }
      }

      return {
        success: true,
        message: 'Email verified successfully',
        session: data.session
      }
    } catch (error) {
      console.error('Verify email token hash error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Token verification failed']
      }
    }
  }

  /**
   * Send account recovery email with recovery token
   * Uses Resend API if RESEND_API_KEY is configured, otherwise logs an error
   * Based on Supabase documentation: https://supabase.com/docs/guides/functions/examples/send-emails
   */
  async sendAccountRecoveryEmail(
    email: string, 
    recoveryToken: string, 
    options?: { 
      recoveryUrl?: string
      fromEmail?: string
      frontendUrl?: string
    }
  ): Promise<{ success: boolean; message: string; errors?: string[] }> {
    try {
      const resendApiKey = process.env.RESEND_API_KEY
      const frontendUrl = options?.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3001'
      const fromEmail = options?.fromEmail || process.env.EMAIL_FROM || 'noreply@grovio.com'
      
      // Build recovery URL
      const recoveryUrl = options?.recoveryUrl || `${frontendUrl}/account/recover?email=${encodeURIComponent(email)}&token=${encodeURIComponent(recoveryToken)}`

      // If Resend API key is not configured, log error and return
      if (!resendApiKey) {
        console.error('RESEND_API_KEY not configured. Cannot send account recovery email.')
        console.log('Account recovery email details:', {
          email,
          recoveryToken,
          recoveryUrl,
          message: 'Email service not configured. Please set RESEND_API_KEY environment variable.'
        })
        return {
          success: false,
          message: 'Email service not configured',
          errors: ['RESEND_API_KEY environment variable is not set. Please configure email service to send recovery emails.']
        }
      }

      // Send email using Resend API
      // Documentation: https://supabase.com/docs/guides/functions/examples/send-emails
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: 'Account Recovery - Grovio',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Account Recovery</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h1 style="color: #2563eb; margin-top: 0;">Account Recovery Request</h1>
                  <p>Hello,</p>
                  <p>We received a request to recover your Grovio account. If you didn't make this request, you can safely ignore this email.</p>
                  <p>To recover your account, click the button below or copy and paste the link into your browser:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${recoveryUrl}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                      Recover Account
                    </a>
                  </div>
                  <p style="font-size: 14px; color: #666;">
                    Or copy and paste this link into your browser:<br>
                    <a href="${recoveryUrl}" style="color: #2563eb; word-break: break-all;">${recoveryUrl}</a>
                  </p>
                  <p style="font-size: 14px; color: #666;">
                    <strong>Recovery Token:</strong> ${recoveryToken}
                  </p>
                  <p style="font-size: 14px; color: #666;">
                    This link will expire in 24 hours. If you need a new recovery link, please request one again.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                  <p style="font-size: 12px; color: #999; margin-bottom: 0;">
                    If you didn't request this email, you can safely ignore it. Your account will remain unchanged.
                  </p>
                  <p style="font-size: 12px; color: #999; margin-top: 10px;">
                    © ${new Date().getFullYear()} Grovio. All rights reserved.
                  </p>
                </div>
              </body>
            </html>
          `,
          text: `
Account Recovery Request

Hello,

We received a request to recover your Grovio account. If you didn't make this request, you can safely ignore this email.

To recover your account, please visit the following link:
${recoveryUrl}

Recovery Token: ${recoveryToken}

This link will expire in 24 hours. If you need a new recovery link, please request one again.

If you didn't request this email, you can safely ignore it. Your account will remain unchanged.

© ${new Date().getFullYear()} Grovio. All rights reserved.
          `.trim(),
        }),
      })

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}))
        console.error('Resend API error:', errorData)
        return {
          success: false,
          message: 'Failed to send recovery email',
          errors: [errorData.message || `Email service returned status ${emailResponse.status}`]
        }
      }

      const emailData = await emailResponse.json()
      console.log('Account recovery email sent successfully:', {
        email,
        messageId: emailData.id,
      })

      return {
        success: true,
        message: 'Account recovery email sent successfully'
      }
    } catch (error) {
      console.error('Send account recovery email error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: [error instanceof Error ? error.message : 'Failed to send recovery email']
      }
    }
  }

  /**
   * Send invoice email after payment (Resend)
   * Sends a link to download the invoice PDF.
   */
  async sendInvoiceEmail(
    to: string,
    options: {
      customerName: string
      orderNumber: string
      invoicePdfUrl: string
      fromEmail?: string
    }
  ): Promise<{ success: boolean; message: string; errors?: string[] }> {
    try {
      const resendApiKey = process.env.RESEND_API_KEY
      const fromEmail = options.fromEmail || process.env.EMAIL_FROM || 'orders@grovio.com'

      if (!resendApiKey) {
        console.warn('RESEND_API_KEY not set. Skipping invoice email.')
        return {
          success: false,
          message: 'Email service not configured',
          errors: ['RESEND_API_KEY not set']
        }
      }

      const { customerName, orderNumber, invoicePdfUrl } = options
      const displayName = customerName?.trim() || 'Customer'

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to,
          subject: `Your Grovio invoice – Order ${orderNumber}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Your Invoice</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                  <h1 style="color: #2563eb; margin-top: 0;">Thank you for your order</h1>
                  <p>Hi ${displayName},</p>
                  <p>Your payment was successful. Please find your invoice for order <strong>${orderNumber}</strong> below.</p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${invoicePdfUrl}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                      Download invoice (PDF)
                    </a>
                  </div>
                  <p style="font-size: 14px; color: #666;">
                    Or copy this link: <a href="${invoicePdfUrl}" style="color: #2563eb; word-break: break-all;">${invoicePdfUrl}</a>
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                  <p style="font-size: 12px; color: #999;">
                    Grovio – Redefining the Way You Save.
                  </p>
                </div>
              </body>
            </html>
          `,
          text: `
Thank you for your order

Hi ${displayName},

Your payment was successful. Download your invoice for order ${orderNumber} here:

${invoicePdfUrl}

Grovio – Redefining the Way You Save.
          `.trim(),
        }),
      })

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}))
        console.error('Resend invoice email error:', errorData)
        return {
          success: false,
          message: 'Failed to send invoice email',
          errors: [errorData.message || `Resend returned ${emailResponse.status}`]
        }
      }

      const emailData = await emailResponse.json()
      console.log('Invoice email sent via Resend:', { to, orderNumber, messageId: emailData.id })
      return {
        success: true,
        message: 'Invoice email sent successfully'
      }
    } catch (error) {
      console.error('Send invoice email error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: [error instanceof Error ? error.message : 'Failed to send invoice email']
      }
    }
  }

  /**
   * Send scheduled order reminder (1 day before). Uses Resend when RESEND_API_KEY is set.
   */
  async sendScheduledOrderReminder(
    email: string,
    options: { userName?: string; scheduledDate: string; bundleTitle: string; shopUrl?: string }
  ): Promise<{ success: boolean; message: string; errors?: string[] }> {
    try {
      const resendApiKey = process.env.RESEND_API_KEY
      const fromEmail = process.env.EMAIL_FROM || 'noreply@grovio.com'
      const shopUrl = options.shopUrl || process.env.FRONTEND_URL || 'http://localhost:3000'

      if (!resendApiKey) {
        console.warn('RESEND_API_KEY not set. Scheduled order reminder not sent.', { email, ...options })
        return {
          success: false,
          message: 'Email service not configured',
          errors: ['RESEND_API_KEY not set'],
        }
      }

      const dateStr = new Date(options.scheduledDate).toLocaleDateString()
      const html = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #D35F0E;">Your scheduled order is tomorrow</h1>
            <p>Hi${options.userName ? ` ${options.userName}` : ''},</p>
            <p>This is a reminder that your scheduled order for <strong>${options.bundleTitle}</strong> is due on <strong>${dateStr}</strong>.</p>
            <p>Complete your payment so we can deliver on time:</p>
            <p><a href="${shopUrl}/shop" style="background: #D35F0E; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Go to shop</a></p>
            <p>If you already placed this order, you can ignore this email.</p>
          </body>
        </html>
      `

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: `Reminder: Scheduled order tomorrow – ${options.bundleTitle}`,
          html,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Resend scheduled reminder error:', err)
        return { success: false, message: 'Failed to send reminder', errors: [(err as { message?: string }).message || 'Resend error'] }
      }
      return { success: true, message: 'Reminder sent' }
    } catch (error) {
      console.error('Send scheduled order reminder error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: [error instanceof Error ? error.message : 'Failed to send reminder'],
      }
    }
  }
}
