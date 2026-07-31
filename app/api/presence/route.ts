import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Anonymous presence heartbeat. The client pings this every ~25s so the admin
 * dashboard can show a live "on site now" count. Stores only a session id, a
 * timestamp, and a coarse activity hint — no personal data. Best-effort: any
 * error is swallowed so it never affects the user.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const sessionId = String(body?.sessionId || '').slice(0, 64)
    const activity = String(body?.activity || '').slice(0, 32)
    if (!sessionId) return NextResponse.json({ ok: false })

    await supabase
      .from('presence')
      .upsert({ session_id: sessionId, last_seen: new Date().toISOString(), activity }, { onConflict: 'session_id' })

    // Best-effort country from Vercel's edge geo header (ISO-3166 alpha-2), for
    // the admin "where visitors are from" view. No IP or personal data is stored,
    // only the country code. A separate update so a missing `country` column
    // (before the migration is run) can't break the presence heartbeat.
    const country = (request.headers.get('x-vercel-ip-country') || '').slice(0, 2).toUpperCase()
    if (country && /^[A-Z]{2}$/.test(country)) {
      await supabase.from('presence').update({ country }).eq('session_id', sessionId)
    }

    // Prune rows older than 5 minutes so the table stays tiny.
    await supabase.from('presence').delete().lt('last_seen', new Date(Date.now() - 5 * 60_000).toISOString())

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
