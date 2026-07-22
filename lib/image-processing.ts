/**
 * Image Processing Adapter
 *
 * Two-stage pipeline for converting photos to colouring-page line art:
 *   Stage A: Preprocessing (denoise, contrast, background flattening)
 *   Stage B: Line extraction via Replicate (primary) or Sharp CV fallback
 *
 * The adapter pattern lets us swap providers without touching calling code.
 */

import sharp from 'sharp'
import type { PhotoJobSettings } from '@/types/photo-job'

/**
 * fetch() with a hard timeout. Node's global fetch never times out on its own,
 * so a stalled socket to Replicate would hang the whole serverless function
 * until Vercel kills it at maxDuration — and once killed, our catch block never
 * runs, leaving the job stuck in "processing" (the UI shows 99% forever). An
 * AbortController guarantees every network call either resolves or throws.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Network request timed out after ${timeoutMs}ms`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------
export interface LineArtProvider {
  name: string
  generate(imageBuffer: Buffer, settings: PhotoJobSettings): Promise<Buffer>
}

// ---------------------------------------------------------------------------
// Stage A – Preprocessing (runs regardless of provider)
// ---------------------------------------------------------------------------
export async function preprocessImage(
  imageBuffer: Buffer,
  settings: PhotoJobSettings
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer)

  // Get metadata for orientation handling
  const metadata = await pipeline.metadata()
  const isLandscapeInput = (metadata.width || 0) > (metadata.height || 0)
  const wantLandscape = settings.orientation === 'landscape'

  // Rotate if orientation mismatch
  if (isLandscapeInput !== wantLandscape) {
    pipeline = pipeline.rotate(90)
  }

  // Denoise – median filter (strength varies by detail level)
  const medianSize = settings.detailLevel === 'high' ? 1 : settings.detailLevel === 'low' ? 5 : 3
  if (medianSize > 1) {
    pipeline = pipeline.median(medianSize)
  }

  // Contrast normalize (linear stretch)
  pipeline = pipeline.normalize()

  // Convert to greyscale for line extraction
  pipeline = pipeline.greyscale()

  return pipeline.toBuffer()
}

// ---------------------------------------------------------------------------
// Stage B Option 1 – Replicate provider (primary)
// ---------------------------------------------------------------------------
export class ReplicateProvider implements LineArtProvider {
  name = 'replicate'

  async generate(_imageBuffer: Buffer, _settings: PhotoJobSettings): Promise<Buffer> {
    // Replicate needs a URL, not a buffer. Use processWithReplicate() instead.
    throw new Error('ReplicateProvider.generate should be called via processWithReplicate()')
  }
}

/**
 * Process a photo job using Replicate API (called from the API route
 * which manages Supabase storage and signed URLs).
 */
