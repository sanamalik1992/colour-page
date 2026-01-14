import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    let previewSignedUrl: string | null = null
    let resultSignedUrl: string | null = null

    if (job.preview_url) {
      const { data } = await supabaseAdmin.storage
        .from('uploads')
        .createSignedUrl(job.preview_url, 3600)
      previewSignedUrl = data?.signedUrl || null
    }

    if (job.result_url) {
      const { data } = await supabaseAdmin.storage
        .from('results')
        .createSignedUrl(job.result_url, 3600)
      resultSignedUrl = data?.signedUrl || null
    }

    return NextResponse.json(
      {
        job,
        preview_signed_url: previewSignedUrl,
        result_signed_url: resultSignedUrl,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Job fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
