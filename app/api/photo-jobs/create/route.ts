import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isHeic, convertHeicToPng } from '@/lib/heic-convert'
import { USAGE_LIMITS_DISABLED, FREE_LIMITS } from '@/lib/pro-gating'
import { getServerUser } from '@/lib/supabase/auth-server'
import type { PhotoJobSettings } from '@/types/photo-job'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FREE_DAILY_LIMIT = FREE_LIMITS.photo_coloring

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string
    // Prefer the verified session email so a logged-in Pro user's page is
    // correctly Pro/unwatermarked; fall back to the form value for guests.
    const authed = await getServerUser()
    const email = authed?.email || (formData.get('email') as string)?.toLowerCase() || null

    if (!file || !sessionId) {
      return NextResponse.json({ error: 'Missing file or session' }, { status: 400 })
    }

    // Check Pro status
    let isPro = false
    if (email) {
      const { data: customer } = await supabase
        .from('stripe_customers')
        .select('is_pro')
        .eq('email', email)
        .maybeSingle()
      isPro = customer?.is_pro === true
    }

    // Rate limit for free users (skipped while usage limits are disabled)
    if (!isPro && !USAGE_LIMITS_DISABLED) {
      const { count } = await supabase
        .from('photo_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', sessionId)
        // Topic sheets have their own separate allowance; they use a
        // `topic/...` input path, so exclude them from the photo count.
        .not('input_storage_path', 'ilike', 'topic/%')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .in('status', ['queued', 'processing', 'rendering', 'done'])

      if ((count || 0) >= FREE_DAILY_LIMIT) {
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

    // Parse settings
    const settings: PhotoJobSettings = {
      orientation: (formData.get('orientation') as string) === 'landscape' ? 'landscape' : 'portrait',
      lineThickness: (['thin', 'medium', 'thick'].includes(formData.get('lineThickness') as string)
        ? formData.get('lineThickness')
        : 'medium') as PhotoJobSettings['lineThickness'],
      detailLevel: (['low', 'medium', 'high'].includes(formData.get('detailLevel') as string)
        ? formData.get('detailLevel')
        : 'medium') as PhotoJobSettings['detailLevel'],
    }

    // Read file buffer
    let buffer: Buffer = Buffer.from(await file.arrayBuffer()) as Buffer
    let contentType = file.type
    const originalFilename = file.name

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: 'That photo came through empty. Please pick another.' }, { status: 400 })
    }

    // Convert HEIC to PNG — a bad/undecodable file gives a clear message rather
    // than a generic 500.
    if (isHeic(file.name, file.type)) {
      try {
        buffer = await convertHeicToPng(buffer) as Buffer
        contentType = 'image/png'
      } catch (heicErr) {
        console.error('HEIC conversion failed:', heicErr)
        return NextResponse.json(
          { error: "We couldn't read that photo format. Please try a JPG or PNG." },
          { status: 400 }
        )
      }
    }

    // Generate job ID and upload
    const jobId = crypto.randomUUID()
    const ext = contentType === 'image/png' ? 'png' : 'jpg'
    const uploadPath = `photo-jobs/${jobId}/input.${ext}`

    // Upload to the uploads bucket with a transient retry, then fall back to the
    // images bucket — so a momentary storage blip doesn't fail the whole submit.
    let uploadError = null
    for (let attempt = 0; attempt < 2; attempt++) {
      const { error } = await supabase.storage
        .from('uploads')
        .upload(uploadPath, buffer, { contentType, upsert: true })
      uploadError = error
      if (!error) break
      await new Promise((r) => setTimeout(r, 400))
    }

    if (uploadError) {
      // Fallback to images bucket
      const { error: fallbackError } = await supabase.storage
        .from('images')
        .upload(uploadPath, buffer, { contentType, upsert: true })
      if (fallbackError) throw fallbackError
    }

    // Insert photo job
    const { error: insertError } = await supabase.from('photo_jobs').insert({
      id: jobId,
      user_id: sessionId,
      email,
      status: 'queued',
      input_storage_path: uploadPath,
      original_filename: originalFilename,
      settings,
      progress: 0,
      is_pro: isPro,
      is_watermarked: !isPro,
    })

    if (insertError) throw insertError

    // Trigger background processing reliably. `after()` keeps this function
    // alive past the response so the request is actually sent (a plain
    // fire-and-forget fetch is often dropped by the platform once the
    // response returns). The /process route runs in its own invocation with a
    // longer timeout; the cron worker is a secondary safety net.
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

    return NextResponse.json({
      jobId,
      status: 'queued',
      isPro,
    })
  } catch (error) {
    console.error('Photo job create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    )
  }
}
