import { Request, Response } from 'express'
import { EmailService } from '../services/email.service'
import { ApiResponse } from '../types/api.types'

const emailService = new EmailService()

/**
 * POST /api/contact
 * Body: { name, email, phone?, message }
 * Sends form to admin and auto-reply to user.
 */
export async function submitContact(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, phone, message } = req.body as { name?: string; email?: string; phone?: string; message?: string }
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      res.status(400).json({
        success: false,
        message: 'Name, email, and message are required',
        errors: ['Validation failed'],
      } as ApiResponse)
      return
    }
    const toEmail = process.env.CONTACT_EMAIL || process.env.EMAIL_FROM || 'hello@grovio.shop'
    const fromEmail = process.env.EMAIL_FROM || 'noreply@grovio.com'

    const adminResult = await emailService.sendContactToAdmin({
      fromEmail,
      toEmail,
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      message: message.trim(),
    })
    if (!adminResult.success) {
      res.status(500).json({
        success: false,
        message: adminResult.message,
        errors: adminResult.errors,
      } as ApiResponse)
      return
    }

    await emailService.sendContactConfirmationToUser(email.trim(), name.trim())

    res.status(200).json({
      success: true,
      message: 'Your message was sent. We will get back to you soon.',
    } as ApiResponse)
  } catch (error) {
    console.error('Contact form error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: ['Failed to send your message'],
    } as ApiResponse)
  }
}
