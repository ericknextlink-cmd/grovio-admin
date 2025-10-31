"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPreferencesController = void 0;
const user_preferences_service_1 = require("../services/user-preferences.service");
class UserPreferencesController {
    constructor() {
        /**
         * Save user preferences from onboarding
         */
        this.savePreferences = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required',
                        errors: ['Please sign in'],
                    });
                    return;
                }
                const preferences = req.body;
                const result = await this.preferencesService.savePreferences(userId, preferences);
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Preferences saved successfully',
                        data: result.data,
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        message: result.error || 'Failed to save preferences',
                        errors: [result.error || 'Save failed'],
                    });
                }
            }
            catch (error) {
                console.error('Save preferences controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to save preferences'],
                });
            }
        };
        /**
         * Get user preferences
         */
        this.getPreferences = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required',
                        errors: ['Please sign in'],
                    });
                    return;
                }
                const result = await this.preferencesService.getPreferences(userId);
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Preferences retrieved successfully',
                        data: result.data,
                    });
                }
                else {
                    res.status(404).json({
                        success: false,
                        message: result.error || 'Preferences not found',
                        errors: [result.error || 'Not found'],
                    });
                }
            }
            catch (error) {
                console.error('Get preferences controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to get preferences'],
                });
            }
        };
        /**
         * Update user preferences
         */
        this.updatePreferences = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required',
                        errors: ['Please sign in'],
                    });
                    return;
                }
                const updates = req.body;
                const result = await this.preferencesService.updatePreferences(userId, updates);
                if (result.success) {
                    res.json({
                        success: true,
                        message: 'Preferences updated successfully',
                        data: result.data,
                    });
                }
                else {
                    res.status(400).json({
                        success: false,
                        message: result.error || 'Failed to update preferences',
                        errors: [result.error || 'Update failed'],
                    });
                }
            }
            catch (error) {
                console.error('Update preferences controller error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to update preferences'],
                });
            }
        };
        /**
         * Check onboarding status
         */
        this.checkOnboardingStatus = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required',
                        errors: ['Please sign in'],
                    });
                    return;
                }
                const completed = await this.preferencesService.hasCompletedOnboarding(userId);
                res.json({
                    success: true,
                    message: 'Onboarding status retrieved',
                    data: {
                        onboardingCompleted: completed,
                    },
                });
            }
            catch (error) {
                console.error('Check onboarding status error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Internal server error',
                    errors: ['Failed to check onboarding status'],
                });
            }
        };
        this.preferencesService = new user_preferences_service_1.UserPreferencesService();
    }
}
exports.UserPreferencesController = UserPreferencesController;
