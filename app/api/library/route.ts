import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ pages: [] })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: pages, error } = await supabase
      .from('coloring_library')
      .select('id, title, category, image_path, downloads')
      .eq('is_published', true)
      .order('downloads', { ascending: false })
      .limit(50)

    if (error || !pages || pages.length === 0) {
      return NextResponse.json({ pages: [] })
    }

    // Generate signed URLs
    const pagesWithUrls = await Promise.all(
      pages.map(async (page) => {
        if (!page.image_path) return null
        
        const { data } = await supabase.storage
          .from('images')
          .createSignedUrl(page.image_path, 3600)
        
        return {
          id: page.id,
          title: page.title,
          category: page.category,
          image_url: data?.signedUrl || '',
          downloads: page.downloads || 0
        }
      })
    )

    return NextResponse.json({ 
      pages: pagesWithUrls.filter(p => p && p.image_url) 
    })
  } catch (error) {
    console.error('Library API error:', error)
    return NextResponse.json({ pages: [] })
  }
}
