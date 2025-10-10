"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const user_service_1 = require("../services/user.service");
class AuthController {
    constructor() {
        /**
         * User signup with email and password
         */
        this.signup = async (req, res) => {
            try {
                const signupData = req.body;
                const result = await this.authService.signUp(signupData);
                if (result.success) {
                    res.status(201).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Signup controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong during signup']
                });
            }
        };
        /**
         * User signin with email and password
         */
        this.signin = async (req, res) => {
            try {
                const signinData = req.body;
                const result = await this.authService.signIn(signinData);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(401).json(result);
                }
            }
            catch (error) {
                console.error('Signin controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong during signin']
                });
            }
        };
        /**
         * Google OAuth authentication
         */
        this.googleAuth = async (req, res) => {
            try {
                const googleData = req.body;
                const result = await this.authService.googleAuth(googleData);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(401).json(result);
                }
            }
            catch (error) {
                console.error('Google auth controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong during Google authentication']
                });
            }
        };
        /**
         * User signout
         */
        this.signout = async (req, res) => {
            try {
                const result = await this.authService.signOut(req);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(500).json(result);
                }
            }
            catch (error) {
                console.error('Signout controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong during signout']
                });
            }
        };
        /**
         * Get current user profile
         */
        this.getProfile = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Not authenticated',
                        errors: ['Please sign in']
                    });
                    return;
                }
                const result = await this.userService.getUserProfile(userId);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(404).json(result);
                }
            }
            catch (error) {
                console.error('Get profile controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while fetching profile']
                });
            }
        };
        /**
         * Update user profile
         */
        this.updateProfile = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Not authenticated',
                        errors: ['Please sign in']
                    });
                    return;
                }
                const updateData = req.body;
                const result = await this.userService.updateUserProfile(userId, updateData);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Update profile controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while updating profile']
                });
            }
        };
        /**
         * Refresh access token
         */
        this.refreshToken = async (req, res) => {
            try {
                const { refreshToken } = req.body;
                if (!refreshToken) {
                    res.status(400).json({
                        success: false,
                        message: 'Refresh token is required',
                        errors: ['Missing refresh token']
                    });
                    return;
                }
                const result = await this.authService.refreshToken(refreshToken);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(401).json(result);
                }
            }
            catch (error) {
                console.error('Refresh token controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while refreshing token']
                });
            }
        };
        this.authService = new auth_service_1.AuthService();
        this.userService = new user_service_1.UserService();
    }
}
exports.AuthController = AuthController;
