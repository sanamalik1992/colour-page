import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/print-pages/download
 * Tracks a download and returns a signed URL for the PDF.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { pageId } = await request.json()

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    // Increment download count
    const { data: current } = await supabase
      .from('print_pages')
      .select('download_count, pdf_storage_path, title')
      .eq('id', pageId)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 })
    }

    // Increment
    await supabase
      .from('print_pages')
      .update({ download_count: (current.download_count || 0) + 1 })
      .eq('id', pageId)

    if (!current.pdf_storage_path) {
      return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
    }

    const { data } = await supabase.storage
      .from('print-pages')
      .createSignedUrl(current.pdf_storage_path, 3600)

    return NextResponse.json({
      url: data?.signedUrl,
      filename: `${current.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'colouring-page'}.pdf`,
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
