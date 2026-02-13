/**
 * HEIC → PNG conversion utility.
 *
 * Apple devices commonly output HEIC; we transparently convert to PNG
 * before processing.
 */

export async function convertHeicToPng(buffer: Buffer): Promise<Buffer> {
  // Dynamic import to avoid bundling issues on edge
  const convert = (await import('heic-convert')).default
  const result = await convert({
    buffer,
    format: 'PNG',
    quality: 1,
  })
  // heic-convert returns ArrayBuffer or Buffer depending on version
  return Buffer.from(result as ArrayBuffer)
}

/**
 * Returns true if the file appears to be HEIC based on name or MIME type.
 */
export function isHeic(filename: string, mimeType?: string): boolean {
  const ext = filename.toLowerCase().split('.').pop()
  return (
    ext === 'heic' ||
    ext === 'heif' ||
    mimeType === 'image/heic' ||
    mimeType === 'image/heif'
  )
}
