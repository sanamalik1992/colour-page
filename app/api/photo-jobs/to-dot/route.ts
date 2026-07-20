import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateDotToDot } from '@/lib/dot-to-dot-engine'
import type { DotJobSettings } from '@/types/dot-job'

// Turns an already-generated colouring page (clean line art) into a
// dot-to-dot. Because the line art is clean, the flood-fill tracer keeps the
// largest enclosed object (i.e. the main subject, background removed). Fast —
// no extra AI call — so it runs inline.
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function downloadOutput(path: string): Promise<Buffer | null> {
  const a = await supabase.storage.from('outputs').download(path)
  if (a.data) return Buffer.from(await a.data.arrayBuffer())
  const b = await supabase.storage.from('images').download(path)
  if (b.data) return Buffer.from(await b.data.arrayBuffer())
  return null
}

async function uploadOutput(path: string, buf: Buffer, ct: string) {
  const { error } = await supabase.storage.from('outputs').upload(path, buf, { contentType: ct, upsert: true })
  if (error) {
    await supabase.storage.from('images').upload(path, buf, { contentType: ct, upsert: true })
  }
}

async function signUrl(path: string): Promise<string | null> {
  const a = await supabase.storage.from('outputs').createSignedUrl(path, 3600)
  if (a.data?.signedUrl) return a.data.signedUrl
  const b = await supabase.storage.from('images').createSignedUrl(path, 3600)
  return b.data?.signedUrl || null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const jobId = String(body?.jobId || '')
    const sessionId = body?.sessionId ? String(body.sessionId) : null
    const dotCount = Math.max(30, Math.min(120, parseInt(String(body?.dotCount)) || 50))

    if (!jobId) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 })
    }

    const { data: job } = await supabase
      .from('photo_jobs')
      .select('id, user_id, status, output_png_path')
      .eq('id', jobId)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Colouring page not found' }, { status: 404 })
    }
    if (job.user_id && sessionId && job.user_id !== sessionId) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }
    if (job.status !== 'done' || !job.output_png_path) {
      return NextResponse.json({ error: 'Colouring page is not ready yet' }, { status: 400 })
    }

    const lineArt = await downloadOutput(job.output_png_path)
    if (!lineArt) {
      return NextResponse.json({ error: 'Could not read the colouring page' }, { status: 500 })
    }

    const settings: DotJobSettings = { dotCount, showGuideLines: false, difficulty: 'medium', style: 'scene' }
    const { png, pdf } = await generateDotToDot(lineArt, settings)

    const pngPath = `dot-from-photo/${jobId}/output.png`
    const pdfPath = `dot-from-photo/${jobId}/output.pdf`
    await Promise.all([
      uploadOutput(pdfPath, pdf, 'application/pdf'),
      uploadOutput(pngPath, png, 'image/png'),
    ])

    const [pngUrl, pdfUrl] = await Promise.all([signUrl(pngPath), signUrl(pdfPath)])

    return NextResponse.json({ pngUrl, pdfUrl })
  } catch (error) {
    console.error('to-dot error:', error)
    return NextResponse.json(
      { error: 'Could not create the dot-to-dot. Please try again.' },
      { status: 500 }
    )
  }
}
