import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// A short, non-identifying tag for a live session id (for the "who's on now"
// list). Never expose the raw session id.
function shortTag(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0
  return h.toString(36).slice(0, 4)
}

interface CheckoutBucket { started: number; completed: number }
interface CheckoutStats {
  last24h: CheckoutBucket
  last7d: CheckoutBucket
  byProduct: { key: string; label: string; started: number; completed: number }[]
}
const PRODUCT_LABEL: Record<string, string> = {
  pro: 'Pro subscription',
  'portable-printer': 'Printer',
  'everything-bundle': 'Everything Bundle',
  other: 'Other',
}

// Checkout stats come from Stripe (the source of truth for started vs paid).
// Listing sessions is relatively slow, so cache the result ~60s — the dashboard
// polls presence/feed every few seconds but checkout numbers barely move.
let checkoutCache: { at: number; data: CheckoutStats } | null = null
async function getCheckoutStats(now: number): Promise<CheckoutStats> {
  if (checkoutCache && now - checkoutCache.at < 60_000) return checkoutCache.data
  const DAY = 86_400_000
  const since7 = Math.floor((now - 7 * DAY) / 1000)
  const win24 = now - DAY
  const empty = (): CheckoutBucket => ({ started: 0, completed: 0 })
  const d1 = empty(), d7 = empty()
  const byKey: Record<string, CheckoutBucket> = {}
  try {
    let startingAfter: string | undefined
    for (let page = 0; page < 5; page++) { // cap 500 sessions
      const res = await stripe.checkout.sessions.list({
        created: { gte: since7 }, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}),
      })
      for (const s of res.data) {
        const key = s.mode === 'subscription' ? 'pro' : (s.metadata?.product || 'other')
        const completed = s.status === 'complete'
        byKey[key] = byKey[key] || empty()
        byKey[key].started++; if (completed) byKey[key].completed++
        d7.started++; if (completed) d7.completed++
        if ((s.created || 0) * 1000 >= win24) { d1.started++; if (completed) d1.completed++ }
      }
      if (!res.has_more) break
      startingAfter = res.data[res.data.length - 1]?.id
    }
  } catch (e) {
    console.error('checkout stats (Stripe list) failed:', e)
  }
  const order = ['pro', 'portable-printer', 'everything-bundle', 'other']
  const byProduct = Object.entries(byKey)
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([key, v]) => ({ key, label: PRODUCT_LABEL[key] || key, ...v }))
  const data = { last24h: d1, last7d: d7, byProduct }
  checkoutCache = { at: now, data }
  return data
}

