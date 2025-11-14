import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
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
 * Uses Supabase's cookie parsing utilities for proper format
 */
export function createClient(req?: Request, res?: Response) {
  // If request/response are provided, use cookie-based storage for PKCE
  if (req && res) {
    return createServerClient(supabaseUrl!, supabaseKey!, {
      cookies: {
        getAll() {
          // Use Supabase's cookie parser to handle cookie format correctly
          const cookieHeader = req.headers.cookie || ''
          const cookies = parseCookieHeader(cookieHeader)
          // Filter out cookies with undefined values and ensure all have values
          return cookies.filter((cookie): cookie is { name: string; value: string } => 
            cookie.value !== undefined && cookie.value !== null
          ).map(cookie => ({
            name: cookie.name,
            value: cookie.value || ''
          }))
        },
        setAll(cookiesToSet) {
          // Set cookies using Express's cookie method with options from Supabase
          cookiesToSet.forEach(({ name, value, options }) => {
            // Use Express's cookie method directly with Supabase's options
            const isProduction = process.env.NODE_ENV === 'production'
            res.cookie(name, value, {
              httpOnly: options?.httpOnly ?? true,
              secure: options?.secure ?? isProduction,
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') ?? (isProduction ? 'none' : 'lax'),
              path: options?.path ?? '/',
              maxAge: options?.maxAge,
              domain: options?.domain,
              expires: options?.expires,
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
