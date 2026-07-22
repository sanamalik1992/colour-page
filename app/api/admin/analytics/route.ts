import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    .select('activity')
    .gt('last_seen', iso(now - 60_000))
  const onlineNow = presenceRows?.length || 0
  const onlineByActivity: Record<string, number> = {}
  for (const r of presenceRows || []) {
    const a = (r.activity as string) || 'browsing'
    onlineByActivity[a] = (onlineByActivity[a] || 0) + 1
  }

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
    online: { now: onlineNow, byActivity: onlineByActivity },
    feed,
    volumes: { last24h: d1, last7d: d7 },
    activeUsers: { last24h: users24.size, last7d: users7.size },
    perDay: perDayList,
    topics: {
      top: (topTopics || []).map((t) => ({ term: t.term, count: t.count })),
      recent: (recentTopics || []).map((t) => ({ term: t.term, at: t.last_at })),
    },
    failingTopics: topFailing,
  })
}
