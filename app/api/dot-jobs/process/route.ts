import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateDotToDot } from '@/lib/dot-to-dot-engine'
import type { DotJobSettings } from '@/types/dot-job'

export const maxDuration = 300 // Vercel Pro: 5 minutes

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function updateJob(jobId: string, updates: Record<string, unknown>) {
  await supabase
    .from('dot_jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

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

export async function POST(request: NextRequest) {
  let jobId: string | undefined

  try {
    const body = await request.json()
    jobId = body.jobId

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Fetch job
    const { data: job } = await supabase
      .from('dot_jobs')
      .select('*')
      .eq('id', jobId)
      .in('status', ['queued', 'processing'])
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found or already processed' }, { status: 404 })
    }

    // Lock
    await updateJob(jobId, {
      status: 'processing',
      processing_started_at: new Date().toISOString(),
      progress: 5,
    })

    const settings: DotJobSettings = job.settings || {
      dotCount: 100,
      showGuideLines: false,
      difficulty: 'medium',
    }

    // Get input image
    const signedUrl = await getSignedUrl(job.input_storage_path)
    if (!signedUrl) throw new Error('Failed to get signed URL for input image')

    const inputRes = await fetch(signedUrl)
    if (!inputRes.ok) throw new Error('Failed to download input image')
    const inputBuffer = Buffer.from(await inputRes.arrayBuffer())

    // Generate dot-to-dot
    const { png, pdf } = await generateDotToDot(
      inputBuffer,
      settings,
      async (pct) => { await updateJob(jobId!, { progress: pct }) }
    )

    // Upload outputs
    await updateJob(jobId, { status: 'rendering', progress: 90 })

    const pdfPath = `dot-jobs/${jobId}/output.pdf`
    const pngPath = `dot-jobs/${jobId}/output.png`

    await Promise.all([
      uploadOutput(pdfPath, pdf, 'application/pdf'),
      uploadOutput(pngPath, png, 'image/png'),
    ])

    await updateJob(jobId, {
      status: 'done',
      progress: 100,
      output_pdf_path: pdfPath,
      output_png_path: pngPath,
      completed_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, status: 'done' })
  } catch (error) {
    console.error('Dot job process error:', error)
    if (jobId) {
      await updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Processing failed',
      })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    )
  }
}
