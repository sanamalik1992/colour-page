import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieToSet = { name: string; value: string; options: CookieOptions }

/**
 * Server-side Supabase client bound to the request cookies (anon key). Use this
 * to read the VERIFIED logged-in user in route handlers and server components.
 * Distinct from lib/supabase/server.ts (service_role admin client) — this one
 * respects the user's session and RLS.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component where cookies are read-only; the
            // middleware refreshes the session cookie instead. Safe to ignore.
          }
        },
      },
    }
  )
}

/**
 * The verified logged-in user, or null. NEVER trust a client-sent id/email when
 * this returns a user — this comes from the signed session, so it's the source
 * of truth for ownership and Pro checks.
 */
export async function getServerUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null
  return { id: user.id, email: user.email.toLowerCase() }
}
