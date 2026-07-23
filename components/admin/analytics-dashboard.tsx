'use client'

import { useEffect, useState } from 'react'
import { Loader2, Activity, Search, Image as ImageIcon, Sparkles, CheckCircle2, XCircle, Users, Crown } from 'lucide-react'

interface Bucket { total: number; photo: number; topic: number; done: number; failed: number; pro: number; free: number }
interface Analytics {
  generatedAt: string
  online: { now: number; byActivity: Record<string, number> }
  feed: { at: string; type: 'topic' | 'photo'; topic: string | null; status: string; isPro: boolean }[]
  volumes: { last24h: Bucket; last7d: Bucket }
  activeUsers: { last24h: number; last7d: number }
  perDay: { day: string; total: number; photo: number; topic: number }[]
  topics: { top: { term: string; count: number }[]; recent: { term: string; at: string }[] }
  failingTopics: { term: string; count: number }[]
  pro: { activeSubscribers: number; signups: { last24h: number; last7d: number }; perDay: { day: string; count: number }[] }
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
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> live · {ago(data.generatedAt)}</span>
        </div>

        {/* LIVE */}
        <section>
          <div className="grid grid-cols-3 gap-3">
            <Card label="On site now" value={data.online.now} sub="last 60s" />
            <Card label="Active users (24h)" value={data.activeUsers.last24h} />
            <Card label="Active users (7d)" value={data.activeUsers.last7d} />
          </div>
          {Object.keys(data.online.byActivity).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(data.online.byActivity).map(([a, n]) => (
                <span key={a} className="text-xs bg-zinc-800 text-gray-300 px-2 py-1 rounded-full">{a}: {n}</span>
              ))}
            </div>
          )}
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
