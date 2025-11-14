"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
exports.createAdminClient = createAdminClient;
const supabase_js_1 = require("@supabase/supabase-js");
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
 * Configured with PKCE flow for secure OAuth authentication
 */
function createClient() {
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
        auth: {
            flowType: 'pkce', // Use PKCE flow instead of implicit flow for OAuth
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
