import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { preprocessImage, processWithReplicate, generateFromText, isBlankImage, isUsablePhotoLineArt, padExtremeAspect, sharpCVFallback } from '@/lib/image-processing'
import { verifySheet } from '@/lib/sheet-verify'
import { renderNumberSheet, renderSequenceSheet, buildLetterSheet, buildLetterStickerSheet, buildLetterWriteSheet, buildLetterPuzzleSheet, buildWordPracticeSheet, buildComposedSheet } from '@/lib/topic-render'
import { type Activity } from '@/lib/topic-prompt'
import { cachedObject } from '@/lib/object-images'
import { renderA4Pdf, renderA4Preview, applyBrandWatermark } from '@/lib/pdf-renderer'
import { isHeic, convertHeicToPng } from '@/lib/heic-convert'
import type { PhotoJobSettings } from '@/types/photo-job'

export const maxDuration = 300 // Vercel Pro: 5 minutes

// Free and Pro sheets are identical in content now — every sheet renders the
// full set of activities. The deterministic builders still take an "isPro"
// layout flag; we always pass this so everyone gets the fuller layout.
const FULL_SHEET = true

// Internal deadline, kept safely below maxDuration. If the work isn't done by
// this point we mark the job failed OURSELVES — otherwise Vercel hard-kills the
// function at maxDuration, our catch block never runs, and the job is left in
// "processing" forever (the client bar sits at 99% with no error).
const WORK_DEADLINE_MS = 120_000

class DeadlineError extends Error {
  constructor() {
    super('This sheet is taking longer than expected. Please try again — it usually works on a second go.')
    this.name = 'DeadlineError'
  }
}

