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

  const prompt = `Transform this image into a clean black and white colouring book page. Use ${thickness} black outlines with ${detail}. Pure white background, no shading, no gradients, no gray tones. Professional colouring book style with clean closed contours that are easy to colour within. Lines should be smooth and consistent.`

  await onProgress?.(20)

  // Create prediction
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
          input_image: signedUrl,
          aspect_ratio: 'match_input_image',
        },
      }),
    }
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Replicate API error: ${errorText}`)
  }

  const prediction = await res.json()
  await onProgress?.(30)

  // Poll for completion
  let result = prediction
  let attempts = 0
  const maxAttempts = 150

  while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 2000))
    attempts++

    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    result = await pollRes.json()

    const progress = Math.min(30 + Math.floor(attempts * 0.35), 80)
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
  const imgRes = await fetch(outputUrl)
  if (!imgRes.ok) throw new Error('Failed to download generated image')

  return Buffer.from(await imgRes.arrayBuffer())
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
