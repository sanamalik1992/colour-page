import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  const userId = request.nextUrl.searchParams.get('userId')

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
  }

  const { data: job, error } = await supabase
    .from('dot_jobs')
    .select('id, status, progress, error, output_pdf_path, output_png_path, settings, created_at')
    .eq('id', jobId)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Generate signed URLs for outputs if done
  let pdfUrl: string | undefined
  let pngUrl: string | undefined

  if (job.status === 'done') {
    if (job.output_pdf_path) {
      const { data: s1 } = await supabase.storage
        .from('outputs')
        .createSignedUrl(job.output_pdf_path, 3600)
      if (s1?.signedUrl) pdfUrl = s1.signedUrl
      else {
        const { data: s2 } = await supabase.storage
          .from('images')
          .createSignedUrl(job.output_pdf_path, 3600)
        pdfUrl = s2?.signedUrl
      }
    }

    if (job.output_png_path) {
      const { data: s1 } = await supabase.storage
        .from('outputs')
        .createSignedUrl(job.output_png_path, 3600)
      if (s1?.signedUrl) pngUrl = s1.signedUrl
      else {
        const { data: s2 } = await supabase.storage
          .from('images')
          .createSignedUrl(job.output_png_path, 3600)
        pngUrl = s2?.signedUrl
      }
    }
  }

  return NextResponse.json({
    job: {
      ...job,
      pdfUrl,
      pngUrl,
    },
  })
}