export async function processWithReplicate(
  signedUrl: string,
  settings: PhotoJobSettings,
  onProgress?: (pct: number) => Promise<void>
): Promise<Buffer> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured')

  // Build prompt based on settings
  const thickness =
    settings.lineThickness === 'thin'
      ? 'fine, delicate'
      : settings.lineThickness === 'thick'
        ? 'bold, heavy'
        : 'medium-weight'

  const detail =
    settings.detailLevel === 'low'
      ? 'simple shapes, minimal detail, suitable for young children'
      : settings.detailLevel === 'high'
        ? 'intricate detail, many elements, suitable for adults'
        : 'moderate detail, clear shapes'

  const prompt = `Convert this photo into a clean black-and-white line drawing for a children's colouring book. ${detail}. Use ${thickness} solid black outlines on a pure white background. Only clean black outlines — absolutely no shading, no grey tones, no colour and no fill. Keep every shape as a closed contour so it is easy to colour inside the lines. Smooth, confident, evenly weighted lines.`

  await onProgress?.(20)

  // Create prediction. `Prefer: wait` asks Replicate to hold the connection
  // and return the finished prediction directly (up to ~60s), which removes
  // polling latency for the common fast case.
  const res = await fetchWithTimeout(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=55',
      },
      body: JSON.stringify({
        input: {
          prompt,
          input_image: signedUrl,
          aspect_ratio: 'match_input_image',
          output_format: 'png',
          safety_tolerance: 2,
        },
      }),
    },
    60000
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Replicate API error: ${errorText}`)
  }

  const prediction = await res.json()
  await onProgress?.(60)

  // If `Prefer: wait` already returned a finished prediction, skip polling.
  // kontext-pro is slower than schnell, so allow a longer (but still bounded)
  // poll window before giving up.
  let result = prediction
  let attempts = 0
  const maxAttempts = 80 // × 1.5s = 120s

  while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 1500))
    attempts++

    const pollRes = await fetchWithTimeout(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
      15000
    )
    result = await pollRes.json()

    const progress = Math.min(60 + Math.floor(attempts * 0.6), 80)
    await onProgress?.(progress)
  }

  if (result.status === 'failed') throw new Error(result.error || 'Generation failed')
  if (result.status !== 'succeeded') throw new Error('Generation timed out')

  const outputUrl =
    typeof result.output === 'string'
      ? result.output
      : Array.isArray(result.output)
        ? result.output[0]
        : result.output?.url

  if (!outputUrl) throw new Error('No output URL from provider')

  await onProgress?.(85)

  // Download the result
  const imgRes = await fetchWithTimeout(outputUrl, {}, 30000)
  if (!imgRes.ok) throw new Error('Failed to download generated image')

  return Buffer.from(await imgRes.arrayBuffer())
}

/**
 * Text-to-image generation for the "learning topic" path. Unlike
 * processWithReplicate() (which edits an uploaded photo with flux-kontext-pro),
 * this produces line art from a prompt alone using a Flux text-to-image model,
 * so no input image is required. Output style is pinned to the same clean
 * colouring-book look by the prompt, so it flows through the same PDF +
 * dot-to-dot steps.
 */
export async function generateFromText(
  prompt: string,
  settings: PhotoJobSettings,
  onProgress?: (pct: number) => Promise<void>
): Promise<Buffer> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured')

  const aspectRatio = settings.orientation === 'landscape' ? '4:3' : '3:4'

  // Replicate occasionally returns transient failures (e.g. "Director:
  // unexpected error handling prediction"). Retry a couple of times — schnell
  // is fast, so a retry costs little and rescues most of these.
  const maxTries = 3
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      await onProgress?.(attempt === 1 ? 20 : 25)
      return await runFluxSchnell(token, prompt, aspectRatio, onProgress)
    } catch (err) {
      lastErr = err
      console.error(`generateFromText attempt ${attempt}/${maxTries} failed:`, err)
      if (attempt < maxTries) await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  console.error('generateFromText: all attempts failed:', lastErr)
  throw new Error("Sorry — the picture didn't come out. Please try again in a moment.")
}

// One flux-schnell generation attempt.
async function runFluxSchnell(
  token: string,
  prompt: string,
  aspectRatio: string,
  onProgress?: (pct: number) => Promise<void>
): Promise<Buffer> {
  // flux-schnell: a fast (few seconds), cheap text-to-image model.
  const res = await fetchWithTimeout(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=55',
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          num_outputs: 1,
          output_format: 'png',
          num_inference_steps: 4, // schnell is distilled for 1-4 steps
          go_fast: true,
          disable_safety_checker: false,
        },
      }),
    },
    60000 // Prefer: wait=55 holds the connection up to ~55s
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Replicate API error: ${errorText}`)
  }

  const prediction = await res.json()
  await onProgress?.(60)

  // Poll ceiling kept tight: schnell finishes in seconds, so if it hasn't
  // completed in ~45s it's stuck — fail fast and let the caller retry rather
  // than burning the whole function budget on one stalled prediction.
  let result = prediction
  let attempts = 0
  const maxAttempts = 30 // × 1.5s = 45s

  while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 1500))
    attempts++
    const pollRes = await fetchWithTimeout(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
      15000
    )
    result = await pollRes.json()
    await onProgress?.(Math.min(60 + Math.floor(attempts * 0.6), 80))
  }

  if (result.status === 'failed') throw new Error(result.error || 'Generation failed')
  if (result.status !== 'succeeded') throw new Error('Generation timed out')

  const outputUrl =
    typeof result.output === 'string'
      ? result.output
      : Array.isArray(result.output)
        ? result.output[0]
        : result.output?.url

  if (!outputUrl) throw new Error('No output URL from provider')

  await onProgress?.(85)

  const imgRes = await fetchWithTimeout(outputUrl, {}, 30000)
  if (!imgRes.ok) throw new Error('Failed to download generated image')
  const buf = Buffer.from(await imgRes.arrayBuffer())
  if (buf.length < 1000) throw new Error('Generated image was empty')
  return buf
}

/**
 * True if an image is effectively blank (a near-white page with almost no ink).
 * Used to catch generations that came back empty so we fail clearly instead of
 * shipping a blank sheet.
 */
export async function isBlankImage(buffer: Buffer): Promise<boolean> {
  try {
    const stats = await sharp(buffer).stats()
    // Blank => every channel is bright with almost no variation (no lines).
    return stats.channels.every((c) => c.mean > 250 && c.stdev < 4)
  } catch {
    return false
  }
}

// Fraction of "ink" (dark pixels) in a line-art image. Clean single-object line
// art typically sits around 3–30%. Near-zero = blank; very high = a solid blob
// or a mostly-black failure. Cheap: threshold then read the mean.
async function inkFraction(buffer: Buffer): Promise<number> {
  try {
    const stats = await sharp(buffer).greyscale().threshold(200).stats()
    const meanWhite = stats.channels[0].mean / 255 // fraction of light pixels
    return 1 - meanWhite
  } catch {
    return -1
  }
}

