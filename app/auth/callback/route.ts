import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

type CookieToSet = { name: string; value: string; options: CookieOptions }

/**
 * OAuth / email-confirmation callback. Supabase redirects here with a `code`
 * which we exchange for a session. The session cookies MUST be written onto the
 * redirect response we return — writing them to the next/headers cookie store
 * and then returning a fresh NextResponse.redirect() drops them, which is why
 * the user was bounced home still logged out.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'

  // Behind a proxy (Vercel) prefer the forwarded host so the redirect lands on
  // the public domain, not an internal one.
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`

  if (code) {
    const cookieStore = await cookies()
    // Build the redirect response up front and set the session cookies on IT.
    const response = NextResponse.redirect(`${base}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return response
    console.error('exchangeCodeForSession failed:', error.message)
  }

  return NextResponse.redirect(`${base}/login?error=auth`)
}
