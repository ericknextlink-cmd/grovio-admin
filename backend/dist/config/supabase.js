"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
exports.createAdminClient = createAdminClient;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvcGh6b2l4cndmdWd3bmV3bW9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgyNjU0NSwiZXhwIjoyMDc0NDAyNTQ1fQ.odFkjpwSnU9ahBZ5wVQKy7Gu9SXGIUW8dLrsS6r5Ja8";
/**
 * Create Supabase client with anon key (for regular operations)
 */
function createClient() {
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
}
/**
 * Create Supabase admin client with service role key (for admin operations)
 */
function createAdminClient() {
    console.log('supabaseServiceKey', supabaseServiceKey);
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
