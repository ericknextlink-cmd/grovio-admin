"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPreferencesService = void 0;
const supabase_1 = require("../config/supabase");
class UserPreferencesService {
    constructor() {
        this.supabase = (0, supabase_1.createAdminClient)();
    }
    /**
     * Save or update user preferences from onboarding
     */
    async savePreferences(userId, preferences) {
        try {
            // Check if preferences exist
            const { data: existing } = await this.supabase
                .from('user_preferences')
                .select('id')
                .eq('user_id', userId)
                .single();
            const preferencesData = {
                user_id: userId,
                family_size: preferences.familySize,
                role: preferences.role?.toLowerCase(),
                dietary_restrictions: preferences.dietaryRestrictions || [],
                preferred_categories: preferences.cuisinePreferences || [],
                cuisine_preferences: preferences.cuisinePreferences || [],
                budget_range: preferences.budgetRange,
                shopping_frequency: preferences.shoppingFrequency,
                cooking_frequency: preferences.cookingFrequency,
                cooking_skill: preferences.cookingSkill?.toLowerCase(),
                meal_planning: preferences.mealPlanning || false,
                favorite_ingredients: preferences.favoriteIngredients || [],
                allergies: preferences.allergies || [],
                onboarding_completed: true,
                onboarding_completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            let result;
            if (existing) {
                // Update existing preferences
                const { data, error } = await this.supabase
                    .from('user_preferences')
                    .update(preferencesData)
                    .eq('user_id', userId)
                    .select()
                    .single();
                if (error) {
                    return {
                        success: false,
                        error: error.message,
                    };
                }
                result = data;
            }
            else {
                // Insert new preferences
                const { data, error } = await this.supabase
                    .from('user_preferences')
                    .insert(preferencesData)
                    .select()
                    .single();
                if (error) {
                    return {
                        success: false,
                        error: error.message,
                    };
                }
                result = data;
            }
            return {
                success: true,
                data: this.formatPreferencesResponse(result),
            };
        }
        catch (error) {
            console.error('Save preferences error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save preferences',
            };
        }
    }
    /**
     * Get user preferences
     */
    async getPreferences(userId) {
        try {
            const { data: preferences, error } = await this.supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (error) {
                // No preferences found - return default
                if (error.code === 'PGRST116') {
                    return {
                        success: true,
                        data: {
                            onboardingCompleted: false,
                            familySize: 1,
                            language: 'en',
                            currency: 'GHS',
                        },
                    };
                }
                return {
                    success: false,
                    error: error.message,
                };
            }
            return {
                success: true,
                data: this.formatPreferencesResponse(preferences),
            };
        }
        catch (error) {
            console.error('Get preferences error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get preferences',
            };
        }
    }
    /**
     * Check if user has completed onboarding
     */
    async hasCompletedOnboarding(userId) {
        try {
            const { data } = await this.supabase
                .from('user_preferences')
                .select('onboarding_completed')
                .eq('user_id', userId)
                .single();
            return data?.onboarding_completed || false;
        }
        catch {
            return false;
        }
    }
    /**
     * Format preferences for API response
     */
    formatPreferencesResponse(data) {
        return {
            familySize: data.family_size,
            role: data.role,
            language: data.language,
            currency: data.currency,
            dietaryRestrictions: data.dietary_restrictions || [],
            cuisinePreferences: data.cuisine_preferences || [],
            preferredCategories: data.preferred_categories || [],
            budgetRange: data.budget_range,
            shoppingFrequency: data.shopping_frequency,
            cookingFrequency: data.cooking_frequency,
            cookingSkill: data.cooking_skill,
            mealPlanning: data.meal_planning,
            favoriteIngredients: data.favorite_ingredients || [],
            allergies: data.allergies || [],
            onboardingCompleted: data.onboarding_completed,
            onboardingCompletedAt: data.onboarding_completed_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }
    /**
     * Update specific preference fields
     */
    async updatePreferences(userId, updates) {
        try {
            const updateData = {};
            if (updates.familySize !== undefined)
                updateData.family_size = updates.familySize;
            if (updates.role)
                updateData.role = updates.role.toLowerCase();
            if (updates.dietaryRestrictions)
                updateData.dietary_restrictions = updates.dietaryRestrictions;
            if (updates.cuisinePreferences) {
                updateData.cuisine_preferences = updates.cuisinePreferences;
                updateData.preferred_categories = updates.cuisinePreferences;
            }
            if (updates.budgetRange)
                updateData.budget_range = updates.budgetRange;
            if (updates.shoppingFrequency)
                updateData.shopping_frequency = updates.shoppingFrequency;
            if (updates.cookingFrequency)
                updateData.cooking_frequency = updates.cookingFrequency;
            if (updates.cookingSkill)
                updateData.cooking_skill = updates.cookingSkill.toLowerCase();
            if (updates.mealPlanning !== undefined)
                updateData.meal_planning = updates.mealPlanning;
            if (updates.favoriteIngredients)
                updateData.favorite_ingredients = updates.favoriteIngredients;
            if (updates.allergies)
                updateData.allergies = updates.allergies;
            updateData.updated_at = new Date().toISOString();
            const { data, error } = await this.supabase
                .from('user_preferences')
                .update(updateData)
                .eq('user_id', userId)
                .select()
                .single();
            if (error) {
                return {
                    success: false,
                    error: error.message,
                };
            }
            return {
                success: true,
                data: this.formatPreferencesResponse(data),
            };
        }
        catch (error) {
            console.error('Update preferences error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update preferences',
            };
        }
    }
}
exports.UserPreferencesService = UserPreferencesService;
