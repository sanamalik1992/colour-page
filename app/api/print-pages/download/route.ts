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
    await supabase.rpc('increment_print_page_downloads', { page_id: pageId }).catch(() => {
      // Fallback: manual increment if RPC doesn't exist
      supabase
        .from('print_pages')
        .update({ download_count: supabase.rpc('', {}) as unknown as number })
        .eq('id', pageId)
    })

    // Simple increment via raw SQL fallback
    await supabase
      .from('print_pages')
      .select('download_count')
      .eq('id', pageId)
      .single()
      .then(async ({ data }) => {
        if (data) {
          await supabase
            .from('print_pages')
            .update({ download_count: (data.download_count || 0) + 1 })
            .eq('id', pageId)
        }
      })

    // Get the page and generate a signed URL
    const { data: page } = await supabase
      .from('print_pages')
      .select('pdf_storage_path, title')
      .eq('id', pageId)
      .single()

    if (!page?.pdf_storage_path) {
      return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
    }

    const { data } = await supabase.storage
      .from('print-pages')
      .createSignedUrl(page.pdf_storage_path, 3600)

    return NextResponse.json({
      url: data?.signedUrl,
      filename: `${page.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'colouring-page'}.pdf`,
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
