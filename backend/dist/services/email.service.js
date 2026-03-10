"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const supabase_1 = require("../config/supabase");
const email_1 = require("../templates/email");
/**
 * Resend only sends from verified senders. Set EMAIL_FROM in .env to:
 * - Your verified domain in Resend (e.g. orders@yourdomain.com after verifying yourdomain.com), or
 * - Resend's testing sender: onboarding@resend.dev (works on free tier until you add a domain).
 * If EMAIL_FROM is unset, we fall back to onboarding@resend.dev so emails can still send in development.
 */
function getResendFromEmail(override) {
    const from = override || process.env.EMAIL_FROM || 'onboarding@resend.dev';
    if (!process.env.EMAIL_FROM && !override) {
        console.warn('EMAIL_FROM not set. Using onboarding@resend.dev. For production, set EMAIL_FROM in .env to a verified sender in Resend (e.g. orders@yourdomain.com).');
    }
    return from;
}
class EmailService {
    /**
     * Send email verification OTP
     */
    async sendVerificationEmail(email, options) {
        try {
            const supabase = (0, supabase_1.createClient)();
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                    emailRedirectTo: options?.emailRedirectTo
                }
            });
            if (error) {
                return {
                    success: false,
                    message: 'Failed to send verification email',
                    errors: [error.message]
                };
            }
            return {
                success: true,
                message: 'Verification email sent successfully'
            };
        }
        catch (error) {
            console.error('Send verification email error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Failed to send verification email']
            };
        }
    }
    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, options) {
        try {
            const supabase = (0, supabase_1.createClient)();
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: options?.emailRedirectTo
            });
            if (error) {
                return {
                    success: false,
                    message: 'Failed to send password reset email',
                    errors: [error.message]
                };
            }
            return {
                success: true,
                message: 'Password reset email sent successfully'
            };
        }
        catch (error) {
            console.error('Send password reset email error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Failed to send password reset email']
            };
        }
    }
    /**
     * Verify email OTP
     */
    async verifyEmailOtp(email, token) {
        try {
            const supabase = (0, supabase_1.createClient)();
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email'
            });
            if (error) {
                return {
                    success: false,
                    message: 'OTP verification failed',
                    errors: [error.message]
                };
            }
            return {
                success: true,
                message: 'Email verified successfully',
                session: data.session
            };
        }
        catch (error) {
            console.error('Verify email OTP error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['OTP verification failed']
            };
        }
    }
    /**
     * Verify email with token hash (PKCE flow)
     */
    async verifyEmailWithTokenHash(tokenHash, type = 'email') {
        try {
            const supabase = (0, supabase_1.createClient)();
            const { data, error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type
            });
            if (error) {
                return {
                    success: false,
                    message: 'Token verification failed',
                    errors: [error.message]
                };
            }
            return {
                success: true,
                message: 'Email verified successfully',
                session: data.session
            };
        }
        catch (error) {
            console.error('Verify email token hash error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Token verification failed']
            };
        }
    }
    /**
     * Send account recovery email with recovery token
     * Uses Resend API if RESEND_API_KEY is configured, otherwise logs an error
     * Based on Supabase documentation: https://supabase.com/docs/guides/functions/examples/send-emails
     */
    async sendAccountRecoveryEmail(email, recoveryToken, options) {
        try {
            const resendApiKey = process.env.RESEND_API_KEY;
            const frontendUrl = options?.frontendUrl || process.env.FRONTEND_URL || '';
            const fromEmail = getResendFromEmail(options?.fromEmail);
            // Build recovery URL
            const recoveryUrl = options?.recoveryUrl || `${frontendUrl}/account/recover?email=${encodeURIComponent(email)}&token=${encodeURIComponent(recoveryToken)}`;
            // If Resend API key is not configured, log error and return
            if (!resendApiKey) {
                console.error('RESEND_API_KEY not configured. Cannot send account recovery email.');
                console.log('Account recovery email details:', {
                    email,
                    recoveryToken,
                    recoveryUrl,
                    message: 'Email service not configured. Please set RESEND_API_KEY environment variable.'
                });
                return {
                    success: false,
                    message: 'Email service not configured',
                    errors: ['RESEND_API_KEY environment variable is not set. Please configure email service to send recovery emails.']
                };
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
                    html: (0, email_1.accountRecoveryHtml)({ recoveryUrl, recoveryToken }),
                    text: (0, email_1.accountRecoveryText)({ recoveryUrl, recoveryToken }),
                }),
            });
            if (!emailResponse.ok) {
                const errorData = await emailResponse.json().catch(() => ({}));
                console.error('Resend API error:', errorData);
                return {
                    success: false,
                    message: 'Failed to send recovery email',
                    errors: [errorData.message || `Email service returned status ${emailResponse.status}`]
                };
            }
            const emailData = await emailResponse.json();
            console.log('Account recovery email sent successfully:', {
                email,
                messageId: emailData.id,
            });
            return {
                success: true,
                message: 'Account recovery email sent successfully'
            };
        }
        catch (error) {
            console.error('Send account recovery email error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: [error instanceof Error ? error.message : 'Failed to send recovery email']
            };
        }
    }
    /**
     * Send invoice email after payment (Resend)
     * Sends a link to download the invoice PDF.
     */
    async sendInvoiceEmail(to, options) {
        try {
            const resendApiKey = process.env.RESEND_API_KEY;
            const fromEmail = getResendFromEmail(options.fromEmail);
            if (!resendApiKey) {
                console.warn('RESEND_API_KEY not set. Skipping invoice email.');
                return {
                    success: false,
                    message: 'Email service not configured',
                    errors: ['RESEND_API_KEY not set']
                };
            }
            const { customerName, orderNumber, invoicePdfUrl } = options;
            const displayName = customerName?.trim() || 'Customer';
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
                    html: (0, email_1.invoiceHtml)({ displayName, orderNumber, invoicePdfUrl }),
                    text: (0, email_1.invoiceText)({ displayName, orderNumber, invoicePdfUrl }),
                }),
            });
            if (!emailResponse.ok) {
                const errorData = await emailResponse.json().catch(() => ({}));
                console.error('Resend invoice email error:', errorData);
                return {
                    success: false,
                    message: 'Failed to send invoice email',
                    errors: [errorData.message || `Resend returned ${emailResponse.status}`]
                };
            }
            const emailData = await emailResponse.json();
            console.log('Invoice email sent via Resend:', { to, orderNumber, messageId: emailData.id });
            return {
                success: true,
                message: 'Invoice email sent successfully'
            };
        }
        catch (error) {
            console.error('Send invoice email error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: [error instanceof Error ? error.message : 'Failed to send invoice email']
            };
        }
    }
    /**
     * Send order confirmation email after successful payment (Resend).
     * Includes invoice link and delivery code for the rider.
     */
    async sendOrderConfirmationEmail(to, options) {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            console.warn('RESEND_API_KEY not set. Skipping order confirmation email.');
            return { success: false, message: 'Email service not configured', errors: ['RESEND_API_KEY not set'] };
        }
        const fromEmail = getResendFromEmail(options.fromEmail);
        const displayName = (options.customerName || 'Customer').trim();
        const { orderNumber, invoicePdfUrl, deliveryCode } = options;
        try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
                body: JSON.stringify({
                    from: fromEmail,
                    to,
                    subject: `Order confirmed – ${orderNumber}`,
                    html: (0, email_1.orderConfirmationHtml)({ displayName, orderNumber, invoicePdfUrl, deliveryCode }),
                    text: (0, email_1.orderConfirmationText)({ displayName, orderNumber, invoicePdfUrl, deliveryCode }),
                }),
            });
            if (!emailResponse.ok) {
                const errorData = await emailResponse.json().catch(() => ({}));
                console.error('Resend order confirmation email error:', errorData);
                return { success: false, message: 'Failed to send email', errors: [errorData.message || `Resend ${emailResponse.status}`] };
            }
            const data = await emailResponse.json();
            console.log('Order confirmation email sent via Resend:', { to, orderNumber, messageId: data.id });
            return { success: true, message: 'Order confirmation email sent successfully' };
        }
        catch (error) {
            console.error('Send order confirmation email error:', error);
            return { success: false, message: 'Internal server error', errors: [error instanceof Error ? error.message : 'Failed to send email'] };
        }
    }
    /**
     * Send scheduled order reminder (1 day before). Uses Resend when RESEND_API_KEY is set.
     */
    async sendScheduledOrderReminder(email, options) {
        try {
            const resendApiKey = process.env.RESEND_API_KEY;
            const fromEmail = getResendFromEmail();
            const shopUrl = options.shopUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
            if (!resendApiKey) {
                console.warn('RESEND_API_KEY not set. Scheduled order reminder not sent.', { email, ...options });
                return {
                    success: false,
                    message: 'Email service not configured',
                    errors: ['RESEND_API_KEY not set'],
                };
            }
            const html = (0, email_1.scheduledReminderHtml)({
                userName: options.userName,
                scheduledDate: options.scheduledDate,
                bundleTitle: options.bundleTitle,
                shopUrl,
            });
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
                body: JSON.stringify({
                    from: fromEmail,
                    to: email,
                    subject: `Reminder: Scheduled order tomorrow – ${options.bundleTitle}`,
                    html,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error('Resend scheduled reminder error:', err);
                return { success: false, message: 'Failed to send reminder', errors: [err.message || 'Resend error'] };
            }
            return { success: true, message: 'Reminder sent' };
        }
        catch (error) {
            console.error('Send scheduled order reminder error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: [error instanceof Error ? error.message : 'Failed to send reminder'],
            };
        }
    }
    /**
     * Send contact form submission to admin/support (Resend). Matches Grovio style: #f8f9fa, #D35F0E, same footer as invoice.
     */
    async sendContactToAdmin(options) {
        try {
            const resendApiKey = process.env.RESEND_API_KEY;
            const fromEmail = getResendFromEmail(options.fromEmail);
            if (!resendApiKey) {
                return { success: false, message: 'Email not configured', errors: ['RESEND_API_KEY not set'] };
            }
            const html = (0, email_1.contactToAdminHtml)({
                name: options.name,
                email: options.email,
                phone: options.phone,
                message: options.message,
            });
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
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return { success: false, message: 'Failed to send', errors: [err.message || `Resend ${res.status}`] };
            }
            return { success: true, message: 'Contact email sent' };
        }
        catch (error) {
            console.error('Send contact to admin error:', error);
            return { success: false, message: 'Internal server error', errors: [error instanceof Error ? error.message : 'Failed to send'] };
        }
    }
    /**
     * Send auto-reply to user: we received your message and will get back to you. Same style as invoice/scheduled.
     */
    async sendContactConfirmationToUser(email, name) {
        try {
            const resendApiKey = process.env.RESEND_API_KEY;
            const fromEmail = getResendFromEmail();
            if (!resendApiKey) {
                return { success: false, message: 'Email not configured', errors: ['RESEND_API_KEY not set'] };
            }
            const displayName = (name || 'there').trim() || 'there';
            const html = (0, email_1.contactConfirmationHtml)({ displayName });
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendApiKey}` },
                body: JSON.stringify({
                    from: fromEmail,
                    to: email,
                    subject: 'We received your message – Grovio',
                    html,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return { success: false, message: 'Failed to send', errors: [err.message || `Resend ${res.status}`] };
            }
            return { success: true, message: 'Confirmation email sent' };
        }
        catch (error) {
            console.error('Send contact confirmation error:', error);
            return { success: false, message: 'Internal server error', errors: [error instanceof Error ? error.message : 'Failed to send'] };
        }
    }
}
exports.EmailService = EmailService;
