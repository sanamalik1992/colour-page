import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/print-pages – Browse published print pages.
 *
 * Query params:
 *   category, season, search, sort (featured|newest|popular), limit, offset, featured (bool)
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const season = searchParams.get('season')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'featured'
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')
  const featuredOnly = searchParams.get('featured') === 'true'

  let query = supabase
    .from('print_pages')
    .select(
      'id, title, slug, description, category, tags, season, age_range, preview_png_path, pdf_storage_path, featured, download_count, view_count, created_at',
      { count: 'exact' }
    )
    .eq('is_published', true)

  if (category && category !== 'All') {
    query = query.eq('category', category)
  }

  if (season) {
    query = query.eq('season', season)
  }

  if (featuredOnly) {
    query = query.eq('featured', true)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,category.ilike.%${search}%`)
  }

  // Sorting
  switch (sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'popular':
      query = query.order('download_count', { ascending: false })
      break
    case 'featured':
    default:
      query = query
        .order('featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
  }

  const { data: pages, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate signed URLs for previews (try print-pages bucket, then images bucket)
  async function getSignedUrl(path: string): Promise<string | undefined> {
    const { data: d1 } = await supabase.storage.from('print-pages').createSignedUrl(path, 3600)
    if (d1?.signedUrl) return d1.signedUrl
    const { data: d2 } = await supabase.storage.from('images').createSignedUrl(path, 3600)
    return d2?.signedUrl
  }

  const pagesWithUrls = await Promise.all(
    (pages || []).map(async (page) => {
      const preview_url = page.preview_png_path ? await getSignedUrl(page.preview_png_path) : undefined
      const pdf_url = page.pdf_storage_path ? await getSignedUrl(page.pdf_storage_path) : undefined
      return { ...page, preview_url, pdf_url }
    })
  )

  // Determine current season for "Seasonal Now"
  const now = new Date()
  const month = now.getMonth() + 1
  let currentSeason: string | null = null
  if (month >= 3 && month <= 5) currentSeason = 'spring'
  else if (month >= 6 && month <= 8) currentSeason = 'summer'
  else if (month >= 9 && month <= 11) currentSeason = 'autumn'
  else currentSeason = 'winter'

  return NextResponse.json({
    pages: pagesWithUrls,
    total: count || 0,
    hasMore: (offset + limit) < (count || 0),
    currentSeason,
  })
}