// Ink-fraction bands for judging a single-object line drawing:
//  • below BLANK           → an empty/near-white frame
//  • GOOD_LO … GOOD_HI     → healthy line art (thin outlines)
//  • above USABLE_HI       → a filled/solid blob (e.g. a headless mass)
const INK_BLANK = 0.012
const INK_GOOD_LO = 0.02
const INK_GOOD_HI = 0.28
const INK_USABLE_HI = 0.42

/**
 * Judge a generated object. `usable` = safe to show; `good` = clean enough to
 * cache and reuse. If the image can't be measured we don't block it.
 */
export async function scoreObject(buf: Buffer): Promise<{ ink: number; usable: boolean; good: boolean }> {
  const ink = await inkFraction(buf)
  if (ink < 0) return { ink, usable: true, good: true }
  const usable = ink >= INK_BLANK && ink <= INK_USABLE_HI
  const good = ink >= INK_GOOD_LO && ink <= INK_GOOD_HI
  return { ink, usable, good }
}

/**
 * Generate a single-object picture, retrying to avoid malformed results (blank
 * frames, headless blobs). Returns as soon as one lands in the healthy band;
 * otherwise keeps the closest-to-ideal attempt. Because good objects are cached
 * and reused, spending a couple of extra attempts here is a one-time cost that
 * pays off on every future sheet — so we can afford to be picky.
 */
export async function generateGoodObject(
  prompt: string,
  settings: PhotoJobSettings,
  extraTries = 2
): Promise<Buffer> {
  let best: Buffer | null = null
  let bestScore = -Infinity
  for (let i = 0; i <= extraTries; i++) {
    const buf = await generateFromText(prompt, settings) // throws only on hard API failure
    const { ink, good } = await scoreObject(buf)
    if (good) return buf // healthy line art — done
    // Prefer the attempt whose ink is closest to the ideal (~0.09).
    const score = ink < 0 ? 1 : -Math.abs(ink - 0.09)
    if (score > bestScore) { bestScore = score; best = buf }
    console.warn(`generateGoodObject: attempt ${i + 1} ink=${ink.toFixed(3)} not ideal, retrying`)
  }
  return best!
}

// ---------------------------------------------------------------------------
// Stage B Option 2 – Sharp CV fallback (no external API needed)
// ---------------------------------------------------------------------------
export class SharpCVProvider implements LineArtProvider {
  name = 'sharp-cv'

  async generate(imageBuffer: Buffer, settings: PhotoJobSettings): Promise<Buffer> {
    // Preprocessing is already done; imageBuffer is greyscale
    const metadata = await sharp(imageBuffer).metadata()
    const width = metadata.width || 2480
    const height = metadata.height || 3508

    // Adaptive threshold simulation using Sharp:
    // 1. Create a blurred version (local mean)
    // 2. Compare original to blurred to get edges
    // 3. Apply morphological operations via erode/dilate

    const blurSigma =
      settings.detailLevel === 'low' ? 3 : settings.detailLevel === 'high' ? 0.8 : 1.5

    // Get raw pixels for edge detection
    const original = await sharp(imageBuffer)
      .resize(width, height, { fit: 'inside' })
      .raw()
      .toBuffer()

    const blurred = await sharp(imageBuffer)
      .resize(width, height, { fit: 'inside' })
      .blur(blurSigma + 0.5)
      .raw()
      .toBuffer()

    const resizedMeta = await sharp(imageBuffer)
      .resize(width, height, { fit: 'inside' })
      .metadata()

    const w = resizedMeta.width || width
    const h = resizedMeta.height || height

    // Edge detection: where original is darker than local mean
    const edgeBuffer = Buffer.alloc(w * h)
    const threshold = settings.detailLevel === 'low' ? 15 : settings.detailLevel === 'high' ? 5 : 10

    for (let i = 0; i < w * h; i++) {
      const diff = blurred[i] - original[i]
      edgeBuffer[i] = diff > threshold ? 0 : 255 // black lines on white
    }

    // Line thickening via dilate (erode on inverted = dilate on lines)
    const kernelSize =
      settings.lineThickness === 'thin' ? 1 : settings.lineThickness === 'thick' ? 3 : 2

    let result = sharp(edgeBuffer, { raw: { width: w, height: h, channels: 1 } })

    if (kernelSize > 1) {
      // Simulate dilation by slightly blurring then thresholding
      result = sharp(
        await result
          .blur(kernelSize * 0.5 + 0.5)
          .toBuffer()
      , { raw: { width: w, height: h, channels: 1 } })
        .threshold(200) // re-binarize
    }

    // Final cleanup: ensure pure black and white
    return result
      .threshold(128)
      .png()
      .toBuffer()
  }
}

// ---------------------------------------------------------------------------
// Exported adapter – tries Replicate first, falls back to Sharp CV
// ---------------------------------------------------------------------------
export const sharpCVFallback = new SharpCVProvider()
