"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const supabase_1 = require("../config/supabase");
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
            const frontendUrl = options?.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3001';
            const fromEmail = options?.fromEmail || process.env.EMAIL_FROM || 'noreply@grovio.com';
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
}
exports.EmailService = EmailService;
