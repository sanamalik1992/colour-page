import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const { data: page } = await supabase
    .from('colouring_pages')
    .select('id, download_count')
    .eq('slug', slug)
    .single()

  if (page) {
    await supabase
      .from('colouring_pages')
      .update({ download_count: (page.download_count || 0) + 1 })
      .eq('slug', slug)
  }

  return NextResponse.json({ success: true })
}
