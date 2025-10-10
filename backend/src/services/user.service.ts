import { createClient } from '../config/supabase'
import { AuthResponse, UserProfile } from '../types/auth'

export class UserService {

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<AuthResponse> {
    try {
      const supabase = createClient()

      // Get user data from our database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        return {
          success: false,
          message: 'User profile not found',
          errors: ['Profile data unavailable']
        }
      }

      // Get user preferences
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userData.id)
        .single()

      return {
        success: true,
        message: 'User profile retrieved successfully',
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
          preferences: preferences || {
            language: 'en',
            currency: 'GHS'
          },
          createdAt: userData.created_at,
          updatedAt: userData.updated_at
        }
      }
    } catch (error) {
      console.error('Get user profile error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while fetching profile']
      }
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updateData: Partial<UserProfile>): Promise<AuthResponse> {
    try {
      const supabase = createClient()

      const { firstName, lastName, phoneNumber, preferences } = updateData

      // Validate input
      const errors: string[] = []
      if (firstName && typeof firstName !== 'string') errors.push('First name must be a string')
      if (lastName && typeof lastName !== 'string') errors.push('Last name must be a string')
      if (phoneNumber && typeof phoneNumber !== 'string') errors.push('Phone number must be a string')

      if (errors.length > 0) {
        return {
          success: false,
          message: 'Validation failed',
          errors
        }
      }

      // Update user data
      const userUpdateData: any = {
        updated_at: new Date().toISOString()
      }

      if (firstName) userUpdateData.first_name = firstName.trim()
      if (lastName) userUpdateData.last_name = lastName.trim()
      if (phoneNumber) {
        userUpdateData.phone_number = phoneNumber.trim()
        // Extract country code
        const countryCodeMatch = phoneNumber.match(/^\+(\d{1,4})/)
        if (countryCodeMatch) {
          userUpdateData.country_code = `+${countryCodeMatch[1]}`
        }
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(userUpdateData)
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('User update error:', updateError)
        return {
          success: false,
          message: 'Failed to update profile',
          errors: [updateError.message]
        }
      }

      // Update preferences if provided
      if (preferences) {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            ...preferences,
            updated_at: new Date().toISOString()
          })
      }

      // Get updated preferences
      const { data: updatedPreferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

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
          preferences: updatedPreferences || {
            language: 'en',
            currency: 'GHS'
          },
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at
        }
      }
    } catch (error) {
      console.error('Update user profile error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while updating profile']
      }
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(page: number = 1, limit: number = 10): Promise<any> {
    try {
      const supabase = createClient()
      const offset = (page - 1) * limit

      const { data: users, error: usersError, count } = await supabase
        .from('users')
        .select('*, user_preferences(*)', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })

      if (usersError) {
        return {
          success: false,
          message: 'Failed to fetch users',
          errors: [usersError.message]
        }
      }

      const formattedUsers = users?.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        countryCode: user.country_code,
        profilePicture: user.profile_picture,
        isEmailVerified: user.is_email_verified,
        isPhoneVerified: user.is_phone_verified,
        role: user.role,
        preferences: user.user_preferences || {
          language: 'en',
          currency: 'GHS'
        },
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }))

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users: formattedUsers,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil((count || 0) / limit),
            totalUsers: count || 0,
            limit
          }
        }
      }
    } catch (error) {
      console.error('Get all users error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while fetching users']
      }
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId: string): Promise<AuthResponse> {
    try {
      const supabase = createClient()

      // Delete user from our tables first (cascading will handle related data)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (deleteError) {
        console.error('Delete user error:', deleteError)
        return {
          success: false,
          message: 'Failed to delete user',
          errors: [deleteError.message]
        }
      }

      // Delete from Supabase Auth
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)

      if (authDeleteError) {
        console.error('Delete auth user error:', authDeleteError)
        // Continue anyway, user data is already deleted from our tables
      }

      return {
        success: true,
        message: 'User deleted successfully'
      }
    } catch (error) {
      console.error('Delete user service error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while deleting user']
      }
    }
  }
}
