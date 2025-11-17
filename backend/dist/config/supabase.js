"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
exports.createAdminClient = createAdminClient;
const supabase_js_1 = require("@supabase/supabase-js");
const ssr_1 = require("@supabase/ssr");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Validate required environment variables
if (!supabaseUrl) {
    throw new Error('Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable.');
}
if (!supabaseKey) {
    throw new Error('Missing Supabase Key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY environment variable.');
}
/**
 * Create Supabase client with anon key (for regular operations)
 * Use cookie-based storage for PKCE flow in server-side scenarios
 * Uses Supabase's cookie parsing utilities for proper format
 */
function createClient(req, res) {
    // If request/response are provided, use cookie-based storage for PKCE
    if (req && res) {
        return (0, ssr_1.createServerClient)(supabaseUrl, supabaseKey, {
            cookies: {
                getAll() {
                    // Use Supabase's cookie parser to handle cookie format correctly
                    const cookieHeader = req.headers.cookie || '';
                    const cookies = (0, ssr_1.parseCookieHeader)(cookieHeader);
                    // Filter out cookies with undefined values and ensure all have values
                    return cookies.filter((cookie) => cookie.value !== undefined && cookie.value !== null).map(cookie => ({
                        name: cookie.name,
                        value: cookie.value || ''
                    }));
                },
                setAll(cookiesToSet) {
                    // Set cookies using Express's cookie method with options from Supabase
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const isProduction = process.env.NODE_ENV === 'production';
                        const isDevelopment = process.env.NODE_ENV === 'development';
                        // Check if this is a PKCE code verifier cookie (critical for OAuth flow)
                        const isPKCECookie = name.includes('code-verifier') || name.includes('auth-token');
                        // For OAuth/PKCE flows, we ALWAYS need SameSite=None with Secure for cross-domain redirects
                        // This is critical when Google redirects back to our callback URL
                        // We override Supabase's default because we need cross-site cookie support
                        let sameSite = 'lax';
                        let secure = true;
                        if (isProduction) {
                            // Production: Always use SameSite=None for OAuth cookies (required for cross-domain redirects)
                            sameSite = 'none';
                            secure = true; // Required when SameSite=None
                        }
                        else if (isPKCECookie) {
                            // Even in development, use SameSite=None for PKCE cookies if using cross-domain setup
                            // Check if frontend and backend are on different origins
                            const backendUrl = process.env.BACKEND_URL || '';
                            const frontendUrl = process.env.FRONTEND_URL || '';
                            try {
                                const backendOrigin = backendUrl ? new URL(backendUrl).origin : '';
                                const frontendOrigin = frontendUrl ? new URL(frontendUrl).origin : '';
                                if (backendOrigin && frontendOrigin && backendOrigin !== frontendOrigin) {
                                    // Different origins - need SameSite=None
                                    sameSite = 'none';
                                    secure = true;
                                }
                                else {
                                    // Same origin - can use lax
                                    sameSite = 'lax';
                                    secure = false; // Development can use HTTP
                                }
                            }
                            catch (e) {
                                // Fallback to lax if URL parsing fails
                                sameSite = 'lax';
                                secure = false;
                            }
                        }
                        else {
                            // Non-PKCE cookies use lax in development
                            sameSite = 'lax';
                            secure = false;
                        }
                        // Log cookie settings for debugging
                        console.log(`Setting cookie: ${name}`);
                        console.log(`   - SameSite: ${sameSite}`);
                        console.log(`   - Secure: ${secure}`);
                        console.log(`   - HttpOnly: ${options?.httpOnly ?? true}`);
                        console.log(`   - Path: ${options?.path ?? '/'}`);
                        console.log(`   - Is PKCE: ${isPKCECookie}`);
                        console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
                        // For PKCE cookies, ALWAYS use HttpOnly for security
                        // Even if Supabase requests non-HttpOnly, we enforce it for security
                        const httpOnly = isPKCECookie ? true : (options?.httpOnly ?? true);
                        res.cookie(name, value, {
                            httpOnly: httpOnly,
                            secure: secure,
                            sameSite: sameSite,
                            path: options?.path ?? '/',
                            maxAge: options?.maxAge ?? (10 * 60), // Default 10 minutes for PKCE code verifier
                            // Don't set domain - let it default to the current domain (better for cross-subdomain)
                            // domain: options?.domain, // Commented out - let Express handle domain automatically
                            expires: options?.expires,
                        });
                    });
                },
            },
        });
    }
    // Fallback to default client (for client-side or when cookies aren't available)
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
        auth: {
            flowType: 'pkce',
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    });
}
/**
 * Create Supabase admin client with service role key (for admin operations)
 */
function createAdminClient() {
    if (!supabaseServiceKey) {
        throw new Error('Missing Supabase service role key');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
