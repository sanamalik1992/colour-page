'use client'

import { useEffect, useState } from 'react'
import { Loader2, Activity, Search, Image as ImageIcon, Sparkles, CheckCircle2, XCircle, Users, Crown, ShoppingCart, Home, LayoutGrid, FolderHeart, ShoppingBag, Eye, Circle, Trash2, AlertTriangle, MapPin } from 'lucide-react'

// Friendly label + icon for a live visitor's coarse activity (from presence).
const ACTIVITY_META: Record<string, { label: string; icon: typeof Home }> = {
  home: { label: 'Home / creating', icon: Home },
  gallery: { label: 'Browsing gallery', icon: LayoutGrid },
  'my-pages': { label: 'My library', icon: FolderHeart },
  pro: { label: 'On Pro page', icon: Crown },
  shop: { label: 'In shop', icon: ShoppingBag },
  result: { label: 'Viewing a result', icon: Eye },
  browsing: { label: 'Browsing', icon: Circle },
}
function activityMeta(a: string) {
  return ACTIVITY_META[a] || { label: a, icon: Circle }
}

interface Bucket { total: number; photo: number; topic: number; done: number; failed: number; pro: number; free: number }
interface Visitor { id: string; activity: string; lastSeen: string }
interface CheckoutBucket { started: number; completed: number }
interface Analytics {
  generatedAt: string
  online: { now: number; byActivity: Record<string, number>; byCountry: { code: string; count: number }[]; visitors: Visitor[] }
  checkout: {
    last24h: CheckoutBucket
    last7d: CheckoutBucket
    byProduct: { key: string; label: string; started: number; completed: number }[]
  }
  feed: { at: string; type: 'topic' | 'photo'; topic: string | null; status: string; isPro: boolean }[]
  volumes: { last24h: Bucket; last7d: Bucket }
  activeUsers: { last24h: number; last7d: number }
  perDay: { day: string; total: number; photo: number; topic: number }[]
  topics: { top: { term: string; count: number }[]; recent: { term: string; at: string }[] }
  failingTopics: { term: string; count: number }[]
  pro: { activeSubscribers: number; signups: { last24h: number; last7d: number }; perDay: { day: string; count: number }[] }
}

function conv(b: { started: number; completed: number }): string {
  if (!b.started) return '—'
  return `${Math.round((b.completed / b.started) * 100)}% paid`
}

// ISO-3166 alpha-2 → flag emoji (regional-indicator letters). No assets needed.
function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '🌍'
  return code.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}
