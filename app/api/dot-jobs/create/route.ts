import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkUsage, recordUsage } from '@/lib/pro-gating'
import { generateDotToDot } from '@/lib/dot-to-dot-engine'
import { processWithReplicate } from '@/lib/image-processing'
import { isHeic, convertHeicToPng } from '@/lib/heic-convert'
import { getServerUser } from '@/lib/supabase/auth-server'
import type { DotJobSettings } from '@/types/dot-job'

// Dot-to-dot generation runs inline here instead of relying on a
// fire-and-forget background trigger (which Vercel routinely drops once the
// response is sent, leaving jobs stuck with no output). When Replicate is
// configured we first turn the photo into clean line art (far better
// outlines), then trace it; otherwise we trace the photo directly.
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getSignedUrl(path: string): Promise<string | null> {
  const { data: s1 } = await supabase.storage.from('uploads').createSignedUrl(path, 3600)
  if (s1?.signedUrl) return s1.signedUrl
  const { data: s2 } = await supabase.storage.from('images').createSignedUrl(path, 3600)
  return s2?.signedUrl || null
}

async function uploadOutput(path: string, buf: Buffer, ct: string) {
  const { error } = await supabase.storage
    .from('outputs')
    .upload(path, buf, { contentType: ct, upsert: true })
  if (error) {
    await supabase.storage
      .from('images')
      .upload(path, buf, { contentType: ct, upsert: true })
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sessionId = formData.get('sessionId') as string
    const authed = await getServerUser()
    const email = authed?.email || (formData.get('email') as string | null)
    const dotCount = parseInt(formData.get('dotCount') as string) || 100
    const showGuideLines = formData.get('showGuideLines') === 'true'
    const difficulty = (formData.get('difficulty') as string) || 'medium'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Server-side usage check
    const userId = email || sessionId
    const usage = await checkUsage(userId, 'dot_to_dot', email)

    if (!usage.allowed) {
      const message = usage.isPro
        ? 'Daily limit reached. Try again tomorrow.'
        : 'You have used your free dot-to-dot try. Upgrade to Pro for unlimited access!'
      return NextResponse.json({
        error: message,
        isPro: usage.isPro,
        used: usage.used,
        limit: usage.limit,
      }, { status: 429 })
    }

    // Read the upload once; we process from this buffer directly.
    let buffer: Buffer = Buffer.from(await file.arrayBuffer()) as Buffer
    let contentType = file.type || 'image/jpeg'
    let ext = (file.name.split('.').pop() || 'jpg').toLowerCase()

    // iPhone photos are HEIC by default and Sharp can't decode them —
    // convert to PNG up front (mirrors the photo-to-colouring pipeline).
    if (isHeic(file.name, file.type)) {
      try {
        buffer = (await convertHeicToPng(buffer)) as Buffer
        contentType = 'image/png'
        ext = 'png'
      } catch (heicErr) {
        console.error('HEIC conversion failed:', heicErr)
        return NextResponse.json(
          { error: 'We could not read that photo. Please try a JPG or PNG.' },
          { status: 400 }
        )
      }
    }

    const storagePath = `dot-jobs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Store the input (best-effort; not required for processing)
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, buffer, { contentType, upsert: true })
    if (uploadError) {
      await supabase.storage
        .from('images')
        .upload(storagePath, buffer, { contentType, upsert: true })
    }

    // Record usage (atomic increment)
    const { allowed } = await recordUsage(userId, 'dot_to_dot', email)
    if (!allowed) {
      return NextResponse.json({ error: 'Usage limit reached', isPro: usage.isPro }, { status: 429 })
    }

    const settings: DotJobSettings = {
      dotCount,
      showGuideLines,
      difficulty: (['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium') as DotJobSettings['difficulty'],
    }

    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('dot_jobs')
      .insert({
        user_id: userId,
        email: email?.toLowerCase() || null,
        status: 'processing',
        input_storage_path: storagePath,
        original_filename: file.name,
        settings,
        is_pro: usage.isPro,
        progress: 10,
      })
      .select('id')
      .single()

    if (jobError || !job) {
      throw new Error('Failed to create job')
    }

    // Process inline so the result is guaranteed to exist.
    try {
      // For premium outlines, turn the photo into clean line art with the
      // same AI that powers the colouring page, then trace that. If Replicate
      // isn't configured, is slow, or fails, we trace the photo directly.
      let sourceBuffer: Buffer = buffer
      if (process.env.REPLICATE_API_TOKEN) {
        try {
          const signedUrl = await getSignedUrl(storagePath)
          if (signedUrl) {
            const detailLevel = dotCount <= 60 ? 'low' : dotCount >= 150 ? 'high' : 'medium'
            const lineArt = await withTimeout(
              processWithReplicate(signedUrl, {
                orientation: 'portrait',
                lineThickness: 'medium',
                detailLevel,
              }),
              45000
            )
            if (lineArt && lineArt.length > 0) sourceBuffer = lineArt as Buffer
          }
        } catch (aiErr) {
          console.error('Line-art step failed for dot-to-dot, using photo:', aiErr)
        }
      }

      const { png, pdf } = await generateDotToDot(sourceBuffer, settings)

      const pdfPath = `dot-jobs/${job.id}/output.pdf`
      const pngPath = `dot-jobs/${job.id}/output.png`

      await Promise.all([
        uploadOutput(pdfPath, pdf, 'application/pdf'),
        uploadOutput(pngPath, png, 'image/png'),
      ])

      await supabase
        .from('dot_jobs')
        .update({
          status: 'done',
          progress: 100,
          output_pdf_path: pdfPath,
          output_png_path: pngPath,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    } catch (procErr) {
      console.error('Dot job inline processing failed:', procErr)
      await supabase
        .from('dot_jobs')
        .update({
          status: 'failed',
          error: 'Failed to generate puzzle. Please try another photo.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
      return NextResponse.json({ error: 'Failed to generate puzzle. Please try another photo.' }, { status: 500 })
    }

    return NextResponse.json({
      jobId: job.id,
      remaining: usage.remaining - 1,
      isPro: usage.isPro,
      status: 'done',
    })
  } catch (error) {
    console.error('Dot job create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    )
  }
}
