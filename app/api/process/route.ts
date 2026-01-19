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

    console.log('Starting AI coloring page generation for job:', jobId)
    
    await supabase
      .from('jobs')
      .update({ 
        status: 'processing',
        progress: 10,
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

    await updateJobProgress(supabase, jobId, 20)

    console.log('Calling Replicate AI to generate coloring page...')

    // Use Replicate's image-to-sketch model
    const output = await replicate.run(
      "tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
      {
        input: {
          img: signedUpload.signedUrl,
          version: "v1.4",
          scale: 2
        }
      }
    )

    console.log('Replicate AI completed, processing output...')
    await updateJobProgress(supabase, jobId, 70)

    // Extract image URL from output
    let imageUrl: string | undefined

    if (typeof output === 'string') {
      imageUrl = output
    } else if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0] as string
    } else if (output && typeof output === 'object' && 'output' in output) {
      const outputObj = output as { output: string | string[] }
      imageUrl = Array.isArray(outputObj.output) ? outputObj.output[0] : outputObj.output
    }

    if (!imageUrl) {
      console.error('Replicate output:', JSON.stringify(output))
      throw new Error('No output from AI model')
    }

    console.log('Downloading generated image from:', imageUrl)
    await updateJobProgress(supabase, jobId, 80)

    // Download the AI-generated image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`)
    }

    const imageBlob = await imageResponse.blob()
    const imageBuffer = await imageBlob.arrayBuffer()

    await updateJobProgress(supabase, jobId, 90)

    // Upload result to storage
    const resultFileName = `results/${nanoid()}.png`
    
    console.log('Uploading AI result to storage:', resultFileName)
    
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