import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;



/**
 * Create Supabase client with anon key (for regular operations)
 */
export function createClient() {
  return createSupabaseClient(supabaseUrl!, supabaseKey!)
}

/**
 * Create Supabase admin client with service role key (for admin operations)
 */
export function createAdminClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing Supabase service role key')
  }

  return createSupabaseClient(supabaseUrl!, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
