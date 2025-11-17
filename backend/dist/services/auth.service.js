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
    async initiateGoogleAuth(redirectTo = '/dashboard', req, res) {
        try {
            // Use cookie-based client for PKCE flow
            const supabase = (0, supabase_1.createClient)(req, res);
            // Debug: Log that we're initiating OAuth
            console.log(' Initiating Google OAuth with cookie-based client');
            if (req) {
                console.log(' Request origin:', req.headers.origin);
                console.log(' Request cookie header present:', !!req.headers.cookie);
            }
            // Generate the OAuth URL
            // IMPORTANT: Do NOT pass 'state' in queryParams - Supabase manages its own state for CSRF protection
            // Also, do NOT pass query parameters in redirectTo URL - it can interfere with state validation
            // Instead, we'll use a cookie to store the redirectTo path
            const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
            const callbackUrl = `${backendUrl}/api/auth/google/callback`;
            console.log(' Callback URL:', callbackUrl);
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: callbackUrl,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                        // DO NOT add 'state' here - Supabase manages its own state internally
                        // DO NOT add query parameters to redirectTo - it can break state validation
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
            // Debug: Check if cookies were set by Supabase
            if (res) {
                // Check if Set-Cookie headers were set (Supabase stores PKCE code verifier in cookies)
                const setCookieHeaders = res.getHeader('Set-Cookie');
                console.log('OAuth URL generated, Set-Cookie headers:', setCookieHeaders ? 'present' : 'missing');
                if (setCookieHeaders) {
                    console.log('Number of cookies set:', Array.isArray(setCookieHeaders) ? setCookieHeaders.length : 1);
                }
            }
            // Return cookie name and value so the controller can set it
            // This allows us to store redirectTo without interfering with OAuth state
            const cookieName = 'grovio_oauth_redirect';
            const cookieValue = Buffer.from(JSON.stringify({ redirectTo, ts: Date.now() })).toString('base64url');
            return {
                success: true,
                message: 'Google OAuth URL generated successfully',
                url: data.url,
                cookieName: cookieName,
                cookieValue: cookieValue,
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
     * Handle Google OAuth callback (server-side SSR flow)
     * Exchanges authorization code for session using PKCE code verifier from cookies
     */
    async handleGoogleCallback(code, req, res) {
        try {
            if (!code) {
                return {
                    success: false,
                    message: 'Authorization code is required',
                    errors: ['Missing authorization code'],
                };
            }
            // Use cookie-based client to exchange code (PKCE code verifier is in cookies)
            const supabase = (0, supabase_1.createClient)(req, res);
            console.log('Exchanging OAuth code for session with PKCE...');
            console.log('Request has cookies:', !!req?.headers?.cookie);
            console.log('Request origin:', req?.headers?.origin);
            console.log('Request referer:', req?.headers?.referer);
            console.log('Request host:', req?.headers?.host);
            if (req?.headers?.cookie) {
                const cookies = req.headers.cookie.split(';');
                console.log('Total cookies received:', cookies.length);
                // Check for PKCE code verifier cookie
                const pkceCookies = cookies.filter((c) => c.includes('code-verifier') || c.includes('auth-token'));
                console.log('PKCE-related cookies found:', pkceCookies.length);
                if (pkceCookies.length > 0) {
                    console.log('PKCE cookie names:', pkceCookies.map((c) => c.split('=')[0].trim()));
                }
                else {
                    console.warn(' WARNING: No PKCE code verifier cookie found!');
                    console.warn(' This will cause the code exchange to fail.');
                    console.warn(' Possible causes:');
                    console.warn('   - Cookie was not set correctly (check SameSite/Secure settings)');
                    console.warn('   - Cookie expired (10 min default)');
                    console.warn('   - Browser blocked third-party cookies');
                    console.warn('   - Cookie domain mismatch');
                }
            }
            else {
                console.error('ERROR: No cookies in request header!');
                console.error('This means the PKCE code verifier was not sent.');
            }
            // Exchange the code for a session
            // The PKCE code verifier is automatically retrieved from cookies by createServerClient
            const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);
            if (authError) {
                console.error('Error exchanging code for session:', authError);
                return {
                    success: false,
                    message: 'Failed to exchange authorization code',
                    errors: [(0, error_sanitizer_1.sanitizeAuthError)(authError)],
                };
            }
            if (!authData.session || !authData.user) {
                console.error('No session or user returned from code exchange');
                return {
                    success: false,
                    message: 'Failed to create session',
                    errors: ['No session data returned'],
                };
            }
            console.log('Successfully exchanged code for session:', {
                userId: authData.user.id,
                email: authData.user.email,
                hasAccessToken: !!authData.session.access_token,
            });
            // Process user profile creation/update
            const userResult = await this.processGoogleUser(authData.user, authData.session);
            // Get redirectTo from cookie if it exists
            let redirectTo = '/dashboard';
            const cookieName = 'grovio_oauth_redirect';
            if (req?.cookies?.[cookieName]) {
                try {
                    const decoded = Buffer.from(req.cookies[cookieName], 'base64url').toString('utf8');
                    const parsed = JSON.parse(decoded);
                    if (parsed?.redirectTo && typeof parsed.redirectTo === 'string') {
                        redirectTo = parsed.redirectTo;
                    }
                }
                catch (err) {
                    console.warn('Failed to decode redirect cookie:', err);
                }
            }
            return {
                ...userResult,
                session: authData.session,
                redirectTo,
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
     * Process Google user profile (helper method)
     * Creates or updates user profile and preferences
     */
    async processGoogleUser(googleUser, session) {
        try {
            const userMetadata = googleUser.user_metadata || {};
            const adminSupabase = (0, supabase_1.createAdminClient)();
            // Check if user exists in our database
            const { data: existingUser, error: userError } = await adminSupabase
                .from('users')
                .select('*')
                .eq('id', googleUser.id)
                .maybeSingle();
            let userData;
            if (userError?.code === 'PGRST116' || !existingUser) {
                // New user - create profile
                console.log('🆕 Creating new user profile for Google OAuth user:', {
                    userId: googleUser.id,
                    email: googleUser.email,
                });
                const firstName = userMetadata.given_name ||
                    userMetadata.first_name ||
                    userMetadata.full_name?.split(' ')[0] ||
                    userMetadata.name?.split(' ')[0] ||
                    googleUser.email?.split('@')[0] ||
                    'User';
                const lastName = userMetadata.family_name ||
                    userMetadata.last_name ||
                    userMetadata.full_name?.split(' ').slice(1).join(' ') ||
                    userMetadata.name?.split(' ').slice(1).join(' ') ||
                    '';
                const phoneNumber = userMetadata.phone || userMetadata.phone_number || googleUser.phone || '';
                const countryCode = userMetadata.country_code || '+233';
                const { data: newUser, error: insertError } = await adminSupabase
                    .from('users')
                    .insert({
                    id: googleUser.id,
                    email: googleUser.email,
                    first_name: firstName,
                    last_name: lastName,
                    phone_number: phoneNumber,
                    country_code: countryCode,
                    profile_picture: userMetadata.avatar_url || userMetadata.picture || null,
                    is_email_verified: googleUser.email_confirmed_at ? true : false,
                    is_phone_verified: googleUser.phone_confirmed_at ? true : false,
                    role: 'customer',
                    google_id: userMetadata.sub || userMetadata.provider_id || googleUser.id,
                    preferences: {
                        language: 'en',
                        currency: 'GHS',
                    },
                })
                    .select()
                    .single();
                if (insertError) {
                    // Check if user was created concurrently
                    if (insertError.code === '23505') {
                        const { data: existingUserData } = await adminSupabase
                            .from('users')
                            .select('*')
                            .eq('id', googleUser.id)
                            .maybeSingle();
                        if (existingUserData) {
                            userData = existingUserData;
                        }
                        else {
                            return {
                                success: false,
                                message: 'Failed to create user profile',
                                errors: [(0, error_sanitizer_1.sanitizeDatabaseError)(insertError)],
                            };
                        }
                    }
                    else {
                        return {
                            success: false,
                            message: 'Failed to create user profile',
                            errors: [(0, error_sanitizer_1.sanitizeDatabaseError)(insertError)],
                        };
                    }
                }
                else {
                    userData = newUser;
                    // Create initial user preferences
                    await adminSupabase
                        .from('user_preferences')
                        .insert({
                        user_id: googleUser.id,
                        language: 'en',
                        currency: 'GHS',
                    }).then(({ error: prefError }) => {
                        if (prefError && prefError.code !== '23505') {
                            console.warn(' Failed to create user preferences (non-fatal):', prefError.message);
                        }
                    });
                }
            }
            else {
                // Existing user - update profile if needed
                const updateData = {
                    updated_at: new Date().toISOString(),
                };
                if (userMetadata.avatar_url || userMetadata.picture) {
                    updateData.profile_picture = userMetadata.avatar_url || userMetadata.picture;
                }
                if (googleUser.email_confirmed_at) {
                    updateData.is_email_verified = true;
                }
                const { data: updatedUser, error: updateError } = await adminSupabase
                    .from('users')
                    .update(updateData)
                    .eq('id', googleUser.id)
                    .select()
                    .single();
                if (updateError) {
                    console.warn(' Failed to update user profile (non-fatal):', updateError.message);
                    userData = existingUser;
                }
                else {
                    userData = updatedUser || existingUser;
                }
            }
            // Get user preferences
            const { data: preferences } = await adminSupabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userData.id)
                .maybeSingle();
            // Create preferences if they don't exist
            if (!preferences) {
                await adminSupabase
                    .from('user_preferences')
                    .insert({
                    user_id: userData.id,
                    language: 'en',
                    currency: 'GHS',
                });
            }
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
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
            };
        }
        catch (error) {
            console.error('Process Google user error:', error);
            return {
                success: false,
                message: 'Failed to process user profile',
                errors: ['Something went wrong while creating/updating user profile'],
            };
        }
    }
    /**
     * Handle OAuth session from frontend (for client-side OAuth flow)
     * When OAuth is initiated client-side, the frontend exchanges the code for a session
     * and sends the session to this endpoint to create/update user profile
     */
    async handleGoogleCallbackSession(session) {
        try {
            if (!session?.access_token || !session?.user) {
                return {
                    success: false,
                    message: 'Invalid session data',
                    errors: ['Session must include access_token and user'],
                };
            }
            // Verify the session token with Supabase
            const adminSupabase = (0, supabase_1.createAdminClient)();
            const { data: { user: verifiedUser }, error: verifyError } = await adminSupabase.auth.getUser(session.access_token);
            if (verifyError || !verifiedUser) {
                console.error('Error verifying session token:', verifyError);
                return {
                    success: false,
                    message: 'Invalid session token',
                    errors: ['Failed to verify session with Supabase'],
                };
            }
            // Use verified user data
            const googleUser = verifiedUser;
            const userMetadata = googleUser.user_metadata || session.user?.user_metadata || {};
            // Check if user exists in our database using admin client to bypass RLS
            const { data: existingUser, error: userError } = await adminSupabase
                .from('users')
                .select('*')
                .eq('id', googleUser.id)
                .maybeSingle(); // Use maybeSingle() to avoid errors when no rows found
            let userData;
            // Check if user profile is missing (PGRST116 means no rows found)
            if (userError?.code === 'PGRST116' || !existingUser) {
                // New user - create profile using admin client to bypass RLS
                console.log('🆕 Creating new user profile for Google OAuth user:', {
                    userId: googleUser.id,
                    email: googleUser.email,
                    hasMetadata: !!userMetadata,
                    metadataKeys: Object.keys(userMetadata),
                });
                const firstName = userMetadata.given_name ||
                    userMetadata.first_name ||
                    userMetadata.full_name?.split(' ')[0] ||
                    userMetadata.name?.split(' ')[0] ||
                    googleUser.email?.split('@')[0] ||
                    'User';
                const lastName = userMetadata.family_name ||
                    userMetadata.last_name ||
                    userMetadata.full_name?.split(' ').slice(1).join(' ') ||
                    userMetadata.name?.split(' ').slice(1).join(' ') ||
                    '';
                const phoneNumber = userMetadata.phone || userMetadata.phone_number || googleUser.phone || '';
                const countryCode = userMetadata.country_code || '+233';
                // Use a transaction-like approach: insert user and preferences together
                // If user insert fails, we don't want to proceed
                const { data: newUser, error: insertError } = await adminSupabase
                    .from('users')
                    .insert({
                    id: googleUser.id,
                    email: googleUser.email,
                    first_name: firstName,
                    last_name: lastName,
                    phone_number: phoneNumber,
                    country_code: countryCode,
                    profile_picture: userMetadata.avatar_url || userMetadata.picture || null,
                    is_email_verified: googleUser.email_confirmed_at ? true : false,
                    is_phone_verified: googleUser.phone_confirmed_at ? true : false,
                    role: 'customer',
                    google_id: userMetadata.sub || userMetadata.provider_id || googleUser.id,
                    preferences: {
                        language: 'en',
                        currency: 'GHS',
                    },
                })
                    .select()
                    .single();
                if (insertError) {
                    console.error('Database insert error during Google OAuth:', {
                        error: insertError,
                        userId: googleUser.id,
                        email: googleUser.email,
                        code: insertError.code,
                        message: insertError.message,
                        details: insertError.details,
                        hint: insertError.hint,
                    });
                    // Check if it's a duplicate key error (user might have been created concurrently)
                    if (insertError.code === '23505') {
                        console.log(' User profile was created concurrently, fetching existing profile');
                        // User was created by another process (possibly auto-repair middleware)
                        // Try to fetch the existing user
                        const { data: existingUserData, error: fetchError } = await adminSupabase
                            .from('users')
                            .select('*')
                            .eq('id', googleUser.id)
                            .maybeSingle();
                        if (existingUserData && !fetchError) {
                            console.log('Found existing user profile after concurrent creation');
                            userData = existingUserData;
                        }
                        else {
                            console.error('Failed to fetch existing user after duplicate key error:', fetchError);
                            return {
                                success: false,
                                message: 'Failed to create user profile',
                                errors: [(0, error_sanitizer_1.sanitizeDatabaseError)(insertError)],
                            };
                        }
                    }
                    else {
                        return {
                            success: false,
                            message: 'Failed to create user profile',
                            errors: [(0, error_sanitizer_1.sanitizeDatabaseError)(insertError)],
                        };
                    }
                }
                else {
                    console.log('Successfully created user profile:', {
                        userId: newUser.id,
                        email: newUser.email,
                    });
                    userData = newUser;
                    // Create initial user preferences (with error handling)
                    const { error: preferencesError } = await adminSupabase
                        .from('user_preferences')
                        .insert({
                        user_id: googleUser.id,
                        language: 'en',
                        currency: 'GHS',
                    });
                    if (preferencesError) {
                        if (preferencesError.code === '23505') {
                            console.log('User preferences already exist (duplicate key)');
                        }
                        else {
                            // Log but don't fail - preferences might already exist or can be created later
                            console.warn(' Failed to create user preferences (non-fatal):', preferencesError.message);
                        }
                    }
                    else {
                        console.log('Successfully created user preferences');
                    }
                }
            }
            else {
                // Existing user - update profile picture if needed
                // Use admin client to ensure update works even if RLS blocks it
                console.log('User profile already exists, updating if needed:', {
                    userId: googleUser.id,
                    email: googleUser.email,
                });
                const updateData = {
                    updated_at: new Date().toISOString(),
                };
                if (userMetadata.avatar_url || userMetadata.picture) {
                    updateData.profile_picture = userMetadata.avatar_url || userMetadata.picture;
                }
                // Update email verification status if it changed
                if (googleUser.email_confirmed_at) {
                    updateData.is_email_verified = true;
                }
                const { data: updatedUser, error: updateError } = await adminSupabase
                    .from('users')
                    .update(updateData)
                    .eq('id', googleUser.id)
                    .select()
                    .single();
                if (updateError) {
                    console.warn(' Failed to update user profile (non-fatal):', updateError.message);
                    // Use existing user data if update fails
                    userData = existingUser;
                }
                else {
                    userData = updatedUser || existingUser;
                }
            }
            // Get user preferences using admin client to bypass RLS
            const { data: preferences, error: preferencesError } = await adminSupabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userData.id)
                .maybeSingle();
            // If preferences don't exist, create them (non-fatal if it fails)
            if (!preferences && !preferencesError) {
                console.log('Creating user preferences for user');
                const { error: createPrefError } = await adminSupabase
                    .from('user_preferences')
                    .insert({
                    user_id: userData.id,
                    language: 'en',
                    currency: 'GHS',
                });
                if (createPrefError && createPrefError.code !== '23505') {
                    console.warn(' Failed to create user preferences (non-fatal):', createPrefError.message);
                }
            }
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
                accessToken: session.access_token,
                refreshToken: session.refresh_token,
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
