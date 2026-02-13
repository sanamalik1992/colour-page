import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { preprocessImage, sharpCVFallback } from '@/lib/image-processing'
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

/**
 * Resolve a signed URL from either uploads or images bucket.
 */
async function getSignedUrl(path: string): Promise<string | null> {
  const { data: s1 } = await supabase.storage.from('uploads').createSignedUrl(path, 3600)
  if (s1?.signedUrl) return s1.signedUrl
  const { data: s2 } = await supabase.storage.from('images').createSignedUrl(path, 3600)
  return s2?.signedUrl || null
}

/**
 * Upload to outputs bucket, fallback to images.
 */
async function uploadOutput(path: string, buf: Buffer, ct: string) {
  const { error } = await supabase.storage.from('outputs').upload(path, buf, { contentType: ct, upsert: true })
  if (error) {
    await supabase.storage.from('images').upload(path, buf, { contentType: ct, upsert: true })
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
      .from('photo_jobs')
      .select('*')
      .eq('id', jobId)
      .in('status', ['queued', 'processing'])
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found or already processed' }, { status: 404 })
    }

    // Lock the job
    await updateJob(jobId, {
      status: 'processing',
      processing_started_at: new Date().toISOString(),
      progress: 5,
    })

    const settings: PhotoJobSettings = job.settings || {
      orientation: 'portrait',
      lineThickness: 'medium',
      detailLevel: 'medium',
    }

    // Get the input image
    const signedUrl = await getSignedUrl(job.input_storage_path)
    if (!signedUrl) throw new Error('Failed to get signed URL for input image')

    const inputRes = await fetch(signedUrl)
    if (!inputRes.ok) throw new Error('Failed to download input image')
    const inputBuffer = Buffer.from(await inputRes.arrayBuffer())

    // Stage A: Preprocessing
    await updateJob(jobId, { progress: 15 })
    const preprocessed = await preprocessImage(inputBuffer, settings)

    // Upload preprocessed image
    const preprocessedPath = `photo-jobs/${jobId}/preprocessed.png`
    const { error: upErr } = await supabase.storage
      .from('uploads')
      .upload(preprocessedPath, preprocessed, { contentType: 'image/png', upsert: true })
    if (upErr) {
      await supabase.storage
        .from('images')
        .upload(preprocessedPath, preprocessed, { contentType: 'image/png', upsert: true })
    }

    const preprocessedUrl = await getSignedUrl(preprocessedPath)
    if (!preprocessedUrl) throw new Error('Failed to get preprocessed URL')

    // Stage B: Try Replicate with webhook (async), or CV fallback (sync)
    const hasReplicate = !!process.env.REPLICATE_API_TOKEN

    if (hasReplicate) {
      // Submit to Replicate with webhook – returns immediately
      const token = process.env.REPLICATE_API_TOKEN!

      const thickness =
        settings.lineThickness === 'thin' ? 'fine, delicate'
          : settings.lineThickness === 'thick' ? 'bold, heavy'
            : 'medium-weight'
      const detail =
        settings.detailLevel === 'low' ? 'simple shapes, minimal detail, suitable for young children'
          : settings.detailLevel === 'high' ? 'intricate detail, many elements, suitable for adults'
            : 'moderate detail, clear shapes'

      const prompt = `Transform this image into a clean black and white colouring book page. Use ${thickness} black outlines with ${detail}. Pure white background, no shading, no gradients, no gray tones. Professional colouring book style with clean closed contours that are easy to colour within. Lines should be smooth and consistent.`

      // Build webhook URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
      const webhookUrl = `${appUrl}/api/photo-jobs/webhook`

      const res = await fetch(
        'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              prompt,
              input_image: preprocessedUrl,
              aspect_ratio: 'match_input_image',
            },
            webhook: webhookUrl,
            webhook_events_filter: ['completed'],
          }),
        }
      )

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Replicate API error: ${errorText}`)
      }

      const prediction = await res.json()

      await updateJob(jobId, {
        prediction_id: prediction.id,
        progress: 25,
      })

      // Return immediately – webhook will finish the job
      return NextResponse.json({ success: true, status: 'processing', mode: 'webhook' })
    }

    // No Replicate – use CV fallback (completes synchronously within 60s)
    await updateJob(jobId, { progress: 30 })
    const lineArtBuffer = await sharpCVFallback.generate(preprocessed, settings)

    // Render A4 outputs
    await updateJob(jobId, { status: 'rendering', progress: 80 })
    const isLandscape = settings.orientation === 'landscape'

    const [pdfBuffer, previewBuffer] = await Promise.all([
      renderA4Pdf(lineArtBuffer, {
        watermark: job.is_watermarked,
        footer: true,
        landscape: isLandscape,
      }),
      renderA4Preview(lineArtBuffer, isLandscape),
    ])

    const pdfPath = `photo-jobs/${jobId}/output.pdf`
    const pngPath = `photo-jobs/${jobId}/output.png`

    await Promise.all([
      uploadOutput(pdfPath, pdfBuffer, 'application/pdf'),
      uploadOutput(pngPath, previewBuffer, 'image/png'),
    ])

    await updateJob(jobId, {
      status: 'done',
      progress: 100,
      output_pdf_path: pdfPath,
      output_png_path: pngPath,
      completed_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, status: 'done', mode: 'cv-fallback' })
  } catch (error) {
    console.error('Photo job process error:', error)
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
