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

    console.log('Starting AI coloring page generation')
    
    await supabase
      .from('jobs')
      .update({ 
        status: 'processing',
        progress: 10,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    const { data: signedUpload } = await supabase.storage
      .from('images')
      .createSignedUrl(job.upload_path, 3600)

    if (!signedUpload) {
      throw new Error('Failed to get upload URL')
    }

    await updateJobProgress(supabase, jobId, 20)

    console.log('Calling Replicate AI - Image to Line Art...')

    const prompt = job.complexity === 'detailed'
      ? "detailed black and white line drawing, coloring book style, intricate outlines, many fine details, suitable for adult coloring"
      : "simple black and white line drawing, coloring book style for children, bold clear outlines, minimal details"

    const output = await replicate.run(
      "jagilley/controlnet-scribble:435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488595a2de23e143fdb0117",
      {
        input: {
          image: signedUpload.signedUrl,
          prompt: prompt,
          a_prompt: "best quality, extremely detailed, perfect lines, black lines on white background, high contrast",
          n_prompt: "color, colored, shading, gradient, blurry, photograph, realistic, filled areas, gray",
          num_samples: "1",
          image_resolution: "768",
          detect_resolution: "768",
          ddim_steps: 20,
          guess_mode: false,
          strength: 1.5,
          scale: 9.0,
          seed: -1,
          eta: 0.0
        }
      }
    )

    console.log('AI processing complete')
    console.log('Output type:', typeof output)
    console.log('Output:', output)
    
    await updateJobProgress(supabase, jobId, 70)

    let imageUrl: string | undefined

if (typeof output === 'string') {
  imageUrl = output
} else if (Array.isArray(output)) {
  if (output.length > 0) {
    imageUrl = typeof output[0] === 'string' ? output[0] : undefined
  }
} else if (output && typeof output === 'object') {
  const outputObj = output as Record<string, unknown>
  
  if ('output' in outputObj) {
    const out = outputObj.output
    if (typeof out === 'string') {
      imageUrl = out
    } else if (Array.isArray(out) && out.length > 0 && typeof out[0] === 'string') {
      imageUrl = out[0]
    }
  } else if ('url' in outputObj && typeof outputObj.url === 'string') {
    imageUrl = outputObj.url
  } else if ('image' in outputObj && typeof outputObj.image === 'string') {
    imageUrl = outputObj.image
  }
}

    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('Failed to extract image URL from output:', JSON.stringify(output, null, 2))
      throw new Error('No valid image URL in AI output')
    }

    console.log('Downloading AI-generated image from:', imageUrl)
    await updateJobProgress(supabase, jobId, 80)

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download AI image: ${imageResponse.status} ${imageResponse.statusText}`)
    }

    const imageBlob = await imageResponse.blob()
    const imageBuffer = await imageBlob.arrayBuffer()

    console.log('Downloaded image size:', imageBuffer.byteLength, 'bytes')
    await updateJobProgress(supabase, jobId, 90)

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