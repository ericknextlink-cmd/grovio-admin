"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const supabase_1 = require("../config/supabase");
class ProfileService {
    /**
     * Upload profile picture
     */
    async uploadProfilePicture(userId, file, fileName, mimeType) {
        try {
            const supabase = (0, supabase_1.createClient)();
            // Generate unique file name
            const fileExtension = fileName.split('.').pop();
            const uniqueFileName = `${userId}-${Date.now()}.${fileExtension}`;
            const filePath = `profiles/${uniqueFileName}`;
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                contentType: mimeType,
                upsert: true
            });
            if (uploadError) {
                return {
                    success: false,
                    message: 'Failed to upload profile picture',
                    errors: [uploadError.message]
                };
            }
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
            const profilePictureUrl = urlData.publicUrl;
            // Update user profile picture in database
            const { error: updateError } = await supabase
                .from('users')
                .update({
                profile_picture: profilePictureUrl,
                updated_at: new Date().toISOString()
            })
                .eq('id', userId);
            if (updateError) {
                return {
                    success: false,
                    message: 'Failed to update profile picture',
                    errors: [updateError.message]
                };
            }
            return {
                success: true,
                profilePictureUrl,
                message: 'Profile picture uploaded successfully'
            };
        }
        catch (error) {
            console.error('Upload profile picture error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Failed to upload profile picture']
            };
        }
    }
    /**
     * Delete profile picture
     */
    async deleteProfilePicture(userId) {
        try {
            const supabase = (0, supabase_1.createClient)();
            // Get current profile picture URL
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('profile_picture')
                .eq('id', userId)
                .single();
            if (userError || !userData) {
                return {
                    success: false,
                    message: 'User not found',
                    errors: ['User data not available']
                };
            }
            // Extract file path from URL if exists
            if (userData.profile_picture) {
                const urlParts = userData.profile_picture.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const filePath = `profiles/${fileName}`;
                // Delete from storage
                await supabase.storage
                    .from('avatars')
                    .remove([filePath]);
            }
            // Update database to remove profile picture
            const { error: updateError } = await supabase
                .from('users')
                .update({
                profile_picture: null,
                updated_at: new Date().toISOString()
            })
                .eq('id', userId);
            if (updateError) {
                return {
                    success: false,
                    message: 'Failed to delete profile picture',
                    errors: [updateError.message]
                };
            }
            return {
                success: true,
                message: 'Profile picture deleted successfully'
            };
        }
        catch (error) {
            console.error('Delete profile picture error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Failed to delete profile picture']
            };
        }
    }
    /**
     * Update user profile data
     */
    async updateProfile(userId, profileData) {
        try {
            // Use admin client so RLS does not block update/select on users (userId is already validated by auth middleware)
            const supabase = (0, supabase_1.createAdminClient)();
            const { firstName, lastName, phoneNumber, addressLine1, addressLine2, addressArea, addressRegion, addressLat, addressLng, preferences } = profileData;
            // Prepare update data for users table
            const updateData = {
                updated_at: new Date().toISOString()
            };
            if (firstName)
                updateData.first_name = firstName.trim();
            if (lastName)
                updateData.last_name = lastName.trim();
            if (phoneNumber) {
                updateData.phone_number = phoneNumber.trim();
                // Extract country code
                const countryCodeMatch = phoneNumber.match(/^\+(\d{1,4})/);
                if (countryCodeMatch) {
                    updateData.country_code = `+${countryCodeMatch[1]}`;
                }
            }
            // Update user data
            const { data: updatedUser, error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', userId)
                .select()
                .single();
            if (updateError) {
                return {
                    success: false,
                    message: 'Failed to update profile',
                    errors: [updateError.message]
                };
            }
            if (!updatedUser) {
                return {
                    success: false,
                    message: 'Failed to update profile',
                    errors: ['User not found after update']
                };
            }
            // Build preferences/address update for user_preferences
            const prefsPayload = {
                user_id: userId,
                updated_at: new Date().toISOString()
            };
            if (addressLine1 !== undefined)
                prefsPayload.address_line1 = addressLine1.trim() || null;
            if (addressLine2 !== undefined)
                prefsPayload.address_line2 = addressLine2?.trim() || null;
            if (addressArea !== undefined)
                prefsPayload.address_area = addressArea?.trim() || null;
            if (addressRegion !== undefined)
                prefsPayload.address_region = addressRegion?.trim() || null;
            if (addressLat !== undefined)
                prefsPayload.address_lat = addressLat;
            if (addressLng !== undefined)
                prefsPayload.address_lng = addressLng;
            if (preferences && Object.keys(preferences).length > 0) {
                Object.assign(prefsPayload, preferences);
            }
            if (Object.keys(prefsPayload).length > 2) {
                await supabase
                    .from('user_preferences')
                    .upsert(prefsPayload, { onConflict: 'user_id' });
            }
            // Get updated preferences (including address)
            const { data: updatedPreferences } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();
            const prefs = updatedPreferences;
            return {
                success: true,
                message: 'Profile updated successfully',
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.first_name,
                    lastName: updatedUser.last_name,
                    phoneNumber: updatedUser.phone_number,
                    countryCode: updatedUser.country_code,
                    profilePicture: updatedUser.profile_picture,
                    isEmailVerified: updatedUser.is_email_verified,
                    isPhoneVerified: updatedUser.is_phone_verified,
                    role: updatedUser.role,
                    addressLine1: prefs?.address_line1 ?? undefined,
                    addressLine2: prefs?.address_line2 ?? undefined,
                    addressArea: prefs?.address_area ?? undefined,
                    addressRegion: prefs?.address_region ?? undefined,
                    addressLat: prefs?.address_lat != null ? Number(prefs.address_lat) : undefined,
                    addressLng: prefs?.address_lng != null ? Number(prefs.address_lng) : undefined,
                    preferences: updatedPreferences || {
                        language: 'en',
                        currency: 'GHS'
                    },
                    createdAt: updatedUser.created_at,
                    updatedAt: updatedUser.updated_at
                }
            };
        }
        catch (error) {
            console.error('Update profile error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Failed to update profile']
            };
        }
    }
    /**
     * Get user profile with all details
     */
    async getProfile(userId) {
        try {
            const supabase = (0, supabase_1.createAdminClient)();
            // Get user data
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .eq('is_deleted', false)
                .single();
            if (userError || !userData) {
                return {
                    success: false,
                    message: 'User profile not found',
                    errors: ['Profile data not available']
                };
            }
            // Get user preferences
            const { data: preferences } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();
            const prefsRow = preferences;
            return {
                success: true,
                message: 'Profile retrieved successfully',
                user: {
                    id: userData.id,
                    email: userData.email,
                    firstName: userData.first_name,
                    lastName: userData.last_name,
                    phoneNumber: userData.phone_number,
                    countryCode: userData.country_code,
                    profilePicture: userData.profile_picture,
                    isEmailVerified: userData.is_email_verified,
                    isPhoneVerified: userData.is_phone_verified,
                    role: userData.role,
                    addressLine1: prefsRow?.address_line1 ?? undefined,
                    addressLine2: prefsRow?.address_line2 ?? undefined,
                    addressArea: prefsRow?.address_area ?? undefined,
                    addressRegion: prefsRow?.address_region ?? undefined,
                    addressLat: prefsRow?.address_lat != null ? Number(prefsRow.address_lat) : undefined,
                    addressLng: prefsRow?.address_lng != null ? Number(prefsRow.address_lng) : undefined,
                    preferences: preferences || {
                        language: 'en',
                        currency: 'GHS'
                    },
                    createdAt: userData.created_at,
                    updatedAt: userData.updated_at
                }
            };
        }
        catch (error) {
            console.error('Get profile error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Failed to retrieve profile']
            };
        }
    }
}
exports.ProfileService = ProfileService;
