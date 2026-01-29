import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const sort = searchParams.get('sort') || 'trending' // trending, newest, popular

  let query = supabase
    .from('colouring_pages')
    .select('id, title, slug, description, category, tags, preview_path, download_count, trend_score, created_at')
    .eq('is_published', true)

  if (category && category !== 'All') {
    query = query.eq('category', category)
  }

  // Sorting
  switch (sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'popular':
      query = query.order('download_count', { ascending: false })
      break
    case 'trending':
    default:
      query = query.order('trend_score', { ascending: false }).order('created_at', { ascending: false })
  }

  const { data: pages, error, count } = await query
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate signed URLs for previews
  const pagesWithUrls = await Promise.all(
    (pages || []).map(async (page) => {
      if (!page.preview_path) return { ...page, preview_url: null }
      
      const { data } = await supabase.storage
        .from('colouring-pages')
        .createSignedUrl(page.preview_path, 3600)
      
      return { ...page, preview_url: data?.signedUrl }
    })
  )

  return NextResponse.json({
    pages: pagesWithUrls,
    total: count,
    hasMore: (offset + limit) < (count || 0)
  })
}
