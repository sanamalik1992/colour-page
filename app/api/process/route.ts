import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import sharp from 'sharp'
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

    console.log('Starting coloring page generation for job:', jobId)
    
    await supabase
      .from('jobs')
      .update({ 
        status: 'processing',
        progress: 10,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Download the original image
    console.log('Downloading original image...')
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('images')
      .download(job.upload_path)

    if (downloadError || !imageData) {
      throw new Error('Failed to download image')
    }

    await updateJobProgress(supabase, jobId, 25)

    // Convert to buffer
    const buffer = await imageData.arrayBuffer()
    console.log('Image downloaded, size:', buffer.byteLength)

    await updateJobProgress(supabase, jobId, 40)

    // A4 dimensions at 300 DPI: 2480 x 3508 pixels
    const A4_WIDTH = 2480
    const A4_HEIGHT = 3508

    console.log('Converting to coloring page...')
    
    // Create coloring page based on complexity
    let processedBuffer: Buffer

    if (job.complexity === 'detailed') {
      // Detailed version - more edges, finer lines
      processedBuffer = await sharp(Buffer.from(buffer))
        .resize(A4_WIDTH, A4_HEIGHT, { fit: 'inside', background: { r: 255, g: 255, b: 255 } })
        .greyscale()
        .normalize()
        .sharpen()
        .modulate({ brightness: 1.1, saturation: 0 })
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .threshold(100)
        .negate()
        .png({ quality: 100, compressionLevel: 9 })
        .toBuffer()
    } else {
      // Simple version - bold, clear outlines
      processedBuffer = await sharp(Buffer.from(buffer))
        .resize(A4_WIDTH, A4_HEIGHT, { fit: 'inside', background: { r: 255, g: 255, b: 255 } })
        .greyscale()
        .normalize()
        .blur(1)
        .modulate({ brightness: 1.2 })
        .convolve({
          width: 3,
          height: 3,
          kernel: [-2, -2, -2, -2, 16, -2, -2, -2, -2]
        })
        .threshold(150)
        .negate()
        .png({ quality: 100, compressionLevel: 9 })
        .toBuffer()
    }

    console.log('Coloring page created, size:', processedBuffer.length)
    await updateJobProgress(supabase, jobId, 80)

    // Upload result
    const resultFileName = `results/${nanoid()}.png`
    
    console.log('Uploading result to storage:', resultFileName)
    
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(resultFileName, processedBuffer, {
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

export const maxDuration = 60 // 1 minute is plenty for Sharp