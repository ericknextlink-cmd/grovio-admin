"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpController = void 0;
const email_service_1 = require("../services/email.service");
const token_service_1 = require("../services/token.service");
class OtpController {
    constructor() {
        /**
         * Send email verification OTP
         */
        this.sendEmailOtp = async (req, res) => {
            try {
                const { email, type = 'signup' } = req.body;
                if (!email) {
                    res.status(400).json({
                        success: false,
                        message: 'Email is required',
                        errors: ['Email address is missing']
                    });
                    return;
                }
                const result = await this.emailService.sendVerificationEmail(email, {
                    emailRedirectTo: `${process.env.FRONTEND_URL}/auth/verify`
                });
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Send email OTP controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while sending verification email']
                });
            }
        };
        /**
         * Verify email OTP
         */
        this.verifyEmailOtp = async (req, res) => {
            try {
                const { email, token } = req.body;
                if (!email || !token) {
                    res.status(400).json({
                        success: false,
                        message: 'Email and OTP token are required',
                        errors: ['Missing required fields']
                    });
                    return;
                }
                const result = await this.emailService.verifyEmailOtp(email, token);
                if (result.success) {
                    res.status(200).json({
                        success: true,
                        message: result.message,
                        data: {
                            session: result.session
                        }
                    });
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Verify email OTP controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while verifying OTP']
                });
            }
        };
        /**
         * Verify email with token hash (PKCE flow)
         */
        this.verifyTokenHash = async (req, res) => {
            try {
                const { token_hash, type = 'email' } = req.query;
                if (!token_hash) {
                    res.status(400).json({
                        success: false,
                        message: 'Token hash is required',
                        errors: ['Missing token hash parameter']
                    });
                    return;
                }
                const result = await this.emailService.verifyEmailWithTokenHash(token_hash, type);
                if (result.success) {
                    // Redirect to success page or return JSON based on Accept header
                    const acceptsJson = req.headers.accept?.includes('application/json');
                    if (acceptsJson) {
                        res.status(200).json({
                            success: true,
                            message: result.message,
                            data: {
                                session: result.session
                            }
                        });
                    }
                    else {
                        // Redirect to frontend success page
                        const redirectUrl = `${process.env.FRONTEND_URL}/auth/verified?success=true`;
                        res.redirect(redirectUrl);
                    }
                }
                else {
                    const acceptsJson = req.headers.accept?.includes('application/json');
                    if (acceptsJson) {
                        res.status(400).json(result);
                    }
                    else {
                        // Redirect to frontend error page
                        const redirectUrl = `${process.env.FRONTEND_URL}/auth/verified?success=false&error=${encodeURIComponent(result.message)}`;
                        res.redirect(redirectUrl);
                    }
                }
            }
            catch (error) {
                console.error('Verify token hash controller error:', error);
                const acceptsJson = req.headers.accept?.includes('application/json');
                if (acceptsJson) {
                    res.status(500).json({
                        success: false,
                        message: 'Internal server error',
                        errors: ['Something went wrong while verifying token']
                    });
                }
                else {
                    const redirectUrl = `${process.env.FRONTEND_URL}/auth/verified?success=false&error=Internal server error`;
                    res.redirect(redirectUrl);
                }
            }
        };
        /**
         * Send password reset email
         */
        this.sendPasswordResetOtp = async (req, res) => {
            try {
                const { email } = req.body;
                if (!email) {
                    res.status(400).json({
                        success: false,
                        message: 'Email is required',
                        errors: ['Email address is missing']
                    });
                    return;
                }
                const result = await this.emailService.sendPasswordResetEmail(email, {
                    emailRedirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`
                });
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Send password reset OTP controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while sending password reset email']
                });
            }
        };
        this.emailService = new email_service_1.EmailService();
        this.tokenService = new token_service_1.TokenService();
    }
}
exports.OtpController = OtpController;
