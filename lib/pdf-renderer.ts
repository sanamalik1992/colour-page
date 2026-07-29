/**
 * A4 PDF Renderer
 *
 * Creates print-ready A4 PDFs at 300 DPI with configurable margins,
 * optional watermark, and optional footer branding.
 */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import sharp from 'sharp'

// A4 dimensions in points (1 pt = 1/72 inch)
const A4_WIDTH_PT = 595.28
const A4_HEIGHT_PT = 841.89

// A4 at 300 DPI in pixels
const A4_WIDTH_PX = 2480
const A4_HEIGHT_PX = 3508

// 10mm margins in points (10mm ≈ 28.35pt)
const MARGIN_PT = 28.35

// Watermark text
const WATERMARK_TEXT = 'colour.page'
const FOOTER_TEXT = 'colour.page'

export interface PdfRenderOptions {
  /** Add a diagonal watermark across the page */
  watermark?: boolean
  /** Add a small footer with branding (Pro users can toggle off) */
  footer?: boolean
  /** Orientation override – if set, rotate the image accordingly */
  landscape?: boolean
}

/**
 * Bake a subtle, clearly-branded "colour.page" wordmark diagonally across a
 * sheet — the free-tier watermark. Applied to the line-art bitmap BEFORE it's
 * turned into the PDF/PNG, so it renders identically on the on-screen preview,
 * the PNG download and the printed PDF. Light enough (6% grey) to colour over,
 * legible enough to read as the brand from across the room.
 */
