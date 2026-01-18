import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const sessionId = searchParams.get('sessionId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch job with session validation
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Validate session ownership
    if (job.session_id && job.session_id !== sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Generate signed URLs if job is completed
    let signedPreviewUrl: string | undefined
    let signedResultUrl: string | undefined

    if (job.status === 'completed') {
      if (job.preview_url) {
        const { data: previewData } = await supabase.storage
          .from('images')
          .createSignedUrl(job.preview_url, 3600) // 1 hour
        
        signedPreviewUrl = previewData?.signedUrl
      }

      if (job.result_url) {
        const { data: resultData } = await supabase.storage
          .from('images')
          .createSignedUrl(job.result_url, 3600)
        
        signedResultUrl = resultData?.signedUrl
      }
    }

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress || 0,
        uploadPath: job.upload_path,
        originalFilename: job.original_filename,
        complexity: job.complexity,
        instructions: job.instructions,
        customText: job.custom_text,
        addTextOverlay: job.add_text_overlay,
        previewUrl: job.preview_url,
        resultUrl: job.result_url,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at,
        errorMessage: job.error_message
      },
      signedPreviewUrl,
      signedResultUrl
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}