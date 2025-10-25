"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountService = void 0;
const supabase_1 = require("../config/supabase");
const token_service_1 = require("./token.service");
class AccountService {
    constructor() {
        this.tokenService = new token_service_1.TokenService();
    }
    /**
     * Check email status (exists, deleted, available)
     */
    async checkEmailStatus(email) {
        try {
            const supabase = (0, supabase_1.createClient)();
            // Check if email exists in active users
            const { data: activeUser } = await supabase
                .from('users')
                .select('id, email, is_deleted')
                .eq('email', email.toLowerCase().trim())
                .eq('is_deleted', false)
                .single();
            if (activeUser) {
                return {
                    success: true,
                    status: 'exists',
                    message: 'Email is already registered'
                };
            }
            // Check if email exists in deleted users
            const { data: deletedUser } = await supabase
                .from('deleted_users')
                .select('id, email, can_recover, deleted_at')
                .eq('email', email.toLowerCase().trim())
                .single();
            if (deletedUser) {
                return {
                    success: true,
                    status: 'deleted',
                    message: 'Email was previously registered but account was deleted',
                    canRecover: deletedUser.can_recover
                };
            }
            // Email is available
            return {
                success: true,
                status: 'available',
                message: 'Email is available for registration'
            };
        }
        catch (error) {
            console.error('Check email status error:', error);
            return {
                success: false,
                status: 'available',
                message: 'Internal server error',
                errors: ['Failed to check email status']
            };
        }
    }
    /**
     * Soft delete user account
     */
    async deleteAccount(userId, reason) {
        try {
            const supabase = (0, supabase_1.createClient)();
            // Get user data before deletion
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
            if (userError || !userData) {
                return {
                    success: false,
                    message: 'User not found',
                    errors: ['User data not available']
                };
            }
            // Mark user as deleted
            const { error: updateError } = await supabase
                .from('users')
                .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deletion_reason: reason || 'User requested account deletion'
            })
                .eq('id', userId);
            if (updateError) {
                return {
                    success: false,
                    message: 'Failed to delete account',
                    errors: [updateError.message]
                };
            }
            // Add to deleted users table
            const { error: deletedUserError } = await supabase
                .from('deleted_users')
                .insert({
                user_id: userId,
                email: userData.email,
                first_name: userData.first_name,
                last_name: userData.last_name,
                phone_number: userData.phone_number,
                deletion_reason: reason || 'User requested account deletion',
                can_recover: true
            });
            if (deletedUserError) {
                console.error('Failed to add to deleted users table:', deletedUserError);
                // Continue anyway, main deletion was successful
            }
            // Sign out user from Supabase Auth
            await supabase.auth.signOut();
            return {
                success: true,
                message: 'Account deleted successfully. You can recover your account within 30 days if needed.'
            };
        }
        catch (error) {
            console.error('Delete account error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Failed to delete account']
            };
        }
    }
    /**
     * Initiate account recovery
     */
    async initiateAccountRecovery(email) {
        try {
            const emailStatus = await this.checkEmailStatus(email);
            if (emailStatus.status !== 'deleted') {
                return {
                    success: false,
                    message: 'Account recovery not available',
                    errors: ['Email is not associated with a deleted account']
                };
            }
            if (!emailStatus.canRecover) {
                return {
                    success: false,
                    message: 'Account recovery not allowed',
                    errors: ['This account cannot be recovered']
                };
            }
            // Generate recovery token
            const tokenResult = await this.tokenService.generateRecoveryToken(email);
            if (!tokenResult.success) {
                return {
                    success: false,
                    message: 'Failed to initiate account recovery',
                    errors: tokenResult.errors
                };
            }
            // TODO: Send recovery email with token
            // This would typically send an email with a recovery link
            return {
                success: true,
                message: 'Account recovery initiated. Please check your email for recovery instructions.'
            };
        }
        catch (error) {
            console.error('Initiate account recovery error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Failed to initiate account recovery']
            };
        }
    }
    /**
     * Complete account recovery
     */
    async completeAccountRecovery(email, recoveryToken, newPassword) {
        try {
            const supabase = (0, supabase_1.createClient)();
            // Verify recovery token
            const tokenResult = await this.tokenService.verifyRecoveryToken(email, recoveryToken);
            if (!tokenResult.success) {
                return {
                    success: false,
                    message: tokenResult.message,
                    errors: tokenResult.errors
                };
            }
            const deletedUser = tokenResult.deletedUser;
            // Create new auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: deletedUser.email,
                password: newPassword,
                options: {
                    data: {
                        first_name: deletedUser.first_name,
                        last_name: deletedUser.last_name,
                        phone_number: deletedUser.phone_number
                    }
                }
            });
            if (authError || !authData.user) {
                return {
                    success: false,
                    message: 'Failed to recover account',
                    errors: [authError?.message || 'Account recovery failed']
                };
            }
            // Restore user data
            const { error: restoreError } = await supabase
                .from('users')
                .insert({
                id: authData.user.id,
                email: deletedUser.email,
                first_name: deletedUser.first_name,
                last_name: deletedUser.last_name,
                phone_number: deletedUser.phone_number,
                country_code: '+233', // Default, user can update
                role: 'customer',
                preferences: {
                    language: 'en',
                    currency: 'GHS'
                }
            });
            if (restoreError) {
                return {
                    success: false,
                    message: 'Failed to restore user data',
                    errors: [restoreError.message]
                };
            }
            // Remove from deleted users table
            await supabase
                .from('deleted_users')
                .delete()
                .eq('email', email);
            return {
                success: true,
                message: 'Account recovered successfully. Please verify your email address.',
                user: {
                    id: authData.user.id,
                    email: deletedUser.email,
                    firstName: deletedUser.first_name,
                    lastName: deletedUser.last_name,
                    phoneNumber: deletedUser.phone_number,
                    countryCode: '+233',
                    isEmailVerified: false,
                    isPhoneVerified: false,
                    role: 'customer',
                    preferences: {
                        language: 'en',
                        currency: 'GHS'
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            };
        }
        catch (error) {
            console.error('Complete account recovery error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Failed to complete account recovery']
            };
        }
    }
}
exports.AccountService = AccountService;
