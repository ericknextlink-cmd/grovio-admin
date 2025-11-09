"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const supabase_1 = require("../config/supabase");
const auth_1 = require("../utils/auth");
const error_sanitizer_1 = require("../utils/error-sanitizer");
const user_service_1 = require("./user.service");
const email_service_1 = require("./email.service");
const token_service_1 = require("./token.service");
class AuthService {
    constructor() {
        this.userService = new user_service_1.UserService();
        this.emailService = new email_service_1.EmailService();
        this.tokenService = new token_service_1.TokenService();
    }
    /**
     * Sign up new user with email and password
     */
    async signUp(signupData) {
        const { firstName, lastName, email, phoneNumber, password } = signupData;
        // Validation
        const errors = [];
        if (!firstName?.trim())
            errors.push('First name is required');
        if (!lastName?.trim())
            errors.push('Last name is required');
        if (!email?.trim())
            errors.push('Email is required');
        else if (!(0, auth_1.isValidEmail)(email))
            errors.push('Invalid email format');
        if (!phoneNumber?.trim())
            errors.push('Phone number is required');
        else if (!(0, auth_1.isValidPhoneNumber)(phoneNumber)) {
            errors.push('Phone number must be in international format (e.g., +233241234567)');
        }
        if (!password)
            errors.push('Password is required');
        else {
            const passwordValidation = (0, auth_1.isValidPassword)(password);
            if (!passwordValidation.valid) {
                errors.push(...passwordValidation.errors);
            }
        }
        if (errors.length > 0) {
            return {
                success: false,
                message: 'Validation failed',
                errors
            };
        }
        try {
            const supabase = (0, supabase_1.createClient)();
            // Check if user already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id, email, phone_number')
                .or(`email.eq.${email},phone_number.eq.${phoneNumber}`)
                .single();
            if (existingUser) {
                const conflictField = existingUser.email === email ? 'email' : 'phone number';
                return {
                    success: false,
                    message: `User with this ${conflictField} already exists`,
                    errors: [`${conflictField} already registered`]
                };
            }
            // Extract country code from phone number
            const countryCodeMatch = phoneNumber.match(/^\+(\d{1,4})/);
            const countryCode = countryCodeMatch ? `+${countryCodeMatch[1]}` : '+233';
            // Hash password
            const passwordHash = await (0, auth_1.hashPassword)(password);
            // Create user in Supabase Auth
            console.log('Creating auth user for:', email);
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
            });
            console.log('Auth signup result:', {
                hasUser: !!authData.user,
                userId: authData.user?.id,
                error: authError?.message
            });
            if (authError) {
                console.error('Supabase auth error:', authError);
                return {
                    success: false,
                    message: 'Failed to create account',
                    errors: [(0, error_sanitizer_1.sanitizeAuthError)(authError)]
                };
            }
            if (!authData.user) {
                console.error('No user returned from signUp');
                return {
                    success: false,
                    message: 'Failed to create account',
                    errors: ['User creation failed']
                };
            }
            console.log('Auth user created:', authData.user.id);
            // Insert user data into our custom users table using admin client to bypass RLS
            const adminSupabase = (0, supabase_1.createAdminClient)();
            const { error: dbError } = await adminSupabase
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
                    currency: 'GHS'
                }
            });
            if (dbError) {
                console.error('Database insert error:', dbError);
                // Try to clean up the auth user if database insert fails
                try {
                    await supabase.auth.admin.deleteUser(authData.user.id);
                }
                catch (cleanupError) {
                    console.error('Failed to cleanup auth user:', cleanupError);
                }
                return {
                    success: false,
                    message: 'Failed to create user profile',
                    errors: [(0, error_sanitizer_1.sanitizeDatabaseError)(dbError)]
                };
            }
            // Create initial user preferences
            await adminSupabase
                .from('user_preferences')
                .insert({
                user_id: authData.user.id,
                language: 'en',
                currency: 'GHS'
            });
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
                        currency: 'GHS'
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            };
        }
        catch (error) {
            console.error('Signup service error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Something went wrong during signup']
            };
        }
    }
    /**
     * Sign in user with email and password
     */
    async signIn(signinData) {
        const { email, password } = signinData;
        // Validation
        const errors = [];
        if (!email?.trim())
            errors.push('Email is required');
        else if (!(0, auth_1.isValidEmail)(email))
            errors.push('Invalid email format');
        if (!password)
            errors.push('Password is required');
        if (errors.length > 0) {
            return {
                success: false,
                message: 'Validation failed',
                errors
            };
        }
        try {
            const supabase = (0, supabase_1.createClient)();
            // First, try to authenticate with Supabase Auth (this validates the password)
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email.toLowerCase().trim(),
                password
            });
            if (authError || !authData.user) {
                return {
                    success: false,
                    message: 'Invalid email or password',
                    errors: ['Invalid credentials']
                };
            }
            // Get user from our database using admin client to bypass RLS
            const adminSupabase = (0, supabase_1.createAdminClient)();
            const { data: userData, error: userError } = await adminSupabase
                .from('users')
                .select('*')
                .eq('id', authData.user.id)
                .single();
            // If user doesn't exist in our database but exists in auth, create profile
            if (userError || !userData) {
                // User exists in auth.users but not in public.users
                // This shouldn't happen, but we'll handle it gracefully
                console.warn(`User ${authData.user.id} exists in auth but not in public.users`);
                // Try to create the profile from auth metadata
                const { data: newUserData, error: createError } = await adminSupabase
                    .from('users')
                    .insert({
                    id: authData.user.id,
                    email: authData.user.email?.toLowerCase().trim() || email.toLowerCase().trim(),
                    first_name: authData.user.user_metadata?.first_name || '',
                    last_name: authData.user.user_metadata?.last_name || '',
                    phone_number: authData.user.user_metadata?.phone_number || '',
                    country_code: authData.user.user_metadata?.country_code || '+233',
                    role: 'customer',
                    preferences: {
                        language: 'en',
                        currency: 'GHS'
                    }
                })
                    .select()
                    .single();
                if (createError || !newUserData) {
                    console.error('Failed to create user profile during signin:', createError);
                    return {
                        success: false,
                        message: 'Account exists but profile is incomplete',
                        errors: ['Please contact support to complete your account setup']
                    };
                }
                // Use the newly created user data
                const { data: preferences } = await adminSupabase
                    .from('user_preferences')
                    .select('*')
                    .eq('user_id', newUserData.id)
                    .single();
                return {
                    success: true,
                    message: 'Signed in successfully',
                    user: {
                        id: newUserData.id,
                        email: newUserData.email,
                        firstName: newUserData.first_name,
                        lastName: newUserData.last_name,
                        phoneNumber: newUserData.phone_number,
                        countryCode: newUserData.country_code,
                        profilePicture: newUserData.profile_picture,
                        isEmailVerified: newUserData.is_email_verified,
                        isPhoneVerified: newUserData.is_phone_verified,
                        role: newUserData.role,
                        preferences: preferences || {
                            language: 'en',
                            currency: 'GHS'
                        },
                        createdAt: newUserData.created_at,
                        updatedAt: newUserData.updated_at
                    },
                    accessToken: authData.session.access_token,
                    refreshToken: authData.session.refresh_token
                };
            }
            // If user doesn't have a password hash, they might be OAuth-only
            // (Supabase Auth already validated the password above, so this is just a check)
            if (!userData.password_hash && authData.user.app_metadata?.provider !== 'email') {
                return {
                    success: false,
                    message: 'This account was created with Google. Please sign in with Google.',
                    errors: ['Use Google sign-in']
                };
            }
            // Get user preferences using admin client
            const { data: preferences } = await adminSupabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userData.id)
                .single();
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
                        currency: 'GHS'
                    },
                    createdAt: userData.created_at,
                    updatedAt: userData.updated_at
                },
                accessToken: authData.session.access_token,
                refreshToken: authData.session.refresh_token
            };
        }
        catch (error) {
            console.error('Signin service error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Something went wrong during signin']
            };
        }
    }
    /**
     * Initiate Google OAuth flow - returns redirect URL
     */
    async initiateGoogleAuth(redirectTo = '/dashboard') {
        try {
            const supabase = (0, supabase_1.createClient)();
            // Generate the OAuth URL
            const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${backendUrl}/api/auth/google/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) {
                console.error('Error initiating Google OAuth:', error);
                return {
                    success: false,
                    message: 'Failed to initiate Google authentication',
                    errors: [(0, error_sanitizer_1.sanitizeError)(error)],
                };
            }
            return {
                success: true,
                message: 'Google OAuth URL generated successfully',
                url: data.url,
            };
        }
        catch (error) {
            console.error('Initiate Google auth service error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Something went wrong while initiating Google authentication'],
            };
        }
    }
    /**
     * Handle Google OAuth callback
     */
    async handleGoogleCallback(code) {
        try {
            const supabase = (0, supabase_1.createClient)();
            // Exchange code for session
            const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);
            if (authError) {
                console.error('Error exchanging code for session:', authError);
                return {
                    success: false,
                    message: 'Failed to complete Google authentication',
                    errors: [(0, error_sanitizer_1.sanitizeAuthError)(authError)],
                };
            }
            if (!authData.user || !authData.session) {
                return {
                    success: false,
                    message: 'No user data received from Google',
                    errors: ['Authentication failed'],
                };
            }
            const googleUser = authData.user;
            const userMetadata = googleUser.user_metadata;
            // Check if user exists in our database
            const { data: existingUser, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', googleUser.id)
                .single();
            let userData;
            if (userError || !existingUser) {
                // New user - create profile using admin client to bypass RLS
                const firstName = userMetadata.given_name || userMetadata.full_name?.split(' ')[0] || 'User';
                const lastName = userMetadata.family_name || userMetadata.full_name?.split(' ').slice(1).join(' ') || '';
                const phoneNumber = userMetadata.phone || '';
                const countryCode = '+233';
                const adminSupabase = (0, supabase_1.createAdminClient)();
                const { data: newUser, error: insertError } = await adminSupabase
                    .from('users')
                    .insert({
                    id: googleUser.id,
                    email: googleUser.email,
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
                        currency: 'GHS',
                    },
                })
                    .select()
                    .single();
                if (insertError) {
                    console.error('Database insert error:', insertError);
                    return {
                        success: false,
                        message: 'Failed to create user profile',
                        errors: [(0, error_sanitizer_1.sanitizeDatabaseError)(insertError)],
                    };
                }
                // Create initial user preferences
                await adminSupabase.from('user_preferences').insert({
                    user_id: googleUser.id,
                    language: 'en',
                    currency: 'GHS',
                });
                userData = newUser;
            }
            else {
                // Existing user - update profile picture if needed
                const updateData = {
                    updated_at: new Date().toISOString(),
                };
                if (userMetadata.avatar_url || userMetadata.picture) {
                    updateData.profile_picture = userMetadata.avatar_url || userMetadata.picture;
                }
                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update(updateData)
                    .eq('id', googleUser.id)
                    .select()
                    .single();
                userData = updatedUser || existingUser;
            }
            // Get user preferences
            const { data: preferences } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userData.id)
                .single();
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
                        currency: 'GHS',
                    },
                    createdAt: userData.created_at,
                    updatedAt: userData.updated_at,
                },
                accessToken: authData.session?.access_token,
                refreshToken: authData.session?.refresh_token,
            };
        }
        catch (error) {
            console.error('Google callback service error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Something went wrong during Google authentication'],
            };
        }
    }
    /**
     * Google OAuth authentication (ID token method - legacy)
     */
    async googleAuth(googleData) {
        const { idToken, nonce } = googleData;
        if (!idToken) {
            return {
                success: false,
                message: 'Google ID token is required',
                errors: ['Missing ID token']
            };
        }
        try {
            const supabase = (0, supabase_1.createClient)();
            // Sign in with Google ID token
            const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
                nonce
            });
            if (authError) {
                console.error('Google auth error:', authError);
                return {
                    success: false,
                    message: 'Google authentication failed',
                    errors: [(0, error_sanitizer_1.sanitizeAuthError)(authError)]
                };
            }
            if (!authData.user) {
                return {
                    success: false,
                    message: 'Google authentication failed',
                    errors: ['User data not available']
                };
            }
            const googleUser = authData.user;
            const userMetadata = googleUser.user_metadata;
            // Check if user exists in our database
            const { data: existingUser, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', googleUser.id)
                .single();
            let userData;
            if (userError || !existingUser) {
                // New user - create profile using admin client to bypass RLS
                const firstName = userMetadata.given_name || userMetadata.full_name?.split(' ')[0] || 'User';
                const lastName = userMetadata.family_name || userMetadata.full_name?.split(' ').slice(1).join(' ') || '';
                const phoneNumber = userMetadata.phone || '';
                const countryCode = '+233';
                const adminSupabase = (0, supabase_1.createAdminClient)();
                const { data: newUser, error: insertError } = await adminSupabase
                    .from('users')
                    .insert({
                    id: googleUser.id,
                    email: googleUser.email,
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
                        currency: 'GHS'
                    }
                })
                    .select()
                    .single();
                if (insertError) {
                    console.error('Database insert error:', insertError);
                    return {
                        success: false,
                        message: 'Failed to create user profile',
                        errors: [insertError.message]
                    };
                }
                // Create initial user preferences
                await adminSupabase
                    .from('user_preferences')
                    .insert({
                    user_id: googleUser.id,
                    language: 'en',
                    currency: 'GHS'
                });
                userData = newUser;
            }
            else {
                // Existing user - update profile picture if needed
                const updateData = {
                    updated_at: new Date().toISOString()
                };
                if (userMetadata.avatar_url || userMetadata.picture) {
                    updateData.profile_picture = userMetadata.avatar_url || userMetadata.picture;
                }
                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update(updateData)
                    .eq('id', googleUser.id)
                    .select()
                    .single();
                userData = updatedUser || existingUser;
            }
            // Get user preferences
            const { data: preferences } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userData.id)
                .single();
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
                        currency: 'GHS'
                    },
                    createdAt: userData.created_at,
                    updatedAt: userData.updated_at
                },
                accessToken: authData.session?.access_token,
                refreshToken: authData.session?.refresh_token
            };
        }
        catch (error) {
            console.error('Google auth service error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Something went wrong during Google authentication']
            };
        }
    }
    /**
     * Sign out user
     */
    async signOut(req) {
        try {
            const supabase = (0, supabase_1.createClient)();
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Signout error:', error);
                return {
                    success: false,
                    message: 'Failed to sign out',
                    errors: [(0, error_sanitizer_1.sanitizeError)(error)]
                };
            }
            return {
                success: true,
                message: 'Signed out successfully'
            };
        }
        catch (error) {
            console.error('Signout service error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Something went wrong during signout']
            };
        }
    }
    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        try {
            const supabase = (0, supabase_1.createClient)();
            const { data, error } = await supabase.auth.refreshSession({
                refresh_token: refreshToken
            });
            if (error) {
                console.error('Refresh token error:', error);
                return {
                    success: false,
                    message: 'Failed to refresh token',
                    errors: [(0, error_sanitizer_1.sanitizeAuthError)(error)]
                };
            }
            if (!data.session) {
                return {
                    success: false,
                    message: 'Failed to refresh token',
                    errors: ['No session data']
                };
            }
            return {
                success: true,
                message: 'Token refreshed successfully',
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token
            };
        }
        catch (error) {
            console.error('Refresh token service error:', error);
            return {
                success: false,
                message: 'Internal server error',
                errors: ['Something went wrong while refreshing token']
            };
        }
    }
}
exports.AuthService = AuthService;
