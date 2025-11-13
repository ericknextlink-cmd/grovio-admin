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

    // Check if user profile exists in database
    // PGRST116 = "Cannot coerce the result to a single JSON object" (no rows found)
    // This means user exists in auth.users but not in public.users
    const isProfileMissing = dbError?.code === 'PGRST116' || !userData
    
    if (isProfileMissing) {
      // Log the error for debugging
      console.error('User profile not found in database:', {
        userId: user.id,
        userEmail: user.email,
        dbError: dbError?.message,
        code: dbError?.code,
        errorDetails: dbError,
        hasUserData: !!userData,
        willAttemptRepair: true,
      })

      // Always attempt auto-repair if user profile is missing
      // This handles cases where user exists in auth.users but not in public.users
      // PGRST116 means "Cannot coerce the result to a single JSON object" (no rows returned)
      console.log('🔄 Auto-repairing missing user profile:', {
        userId: user.id,
        userEmail: user.email,
        errorCode: dbError?.code,
        hasUserMetadata: !!user.user_metadata,
        hasAppMetadata: !!user.app_metadata,
      })

      try {
          // IMPORTANT: Fetch full user data from auth.users using admin client
          // The user object from getUser() might not have all metadata
          // Using admin client ensures we get complete user data from auth.users
          const { data: authUserData, error: authUserError } = await adminSupabase.auth.admin.getUserById(user.id)
          
          if (authUserError) {
            console.error('Failed to fetch user from auth.users:', authUserError)
            // Fall back to using the user object from getUser()
          }

          // Use admin-fetched user data if available, otherwise use the user from getUser()
          const fullUser = authUserData?.user || user
          
          // Extract user metadata from auth user (prefer admin-fetched data)
          const userMetadata = fullUser.user_metadata || {}
          const appMetadata = fullUser.app_metadata || {}
          
          console.log('📋 User metadata for auto-repair:', {
            userMetadata: Object.keys(userMetadata),
            appMetadata: Object.keys(appMetadata),
            providers: appMetadata.providers || [],
            hasAvatar: !!(userMetadata.avatar_url || userMetadata.picture),
          })
          
          // Determine if this is a Google OAuth user
          const isGoogleUser = userMetadata.provider === 'google' || 
                              appMetadata.provider === 'google' ||
                              (appMetadata.providers && appMetadata.providers.includes('google')) ||
                              userMetadata.avatar_url ||
                              userMetadata.picture ||
                              userMetadata.iss?.includes('google')

          // Build user data for insertion
          const firstName = userMetadata.first_name || 
                           userMetadata.given_name || 
                           userMetadata.full_name?.split(' ')[0] || 
                           userMetadata.name?.split(' ')[0] ||
                           fullUser.email?.split('@')[0] || 
                           'User'
          const lastName = userMetadata.last_name || 
                          userMetadata.family_name || 
                          userMetadata.full_name?.split(' ').slice(1).join(' ') ||
                          userMetadata.name?.split(' ').slice(1).join(' ') ||
                          ''
          const phoneNumber = userMetadata.phone_number || 
                            userMetadata.phone || 
                            fullUser.phone || 
                            ''
          const countryCode = userMetadata.country_code || '+233'
          
          console.log('📝 Creating user profile with data:', {
            id: fullUser.id,
            email: fullUser.email,
            firstName,
            lastName,
            isGoogleUser,
            hasProfilePicture: !!(userMetadata.avatar_url || userMetadata.picture),
          })
          
          // Create user profile in public.users table
          const { data: newUserData, error: insertError } = await adminSupabase
            .from('users')
            .insert({
              id: fullUser.id,
              email: fullUser.email?.toLowerCase().trim() || '',
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
              country_code: countryCode,
              profile_picture: userMetadata.avatar_url || userMetadata.picture || null,
              is_email_verified: fullUser.email_confirmed_at ? true : false,
              is_phone_verified: fullUser.phone_confirmed_at ? true : false,
              role: 'customer',
              google_id: isGoogleUser ? (userMetadata.sub || userMetadata.provider_id || fullUser.id) : null,
              preferences: {
                language: 'en',
                currency: 'GHS',
              },
            })
            .select('id, email, role')
            .single()

          if (insertError) {
            console.error('❌ Failed to auto-repair user profile:', {
              error: insertError,
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
            })
            
            // Check if it's a duplicate key error (user might have been created concurrently)
            if (insertError.code === '23505') {
              console.log('⚠️ User profile was created concurrently, fetching existing profile')
              // User was created by another process - try to fetch it
              // Use maybeSingle() to avoid errors if user doesn't exist (shouldn't happen, but safe)
              const { data: existingUserData, error: fetchError } = await adminSupabase
                .from('users')
                .select('id, email, role')
                .eq('id', fullUser.id)
                .maybeSingle()
              
              if (existingUserData && !fetchError) {
                console.log('✅ Found existing user profile after concurrent creation')
                req.user = {
                  id: existingUserData.id,
                  email: existingUserData.email,
                  role: existingUserData.role,
                }
                next()
                return
              } else {
                console.error('❌ Failed to fetch existing user after duplicate key error:', fetchError)
                // Continue to return error response below
              }
            }
            
            // If auto-repair fails, return the original error
            return res.status(404).json({
              success: false,
              message: 'User profile not found',
              errors: ['Your account exists but profile data is missing. Please contact support or try signing up again.']
            })
          }

          console.log('✅ Successfully created user profile:', {
            userId: newUserData.id,
            email: newUserData.email,
            role: newUserData.role,
          })

          // Create user preferences if they don't exist
          const { error: prefError } = await adminSupabase
            .from('user_preferences')
            .insert({
              user_id: fullUser.id,
              language: 'en',
              currency: 'GHS',
            })
          
          if (prefError) {
            if (prefError.code === '23505') {
              console.log('ℹ️ User preferences already exist (duplicate key)')
            } else {
              console.warn('⚠️ Failed to create user preferences (non-fatal):', prefError.message)
            }
          } else {
            console.log('✅ Successfully created user preferences')
          }

          console.log('🎉 Successfully auto-repaired user profile:', fullUser.id)

          // Use the newly created user data
          req.user = {
            id: newUserData.id,
            email: newUserData.email,
            role: newUserData.role,
          }

          next()
          return
        } catch (repairError) {
          console.error('❌ Error during user profile auto-repair:', {
            error: repairError,
            message: repairError instanceof Error ? repairError.message : String(repairError),
            stack: repairError instanceof Error ? repairError.stack : undefined,
            userId: user.id,
            userEmail: user.email,
          })
          // If auto-repair fails, return error
          return res.status(404).json({
            success: false,
            message: 'User profile not found',
            errors: ['Your account exists but profile data is missing. Please contact support or try signing up again.']
          })
        }
      } else {
        // Database error that's not a missing profile (e.g., connection error, permission error)
        console.error('Database error (not a missing profile):', {
          error: dbError,
          code: dbError?.code,
          message: dbError?.message,
          userId: user.id,
        })
        return res.status(500).json({
          success: false,
          message: 'Database error',
          errors: ['Failed to retrieve user profile']
        })
      }
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
