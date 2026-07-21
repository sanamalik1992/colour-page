import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  const sessionId = request.nextUrl.searchParams.get('sessionId')

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
  }

  let query = supabase.from('photo_jobs').select('*').eq('id', jobId)

  // If sessionId provided, scope to that user for security
  if (sessionId) {
    query = query.eq('user_id', sessionId)
  }

  const { data: job, error } = await query.single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Stale-job reaper: the process function can't run longer than maxDuration
  // (300s). If a job has been non-terminal well past that, the serverless
  // function died mid-run (e.g. a stalled network call) and can never finish or
  // report its own failure — so it would sit at 99% forever. Mark it failed on
  // read so the UI unsticks. Uses processing_started_at (set when the job locks)
  // and falls back to created_at.
  const STALE_MS = 360_000 // 6 minutes — comfortably beyond the 300s ceiling
  if (job.status !== 'done' && job.status !== 'failed') {
    const startedAt = job.processing_started_at || job.created_at
    if (startedAt && Date.now() - new Date(startedAt).getTime() > STALE_MS) {
      const message =
        'This sheet timed out while generating. Please try again — it usually works on a second go.'
      await supabase
        .from('photo_jobs')
        .update({ status: 'failed', error: message, updated_at: new Date().toISOString() })
        .eq('id', job.id)
      job.status = 'failed'
      job.error = message
    }
  }

  // Generate signed URLs for outputs
  let signedPdfUrl: string | undefined
  let signedPngUrl: string | undefined

  if (job.output_pdf_path) {
    const { data } = await supabase.storage
      .from('outputs')
      .createSignedUrl(job.output_pdf_path, 3600)
    if (data?.signedUrl) {
      signedPdfUrl = data.signedUrl
    } else {
      const { data: fallback } = await supabase.storage
        .from('images')
        .createSignedUrl(job.output_pdf_path, 3600)
      signedPdfUrl = fallback?.signedUrl
    }
  }

  if (job.output_png_path) {
    const { data } = await supabase.storage
      .from('outputs')
      .createSignedUrl(job.output_png_path, 3600)
    if (data?.signedUrl) {
      signedPngUrl = data.signedUrl
    } else {
      const { data: fallback } = await supabase.storage
        .from('images')
        .createSignedUrl(job.output_png_path, 3600)
      signedPngUrl = fallback?.signedUrl
    }
  }

  return NextResponse.json({
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      settings: job.settings,
      is_pro: job.is_pro,
      is_watermarked: job.is_watermarked,
      error: job.error,
      created_at: job.created_at,
      updated_at: job.updated_at,
      completed_at: job.completed_at,
    },
    signedPdfUrl,
    signedPngUrl,
  })
}
