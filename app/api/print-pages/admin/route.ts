import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin'
import { generatePrintPagePdf } from '@/lib/pdf-renderer'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/print-pages/admin – List all print pages (including unpublished) for admin.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')

  if (!(await isAdmin(email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data: pages, error } = await supabase
    .from('print_pages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pages })
}

/**
 * POST /api/print-pages/admin – Upload a new print page.
 *
 * Form fields: file (image), title, category, tags (comma-sep), season,
 *              featured (bool), age_range, description, email (for admin check)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const email = formData.get('email') as string

    if (!(await isAdmin(email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const tagsRaw = (formData.get('tags') as string) || ''
    const season = (formData.get('season') as string) || null
    const featured = formData.get('featured') === 'true'
    const ageRange = (formData.get('age_range') as string) || '3-12'
    const description = (formData.get('description') as string) || ''

    if (!file || !title || !category) {
      return NextResponse.json({ error: 'File, title, and category are required' }, { status: 400 })
    }

    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36)

    const pageId = crypto.randomUUID()
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'

    // Upload source image
    const sourcePath = `sources/${pageId}.${ext}`
    await supabase.storage
      .from('print-pages')
      .upload(sourcePath, fileBuffer, { contentType: file.type, upsert: true })

    // Generate A4 PDF and preview
    const { pdf, preview } = await generatePrintPagePdf(fileBuffer)

    const pdfPath = `pdfs/${pageId}.pdf`
    const previewPath = `previews/${pageId}.png`

    await Promise.all([
      supabase.storage
        .from('print-pages')
        .upload(pdfPath, pdf, { contentType: 'application/pdf', upsert: true }),
      supabase.storage
        .from('print-pages')
        .upload(previewPath, preview, { contentType: 'image/png', upsert: true }),
    ])

    // Insert record
    const { data, error } = await supabase.from('print_pages').insert({
      id: pageId,
      title,
      slug,
      description,
      category,
      tags,
      season,
      age_range: ageRange,
      source_storage_path: sourcePath,
      pdf_storage_path: pdfPath,
      preview_png_path: previewPath,
      featured,
      is_published: false, // Draft by default
    }).select().single()

    if (error) throw error

    return NextResponse.json({ page: data })
  } catch (error) {
    console.error('Admin upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/print-pages/admin – Update a print page (publish, feature, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, pageId, ...updates } = body

    if (!(await isAdmin(email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    // Only allow safe fields
    const allowedFields = ['title', 'description', 'category', 'tags', 'season', 'age_range', 'featured', 'is_published', 'sort_order']
    const safeUpdates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key]
      }
    }

    // Set published_at when publishing
    if (safeUpdates.is_published === true) {
      safeUpdates.published_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('print_pages')
      .update(safeUpdates)
      .eq('id', pageId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ page: data })
  } catch (error) {
    console.error('Admin update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/print-pages/admin – Delete a print page.
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, pageId } = body

    if (!(await isAdmin(email))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    // Get paths for cleanup
    const { data: page } = await supabase
      .from('print_pages')
      .select('source_storage_path, pdf_storage_path, preview_png_path')
      .eq('id', pageId)
      .single()

    // Delete storage files
    if (page) {
      const paths = [page.source_storage_path, page.pdf_storage_path, page.preview_png_path].filter(Boolean) as string[]
      if (paths.length > 0) {
        await supabase.storage.from('print-pages').remove(paths)
      }
    }

    // Delete record
    await supabase.from('print_pages').delete().eq('id', pageId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin delete error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}
