export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  countryCode: string
  profilePicture?: string
  isEmailVerified: boolean
  isPhoneVerified: boolean
  role: 'customer' | 'admin'
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  familySize?: number
  dietaryRestrictions?: string[]
  preferredCategories?: string[]
  budgetRange?: {
    min: number
    max: number
  }
  deliveryAddress?: string
  language: 'en' | 'tw' | 'fr'
  currency: 'GH₵' | 'USD'
}

export interface SignupRequest {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string // includes country code e.g., +233241234567
  password: string
}

export interface SigninRequest {
  email: string
  password: string
}

export interface GoogleAuthRequest {
  idToken: string
  nonce?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  user?: User
  accessToken?: string
  refreshToken?: string
  errors?: string[]
}

export interface UserProfile {
  firstName: string
  lastName: string
  phoneNumber: string
  preferences: UserPreferences
}

// Database user table structure
export interface DatabaseUser {
  id: string
  email: string
  first_name: string
  last_name: string
  phone_number: string
  country_code: string
  password_hash?: string // null for Google OAuth users
  profile_picture?: string
  is_email_verified: boolean
  is_phone_verified: boolean
  role: 'customer' | 'admin'
  preferences: UserPreferences
  google_id?: string // for Google OAuth users
  created_at: string
  updated_at: string
}
