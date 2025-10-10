import { Request } from 'express'
import { createClient, createAdminClient } from '../config/supabase'
import { hashPassword, verifyPassword, isValidEmail, isValidPassword, isValidPhoneNumber, generateToken } from '../utils/auth'
import { SignupRequest, SigninRequest, GoogleAuthRequest, AuthResponse } from '../types/auth'
import { UserService } from './user.service'
import { EmailService } from './email.service'
import { TokenService } from './token.service'

export class AuthService {
  private userService: UserService
  private emailService: EmailService
  private tokenService: TokenService

  constructor() {
    this.userService = new UserService()
    this.emailService = new EmailService()
    this.tokenService = new TokenService()
  }

  /**
   * Sign up new user with email and password
   */
  async signUp(signupData: SignupRequest): Promise<AuthResponse> {
    const { firstName, lastName, email, phoneNumber, password } = signupData

    // Validation
    const errors: string[] = []

    if (!firstName?.trim()) errors.push('First name is required')
    if (!lastName?.trim()) errors.push('Last name is required')
    if (!email?.trim()) errors.push('Email is required')
    else if (!isValidEmail(email)) errors.push('Invalid email format')
    
    if (!phoneNumber?.trim()) errors.push('Phone number is required')
    else if (!isValidPhoneNumber(phoneNumber)) {
      errors.push('Phone number must be in international format (e.g., +233241234567)')
    }

    if (!password) errors.push('Password is required')
    else {
      const passwordValidation = isValidPassword(password)
      if (!passwordValidation.valid) {
        errors.push(...passwordValidation.errors)
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: 'Validation failed',
        errors
      }
    }

    try {
      const supabase = createClient()

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email, phone_number')
        .or(`email.eq.${email},phone_number.eq.${phoneNumber}`)
        .single()

      if (existingUser) {
        const conflictField = existingUser.email === email ? 'email' : 'phone number'
        return {
          success: false,
          message: `User with this ${conflictField} already exists`,
          errors: [`${conflictField} already registered`]
        }
      }

      // Extract country code from phone number
      const countryCodeMatch = phoneNumber.match(/^\+(\d{1,4})/)
      const countryCode = countryCodeMatch ? `+${countryCodeMatch[1]}` : '+233'

      // Hash password
      const passwordHash = await hashPassword(password)

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone_number: phoneNumber.trim(),
            country_code: countryCode
          }
        }
      })

      if (authError) {
        console.error('Supabase auth error:', authError)
        return {
          success: false,
          message: 'Failed to create account',
          errors: [authError.message]
        }
      }

      if (!authData.user) {
        return {
          success: false,
          message: 'Failed to create account',
          errors: ['User creation failed']
        }
      }

      // Insert user data into our custom users table
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email.toLowerCase().trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phoneNumber.trim(),
          country_code: countryCode,
          password_hash: passwordHash,
          role: 'customer',
          preferences: {
            language: 'en',
            currency: 'GH₵'
          }
        })

      if (dbError) {
        console.error('Database insert error:', dbError)
        // Try to clean up the auth user if database insert fails
        await supabase.auth.admin.deleteUser(authData.user.id)
        
        return {
          success: false,
          message: 'Failed to create user profile',
          errors: [dbError.message]
        }
      }

      // Create initial user preferences
      await supabase
        .from('user_preferences')
        .insert({
          user_id: authData.user.id,
          language: 'en',
          currency: 'GH₵'
        })

      return {
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: authData.user.id,
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          countryCode: countryCode,
          isEmailVerified: false,
          isPhoneVerified: false,
          role: 'customer',
          preferences: {
            language: 'en',
            currency: 'GH₵'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Signup service error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during signup']
      }
    }
  }

  /**
   * Sign in user with email and password
   */
  async signIn(signinData: SigninRequest): Promise<AuthResponse> {
    const { email, password } = signinData

    // Validation
    const errors: string[] = []

    if (!email?.trim()) errors.push('Email is required')
    else if (!isValidEmail(email)) errors.push('Invalid email format')
    
    if (!password) errors.push('Password is required')

    if (errors.length > 0) {
      return {
        success: false,
        message: 'Validation failed',
        errors
      }
    }

    try {
      const supabase = createClient()

      // Get user from our database first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (userError || !userData) {
        return {
          success: false,
          message: 'Invalid email or password',
          errors: ['Invalid credentials']
        }
      }

      // If user has a password hash, verify it
      if (userData.password_hash) {
        const isPasswordValid = await verifyPassword(password, userData.password_hash)
        if (!isPasswordValid) {
          return {
            success: false,
            message: 'Invalid email or password',
            errors: ['Invalid credentials']
          }
        }
      } else {
        return {
          success: false,
          message: 'This account was created with Google. Please sign in with Google.',
          errors: ['Use Google sign-in']
        }
      }

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      })

      if (authError) {
        console.error('Supabase auth error:', authError)
        return {
          success: false,
          message: 'Sign in failed',
          errors: [authError.message]
        }
      }

      if (!authData.user || !authData.session) {
        return {
          success: false,
          message: 'Sign in failed',
          errors: ['Authentication failed']
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
        message: 'Signed in successfully',
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
            currency: 'GH₵'
          },
          createdAt: userData.created_at,
          updatedAt: userData.updated_at
        },
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token
      }
    } catch (error) {
      console.error('Signin service error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during signin']
      }
    }
  }

  /**
   * Google OAuth authentication
   */
  async googleAuth(googleData: GoogleAuthRequest): Promise<AuthResponse> {
    const { idToken, nonce } = googleData

    if (!idToken) {
      return {
        success: false,
        message: 'Google ID token is required',
        errors: ['Missing ID token']
      }
    }

    try {
      const supabase = createClient()

      // Sign in with Google ID token
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
        nonce
      })

      if (authError) {
        console.error('Google auth error:', authError)
        return {
          success: false,
          message: 'Google authentication failed',
          errors: [authError.message]
        }
      }

      if (!authData.user) {
        return {
          success: false,
          message: 'Google authentication failed',
          errors: ['User data not available']
        }
      }

      const googleUser = authData.user
      const userMetadata = googleUser.user_metadata

      // Check if user exists in our database
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', googleUser.id)
        .single()

      let userData

      if (userError || !existingUser) {
        // New user - create profile
        const firstName = userMetadata.given_name || userMetadata.full_name?.split(' ')[0] || 'User'
        const lastName = userMetadata.family_name || userMetadata.full_name?.split(' ').slice(1).join(' ') || ''
        
        const phoneNumber = userMetadata.phone || ''
        const countryCode = '+233'

        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: googleUser.id,
            email: googleUser.email!,
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            country_code: countryCode,
            profile_picture: userMetadata.avatar_url || userMetadata.picture,
            is_email_verified: googleUser.email_confirmed_at ? true : false,
            is_phone_verified: false,
            role: 'customer',
            google_id: userMetadata.sub || googleUser.id,
            preferences: {
              language: 'en',
              currency: 'GH₵'
            }
          })
          .select()
          .single()

        if (insertError) {
          console.error('Database insert error:', insertError)
          return {
            success: false,
            message: 'Failed to create user profile',
            errors: [insertError.message]
          }
        }

        // Create initial user preferences
        await supabase
          .from('user_preferences')
          .insert({
            user_id: googleUser.id,
            language: 'en',
            currency: 'GH₵'
          })

        userData = newUser
      } else {
        // Existing user - update profile picture if needed
        const updateData: any = {
          updated_at: new Date().toISOString()
        }

        if (userMetadata.avatar_url || userMetadata.picture) {
          updateData.profile_picture = userMetadata.avatar_url || userMetadata.picture
        }

        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', googleUser.id)
          .select()
          .single()

        userData = updatedUser || existingUser
      }

      // Get user preferences
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userData.id)
        .single()

      return {
        success: true,
        message: 'Signed in with Google successfully',
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
            currency: 'GH₵'
          },
          createdAt: userData.created_at,
          updatedAt: userData.updated_at
        },
        accessToken: authData.session?.access_token,
        refreshToken: authData.session?.refresh_token
      }
    } catch (error) {
      console.error('Google auth service error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during Google authentication']
      }
    }
  }

  /**
   * Sign out user
   */
  async signOut(req: Request): Promise<AuthResponse> {
    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Signout error:', error)
        return {
          success: false,
          message: 'Failed to sign out',
          errors: [error.message]
        }
      }

      return {
        success: true,
        message: 'Signed out successfully'
      }
    } catch (error) {
      console.error('Signout service error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong during signout']
      }
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      })

      if (error) {
        console.error('Refresh token error:', error)
        return {
          success: false,
          message: 'Failed to refresh token',
          errors: [error.message]
        }
      }

      if (!data.session) {
        return {
          success: false,
          message: 'Failed to refresh token',
          errors: ['No session data']
        }
      }

      return {
        success: true,
        message: 'Token refreshed successfully',
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      }
    } catch (error) {
      console.error('Refresh token service error:', error)
      return {
        success: false,
        message: 'Internal server error',
        errors: ['Something went wrong while refreshing token']
      }
    }
  }
}
