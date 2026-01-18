import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Replicate from 'replicate'
import { nanoid } from 'nanoid'
import type { SupabaseClient } from '@supabase/supabase-js'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

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

    const supabase = createServiceClient()

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    await supabase
      .from('jobs')
      .update({ 
        status: 'processing',
        progress: 5,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    const { data: signedUpload } = await supabase.storage
      .from('images')
      .createSignedUrl(job.upload_path, 3600)

    if (!signedUpload) {
      throw new Error('Failed to get upload URL')
    }

    await updateJobProgress(supabase, jobId, 15)

    await updateJobProgress(supabase, jobId, 30)

    console.log('Starting AI generation...')
    
    const output = await replicate.run(
      "jagilley/controlnet-scribble:435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488595a2de23e143fdb0117",
      {
        input: {
          image: signedUpload.signedUrl,
          prompt: "coloring book page, black and white line art, simple outlines, no shading, high contrast",
          a_prompt: "best quality, extremely detailed, clean lines, black outlines, white background",
          n_prompt: "color, shading, gradient, blurry, lowres, bad quality, watermark",
          num_samples: "1",
          image_resolution: "512",
          detect_resolution: "512",
          ddim_steps: 20,
          guess_mode: false,
          strength: 1.0,
          scale: 9.0,
          eta: 0.0
        }
      }
    )

    await updateJobProgress(supabase, jobId, 80)

    const imageUrl = Array.isArray(output) ? output[0] : output
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('No output from AI model')
    }

    console.log('Downloading generated image...')
    const imageResponse = await fetch(imageUrl)
    const imageBlob = await imageResponse.blob()
    const imageBuffer = await imageBlob.arrayBuffer()

    await updateJobProgress(supabase, jobId, 90)

    const resultFileName = `results/${nanoid()}.png`
    
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(resultFileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to save result: ${uploadError.message}`)
    }

    await updateJobProgress(supabase, jobId, 95)

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