function withDeadline<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new DeadlineError()), WORK_DEADLINE_MS)
    work.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

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

    // All generation + rendering runs under an internal deadline so a stalled
    // job fails cleanly instead of hanging at 99% until Vercel kills it.
    await withDeadline((async (jobId: string) => {
    const tStart = Date.now()
    let lineArtBuffer: Buffer

    if (isTopic) {
      const glyph = settings.glyph
      await updateJob(jobId, { progress: 15 })

      if (settings.category === 'sequence' && settings.numbers?.length) {
        // Maths sequence (multiples / times tables) drawn deterministically.
        lineArtBuffer = await renderSequenceSheet(settings.numbers, settings)
        await updateJob(jobId, { progress: 80 })
      } else if (settings.category === 'number' && glyph?.kind === 'numberRange') {
        // Counting sheet drawn deterministically — no model call, 100% accurate.
        const maxN = parseInt(glyph.value.split('-')[1] || '10', 10)
        lineArtBuffer = await renderNumberSheet(maxN, settings)
        await updateJob(jobId, { progress: 80 })
      } else if (settings.category === 'words' && settings.objects?.length) {
        // Sight / tricky / specific words (there, then, that…) — a read-trace-
        // find-write practice sheet, drawn deterministically (no pictures).
        lineArtBuffer = await buildWordPracticeSheet(settings.title, settings.objects, settings, FULL_SHEET)
        await updateJob(jobId, { progress: 82 })
      } else if (settings.category === 'composed' && settings.activities?.length) {
        // Open-ended / concept topics (nouns, verbs, "an interactive sheet
        // about X"): a designed sequence of activity blocks. Any picture blocks
        // generate their objects via the model; the rest are deterministic.
        await updateJob(jobId, { progress: 20 })
        const genPicture = hasReplicate ? (obj: string) => cachedObject(obj, settings) : undefined
        // Honest progress across the picture-generation phase (20 → 78) so a
        // slow sheet visibly advances instead of sitting frozen at a high %.
        const onPicProgress = (done: number, total: number) => {
          updateJob(jobId, { progress: 20 + Math.round((done / Math.max(1, total)) * 58) }).catch(() => {})
        }
        lineArtBuffer = await buildComposedSheet(settings.title, settings.activities as Activity[], settings, genPicture, onPicProgress)
        await updateJob(jobId, { progress: 82 })
      } else if (settings.category === 'letter' && glyph?.kind === 'letter' && settings.objects?.length) {
        // Letter/phonics: the ACTIVITY TYPE changes with age band.
        //  • 9–10 (high): a word-search + write-a-sentence puzzle — fully
        //    deterministic (our glyph font), no image model needed.
        //  • 3–5 / 6–8: generate each object as its own clear picture (parallel)
        //    then compose a sticker grid — recognise/colour (low) or
        //    write-the-missing-sound fill-gap (medium).
        const band = settings.detailLevel
        // Every sheet carries the full set of age-matched activities (the fuller
        // layout the builders formerly reserved for Pro).
        const isPro = FULL_SHEET
        if (band === 'high') {
          lineArtBuffer = await buildLetterPuzzleSheet(glyph.value, settings.objects, settings, isPro)
          await updateJob(jobId, { progress: 82 })
        } else {
          if (!hasReplicate) throw new Error('Text-to-image generation is not configured')
          await updateJob(jobId, { progress: 20 })
          // The builders show 2 (young) or 3 (6–8) BIG pictures; generate a
          // couple extra as backup in case one drops (dark-surround/vision gate)
          // — but not all six, which would be wasted model calls.
          const letterObjs = settings.objects.slice(0, 4)
          let picDone = 0
          const pics = (await Promise.all(
            letterObjs.map(async (obj) => {
              const b = await cachedObject(obj, settings)
              await updateJob(jobId, { progress: 20 + Math.round((++picDone / letterObjs.length) * 58) }).catch(() => {})
              return b
            })
          )).filter((b): b is Buffer => b != null)
          await updateJob(jobId, { progress: 78 })

          if (pics.length >= 2) {
            lineArtBuffer = band === 'low'
              ? await buildLetterStickerSheet(pics, glyph.value, settings, isPro)
              : await buildLetterWriteSheet(pics, glyph.value, settings.objects, settings, isPro)
          } else {
            // Fallback: one combined image under the header (old behaviour).
            const generated = await generateFromText(settings.prompt || '', settings)
            lineArtBuffer = await buildLetterSheet(generated, glyph.value, settings)
          }
        }
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
        // Guard against a blank generation slipping through as a "done" sheet.
        if (settings.category !== 'letter' && (await isBlankImage(lineArtBuffer))) {
          throw new Error('The picture came out blank. Please try rewording the topic.')
        }
      }
    } else {
      // Photo path: edit the uploaded image into line art.
      const signedUrl = await getSignedUrl(job.input_storage_path)
      if (!signedUrl) throw new Error('Failed to get signed URL for input image')

      const inputRes = await fetch(signedUrl)
      if (!inputRes.ok) throw new Error('Failed to download input image')
      let inputBuffer = Buffer.from(await inputRes.arrayBuffer())
      let modelUrl = signedUrl

      // HEIC safety net. The browser normally uploads a prepared JPEG, but a raw
      // HEIC that couldn't be decoded client-side (rare, non-Apple browsers) can
      // reach storage — and neither Replicate nor sharp can read HEIC. Convert
      // to PNG, store it alongside, and point the model at that instead.
      if (isHeic(job.input_storage_path)) {
        try {
          inputBuffer = Buffer.from(await convertHeicToPng(inputBuffer))
          const convPath = job.input_storage_path.replace(/\.[^.]+$/, '-conv.png')
          await supabase.storage.from('uploads').upload(convPath, inputBuffer, { contentType: 'image/png', upsert: true })
          const convUrl = await getSignedUrl(convPath)
          if (convUrl) modelUrl = convUrl
        } catch (heicErr) {
          console.error('HEIC conversion failed:', heicErr)
          throw new Error("We couldn't read that photo format. Please try a JPG or PNG.")
        }
      }

      // Normalise an extreme aspect ratio (very tall/very wide) before the model.
      // flux-kontext converts standard 3:4–4:3 frames reliably but can fail on an
      // ultra-tall 9:16 phone shot — the "one photo worked, a taller one didn't"
      // report. Pad with white (subject untouched) and point the model at the
      // padded copy stored alongside the original.
      try {
        const { buffer: padded, padded: didPad } = await padExtremeAspect(inputBuffer)
        if (didPad) {
          inputBuffer = Buffer.from(padded)
          const padPath = job.input_storage_path.replace(/\.[^.]+$/, '-pad.jpg')
          await supabase.storage.from('uploads').upload(padPath, inputBuffer, { contentType: 'image/jpeg', upsert: true })
          const padUrl = await getSignedUrl(padPath)
          if (padUrl) modelUrl = padUrl
        }
      } catch (padErr) {
        console.error('aspect padding failed (using original):', padErr)
      }

      await updateJob(jobId, { progress: 15 })

      // Replicate gets the image URL directly — faster (no extra preprocess +
      // re-upload) and higher quality. Preprocessing is only for the CV fallback.
      // The CV fallback can only trace edges — on a busy real photo that's noise,
      // not a colouring page — so we track when it was used and quality-gate the
      // result below rather than ever delivering a broken sheet.
      let usedCvFallback = false
      if (hasReplicate) {
        try {
          lineArtBuffer = await processWithReplicate(
            modelUrl,
            settings,
            async (pct) => { await updateJob(jobId!, { progress: pct }) }
          )
        } catch (replicateError) {
          console.error('Replicate failed, falling back to Sharp CV:', replicateError)
          usedCvFallback = true
          await updateJob(jobId, { progress: 30 })
          const preprocessed = await preprocessImage(inputBuffer, settings)
          lineArtBuffer = await sharpCVFallback.generate(preprocessed, settings)
        }
      } else {
        usedCvFallback = true
        await updateJob(jobId, { progress: 30 })
        const preprocessed = await preprocessImage(inputBuffer, settings)
        lineArtBuffer = await sharpCVFallback.generate(preprocessed, settings)
      }

      // Quality gate for the PHOTO path: never hand back a blank page or a noisy
      // mess. If the outline came out empty or (from the CV tracer) speckled, fail
      // with clear, actionable guidance instead of delivering something broken.
      const photoQa = await isUsablePhotoLineArt(lineArtBuffer, usedCvFallback)
      if (!photoQa.ok) {
        console.warn(`photo job ${jobId} rejected: ${photoQa.reason} (ink=${photoQa.ink.toFixed(3)}, cvFallback=${usedCvFallback})`)
        throw new Error(
          "We couldn't get clean outlines from that photo. For the best result, use a bright, close-up photo with your subject filling the frame and a plain, uncluttered background — then tap Try again."
        )
      }
    }

    console.log(`[timing ${jobId}] generation ${Date.now() - tStart}ms`)

    // FINAL quality gate: look at the finished sheet and refuse to publish one
    // with a clear defect (overlapping/garbled text, a blob picture, broken
    // layout). Fail the job with a retry message rather than deliver it. Fails
    // open if the QA service is unavailable, so it can't block all generation.
    //
    // ONLY for designed topic/activity sheets. A converted PHOTO is judged by its
    // own blank/noise guard above — running the activity-sheet vision check on a
    // photo line-drawing wrongly flags it as an "unrecognisable blob" and bounces
    // perfectly good conversions (the "small glitch" false reject on photos).
    if (isTopic) {
      await updateJob(jobId, { progress: 85 })
      const tQa = Date.now()
      const qa = await verifySheet(lineArtBuffer)
      console.log(`[timing ${jobId}] sheet QA ${Date.now() - tQa}ms → ${qa.ok ? 'ok' : 'reject:' + qa.reason}`)
      if (!qa.ok) {
        console.warn(`sheet QA rejected job ${jobId}: ${qa.reason}`)
        throw new Error('We spotted a small glitch on that sheet — please tap Try again, it usually comes out perfect.')
      }
    }

    // Stage C: Render A4 outputs. Sequential (not parallel) so we don't hold two
    // full-page ~35MB bitmaps decoded at once — keeps peak memory down.
    await updateJob(jobId, { status: 'rendering', progress: 88 })
    const isLandscape = settings.orientation === 'landscape'
    // Pro Family downloads are unbranded and full 300-DPI. Free sheets carry a
    // subtle branded "colour.page" watermark tiled across the page (plus the
    // small footer credit), baked into the bitmap so it's identical on the
    // on-screen preview, the PNG download and the printed PDF.
    const isProJob = job.is_pro === true
    if (!isProJob) lineArtBuffer = await applyBrandWatermark(lineArtBuffer)
    const tRender = Date.now()
    const pdfBuffer = await renderA4Pdf(lineArtBuffer, {
      watermark: false,
      footer: !isProJob,
      landscape: isLandscape,
    })
    const previewBuffer = await renderA4Preview(lineArtBuffer, isLandscape, { footer: !isProJob, hd: isProJob })
    console.log(`[timing ${jobId}] render ${Date.now() - tRender}ms`)

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
    console.log(`[timing ${jobId}] TOTAL ${Date.now() - tStart}ms (${settings.category})`)
    })(jobId)) // end withDeadline

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
