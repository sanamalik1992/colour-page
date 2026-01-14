import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type RouteContext = {
  params: { id: string }
}

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const jobId = params.id

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing job id' },
        { status: 400 }
      )
    }

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select(
        'id,status,complexity,instructions,custom_text,upload_path,preview_url,result_url,is_paid,created_at,updated_at,completed_at'
      )
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
