import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderA4Pdf, renderA4Preview } from '@/lib/pdf-renderer'
import type { PhotoJobSettings } from '@/types/photo-job'

export const maxDuration = 60 // Vercel Hobby limit

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function updateJob(jobId: string, updates: Record<string, unknown>) {
  await supabase
    .from('photo_jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', jobId)
}

async function uploadOutput(path: string, buf: Buffer, ct: string) {
  const { error } = await supabase.storage.from('outputs').upload(path, buf, { contentType: ct, upsert: true })
  if (error) {
    await supabase.storage.from('images').upload(path, buf, { contentType: ct, upsert: true })
  }
}

/**
 * POST /api/photo-jobs/webhook
 *
 * Called by Replicate when a prediction completes. Downloads the result,
 * renders A4 PDF + PNG preview, uploads to storage, marks job done.
 */
export async function POST(request: NextRequest) {
  try {
    const prediction = await request.json()

    // Find the photo job by prediction_id
    const { data: job } = await supabase
      .from('photo_jobs')
      .select('*')
      .eq('prediction_id', prediction.id)
      .single()

    if (!job) {
      return NextResponse.json({ received: true, error: 'Job not found' })
    }

    const jobId = job.id

    // Handle failure
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      await updateJob(jobId, {
        status: 'failed',
        error: prediction.error || 'Generation failed on provider',
      })
      return NextResponse.json({ received: true, status: 'failed' })
    }

    // Handle success
    if (prediction.status === 'succeeded') {
      await updateJob(jobId, { progress: 70 })

      // Get output URL
      const output = prediction.output
      const outputUrl =
        typeof output === 'string'
          ? output
          : Array.isArray(output)
            ? output[0]
            : output?.url

      if (!outputUrl) {
        await updateJob(jobId, { status: 'failed', error: 'No output URL from provider' })
        return NextResponse.json({ received: true, error: 'No output' })
      }

      // Download the generated image
      const imgRes = await fetch(outputUrl)
      if (!imgRes.ok) {
        await updateJob(jobId, { status: 'failed', error: 'Failed to download result image' })
        return NextResponse.json({ received: true, error: 'Download failed' })
      }

      const lineArtBuffer = Buffer.from(await imgRes.arrayBuffer())
      await updateJob(jobId, { status: 'rendering', progress: 80 })

      // Render A4 PDF + preview
      const settings: PhotoJobSettings = job.settings || {
        orientation: 'portrait',
        lineThickness: 'medium',
        detailLevel: 'medium',
      }
      const isLandscape = settings.orientation === 'landscape'

      const [pdfBuffer, previewBuffer] = await Promise.all([
        renderA4Pdf(lineArtBuffer, {
          watermark: job.is_watermarked,
          footer: true,
          landscape: isLandscape,
        }),
        renderA4Preview(lineArtBuffer, isLandscape),
      ])

      await updateJob(jobId, { progress: 90 })

      // Upload outputs
      const pdfPath = `photo-jobs/${jobId}/output.pdf`
      const pngPath = `photo-jobs/${jobId}/output.png`

      await Promise.all([
        uploadOutput(pdfPath, pdfBuffer, 'application/pdf'),
        uploadOutput(pngPath, previewBuffer, 'image/png'),
      ])

      // Mark done
      await updateJob(jobId, {
        status: 'done',
        progress: 100,
        output_pdf_path: pdfPath,
        output_png_path: pngPath,
        completed_at: new Date().toISOString(),
      })

      return NextResponse.json({ received: true, status: 'done' })
    }

    // Other statuses (processing, starting) – just acknowledge
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Photo jobs webhook error:', error)
    return NextResponse.json({ received: true, error: String(error) })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'active' })
}
