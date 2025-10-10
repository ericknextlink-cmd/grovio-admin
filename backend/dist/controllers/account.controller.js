"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountController = void 0;
const account_service_1 = require("../services/account.service");
class AccountController {
    constructor() {
        /**
         * Check email status
         */
        this.checkEmailStatus = async (req, res) => {
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
                const result = await this.accountService.checkEmailStatus(email);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Check email status controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while checking email status']
                });
            }
        };
        /**
         * Delete user account (soft delete)
         */
        this.deleteAccount = async (req, res) => {
            try {
                const userId = req.user?.id;
                const { reason } = req.body;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Not authenticated',
                        errors: ['Please sign in']
                    });
                    return;
                }
                const result = await this.accountService.deleteAccount(userId, reason);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Delete account controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while deleting account']
                });
            }
        };
        /**
         * Initiate account recovery
         */
        this.initiateRecovery = async (req, res) => {
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
                const result = await this.accountService.initiateAccountRecovery(email);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Initiate recovery controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while initiating recovery']
                });
            }
        };
        /**
         * Complete account recovery
         */
        this.completeRecovery = async (req, res) => {
            try {
                const { email, recoveryToken, newPassword } = req.body;
                if (!email || !recoveryToken || !newPassword) {
                    res.status(400).json({
                        success: false,
                        message: 'Missing required fields',
                        errors: ['Email, recovery token, and new password are required']
                    });
                    return;
                }
                const result = await this.accountService.completeAccountRecovery(email, recoveryToken, newPassword);
                if (result.success) {
                    res.status(200).json(result);
                }
                else {
                    res.status(400).json(result);
                }
            }
            catch (error) {
                console.error('Complete recovery controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Something went wrong while completing recovery']
                });
            }
        };
        this.accountService = new account_service_1.AccountService();
    }
}
exports.AccountController = AccountController;
