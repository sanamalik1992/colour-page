/**
 * A4 PDF Renderer
 *
 * Creates print-ready A4 PDFs at 300 DPI with configurable margins,
 * optional watermark, and optional footer branding.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
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
    const textWidth = font.widthOfTextAtSize(WATERMARK_TEXT, fontSize)

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
          rotate: { type: 'degrees' as const, angle: -35 },
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
 * Generate A4 PNG preview (lower resolution for web display).
 */
export async function renderA4Preview(
  imageBuffer: Buffer,
  landscape: boolean = false
): Promise<Buffer> {
  // Preview at half resolution (1240 x 1754)
  const targetW = landscape ? 1754 : 1240
  const targetH = landscape ? 1240 : 1754

  return sharp(imageBuffer)
    .resize(targetW, targetH, { fit: 'inside', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer()
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
