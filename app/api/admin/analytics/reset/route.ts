import { NextRequest, NextResponse } from 'next/server'
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

// OPT-IN only (body { subscriptions: true }). Clears the cached Stripe
// customer/subscription rows so pre-launch TEST subscriptions stop inflating the
// Pro count. Safe because Stripe is the source of truth: a real subscriber gets
// Pro back instantly via the "Restore Pro" button (it re-reads Stripe by email)
// and the webhook re-syncs on the next billing event. Do NOT use this after
// launch with real customers unless you intend them to re-restore.
const SUBSCRIPTION_TABLES: { table: string; keyCol: string }[] = [
  { table: 'stripe_subscriptions', keyCol: 'id' },
  { table: 'stripe_customers', keyCol: 'email' },
]

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const tables = body?.subscriptions ? [...TABLES, ...SUBSCRIPTION_TABLES] : TABLES

  const cleared: Record<string, number> = {}
  const errors: Record<string, string> = {}

  for (const { table, keyCol } of tables) {
    // Count first so we can report what was removed.
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
    const { error } = await supabase.from(table).delete().not(keyCol, 'is', null)
    if (error) errors[table] = error.message
    else cleared[table] = count || 0
  }

  // Set a baseline so the Checkouts panel (live from Stripe, not deletable) also
  // reads zero going forward — sessions created before now are hidden. Best
  // effort: a missing app_config table just means the panel keeps its 7-day view.
  try {
    const nowIso = new Date().toISOString()
    await supabase.from('app_config').upsert({ key: 'checkout_since', value: nowIso }, { onConflict: 'key' })
    cleared.checkouts_hidden_before = 1
  } catch { /* app_config table not present — skip */ }

  const ok = Object.keys(errors).length === 0
  return NextResponse.json({ ok, cleared, errors }, { status: ok ? 200 : 500 })
}
