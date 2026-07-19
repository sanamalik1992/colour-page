'use client'

/**
 * Prepare a user-selected image for upload, in the browser:
 *  - decodes the file (works for HEIC on Safari, which can display it)
 *  - draws it onto a canvas capped at `maxDim`
 *  - re-encodes as JPEG
 *
 * This keeps uploads well under serverless body limits (iPhone photos are
 * often 3-8MB, which otherwise 413 and surface a cryptic Safari error) and
 * sidesteps HEIC decoding on the server. On any failure it falls back to the
 * original file so we never block the user.
 */
export async function prepareImageForUpload(file: File, maxDim = 1800): Promise<File> {
  try {
    if (typeof document === 'undefined') return file

    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode()

      const w = img.naturalWidth
      const h = img.naturalHeight
      if (!w || !h) return file

      const scale = Math.min(1, maxDim / Math.max(w, h))
      const outW = Math.max(1, Math.round(w * scale))
      const outH = Math.max(1, Math.round(h * scale))

      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      ctx.drawImage(img, 0, 0, outW, outH)

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
      )
      if (!blob) return file

      const name = file.name.replace(/\.[^.]+$/, '') || 'photo'
      return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return file
  }
}

/**
 * Parse a fetch Response as JSON without throwing on empty / non-JSON bodies
 * (e.g. a platform 413/500 HTML page), which otherwise throws a cryptic
 * "The string did not match the expected pattern" on Safari.
 */
export async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  try {
    const text = await res.text()
    if (!text) return {}
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/** A friendly message for a failed upload/generation response. */
export function friendlyError(status: number, data: Record<string, unknown>): string {
  if (typeof data.error === 'string' && data.error) return data.error
  if (status === 413) return 'That photo is too large. Please try a smaller one.'
  if (status === 429) return 'Daily limit reached. Upgrade to Pro for unlimited access.'
  if (status >= 500) return 'Something went wrong on our end. Please try again.'
  return 'Failed to start generation. Please try again.'
}
