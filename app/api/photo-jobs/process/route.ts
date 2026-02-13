import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { preprocessImage, processWithReplicate, sharpCVFallback } from '@/lib/image-processing'
import { renderA4Pdf, renderA4Preview } from '@/lib/pdf-renderer'
import type { PhotoJobSettings } from '@/types/photo-job'

export const maxDuration = 300 // 5 minutes

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

export async function POST(request: NextRequest) {
  let jobId: string | undefined

  try {
    const body = await request.json()
    jobId = body.jobId

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    // Fetch job with compare-and-swap lock
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

    // Stage A: Get the input image
    await updateJob(jobId, { progress: 10 })

    const uploadPath = job.input_storage_path
    let signedUrl: string | null = null

    // Try uploads bucket, then images bucket
    const { data: s1 } = await supabase.storage.from('uploads').createSignedUrl(uploadPath, 3600)
    if (s1?.signedUrl) {
      signedUrl = s1.signedUrl
    } else {
      const { data: s2 } = await supabase.storage.from('images').createSignedUrl(uploadPath, 3600)
      signedUrl = s2?.signedUrl || null
    }

    if (!signedUrl) throw new Error('Failed to get signed URL for input image')

    // Download input for preprocessing
    const inputRes = await fetch(signedUrl)
    if (!inputRes.ok) throw new Error('Failed to download input image')
    const inputBuffer = Buffer.from(await inputRes.arrayBuffer())

    // Stage A: Preprocessing
    await updateJob(jobId, { progress: 15 })
    const preprocessed = await preprocessImage(inputBuffer, settings)

    // Stage B: Line extraction – try Replicate, fallback to Sharp CV
    let lineArtBuffer: Buffer

    const hasReplicate = !!process.env.REPLICATE_API_TOKEN

    if (hasReplicate) {
      try {
        // Upload preprocessed image for a fresh signed URL
        const preprocessedPath = `photo-jobs/${jobId}/preprocessed.png`
        await supabase.storage
          .from('uploads')
          .upload(preprocessedPath, preprocessed, { contentType: 'image/png', upsert: true })
          .then(async ({ error }) => {
            if (error) {
              await supabase.storage
                .from('images')
                .upload(preprocessedPath, preprocessed, { contentType: 'image/png', upsert: true })
            }
          })

        // Get signed URL for the preprocessed image
        let preprocessedUrl: string | null = null
        const { data: ps1 } = await supabase.storage.from('uploads').createSignedUrl(preprocessedPath, 3600)
        if (ps1?.signedUrl) {
          preprocessedUrl = ps1.signedUrl
        } else {
          const { data: ps2 } = await supabase.storage.from('images').createSignedUrl(preprocessedPath, 3600)
          preprocessedUrl = ps2?.signedUrl || null
        }

        if (!preprocessedUrl) throw new Error('Failed to get preprocessed URL')

        lineArtBuffer = await processWithReplicate(
          preprocessedUrl,
          settings,
          async (pct) => {
            await updateJob(jobId!, { progress: pct })
          }
        )
      } catch (replicateError) {
        console.error('Replicate failed, falling back to Sharp CV:', replicateError)
        await updateJob(jobId, { progress: 30 })
        lineArtBuffer = await sharpCVFallback.generate(preprocessed, settings)
      }
    } else {
      // No Replicate token – use CV fallback
      await updateJob(jobId, { progress: 30 })
      lineArtBuffer = await sharpCVFallback.generate(preprocessed, settings)
    }

    // Stage C: Render A4 outputs
    await updateJob(jobId, { status: 'rendering', progress: 88 })

    const isLandscape = settings.orientation === 'landscape'

    const [pdfBuffer, previewBuffer] = await Promise.all([
      renderA4Pdf(lineArtBuffer, {
        watermark: job.is_watermarked,
        footer: true,
        landscape: isLandscape,
      }),
      renderA4Preview(lineArtBuffer, isLandscape),
    ])

    await updateJob(jobId, { progress: 93 })

    // Upload outputs
    const pdfPath = `photo-jobs/${jobId}/output.pdf`
    const pngPath = `photo-jobs/${jobId}/output.png`

    // Upload to outputs bucket, fallback to images
    const uploadOutput = async (path: string, buf: Buffer, ct: string) => {
      const { error } = await supabase.storage.from('outputs').upload(path, buf, { contentType: ct, upsert: true })
      if (error) {
        await supabase.storage.from('images').upload(path, buf, { contentType: ct, upsert: true })
      }
    }

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

    return NextResponse.json({ success: true, status: 'done' })
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
