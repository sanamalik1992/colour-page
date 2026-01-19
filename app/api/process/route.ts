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

    // Get signed URL for uploaded image
    const { data: signedUpload } = await supabase.storage
      .from('images')
      .createSignedUrl(job.upload_path, 3600)

    if (!signedUpload) {
      throw new Error('Failed to get upload URL')
    }

    await updateJobProgress(supabase, jobId, 15)

    console.log('Calling Replicate API for image-to-sketch conversion...')

    // Use sketch model for coloring pages
    const output = await replicate.run(
      "jagilley/controlnet-scribble:435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488595a2de23e143fdb0117",
      {
        input: {
          image: signedUpload.signedUrl,
          prompt: job.complexity === 'detailed' 
            ? "detailed black and white line art coloring page, intricate patterns, many fine lines, suitable for adult coloring books"
            : "simple black and white line art coloring page, bold clear outlines, suitable for children",
          a_prompt: "best quality, extremely detailed, clean black lines, white background, high contrast, coloring book style",
          n_prompt: "color, shading, gradient, blurry, lowres, bad quality, watermark, photograph, realistic",
          num_samples: "1",
          image_resolution: "768",
          detect_resolution: "768",
          ddim_steps: 20,
          guess_mode: false,
          strength: 1.5,
          scale: 9.0,
          eta: 0.0
        }
      }
    )

    console.log('Replicate response received')
    await updateJobProgress(supabase, jobId, 70)

    // Get the output image URL
    let imageUrl: string | undefined

    if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0] as string
    } else if (typeof output === 'string') {
      imageUrl = output
    } else if (output && typeof output === 'object' && 'output' in output) {
      const outputObj = output as { output: string | string[] }
      imageUrl = Array.isArray(outputObj.output) ? outputObj.output[0] : outputObj.output
    }

    if (!imageUrl) {
      console.error('Replicate output:', JSON.stringify(output))
      throw new Error('No output URL from AI model')
    }

    console.log('Downloading generated image from:', imageUrl)
    await updateJobProgress(supabase, jobId, 80)

    // Download the generated image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`)
    }

    const imageBlob = await imageResponse.blob()
    const imageBuffer = await imageBlob.arrayBuffer()

    await updateJobProgress(supabase, jobId, 90)

    // Upload result to storage
    const resultFileName = `results/${nanoid()}.png`
    
    console.log('Uploading result to storage:', resultFileName)
    
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(resultFileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to save result: ${uploadError.message}`)
    }

    console.log('Result saved successfully')
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