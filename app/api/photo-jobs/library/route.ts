import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/photo-jobs/library?sessionId=xxx
 * Returns all completed photo jobs for a user's library.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  }

  const { data: jobs, error } = await supabase
    .from('photo_jobs')
    .select('id, status, progress, settings, is_pro, is_watermarked, output_pdf_path, output_png_path, created_at, completed_at, original_filename')
    .eq('user_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate signed URLs for completed jobs
  const jobsWithUrls = await Promise.all(
    (jobs || []).map(async (job) => {
      let pdfUrl: string | undefined
      let pngUrl: string | undefined

      if (job.status === 'done' && job.output_png_path) {
        const { data } = await supabase.storage
          .from('outputs')
          .createSignedUrl(job.output_png_path, 3600)
        if (data?.signedUrl) {
          pngUrl = data.signedUrl
        } else {
          const { data: fallback } = await supabase.storage
            .from('images')
            .createSignedUrl(job.output_png_path, 3600)
          pngUrl = fallback?.signedUrl
        }
      }

      if (job.status === 'done' && job.output_pdf_path) {
        const { data } = await supabase.storage
          .from('outputs')
          .createSignedUrl(job.output_pdf_path, 3600)
        if (data?.signedUrl) {
          pdfUrl = data.signedUrl
        } else {
          const { data: fallback } = await supabase.storage
            .from('images')
            .createSignedUrl(job.output_pdf_path, 3600)
          pdfUrl = fallback?.signedUrl
        }
      }

      return {
        ...job,
        pdfUrl,
        pngUrl,
      }
    })
  )

  return NextResponse.json({ jobs: jobsWithUrls })
}
