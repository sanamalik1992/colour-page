import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { preprocessImage, processWithReplicate, generateFromText, generateFromTextOnce, scoreObject, isBlankImage, sharpCVFallback } from '@/lib/image-processing'
import { verifyObjectImage } from '@/lib/object-verify'
import { renderNumberSheet, renderSequenceSheet, buildLetterSheet, buildLetterStickerSheet, buildLetterWriteSheet, buildLetterPuzzleSheet, buildWordPracticeSheet, buildComposedSheet } from '@/lib/topic-render'
import { singleObjectPrompt, type Activity } from '@/lib/topic-prompt'
import { renderA4Pdf, renderA4Preview } from '@/lib/pdf-renderer'
import type { PhotoJobSettings } from '@/types/photo-job'

export const maxDuration = 300 // Vercel Pro: 5 minutes

// Internal deadline, kept safely below maxDuration. If the work isn't done by
// this point we mark the job failed OURSELVES — otherwise Vercel hard-kills the
// function at maxDuration, our catch block never runs, and the job is left in
// "processing" forever (the client bar sits at 99% with no error).
const WORK_DEADLINE_MS = 180_000

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

// Object line-art cache. The same nouns recur across sheets (cat, moon, lion…),
// and singleObjectPrompt is settings-independent, so we key purely on the object
// name and reuse a stored PNG — turning a multi-second Replicate call into an
// instant download. The library warms itself as new objects are requested.
function objectCacheKey(obj: string): string {
  const slug = obj.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  // v2 namespace: forces a one-time re-generation of every object through the
  // vision-recognisability gate, so pre-check cached blobs are left behind.
  return `object-cache/v2/${slug || 'obj'}.png`
}

// Hard per-object budget. Objects generate in parallel, so ANY single object
// that stalls would freeze the whole sheet's progress — this caps each one and
// drops it (renders without it) rather than letting it hang the job.
const OBJECT_DEADLINE_MS = 42_000

function withObjectDeadline<T>(work: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    work,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

// Generate one object: up to 2 SINGLE flux attempts (no nested retry storms),
// cheap ink filter, then the vision recognisability check (self-timeouts,
// fails open). Keep the first that passes; otherwise drop.
async function generateOneObject(obj: string, settings: PhotoJobSettings, key: string): Promise<Buffer | null> {
  const prompt = singleObjectPrompt(obj)
  for (let i = 0; i < 2; i++) {
    let buf: Buffer
    try {
      buf = await generateFromTextOnce(prompt, settings)
    } catch (e) {
      console.error(`object "${obj}" generation failed (attempt ${i + 1}):`, e)
      continue
    }
    const { usable } = await scoreObject(buf)
    if (!usable) continue // blank/blob — retry
    const recognisable = await verifyObjectImage(buf, obj)
    if (!recognisable) continue
    supabase.storage.from('outputs').upload(key, buf, { contentType: 'image/png', upsert: true }).catch(() => {})
    return buf
  }
  return null
}

async function cachedObject(obj: string, settings: PhotoJobSettings): Promise<Buffer | null> {
  const key = objectCacheKey(obj)
  // Cache hit → instant. (Only recognisable objects are ever cached.)
  try {
    const { data } = await supabase.storage.from('outputs').download(key)
    if (data) return Buffer.from(await data.arrayBuffer())
  } catch { /* miss — fall through to generate */ }

  // Miss → generate under a hard per-object deadline; drop on timeout so a slow
  // object never freezes the sheet.
  const buf = await withObjectDeadline(generateOneObject(obj, settings, key), OBJECT_DEADLINE_MS)
  if (!buf) console.warn(`object "${obj}" not ready within budget — dropping`)
  return buf
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
        lineArtBuffer = await buildWordPracticeSheet(settings.title, settings.objects, settings, !!job.is_pro)
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
        lineArtBuffer = await buildComposedSheet(settings.title, settings.activities as Activity[], settings, !!job.is_pro, genPicture, onPicProgress)
        await updateJob(jobId, { progress: 82 })
      } else if (settings.category === 'letter' && glyph?.kind === 'letter' && settings.objects?.length) {
        // Letter/phonics: the ACTIVITY TYPE changes with age band.
        //  • 9–10 (high): a word-search + write-a-sentence puzzle — fully
        //    deterministic (our glyph font), no image model needed.
        //  • 3–5 / 6–8: generate each object as its own clear picture (parallel)
        //    then compose a sticker grid — recognise/colour (low) or
        //    write-the-missing-sound fill-gap (medium).
        const band = settings.detailLevel
        // Pro sheets carry a second, age-matched activity (colour-every-letter,
        // trace-the-words, write-a-sentence); free sheets are a single taster.
        const isPro = !!job.is_pro
        if (band === 'high') {
          lineArtBuffer = await buildLetterPuzzleSheet(glyph.value, settings.objects, settings, isPro)
          await updateJob(jobId, { progress: 82 })
        } else {
          if (!hasReplicate) throw new Error('Text-to-image generation is not configured')
          await updateJob(jobId, { progress: 20 })
          const letterObjs = settings.objects.slice(0, 6)
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
