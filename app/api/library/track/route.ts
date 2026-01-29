import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Increment downloads
    const { data: page } = await supabase
      .from('coloring_library')
      .select('downloads')
      .eq('id', id)
      .single()

    if (page) {
      await supabase
        .from('coloring_library')
        .update({ downloads: (page.downloads || 0) + 1 })
        .eq('id', id)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
