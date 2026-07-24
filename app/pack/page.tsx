'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Crown, Sparkles, Download, FileText } from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'
import { useMe } from '@/hooks/useMe'
import { useSessionId } from '@/hooks/useSessionId'
import { useChildProfiles } from '@/hooks/useChildProfiles'

interface PackResult {
  title: string
  pages: number
  answerPages?: number
  sheetTitles: string[]
  pdfUrl: string
  coverUrl: string
}

const EXAMPLES = ['letter b', '3 times table', 'fractions', 'number bonds to 10', 'shapes', 'counting', 'addition']

export default function PackPage() {
  const { me, loading: meLoading } = useMe()
  const sessionId = useSessionId()
  const { profiles, save: saveChild } = useChildProfiles()
  const [topic, setTopic] = useState('')
  const [childName, setChildName] = useState('')
  const [age, setAge] = useState(6)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PackResult | null>(null)

  const isPro = me?.isPro ?? false

  const generate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/packs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), age, sessionId, childName: childName.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Something went wrong. Please try again.')
        return
      }
      setResult(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <NavHeader active="create" isPro={isPro} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-brand-primary/15 border border-brand-primary/30 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-4 h-4 text-brand-primary" />
            <span className="text-sm font-semibold text-brand-primary">Activity packs</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">A whole week in one click</h1>
          <p className="text-gray-400">
            Pick a topic and an age — we&apos;ll build a coordinated 4–5 page pack, ready to print.
          </p>
        </div>

        {!meLoading && !isPro ? (
          // Pro gate
          <div className="rounded-2xl border border-brand-primary/30 bg-zinc-900/60 p-8 text-center">
            <Crown className="w-10 h-10 text-brand-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Activity packs are a Pro Family feature</h2>
            <p className="text-gray-400 mb-6">
              Generate a coordinated pack of sheets for a topic instead of one at a time.
            </p>
            <Link
              href="/pro"
              className="inline-flex items-center gap-2 h-12 px-6 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl hover:opacity-90"
            >
              <Crown className="w-4 h-4" /> See Pro Family
            </Link>
          </div>
        ) : (
          <>
            {/* Form */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Topic</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generate()}
                placeholder="e.g. letter b, 3 times table, fractions"
                className="w-full h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => setTopic(ex)} className="text-xs px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-gray-300 hover:border-brand-primary">
                    {ex}
                  </button>
                ))}
              </div>

              <label className="block text-sm font-medium text-gray-300 mb-2 mt-6">Child&apos;s name <span className="text-gray-500 font-normal">(optional — personalises the pack)</span></label>
              <input
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="e.g. Ben"
                maxLength={20}
                className="w-full h-12 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
              />
              {profiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {profiles.map((p) => (
                    <button key={p.id} onClick={() => { setChildName(p.name); setAge(p.age) }} className="text-xs px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-gray-300 hover:border-brand-primary">
                      {p.name} · {p.age}
                    </button>
                  ))}
                </div>
              )}

              <label className="block text-sm font-medium text-gray-300 mb-2 mt-6">Age: <span className="text-brand-primary font-bold">{age}</span></label>
              <input type="range" min={3} max={10} value={age} onChange={(e) => setAge(parseInt(e.target.value, 10))} className="w-full accent-brand-primary" />
              {childName.trim() && (
                <button onClick={() => saveChild(childName, age)} className="text-xs text-brand-primary hover:underline mt-2">
                  Save {childName.trim()} for next time
                </button>
              )}

              <button
                onClick={generate}
                disabled={loading || !topic.trim()}
                className="w-full h-12 mt-6 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Building your pack…</> : <><Sparkles className="w-4 h-4" /> Make the pack</>}
              </button>
              {error && <p className="text-sm text-red-400 mt-3 text-center">{error}</p>}
            </div>

            {/* Result */}
            {result && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 mt-6">
                <h2 className="text-lg font-bold mb-1">{result.title}</h2>
                <p className="text-sm text-gray-400 mb-4">
                  {result.pages} pages{result.answerPages ? ` · includes ${result.answerPages} answer ${result.answerPages === 1 ? 'sheet' : 'sheets'}` : ''}
                </p>
                <div className="grid sm:grid-cols-2 gap-4 items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.coverUrl} alt="Pack cover" className="w-full rounded-xl border border-zinc-700 bg-white" />
                  <div>
                    <ul className="space-y-2 mb-5">
                      {result.sheetTitles.map((t, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                          <FileText className="w-4 h-4 text-brand-primary flex-shrink-0" /> {t}
                        </li>
                      ))}
                    </ul>
                    <a
                      href={result.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 h-11 px-5 bg-brand-primary text-white font-semibold rounded-xl hover:opacity-90"
                    >
                      <Download className="w-4 h-4" /> Download pack (PDF)
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <PageFooter />
    </div>
  )
}
