import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { preprocessImage, processWithReplicate, generateFromText, sharpCVFallback } from '@/lib/image-processing'
import { renderNumberSheet, buildLetterSheet } from '@/lib/topic-render'
import { renderA4Pdf, renderA4Preview } from '@/lib/pdf-renderer'
import type { PhotoJobSettings } from '@/types/photo-job'

export const maxDuration = 300 // Vercel Pro: 5 minutes

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

async function getSignedUrl(path: string): Promise<string | null> {
  const { data: s1 } = await supabase.storage.from('uploads').createSignedUrl(path, 3600)
  if (s1?.signedUrl) return s1.signedUrl
  const { data: s2 } = await supabase.storage.from('images').createSignedUrl(path, 3600)
  return s2?.signedUrl || null
}

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

    // Topic jobs are flagged in settings (kept schema-free); fall back to the
    // column if a migration added one.
    const isTopic = settings.source === 'topic' || job.source === 'topic'
    const hasReplicate = !!process.env.REPLICATE_API_TOKEN
    let lineArtBuffer: Buffer

    if (isTopic) {
      const glyph = settings.glyph
      await updateJob(jobId, { progress: 15 })

      if (settings.category === 'number' && glyph?.kind === 'numberRange') {
        // Counting sheet drawn deterministically — no model call, 100% accurate.
        const maxN = parseInt(glyph.value.split('-')[1] || '10', 10)
        lineArtBuffer = await renderNumberSheet(maxN, settings)
        await updateJob(jobId, { progress: 80 })
      } else {
        // Everything else needs the text-to-image model. There's no CV fallback
        // (nothing to trace without a photo), so a missing token is fatal.
        if (!hasReplicate) throw new Error('Text-to-image generation is not configured')
        const prompt = settings.prompt || settings.topic || job.topic
        if (!prompt) throw new Error('Topic job has no prompt')
        const generated = await generateFromText(
          prompt,
          settings,
          async (pct) => { await updateJob(jobId!, { progress: pct }) }
        )
        if (settings.category === 'letter' && glyph?.kind === 'letter') {
          // Stamp the correct, traceable capital over the generated objects.
          lineArtBuffer = await buildLetterSheet(generated, glyph.value, settings)
        } else {
          lineArtBuffer = generated
        }
      }
    } else {
      // Photo path (existing): edit the uploaded image into line art.
      const signedUrl = await getSignedUrl(job.input_storage_path)
      if (!signedUrl) throw new Error('Failed to get signed URL for input image')

      const inputRes = await fetch(signedUrl)
      if (!inputRes.ok) throw new Error('Failed to download input image')
      const inputBuffer = Buffer.from(await inputRes.arrayBuffer())

      await updateJob(jobId, { progress: 15 })

      // Replicate gets the ORIGINAL image URL directly — faster (no extra
      // preprocess + re-upload) and higher quality (the model works best on the
      // full-colour photo). Preprocessing is only done for the local CV fallback.
      if (hasReplicate) {
        try {
          lineArtBuffer = await processWithReplicate(
            signedUrl,
            settings,
            async (pct) => { await updateJob(jobId!, { progress: pct }) }
          )
        } catch (replicateError) {
          console.error('Replicate failed, falling back to Sharp CV:', replicateError)
          await updateJob(jobId, { progress: 30 })
          const preprocessed = await preprocessImage(inputBuffer, settings)
          lineArtBuffer = await sharpCVFallback.generate(preprocessed, settings)
        }
      } else {
        await updateJob(jobId, { progress: 30 })
        const preprocessed = await preprocessImage(inputBuffer, settings)
        lineArtBuffer = await sharpCVFallback.generate(preprocessed, settings)
      }
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