const REGION_NAMES = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null
function countryName(code: string): string {
  try { return REGION_NAMES?.of(code) || code } catch { return code }
}

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${Math.floor(s)}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function Card({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-extrabold text-white mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    done: 'bg-emerald-500/15 text-emerald-300',
    failed: 'bg-red-500/15 text-red-300',
    processing: 'bg-amber-500/15 text-amber-300',
    rendering: 'bg-amber-500/15 text-amber-300',
    queued: 'bg-zinc-700/50 text-gray-300',
  }
  return <span className={`text-[11px] px-1.5 py-0.5 rounded ${map[status] || 'bg-zinc-700/50 text-gray-300'}`}>{status}</span>
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<Analytics | null>(null)
  const [err, setErr] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [clearSubs, setClearSubs] = useState(false)

  const doReset = async () => {
    setResetting(true)
    setResetMsg('')
    try {
      const res = await fetch('/api/admin/analytics/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptions: clearSubs }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.ok) throw new Error(d?.errors ? Object.values(d.errors).join('; ') : 'Reset failed')
      const total = Object.values(d.cleared || {}).reduce((a: number, b) => a + Number(b), 0)
      setResetMsg(`Cleared ${total} record${total === 1 ? '' : 's'}.`)
      setConfirmReset(false)
      setData(null) // force a fresh load of the now-empty dashboard
    } catch (e) {
      setResetMsg(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setResetting(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/admin/analytics', { cache: 'no-store' })
        if (!res.ok) throw new Error(res.status === 403 ? 'Not authorised' : 'Failed to load')
        const d = await res.json()
        if (!cancelled) { setData(d); setErr('') }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load')
      }
    }
    load()
    const id = setInterval(load, 5000) // live refresh
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (err) return <div className="min-h-screen app-bg flex items-center justify-center text-red-400">{err}</div>
  if (!data) return <div className="min-h-screen app-bg flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-primary" /></div>

  const maxTopic = Math.max(1, ...data.topics.top.map((t) => t.count))
  const maxDay = Math.max(1, ...data.perDay.map((d) => d.total))
  const failRate = (b: Bucket) => (b.total ? Math.round((b.failed / b.total) * 100) : 0)

  return (
    <div className="min-h-screen app-bg text-white">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">Analytics</h1>
          <div className="flex items-center gap-3">
            <a href="/admin/orders" className="text-xs font-semibold text-brand-primary hover:underline">Orders →</a>
            <button
              onClick={() => { setResetMsg(''); setConfirmReset(true) }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Reset
            </button>
            <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> live · {ago(data.generatedAt)}</span>
          </div>
        </div>

        {/* Reset confirmation */}
        {confirmReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => !resetting && setConfirmReset(false)}>
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                <div>
                  <h3 className="text-base font-bold text-white">Reset all analytics?</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    This permanently clears live presence, generation history and topic searches. Orders are <span className="text-gray-200 font-medium">not</span> affected.
                  </p>
                </div>
              </div>

              {/* Opt-in: also clear the cached Pro subscription rows (test data). */}
              <label className="flex items-start gap-2.5 mt-4 rounded-xl border border-zinc-700 bg-zinc-800/40 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearSubs}
                  onChange={(e) => setClearSubs(e.target.checked)}
                  className="mt-0.5 accent-red-500 w-4 h-4"
                />
                <span className="text-xs text-gray-300">
                  <span className="font-semibold text-white">Also clear Pro subscription test data</span> — removes the cached
                  subscriber list so pre-launch test accounts stop counting. Real subscribers (incl. you) get Pro back by tapping
                  <span className="text-gray-100 font-medium"> Restore Pro</span> on the Pro page. Use this before launch only.
                </span>
              </label>

              {resetMsg && <p className="text-sm text-red-300 mt-3">{resetMsg}</p>}
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setConfirmReset(false)}
                  disabled={resetting}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-gray-200 font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={doReset}
                  disabled={resetting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Reset all
                </button>
              </div>
            </div>
          </div>
        )}
        {resetMsg && !confirmReset && <p className="text-xs text-emerald-300 -mt-4">{resetMsg}</p>}

        {/* LIVE */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            <Card label="On site now" value={<span className="flex items-center gap-2">{data.online.now > 0 && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />}{data.online.now}</span>} sub="last 60s" />
            <Card label="Active users (24h)" value={data.activeUsers.last24h} />
            <Card label="Active users (7d)" value={data.activeUsers.last7d} />
          </div>

          {/* Who's on right now */}
          <div className="mt-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> On site right now</p>
            {data.online.now === 0 ? (
              <p className="text-sm text-gray-500">No one on the site at the moment.</p>
            ) : (
              <>
                {/* what everyone's doing, at a glance */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(data.online.byActivity).sort((a, b) => b[1] - a[1]).map(([a, n]) => {
                    const M = activityMeta(a)
                    return (
                      <span key={a} className="inline-flex items-center gap-1.5 text-xs bg-zinc-800 text-gray-200 px-2.5 py-1 rounded-full">
                        <M.icon className="w-3.5 h-3.5 text-brand-primary" /> {M.label} · <span className="font-semibold">{n}</span>
                      </span>
                    )
                  })}
                </div>
                {/* where they're from (live, by country) */}
                {data.online.byCountry.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] text-gray-500 mb-1.5 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Where they&apos;re from</p>
                    <div className="space-y-1">
                      {data.online.byCountry.map(({ code, count }) => (
                        <div key={code} className="relative bg-zinc-800/60 rounded-lg overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-brand-primary/15" style={{ width: `${(count / data.online.now) * 100}%` }} />
                          <div className="relative flex items-center gap-2 px-2.5 py-1 text-sm">
                            <span className="text-base leading-none">{flagEmoji(code)}</span>
                            <span className="flex-1 truncate text-gray-200">{countryName(code)}</span>
                            <span className="font-semibold text-gray-300">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* per-visitor list */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {data.online.visitors.map((v) => {
                    const M = activityMeta(v.activity)
                    return (
                      <div key={v.id} className="flex items-center gap-2 text-sm text-gray-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <M.icon className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="flex-1 truncate">{M.label}</span>
                        <span className="text-[11px] text-gray-600 font-mono">#{v.id}</span>
                        <span className="text-[11px] text-gray-500 w-12 text-right shrink-0">{ago(v.lastSeen)}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </section>

        {/* CHECKOUT */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Checkouts</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card label="Started (24h)" value={data.checkout.last24h.started} sub={`${data.checkout.last24h.completed} completed · ${conv(data.checkout.last24h)}`} />
            <Card label="Started (7d)" value={data.checkout.last7d.started} sub={`${data.checkout.last7d.completed} completed · ${conv(data.checkout.last7d)}`} />
          </div>
          {data.checkout.byProduct.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-gray-500">By product (last 7 days)</p>
              {data.checkout.byProduct.map((p) => (
                <div key={p.key} className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
                  <span className="flex-1 truncate">{p.label}</span>
                  <span className="text-gray-400"><span className="text-white font-semibold">{p.started}</span> started</span>
                  <span className="text-emerald-300"><span className="font-semibold">{p.completed}</span> paid</span>
                  <span className="text-gray-500 w-12 text-right">{conv(p)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-gray-600 mt-2">From Stripe checkout sessions. &ldquo;Started&rdquo; = reached the payment page; &ldquo;paid&rdquo; = completed. Refreshes ~every minute.</p>
        </section>

        {/* LIVE FEED */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> Happening now</h2>
          <div className="space-y-1.5">
            {data.feed.length === 0 && <p className="text-sm text-gray-500">No recent activity.</p>}
            {data.feed.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
                {f.type === 'topic' ? <Sparkles className="w-4 h-4 text-brand-primary shrink-0" /> : <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />}
                <span className="truncate flex-1">
                  {f.type === 'topic' ? (f.topic || 'learning sheet') : 'photo → colouring page'}
                </span>
                {f.isPro && <span className="text-[10px] text-amber-300">PRO</span>}
                <StatusBadge status={f.status} />
                <span className="text-[11px] text-gray-500 w-14 text-right shrink-0">{ago(f.at)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* TOPIC DEMAND */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"><Search className="w-4 h-4" /> Top learning-topic searches</h2>
          <div className="space-y-1.5">
            {data.topics.top.length === 0 && <p className="text-sm text-gray-500">No topics yet.</p>}
            {data.topics.top.map((t) => (
              <div key={t.term} className="relative bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-brand-primary/15" style={{ width: `${(t.count / maxTopic) * 100}%` }} />
                <div className="relative flex items-center justify-between px-3 py-1.5 text-sm">
                  <span className="truncate">{t.term}</span>
                  <span className="text-gray-400 font-semibold ml-2">{t.count}</span>
                </div>
              </div>
            ))}
          </div>
          {data.topics.recent.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1.5">Just searched</p>
              <div className="flex flex-wrap gap-1.5">
                {data.topics.recent.map((t, i) => (
                  <span key={i} className="text-xs bg-zinc-800 text-gray-300 px-2 py-1 rounded-full">{t.term}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* VOLUMES */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Generations</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card label="Today (24h)" value={data.volumes.last24h.total} sub={`${data.volumes.last24h.topic} topic · ${data.volumes.last24h.photo} photo`} />
            <Card label="This week (7d)" value={data.volumes.last7d.total} sub={`${data.volumes.last7d.topic} topic · ${data.volumes.last7d.photo} photo`} />
          </div>
          <div className="mt-3 space-y-1">
            {data.perDay.map((d) => (
              <div key={d.day} className="flex items-center gap-2 text-xs">
                <span className="w-14 text-gray-500 shrink-0">{d.day.slice(5)}</span>
                <div className="flex-1 bg-zinc-800 rounded h-3 overflow-hidden">
                  <div className="h-full bg-brand-primary/60" style={{ width: `${(d.total / maxDay) * 100}%` }} />
                </div>
                <span className="w-8 text-right text-gray-400">{d.total}</span>
              </div>
            ))}
          </div>
        </section>

        {/* SUCCESS / FAILING */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Quality</h2>
          <div className="grid grid-cols-3 gap-3">
            <Card label="Done (24h)" value={<span className="flex items-center gap-1.5"><CheckCircle2 className="w-5 h-5 text-emerald-400" />{data.volumes.last24h.done}</span>} />
            <Card label="Failed (24h)" value={<span className="flex items-center gap-1.5"><XCircle className="w-5 h-5 text-red-400" />{data.volumes.last24h.failed}</span>} />
            <Card label="Fail rate (24h)" value={`${failRate(data.volumes.last24h)}%`} />
          </div>
          {data.failingTopics.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1.5">Topics failing most (7d)</p>
              <div className="space-y-1">
                {data.failingTopics.map((t) => (
                  <div key={t.term} className="flex items-center justify-between bg-red-500/5 border border-red-500/20 rounded px-3 py-1.5 text-sm">
                    <span className="truncate">{t.term}</span>
                    <span className="text-red-300 font-semibold ml-2">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* PRO / PAYING USERS */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" /> Pro subscribers</h2>
          <div className="grid grid-cols-3 gap-3">
            <Card label="Active paying users" value={<span className="text-amber-300">{data.pro.activeSubscribers}</span>} sub="total" />
            <Card label="New Pro (24h)" value={data.pro.signups.last24h} />
            <Card label="New Pro (7d)" value={data.pro.signups.last7d} />
          </div>
          <div className="mt-3 space-y-1">
            {data.pro.perDay.map((d) => {
              const max = Math.max(1, ...data.pro.perDay.map((x) => x.count))
              return (
                <div key={d.day} className="flex items-center gap-2 text-xs">
                  <span className="w-14 text-gray-500 shrink-0">{d.day.slice(5)}</span>
                  <div className="flex-1 bg-zinc-800 rounded h-3 overflow-hidden">
                    <div className="h-full bg-amber-400/60" style={{ width: `${(d.count / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-gray-400">{d.count}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* USAGE */}
        <section>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Free vs Pro generations</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card label="Pro generations (7d)" value={data.volumes.last7d.pro} />
            <Card label="Free generations (7d)" value={data.volumes.last7d.free} />
          </div>
        </section>

        <p className="text-center text-xs text-gray-600 pt-2">Aggregate &amp; anonymous — no personal data or uploaded photos are shown.</p>
      </div>
    </div>
  )
}
