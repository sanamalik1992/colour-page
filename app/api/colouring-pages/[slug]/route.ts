import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const { data: page, error } = await supabase
    .from('colouring_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  // Get signed URL for preview
  let previewUrl = null
  if (page.preview_path) {
    const { data } = await supabase.storage
      .from('colouring-pages')
      .createSignedUrl(page.preview_path, 3600)
    previewUrl = data?.signedUrl
  }

  // Get related pages
  const { data: related } = await supabase
    .from('colouring_pages')
    .select('id, title, slug, preview_path, category')
    .eq('category', page.category)
    .neq('id', page.id)
    .eq('is_published', true)
    .limit(6)

  const relatedWithUrls = await Promise.all(
    (related || []).map(async (r) => {
      if (!r.preview_path) return { ...r, preview_url: null }
      const { data } = await supabase.storage
        .from('colouring-pages')
        .createSignedUrl(r.preview_path, 3600)
      return { ...r, preview_url: data?.signedUrl }
    })
  )

  return NextResponse.json({
    page: { ...page, preview_url: previewUrl },
    related: relatedWithUrls
  })
}
