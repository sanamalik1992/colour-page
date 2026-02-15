/**
 * Image Processing Adapter
 *
 * Two-stage pipeline for converting photos to colouring-page line art:
 *   Stage A: Preprocessing (denoise, contrast, background flattening)
 *   Stage B: Line extraction via Replicate (primary) or Sharp CV fallback
 *
 * The Sharp CV fallback uses multi-scale edge detection with morphological
 * cleanup to produce clean, kid-friendly colouring pages without any
 * external API dependency.
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
    throw new Error('ReplicateProvider.generate should be called via processWithReplicate()')
  }
}

/**
 * Process a photo job using Replicate API.
 */
export async function processWithReplicate(
  signedUrl: string,
  settings: PhotoJobSettings,
  onProgress?: (pct: number) => Promise<void>
): Promise<Buffer> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured')

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

  const imgRes = await fetch(outputUrl)
  if (!imgRes.ok) throw new Error('Failed to download generated image')

  return Buffer.from(await imgRes.arrayBuffer())
}

// ---------------------------------------------------------------------------
// Stage B Option 2 – Sharp CV fallback (no external API needed)
//
// Multi-scale adaptive thresholding + morphological cleanup produces
// clean colouring-page line art from any photograph.
// ---------------------------------------------------------------------------
export class SharpCVProvider implements LineArtProvider {
  name = 'sharp-cv'

  async generate(imageBuffer: Buffer, settings: PhotoJobSettings): Promise<Buffer> {
    const metadata = await sharp(imageBuffer).metadata()
    const width = metadata.width || 2480
    const height = metadata.height || 3508

    // Resize to a workable resolution for processing
    const maxDim = 2000
    const scaleFactor = Math.min(maxDim / Math.max(width, height), 1)
    const procW = Math.round(width * scaleFactor)
    const procH = Math.round(height * scaleFactor)

    const grey = await sharp(imageBuffer)
      .resize(procW, procH, { fit: 'fill' })
      .greyscale()
      .normalize()
      .raw()
      .toBuffer()

    // Multi-scale edge detection: combine fine + coarse edges
    const cfg = {
      low:    { blurS: 2,   blurL: 8, thS: 12, thL: 8, minComp: 100 },
      medium: { blurS: 1.5, blurL: 6, thS: 10, thL: 6, minComp: 50 },
      high:   { blurS: 1,   blurL: 4, thS: 8,  thL: 5, minComp: 25 },
    }[settings.detailLevel] || { blurS: 1.5, blurL: 6, thS: 10, thL: 6, minComp: 50 }

    const [blurredSmall, blurredLarge] = await Promise.all([
      sharp(Buffer.from(grey), { raw: { width: procW, height: procH, channels: 1 } })
        .blur(cfg.blurS + 0.5)
        .raw()
        .toBuffer(),
      sharp(Buffer.from(grey), { raw: { width: procW, height: procH, channels: 1 } })
        .blur(cfg.blurL + 0.5)
        .raw()
        .toBuffer(),
    ])

    // Combine edges from both scales
    const edgeBuffer = Buffer.alloc(procW * procH)
    for (let i = 0; i < procW * procH; i++) {
      const diffSmall = Math.abs(grey[i] - blurredSmall[i])
      const diffLarge = Math.abs(grey[i] - blurredLarge[i])
      edgeBuffer[i] = (diffSmall > cfg.thS || diffLarge > cfg.thL) ? 0 : 255
    }

    // Morphological cleanup: thicken lines, then remove noise
    const lineWeight = settings.lineThickness === 'thin' ? 1 : settings.lineThickness === 'thick' ? 3 : 2

    // Invert so lines = white for morphological ops
    const inverted = Buffer.alloc(procW * procH)
    for (let i = 0; i < procW * procH; i++) {
      inverted[i] = edgeBuffer[i] === 0 ? 255 : 0
    }

    // Dilate (thicken lines) via blur + threshold
    const dilated = await sharp(inverted, { raw: { width: procW, height: procH, channels: 1 } })
      .blur(lineWeight * 0.4 + 0.5)
      .threshold(80)
      .raw()
      .toBuffer()

    // Remove tiny noise components via flood fill
    const cleaned = removeSmallComponents(dilated, procW, procH, cfg.minComp)

    // Invert back to black-on-white
    for (let i = 0; i < procW * procH; i++) {
      cleaned[i] = cleaned[i] > 128 ? 0 : 255
    }

    // Scale back to original resolution
    return sharp(cleaned, { raw: { width: procW, height: procH, channels: 1 } })
      .resize(width, height, { fit: 'fill', kernel: 'nearest' })
      .threshold(128)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer()
  }
}

/**
 * Remove connected components smaller than minSize pixels.
 * Simple BFS flood fill on a binary image (white >= 128 = foreground).
 */
function removeSmallComponents(buffer: Buffer, w: number, h: number, minSize: number): Buffer {
  const result = Buffer.from(buffer)
  const visited = new Uint8Array(w * h)

  for (let startIdx = 0; startIdx < w * h; startIdx++) {
    if (visited[startIdx] || result[startIdx] < 128) continue

    const component: number[] = []
    const queue: number[] = [startIdx]
    visited[startIdx] = 1

    while (queue.length > 0) {
      const idx = queue.pop()!
      component.push(idx)
      const x = idx % w
      const y = Math.floor(idx / w)

      const neighbors = [
        y > 0 ? idx - w : -1,
        y < h - 1 ? idx + w : -1,
        x > 0 ? idx - 1 : -1,
        x < w - 1 ? idx + 1 : -1,
      ]

      for (const ni of neighbors) {
        if (ni >= 0 && !visited[ni] && result[ni] >= 128) {
          visited[ni] = 1
          queue.push(ni)
        }
      }
    }

    if (component.length < minSize) {
      for (const idx of component) {
        result[idx] = 0
      }
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Exported adapter
// ---------------------------------------------------------------------------
export const sharpCVFallback = new SharpCVProvider()
