import { createClient } from '../config/supabase'
import {
  accountRecoveryHtml,
  accountRecoveryText,
  invoiceHtml,
  invoiceText,
  orderConfirmationHtml,
  orderConfirmationText,
  scheduledReminderHtml,
  contactToAdminHtml,
  contactConfirmationHtml,
} from '../templates/email'

/**
 * Resend only sends from verified senders. Set EMAIL_FROM in .env to:
 * - Your verified domain in Resend (e.g. orders@yourdomain.com after verifying yourdomain.com), or
 * - Resend's testing sender: onboarding@resend.dev (works on free tier until you add a domain).
 * If EMAIL_FROM is unset, we fall back to onboarding@resend.dev so emails can still send in development.
 */
function getResendFromEmail(override?: string): string {
  const from = override || process.env.EMAIL_FROM || 'onboarding@resend.dev'
  if (!process.env.EMAIL_FROM && !override) {
    console.warn(
      'EMAIL_FROM not set. Using onboarding@resend.dev. For production, set EMAIL_FROM in .env to a verified sender in Resend (e.g. orders@yourdomain.com).'
    )
  }
  return from
}

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
      const frontendUrl = options?.frontendUrl || process.env.FRONTEND_URL || ''
      const fromEmail = getResendFromEmail(options?.fromEmail)
      
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
          html: accountRecoveryHtml({ recoveryUrl, recoveryToken }),
          text: accountRecoveryText({ recoveryUrl, recoveryToken }),
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
      const fromEmail = getResendFromEmail(options.fromEmail)

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
          html: invoiceHtml({ displayName, orderNumber, invoicePdfUrl }),
          text: invoiceText({ displayName, orderNumber, invoicePdfUrl }),
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
   * Send order confirmation email after successful payment (Resend).
   * Includes invoice link and delivery code for the rider.
   */
  async sendOrderConfirmationEmail(
    to: string,
    options: {
      customerName: string
      orderNumber: string
      invoicePdfUrl: string
      deliveryCode?: string
      fromEmail?: string
    }
  ): Promise<{ success: boolean; message: string; errors?: string[] }> {
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not set. Skipping order confirmation email.')
      return { success: false, message: 'Email service not configured', errors: ['RESEND_API_KEY not set'] }
    }
    const fromEmail = getResendFromEmail(options.fromEmail)
    const displayName = (options.customerName || 'Customer').trim()
    const { orderNumber, invoicePdfUrl, deliveryCode } = options
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: fromEmail,
          to,
          subject: `Order confirmed – ${orderNumber}`,
          html: orderConfirmationHtml({ displayName, orderNumber, invoicePdfUrl, deliveryCode }),
          text: orderConfirmationText({ displayName, orderNumber, invoicePdfUrl, deliveryCode }),
        }),
      })
      if (!emailResponse.ok) {
        const errorData = await emailResponse.json().catch(() => ({}))
        console.error('Resend order confirmation email error:', errorData)
        return { success: false, message: 'Failed to send email', errors: [errorData.message || `Resend ${emailResponse.status}`] }
      }
      const data = await emailResponse.json()
      console.log('Order confirmation email sent via Resend:', { to, orderNumber, messageId: data.id })
      return { success: true, message: 'Order confirmation email sent successfully' }
    } catch (error) {
      console.error('Send order confirmation email error:', error)
      return { success: false, message: 'Internal server error', errors: [error instanceof Error ? error.message : 'Failed to send email'] }
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
      const fromEmail = getResendFromEmail()
      const shopUrl = options.shopUrl || process.env.FRONTEND_URL || 'http://localhost:3000'

      if (!resendApiKey) {
        console.warn('RESEND_API_KEY not set. Scheduled order reminder not sent.', { email, ...options })
        return {
          success: false,
          message: 'Email service not configured',
          errors: ['RESEND_API_KEY not set'],
        }
      }

      const html = scheduledReminderHtml({
        userName: options.userName,
        scheduledDate: options.scheduledDate,
        bundleTitle: options.bundleTitle,
        shopUrl,
      })

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

  /**
   * Send contact form submission to admin/support (Resend). Matches Grovio style: #f8f9fa, #D35F0E, same footer as invoice.
   */
  async sendContactToAdmin(options: {
    fromEmail: string
    toEmail: string
    name: string
    email: string
    phone?: string
    message: string
  }): Promise<{ success: boolean; message: string; errors?: string[] }> {
    try {
      const resendApiKey = process.env.RESEND_API_KEY
      const fromEmail = getResendFromEmail(options.fromEmail)
      if (!resendApiKey) {
        return { success: false, message: 'Email not configured', errors: ['RESEND_API_KEY not set'] }
      }
      const html = contactToAdminHtml({
        name: options.name,
        email: options.email,
        phone: options.phone,
        message: options.message,
      })
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: fromEmail,
          to: options.toEmail,
          reply_to: options.email,
          subject: `Contact form: ${options.name}`,
          html,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { success: false, message: 'Failed to send', errors: [(err as { message?: string }).message || `Resend ${res.status}`] }
      }
      return { success: true, message: 'Contact email sent' }
    } catch (error) {
      console.error('Send contact to admin error:', error)
      return { success: false, message: 'Internal server error', errors: [error instanceof Error ? error.message : 'Failed to send'] }
    }
  }

  /**
   * Send auto-reply to user: we received your message and will get back to you. Same style as invoice/scheduled.
   */
  async sendContactConfirmationToUser(email: string, name: string): Promise<{ success: boolean; message: string; errors?: string[] }> {
    try {
      const resendApiKey = process.env.RESEND_API_KEY
      const fromEmail = getResendFromEmail()
      if (!resendApiKey) {
        return { success: false, message: 'Email not configured', errors: ['RESEND_API_KEY not set'] }
      }
      const displayName = (name || 'there').trim() || 'there'
      const html = contactConfirmationHtml({ displayName })
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: 'We received your message – Grovio',
          html,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { success: false, message: 'Failed to send', errors: [(err as { message?: string }).message || `Resend ${res.status}`] }
      }
      return { success: true, message: 'Confirmation email sent' }
    } catch (error) {
      console.error('Send contact confirmation error:', error)
      return { success: false, message: 'Internal server error', errors: [error instanceof Error ? error.message : 'Failed to send'] }
    }
  }
}