export async function applyBrandWatermark(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const meta = await sharp(imageBuffer).metadata()
    const w = meta.width || A4_WIDTH_PX
    const h = meta.height || A4_HEIGHT_PX
    const fs = Math.round(Math.min(w, h) * 0.045)
    const dx = Math.round(fs * 10)
    const dy = Math.round(fs * 6)
    let tiles = ''
    let row = 0
    for (let y = 0; y < h + dy; y += dy, row++) {
      const offset = (row % 2) * Math.round(dx / 2) // brick-offset alternate rows
      for (let x = -dx; x < w + dx; x += dx) {
        const px = x + offset
        // 13% grey: clearly visible as branding on the free sheet, still light
        // enough for a child to colour straight over it.
        tiles +=
          `<text x="${px}" y="${y}" font-family="Helvetica,Arial,sans-serif" font-size="${fs}" ` +
          `font-weight="700" fill="#000000" fill-opacity="0.13" ` +
          `transform="rotate(-30 ${px} ${y})">${WATERMARK_TEXT}</text>`
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${tiles}</svg>`
    return await sharp(imageBuffer).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer()
  } catch {
    return imageBuffer // never block a sheet over the watermark
  }
}

/**
 * Resize an image buffer to fit A4 at 300 DPI, maintaining aspect ratio.
 * Returns a PNG buffer sized to fit within the printable area.
 */
export async function resizeToA4(
  imageBuffer: Buffer,
  landscape: boolean = false
): Promise<Buffer> {
  const targetW = landscape ? A4_HEIGHT_PX : A4_WIDTH_PX
  const targetH = landscape ? A4_WIDTH_PX : A4_HEIGHT_PX

  // Leave 10mm margins on each side → subtract ~118px per side at 300 DPI
  const marginPx = Math.round((10 / 25.4) * 300) // 10mm in pixels at 300 DPI ≈ 118
  const maxW = targetW - marginPx * 2
  const maxH = targetH - marginPx * 2

  return sharp(imageBuffer)
    .resize(maxW, maxH, { fit: 'inside', withoutEnlargement: false })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer()
}

/**
 * Generate a high-quality A4 PDF from an image buffer.
 */
export async function renderA4Pdf(
  imageBuffer: Buffer,
  options: PdfRenderOptions = {}
): Promise<Buffer> {
  const { watermark = false, footer = true, landscape = false } = options

  const pageWidth = landscape ? A4_HEIGHT_PT : A4_WIDTH_PT
  const pageHeight = landscape ? A4_WIDTH_PT : A4_HEIGHT_PT

  // Resize image to fit A4
  const resizedPng = await resizeToA4(imageBuffer, landscape)
  const resizedMeta = await sharp(resizedPng).metadata()
  const imgW = resizedMeta.width || 0
  const imgH = resizedMeta.height || 0

  // Create PDF
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([pageWidth, pageHeight])

  // Embed the image
  const pngImage = await pdfDoc.embedPng(resizedPng)

  // Calculate position to center the image with margins
  const printableW = pageWidth - MARGIN_PT * 2
  const printableH = pageHeight - MARGIN_PT * 2

  // Scale image to fit printable area (points, not pixels)
  const scaleX = printableW / imgW
  const scaleY = printableH / imgH
  const scale = Math.min(scaleX, scaleY)

  const drawW = imgW * scale
  const drawH = imgH * scale

  // Center in printable area
  const x = MARGIN_PT + (printableW - drawW) / 2
  const y = MARGIN_PT + (printableH - drawH) / 2

  page.drawImage(pngImage, {
    x,
    y,
    width: drawW,
    height: drawH,
  })

  // Add watermark if requested (free tier)
  if (watermark) {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontSize = 60

    // Draw diagonal watermark
    page.pushOperators()

    // Semi-transparent grey
    const opacity = 0.08

    // Multiple watermarks across the page
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const wx = pageWidth * 0.1 + col * (pageWidth * 0.45)
        const wy = pageHeight * 0.2 + row * (pageHeight * 0.3)

        page.drawText(WATERMARK_TEXT, {
          x: wx,
          y: wy,
          size: fontSize,
          font,
          color: rgb(0.7, 0.7, 0.7),
          opacity,
          rotate: degrees(-35),
        })
      }
    }
  }

  // Add footer if requested
  if (footer) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontSize = 8
    const textWidth = font.widthOfTextAtSize(FOOTER_TEXT, fontSize)

    page.drawText(FOOTER_TEXT, {
      x: pageWidth / 2 - textWidth / 2,
      y: 12,
      size: fontSize,
      font,
      color: rgb(0.75, 0.75, 0.75),
    })
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

/**
 * Combine several full-page images into ONE multi-page A4 PDF (one image per
 * page). Used for activity packs. Footer/no-branding applies to every page.
 */
export async function renderMultiPagePdf(
  imageBuffers: Buffer[],
  options: PdfRenderOptions = {}
): Promise<Buffer> {
  const { footer = true, landscape = false } = options
  const pageWidth = landscape ? A4_HEIGHT_PT : A4_WIDTH_PT
  const pageHeight = landscape ? A4_WIDTH_PT : A4_HEIGHT_PT
  const pdfDoc = await PDFDocument.create()
  const font = footer ? await pdfDoc.embedFont(StandardFonts.Helvetica) : null

  for (const imageBuffer of imageBuffers) {
    const resizedPng = await resizeToA4(imageBuffer, landscape)
    const meta = await sharp(resizedPng).metadata()
    const imgW = meta.width || 0
    const imgH = meta.height || 0
    const page = pdfDoc.addPage([pageWidth, pageHeight])
    const pngImage = await pdfDoc.embedPng(resizedPng)
    const printableW = pageWidth - MARGIN_PT * 2
    const printableH = pageHeight - MARGIN_PT * 2
    const scale = Math.min(printableW / imgW, printableH / imgH)
    const drawW = imgW * scale
    const drawH = imgH * scale
    page.drawImage(pngImage, {
      x: MARGIN_PT + (printableW - drawW) / 2,
      y: MARGIN_PT + (printableH - drawH) / 2,
      width: drawW,
      height: drawH,
    })
    if (footer && font) {
      const size = 8
      const tw = font.widthOfTextAtSize(FOOTER_TEXT, size)
      page.drawText(FOOTER_TEXT, { x: pageWidth / 2 - tw / 2, y: 12, size, font, color: rgb(0.75, 0.75, 0.75) })
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

/**
 * Generate A4 PNG preview (lower resolution for web display).
 */
export async function renderA4Preview(
  imageBuffer: Buffer,
  landscape: boolean = false,
  opts: { footer?: boolean; hd?: boolean } = {}
): Promise<Buffer> {
  const { footer = false, hd = false } = opts
  // Pro downloads are full 300-DPI (2480×3508); free previews are half-res.
  const targetW = hd ? (landscape ? A4_HEIGHT_PX : A4_WIDTH_PX) : (landscape ? 1754 : 1240)
  const targetH = hd ? (landscape ? A4_WIDTH_PX : A4_HEIGHT_PX) : (landscape ? 1240 : 1754)

  let img = sharp(imageBuffer)
    .resize(targetW, targetH, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })

  // Free downloads carry a small centred colour.page footer credit baked into
  // the bitmap (so it's present on the PNG download too, not just the PDF).
  // Pro downloads have no branding.
  if (footer) {
    // `fit: 'inside'` means the resized image is at most targetW×targetH but is
    // usually SMALLER in one axis — a tall/narrow photo ends up narrower than
    // targetW. The footer overlay must match the ACTUAL base width, not targetW,
    // or sharp throws "Image to composite must have same dimensions or smaller"
    // (the crash tall photos hit). Size the label to the real base dimensions.
    const base = await img.png().toBuffer()
    const bMeta = await sharp(base).metadata()
    const bw = bMeta.width || targetW
    const bh = bMeta.height || targetH
    const fh = Math.max(9, Math.round(bh * 0.011))
    const label = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${fh * 2}">` +
      `<text x="${bw / 2}" y="${fh * 1.3}" font-family="sans-serif" font-size="${fh}" fill="#bfbfbf" text-anchor="middle">${FOOTER_TEXT}</text></svg>`
    )
    img = sharp(base).composite([{ input: label, gravity: 'south' }])
  }

  return img.png().toBuffer()
}

/**
 * Generate an A4 PDF from a print page source image (for admin uploads).
 */
export async function generatePrintPagePdf(
  sourceImageBuffer: Buffer
): Promise<{ pdf: Buffer; preview: Buffer }> {
  const pdf = await renderA4Pdf(sourceImageBuffer, {
    watermark: false,
    footer: true,
    landscape: false,
  })

  const preview = await renderA4Preview(sourceImageBuffer, false)

  return { pdf, preview }
}
