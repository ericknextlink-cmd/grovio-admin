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
}
exports.EmailService = EmailService;
