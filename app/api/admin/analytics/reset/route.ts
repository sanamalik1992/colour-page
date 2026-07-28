import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Tables that feed the analytics dashboard and hold nothing but activity/test
// data. Wiping these gives a clean slate for launch. We deliberately do NOT
// touch stripe_customers, stripe_subscriptions, orders or profiles — those are
// real customer records, not analytics.
//
// Each entry pairs a table with a primary-key-ish column that is guaranteed
// non-null, so `.not(col, 'is', null)` matches (and deletes) every row.
const TABLES: { table: string; keyCol: string }[] = [
  { table: 'presence', keyCol: 'session_id' },
  { table: 'photo_jobs', keyCol: 'id' },
  { table: 'dot_jobs', keyCol: 'id' },
  { table: 'topic_searches', keyCol: 'term' },
]

export async function POST() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const cleared: Record<string, number> = {}
  const errors: Record<string, string> = {}

  for (const { table, keyCol } of TABLES) {
    // Count first so we can report what was removed.
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
    const { error } = await supabase.from(table).delete().not(keyCol, 'is', null)
    if (error) errors[table] = error.message
    else cleared[table] = count || 0
  }

  const ok = Object.keys(errors).length === 0
  return NextResponse.json({ ok, cleared, errors }, { status: ok ? 200 : 500 })
}
