import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'
import type { SupabaseClient } from '@supabase/supabase-js'

async function updateJobProgress(
  supabase: SupabaseClient, 
  jobId: string, 
  progress: number, 
  status?: string
) {
  await supabase
    .from('jobs')
    .update({ 
      progress,
      ...(status && { status }),
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
}

export async function POST(request: NextRequest) {
  let jobId: string | null = null
  
  try {
    const body = await request.json()
    jobId = body.jobId

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      )
    }

    console.log('Processing job:', jobId)
    const supabase = createServiceClient()

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('Job not found:', jobError)
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    console.log('Starting processing for job:', jobId)
    
    await supabase
      .from('jobs')
      .update({ 
        status: 'processing',
        progress: 5,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Simulate progress
    await updateJobProgress(supabase, jobId, 20)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await updateJobProgress(supabase, jobId, 40)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await updateJobProgress(supabase, jobId, 60)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await updateJobProgress(supabase, jobId, 80)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Generate result filename
    const resultFileName = `results/${nanoid()}.png`
    
    console.log('Copying image to results...')
    
    // For now, just copy the uploaded image to results
    // Later we'll replace this with real AI processing
    const { error: copyError } = await supabase.storage
      .from('images')
      .copy(job.upload_path, resultFileName)

    if (copyError) {
      console.error('Copy error:', copyError)
      throw new Error(`Failed to save result: ${copyError.message}`)
    }

    console.log('Result saved:', resultFileName)
    
    await updateJobProgress(supabase, jobId, 95)

    // Update job as completed
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        progress: 100,
        result_url: resultFileName,
        preview_url: resultFileName,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    console.log('Job completed successfully:', jobId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Processing error:', error)
    
    if (jobId) {
      const supabase = createServiceClient()
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    )
  }
}

export const maxDuration = 300