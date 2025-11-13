import { Request, Response, NextFunction } from 'express'
import { createClient, createAdminClient } from '../config/supabase'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

/**
 * Middleware to authenticate user using Supabase JWT token
 */
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        errors: ['Missing authorization token']
      })
    }

    const supabase = createClient()

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        errors: ['Authentication failed']
      })
    }

    // Get user data from our database using admin client to bypass RLS
    const adminSupabase = createAdminClient()
    const { data: userData, error: dbError } = await adminSupabase
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single()

    if (dbError || !userData) {
      // Log the error for debugging
      console.error('User profile not found in database:', {
        userId: user.id,
        userEmail: user.email,
        dbError: dbError?.message,
        code: dbError?.code
      })

      // Check if it's a "not found" error (PGRST116) vs other errors
      if (dbError?.code === 'PGRST116' || !userData) {
        // User exists in auth.users but not in public.users
        // This can happen if signup failed partway through (e.g., Google OAuth, network error, etc.)
        // Auto-repair: Create the user profile automatically
        console.log('Auto-repairing missing user profile:', {
          userId: user.id,
          userEmail: user.email,
        })

        try {
          // Extract user metadata from auth user
          const userMetadata = user.user_metadata || {}
          const appMetadata = user.app_metadata || {}
          
          // Determine if this is a Google OAuth user
          const isGoogleUser = userMetadata.provider === 'google' || 
                              appMetadata.provider === 'google' ||
                              userMetadata.avatar_url ||
                              userMetadata.picture

          // Build user data for insertion
          const firstName = userMetadata.first_name || 
                           userMetadata.given_name || 
                           userMetadata.full_name?.split(' ')[0] || 
                           user.email?.split('@')[0] || 
                           'User'
          const lastName = userMetadata.last_name || 
                          userMetadata.family_name || 
                          userMetadata.full_name?.split(' ').slice(1).join(' ') || 
                          ''
          const phoneNumber = userMetadata.phone_number || 
                            userMetadata.phone || 
                            user.phone || 
                            ''
          const countryCode = userMetadata.country_code || '+233'
          
          // Create user profile in public.users table
          const { data: newUserData, error: insertError } = await adminSupabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email?.toLowerCase().trim() || '',
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
              country_code: countryCode,
              profile_picture: userMetadata.avatar_url || userMetadata.picture || null,
              is_email_verified: user.email_confirmed_at ? true : false,
              is_phone_verified: user.phone_confirmed_at ? true : false,
              role: 'customer',
              google_id: isGoogleUser ? (userMetadata.sub || user.id) : null,
              preferences: {
                language: 'en',
                currency: 'GHS',
              },
            })
            .select('id, email, role')
            .single()

          if (insertError) {
            console.error('Failed to auto-repair user profile:', insertError)
            // If auto-repair fails, return the original error
            return res.status(404).json({
              success: false,
              message: 'User profile not found',
              errors: ['Your account exists but profile data is missing. Please contact support or try signing up again.']
            })
          }

          // Create user preferences if they don't exist
          await adminSupabase
            .from('user_preferences')
            .insert({
              user_id: user.id,
              language: 'en',
              currency: 'GHS',
            })
            .catch(err => {
              // Ignore error if preferences already exist
              console.log('User preferences may already exist:', err.message)
            })

          console.log('Successfully auto-repaired user profile:', user.id)

          // Use the newly created user data
          req.user = {
            id: newUserData.id,
            email: newUserData.email,
            role: newUserData.role,
          }

          next()
          return
        } catch (repairError) {
          console.error('Error during user profile auto-repair:', repairError)
          // If auto-repair fails, return the original error
          return res.status(404).json({
            success: false,
            message: 'User profile not found',
            errors: ['Your account exists but profile data is missing. Please contact support or try signing up again.']
          })
        }
      }

      // Other database errors
      return res.status(500).json({
        success: false,
        message: 'Database error',
        errors: ['Failed to retrieve user profile']
      })
    }

    // Add user info to request object
    req.user = {
      id: userData.id,
      email: userData.email,
      role: userData.role
    }

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      errors: ['Authentication service error']
    })
  }
}

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errors: ['Please sign in']
    })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      errors: ['Insufficient permissions']
    })
  }

  next()
}

/**
 * Middleware to check if user is customer or admin
 */
export const requireUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errors: ['Please sign in']
    })
  }

  if (!['customer', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'User access required',
      errors: ['Invalid user role']
    })
  }

  next()
}

/**
 * Alias for authenticateToken - for consistency
 */
export const authenticateUser = authenticateToken

/**
 * Extended request interface with userId for convenience
 */
export interface UserRequest extends Request {
  userId?: string
  user?: {
    id: string
    email: string
    role: string
  }
}
