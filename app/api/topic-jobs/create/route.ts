import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserPlan, FREE_LIMITS, USAGE_LIMITS_DISABLED } from '@/lib/pro-gating'
import { buildTopicPrompt, narrowBroadTopic } from '@/lib/topic-prompt'
import { aiPlanTopic } from '@/lib/topic-ai'
import { findBlockedTerm } from '@/lib/blocklist'
import { getServerUser } from '@/lib/supabase/auth-server'
import type { PhotoJobSettings } from '@/types/photo-job'

// Text-topic generation ("What are they learning today?"). Reuses the
// photo_jobs pipeline via a `source: 'topic'` row — the /process route branches
// on source and generates line art from the prompt instead of an uploaded
// photo. Everything downstream (PDF, watermark, dot-to-dot, status) is shared.
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const topic = String(body?.topic || '').trim()
    const sessionId = body?.sessionId ? String(body.sessionId) : ''
    // Prefer the VERIFIED session email so a logged-in Pro user's sheet is
    // correctly Pro/unwatermarked without trusting a client-sent email.
    const authed = await getServerUser()
    const email = authed?.email || (body?.email ? String(body.email).toLowerCase() : null)
    const ageRaw = parseInt(String(body?.age), 10)
    const age = Number.isFinite(ageRaw) ? Math.max(3, Math.min(10, ageRaw)) : undefined

    if (!topic) {
      return NextResponse.json({ error: 'Please type what your child is learning.' }, { status: 400 })
    }
    if (topic.length > 80) {
      return NextResponse.json({ error: 'Please use a shorter topic.' }, { status: 400 })
    }
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Analytics: record EVERY submitted topic (before gating, so blocked and
    // abandoned ones count too). Fire-and-forget — never delays the sheet.
    supabase.rpc('track_topic', { p_term: topic }).then(undefined, () => {})

    // Copyright / brand safety: reject blocked terms (Disney, Pokémon, etc.)
    // before spending a generation.
    const blocked = await findBlockedTerm(topic)
    if (blocked) {
      return NextResponse.json(
        { error: `We can't make character pages for "${blocked}". Try a theme like space, animals or dinosaurs!` },
        { status: 400 }
      )
    }

    // Pro status (from the linked account) — Pro is unlimited.
    const isPro = (await getUserPlan(email)).isPro

    // Learning-sheet daily allowance (generous; Pro unlimited). Counted directly
    // from today's rows — no RPC dependency. The insert below is the record.
    if (!isPro && !USAGE_LIMITS_DISABLED) {
      const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      const { count } = await supabase
        .from('photo_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', sessionId)
        .ilike('input_storage_path', 'topic/%')
        .gte('created_at', startOfDay)
        .in('status', ['queued', 'processing', 'rendering', 'done'])
      if ((count || 0) >= FREE_LIMITS.topic_sheet) {
        return NextResponse.json(
          {
            error: `You've made your ${FREE_LIMITS.topic_sheet} free learning sheets for today — Pro unlocks unlimited.`,
            isPro: false,
            limitReached: true,
            feature: 'topic_sheet',
          },
          { status: 429 }
        )
      }
    }

    // Vague catch-all topics ("alphabet", "phonics") → a focused, fully
    // deterministic sheet (no image model), FIRST — so they generate instantly
    // and skip the blocking AI-planner round-trip. Everything else: interpret
    // with AI when available (long tail like "multiples of 10"), else the
    // deterministic keyword builder.
    const tPlan = Date.now()
    const plan =
      narrowBroadTopic(topic, age) || (await aiPlanTopic(topic, age)) || buildTopicPrompt(topic, age)
    console.log(`[timing] plan "${topic}" ${Date.now() - tPlan}ms → ${plan.category}`)

    // Topic metadata lives in the settings JSON (no schema migration needed).
    const settings: PhotoJobSettings = {
      orientation: 'portrait',
      lineThickness: plan.difficulty.lineThickness,
      detailLevel: plan.difficulty.detailLevel,
      source: 'topic',
      topic,
      age,
      category: plan.category,
      prompt: plan.prompt,
      title: plan.title,
      glyph: plan.glyph,
      numbers: plan.numbers,
      objects: plan.objects,
      activities: plan.activities,
    }

    const jobId = crypto.randomUUID()
    // Sentinel input path (topic jobs have no upload); the `topic/` prefix also
    // lets the photo daily-limit query exclude these rows.
    const { error: insertError } = await supabase.from('photo_jobs').insert({
      id: jobId,
      user_id: sessionId,
      email,
      status: 'queued',
      input_storage_path: `topic/${jobId}`,
      settings,
      progress: 0,
      is_pro: isPro,
      is_watermarked: !isPro,
    })
    if (insertError) {
      console.error('Topic job insert failed:', insertError)
      throw new Error(insertError.message || 'Database insert failed')
    }

    // Reliable background trigger (a plain fire-and-forget fetch is dropped by
    // the platform once the response returns; after() keeps us alive to send it).
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    after(async () => {
      try {
        await fetch(`${baseUrl}/api/photo-jobs/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        })
      } catch (err) {
        console.error('Failed to trigger photo-jobs/process for topic job:', err)
      }
    })

    return NextResponse.json({
      jobId,
      status: 'queued',
      isPro,
      subject: plan.subject,
      category: plan.category,
      // Context for the Pro-activity preview thumbnails on the result screen.
      glyph: plan.glyph?.value || null,
      words: plan.objects || [],
    })
  } catch (error) {
    console.error('Topic job create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sheet' },
      { status: 500 }
    )
  }
}
