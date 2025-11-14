import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { Request, Response } from 'express'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable.')
}

if (!supabaseKey) {
  throw new Error('Missing Supabase Key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY environment variable.')
}

/**
 * Create Supabase client with anon key (for regular operations)
 * Use cookie-based storage for PKCE flow in server-side scenarios
 */
export function createClient(req?: Request, res?: Response) {
  // If request/response are provided, use cookie-based storage for PKCE
  if (req && res) {
    return createServerClient(supabaseUrl!, supabaseKey!, {
      cookies: {
        getAll() {
          // Extract all cookies from request
          return Object.entries(req.cookies || {}).map(([name, value]) => ({
            name,
            value: value || '',
          }))
        },
        setAll(cookiesToSet) {
          // Set cookies in response
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookie(name, value, {
              httpOnly: options?.httpOnly ?? true,
              secure: options?.secure ?? process.env.NODE_ENV === 'production',
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
              maxAge: options?.maxAge,
              domain: options?.domain,
              path: options?.path ?? '/',
            })
          })
        },
      },
    })
  }

  // Fallback to default client (for client-side or when cookies aren't available)
  return createSupabaseClient(supabaseUrl!, supabaseKey!, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
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
