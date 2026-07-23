import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { USAGE_LIMITS_DISABLED, FREE_LIMITS, getUserPlan, countTodaysUsage } from '@/lib/pro-gating'
import { getServerUser } from '@/lib/supabase/auth-server'
import type { PhotoJobSettings } from '@/types/photo-job'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FREE_DAILY_LIMIT = FREE_LIMITS.photo_coloring

/**
 * Registers a photo job for a file the browser has ALREADY uploaded directly to
 * storage (via /api/photo-jobs/sign-upload). No file passes through this
 * function, so the upload can never fail on a body-size/timeout limit here.
 *
 * The daily allowance is enforced at this point (not at sign time), so an
 * abandoned or failed upload never consumes one of the user's free generations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const jobId = String(body?.jobId || '')
    const storagePath = String(body?.storagePath || '')
    const sessionId = String(body?.sessionId || '')
    const originalFilename = body?.originalFilename ? String(body.originalFilename).slice(0, 200) : null

    if (!jobId || !sessionId || !storagePath) {
      return NextResponse.json({ error: 'Missing upload details.' }, { status: 400 })
    }
    // The client can only register the exact path it was granted — never point a
    // job at another job's/user's file.
    if (!storagePath.startsWith(`photo-jobs/${jobId}/input.`)) {
      return NextResponse.json({ error: 'Invalid upload path.' }, { status: 400 })
    }

    // Prefer the VERIFIED session email so a logged-in Pro user's page is
    // correctly Pro/unwatermarked.
    const authed = await getServerUser()
    const email = authed?.email || (body?.email ? String(body.email).toLowerCase() : null)
    const isPro = (await getUserPlan(email)).isPro

    // Daily allowance — counts only genuinely-worked jobs, so retries after a
    // failed upload don't burn the allowance.
    if (!isPro && !USAGE_LIMITS_DISABLED) {
      const used = await countTodaysUsage(sessionId, 'photo')
      if (used >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          {
            error: `You've made your ${FREE_DAILY_LIMIT} free colouring pages for today — Pro unlocks unlimited.`,
            isPro: false,
            limitReached: true,
            feature: 'photo_coloring',
          },
          { status: 429 }
        )
      }
    }

    const settings: PhotoJobSettings = {
      orientation: body?.orientation === 'landscape' ? 'landscape' : 'portrait',
      lineThickness: (['thin', 'medium', 'thick'].includes(body?.lineThickness)
        ? body.lineThickness
        : 'medium') as PhotoJobSettings['lineThickness'],
      detailLevel: (['low', 'medium', 'high'].includes(body?.detailLevel)
        ? body.detailLevel
        : 'medium') as PhotoJobSettings['detailLevel'],
    }

    const { error: insertError } = await supabase.from('photo_jobs').insert({
      id: jobId,
      user_id: sessionId,
      email,
      status: 'queued',
      input_storage_path: storagePath,
      original_filename: originalFilename,
      settings,
      progress: 0,
      is_pro: isPro,
      is_watermarked: !isPro,
    })

    if (insertError) throw insertError

    // Reliable background trigger (after() keeps us alive to actually send it);
    // the per-minute cron worker is a secondary safety net.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    after(async () => {
      try {
        await fetch(`${baseUrl}/api/photo-jobs/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        })
      } catch (err) {
        console.error('Failed to trigger photo-jobs/process:', err)
      }
    })

    return NextResponse.json({ jobId, status: 'queued', isPro })
  } catch (error) {
    console.error('Photo job create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    )
  }
}
