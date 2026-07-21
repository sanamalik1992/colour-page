import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkUsage, recordUsage } from '@/lib/pro-gating'
import { buildTopicPrompt } from '@/lib/topic-prompt'
import { aiPlanTopic } from '@/lib/topic-ai'
import { findBlockedTerm } from '@/lib/blocklist'
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
    const email = body?.email ? String(body.email).toLowerCase() : null
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

    // Copyright / brand safety: reject blocked terms (Disney, Pokémon, etc.)
    // before spending a generation.
    const blocked = await findBlockedTerm(topic)
    if (blocked) {
      return NextResponse.json(
        { error: `We can't make character pages for "${blocked}". Try a theme like space, animals or dinosaurs!` },
        { status: 400 }
      )
    }

    // Usage / Pro gating — topic sheets have their own daily allowance.
    const userId = email || sessionId
    const usage = await checkUsage(userId, 'topic_sheet', email)
    if (!usage.allowed) {
      const message = usage.isPro
        ? 'Daily limit reached. Try again tomorrow.'
        : 'You have used your free learning sheets for today. Upgrade to Pro for more!'
      return NextResponse.json(
        { error: message, isPro: usage.isPro, used: usage.used, limit: usage.limit },
        { status: 429 }
      )
    }

    // Interpret the topic with AI when available (handles the long tail like
    // "multiples of 10" or "life cycle of a frog"); fall back to the
    // deterministic keyword builder otherwise.
    const plan = (await aiPlanTopic(topic, age)) || buildTopicPrompt(topic, age)

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
      glyph: plan.glyph,
      numbers: plan.numbers,
      objects: plan.objects,
    }

    const isPro = usage.isPro

    // Record usage (atomic increment) before kicking off work.
    const { allowed } = await recordUsage(userId, 'topic_sheet', email)
    if (!allowed) {
      return NextResponse.json({ error: 'Usage limit reached', isPro }, { status: 429 })
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
    })
  } catch (error) {
    console.error('Topic job create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sheet' },
      { status: 500 }
    )
  }
}