// A job is a topic sheet if its input path is the topic sentinel; otherwise a
// photo. (Matches how the daily-limit query already distinguishes them.)
function jobType(inputPath: string | null, settings: Record<string, unknown> | null): 'topic' | 'photo' {
  if (settings && settings.source === 'topic') return 'topic'
  if (inputPath && inputPath.startsWith('topic/')) return 'topic'
  return 'photo'
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = Date.now()
  const iso = (ms: number) => new Date(ms).toISOString()
  const DAY = 86_400_000
  const since14 = iso(now - 14 * DAY)

  // --- Live: who's on now (last 60s) ---
  const { data: presenceRows } = await supabase
    .from('presence')
    .select('session_id, activity, last_seen')
    .gt('last_seen', iso(now - 60_000))
    .order('last_seen', { ascending: false })
  const onlineNow = presenceRows?.length || 0
  const onlineByActivity: Record<string, number> = {}
  for (const r of presenceRows || []) {
    const a = (r.activity as string) || 'browsing'
    onlineByActivity[a] = (onlineByActivity[a] || 0) + 1
  }
  // Anonymised per-visitor list for the live view (short tag + activity + when).
  const visitors = (presenceRows || []).slice(0, 60).map((r) => ({
    id: shortTag(String(r.session_id || '')),
    activity: (r.activity as string) || 'browsing',
    lastSeen: r.last_seen as string,
  }))

  const checkout = await getCheckoutStats(now)

  // --- Live feed: last 20 generations (anonymised) ---
  const { data: recent } = await supabase
    .from('photo_jobs')
    .select('id, status, is_pro, created_at, input_storage_path, settings')
    .order('created_at', { ascending: false })
    .limit(20)
  const feed = (recent || []).map((r) => {
    const s = (r.settings as Record<string, unknown>) || {}
    const type = jobType(r.input_storage_path as string, s)
    return {
      at: r.created_at,
      type,
      topic: type === 'topic' ? String(s.topic || '') : null, // never expose photo info
      status: r.status,
      isPro: r.is_pro === true,
    }
  })

  // --- Bulk (14d) for volumes / success / pro-free / active users / per-day ---
  const { data: rows } = await supabase
    .from('photo_jobs')
    .select('status, is_pro, created_at, input_storage_path, user_id, settings')
    .gte('created_at', since14)
    .order('created_at', { ascending: false })
    .limit(8000)

  const win24 = now - DAY
  const win7 = now - 7 * DAY
  const mk = () => ({ total: 0, photo: 0, topic: 0, done: 0, failed: 0, pro: 0, free: 0 })
  const d1 = mk(), d7 = mk()
  const users24 = new Set<string>(), users7 = new Set<string>()
  const perDay: Record<string, { total: number; photo: number; topic: number }> = {}

  for (const r of rows || []) {
    const t = new Date(r.created_at as string).getTime()
    const type = jobType(r.input_storage_path as string, r.settings as Record<string, unknown>)
    const add = (b: ReturnType<typeof mk>) => {
      b.total++; b[type]++
      if (r.status === 'done') b.done++
      if (r.status === 'failed') b.failed++
      if (r.is_pro) b.pro++; else b.free++
    }
    if (t >= win24) { add(d1); if (r.user_id) users24.add(r.user_id as string) }
    if (t >= win7) { add(d7); if (r.user_id) users7.add(r.user_id as string) }
    const day = new Date(r.created_at as string).toISOString().slice(0, 10)
    perDay[day] = perDay[day] || { total: 0, photo: 0, topic: 0 }
    perDay[day].total++; perDay[day][type]++
  }
  const perDayList = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(now - i * DAY).toISOString().slice(0, 10)
    return { day, ...(perDay[day] || { total: 0, photo: 0, topic: 0 }) }
  })

  // --- Topic demand ---
  const { data: topTopics } = await supabase
    .from('topic_searches').select('term, count').order('count', { ascending: false }).limit(25)
  const { data: recentTopics } = await supabase
    .from('topic_searches').select('term, last_at').order('last_at', { ascending: false }).limit(15)

  // --- Pro / paying users ---
  // Total active paying subscribers = customers currently flagged Pro (the
  // webhook keeps is_pro in sync with the live Stripe subscription status).
  const { count: activePro } = await supabase
    .from('stripe_customers').select('*', { count: 'exact', head: true }).eq('is_pro', true)

  // New Pro signups over time = subscriptions created (created_at ≈ subscribe time).
  const { data: subs } = await supabase
    .from('stripe_subscriptions').select('created_at').gte('created_at', since14).order('created_at', { ascending: false }).limit(3000)
  let proSignups24 = 0, proSignups7 = 0
  const proPerDayMap: Record<string, number> = {}
  for (const s of subs || []) {
    const t = new Date(s.created_at as string).getTime()
    if (t >= win24) proSignups24++
    if (t >= win7) proSignups7++
    const day = new Date(s.created_at as string).toISOString().slice(0, 10)
    proPerDayMap[day] = (proPerDayMap[day] || 0) + 1
  }
  const proPerDay = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(now - i * DAY).toISOString().slice(0, 10)
    return { day, count: proPerDayMap[day] || 0 }
  })

  // --- Top failing topics (7d) ---
  const { data: failedRows } = await supabase
    .from('photo_jobs').select('settings').eq('status', 'failed').gte('created_at', iso(win7)).limit(400)
  const failCount: Record<string, number> = {}
  for (const r of failedRows || []) {
    const term = String((r.settings as Record<string, unknown>)?.topic || '').trim().toLowerCase()
    if (term) failCount[term] = (failCount[term] || 0) + 1
  }
  const topFailing = Object.entries(failCount).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([term, count]) => ({ term, count }))

  return NextResponse.json({
    generatedAt: iso(now),
    online: { now: onlineNow, byActivity: onlineByActivity, visitors },
    checkout,
    feed,
    volumes: { last24h: d1, last7d: d7 },
    activeUsers: { last24h: users24.size, last7d: users7.size },
    perDay: perDayList,
    topics: {
      top: (topTopics || []).map((t) => ({ term: t.term, count: t.count })),
      recent: (recentTopics || []).map((t) => ({ term: t.term, at: t.last_at })),
    },
    failingTopics: topFailing,
    pro: {
      activeSubscribers: activePro || 0,
      signups: { last24h: proSignups24, last7d: proSignups7 },
      perDay: proPerDay,
    },
  })
}
