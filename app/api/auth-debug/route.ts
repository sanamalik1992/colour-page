import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerUser } from '@/lib/supabase/auth-server'

export const runtime = 'nodejs'

/**
 * Diagnostic only — reports whether the server can see an auth session and which
 * Supabase cookies arrived. Returns cookie NAMES only, never values, so it's
 * safe to hit. Remove once auth is confirmed working.
 */
export async function GET() {
  const cookieStore = await cookies()
  const all = cookieStore.getAll()
  const sbCookies = all.filter((c) => c.name.startsWith('sb-')).map((c) => c.name)

  let user: { id: string; email: string } | null = null
  let error: string | null = null
  try {
    user = await getServerUser()
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    serverSeesUser: !!user,
    userEmail: user?.email ?? null,
    sbCookiesSeenByServer: sbCookies,
    totalCookies: all.length,
    error,
  })
}
