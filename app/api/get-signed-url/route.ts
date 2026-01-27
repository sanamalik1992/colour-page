import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'Path required' }, { status: 400 })
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const { data } = await supabase.storage.from('images').createSignedUrl(path, 3600)
  if (data?.signedUrl) {
    return NextResponse.json({ url: data.signedUrl })
  }
  
  const { data: data2 } = await supabase.storage.from('uploads').createSignedUrl(path, 3600)
  if (data2?.signedUrl) {
    return NextResponse.json({ url: data2.signedUrl })
  }
  
  return NextResponse.json({ error: 'Could not get signed URL' }, { status: 404 })
}
