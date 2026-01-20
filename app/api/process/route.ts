import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Replicate from 'replicate'
import sharp from 'sharp'
import { nanoid } from 'nanoid'
import type { SupabaseClient } from '@supabase/supabase-js'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

const A4_WIDTH = 2480
const A4_HEIGHT = 3508
const MARGIN = 120

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

async function cleanupAndFormatColoringPage(inputBuffer: Buffer): Promise<Buffer> {
  console.log('Post-processing: cleaning up coloring page...')

  // Convert to greyscale
  let processed = await sharp(inputBuffer)
    .greyscale()
    .normalize()
    .toBuffer()

  // Remove noise
  processed = await sharp(processed)
    .median(2)
    .toBuffer()

  // Increase line thickness
  const dilationKernel = {
    width: 3,
    height: 3,
    kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
    scale: 1,
    offset: 0
  }

  processed = await sharp(processed)
    .convolve(dilationKernel)
    .toBuffer()

  // Hard threshold to pure black/white
  processed = await sharp(processed)
    .threshold(130, { greyscale: false })
    .toBuffer()

  // Force pure #000000 and #FFFFFF
  const { data, info } = await sharp(processed)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = new Uint8Array(data.buffer)
  
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = pixels[i] < 128 ? 0 : 255
  }

  const cleanBuffer = await sharp(Buffer.from(pixels), {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer()

  return cleanBuffer
}

async function layoutToA4(contentBuffer: Buffer): Promise<Buffer> {
  console.log('Laying out on A4 canvas...')

  const metadata = await sharp(contentBuffer).metadata()
  
  const maxWidth = A4_WIDTH - (MARGIN * 2)
  const maxHeight = A4_HEIGHT - (MARGIN * 2)

  let resized = contentBuffer
  if (metadata.width && metadata.height) {
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      resized = await sharp(contentBuffer)
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: false })
        .toBuffer()
    }
  }

  const resizedMeta = await sharp(resized).metadata()
  const contentWidth = resizedMeta.width || maxWidth
  const contentHeight = resizedMeta.height || maxHeight

  const xOffset = Math.floor((A4_WIDTH - contentWidth) / 2)
  const yOffset = Math.floor((A4_HEIGHT - contentHeight) / 2)

  const a4Page = await sharp({
    create: {
      width: A4_WIDTH,
      height: A4_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
    .composite([{
      input: resized,
      left: xOffset,
      top: yOffset
    }])
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer()

  return a4Page
}

export async function POST(request: NextRequest) {
  let jobId: string | null = null
  
  try {
    const body = await request.json()
    jobId = body.jobId

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    console.log('=== STARTING SD LINEART CONTROLNET COLORING PAGE ===')
    console.log('Job ID:', jobId)
    
    const supabase = createServiceClient()

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('Job not found:', jobError)
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

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

    await updateJobProgress(supabase, jobId, 10)

    console.log('Calling SD 1.5 Lineart ControlNet...')

    const isDetailed = job.complexity === 'detailed'

    // Use SD 1.5 Lineart ControlNet
    const output = await replicate.run(
      "pnyompen/sd-lineart-controlnet:4a0778f3b7272cfa9e68e67c909a1f10daadeb24bc51fcc91bf3f4c611704958",
      {
        input: {
          image: signedUpload.signedUrl,
          prompt: isDetailed
            ? "professional children's coloring book page, thick clean black outlines, detailed line art, cartoon illustration style, high quality printable coloring sheet, crisp inked outlines, white background"
            : "simple children's coloring book page, very thick bold black outlines, simple cartoon illustration, easy for kids, high quality printable coloring sheet, crisp inked outlines, white background",
          negative_prompt: "shading, grayscale, pencil texture, sketch, stippling, dots, noise, faded lines, low contrast, texture, background clutter, photograph, realistic, grey tones, gradient, blur, messy lines, broken lines, thin lines, hatching, crosshatch, watermark, signature, text",
          num_inference_steps: 30,
          guidance_scale: 9.0,
          controlnet_conditioning_scale: 1.5,
          seed: -1
        }
      }
    )

    console.log('SD Lineart generation complete')
    console.log('Output type:', typeof output)

    await updateJobProgress(supabase, jobId, 50)

    // Extract image URL
    let imageUrl: string | undefined

    if (typeof output === 'string') {
      imageUrl = output
      console.log('Output is string URL:', imageUrl)
    } else if (Array.isArray(output)) {
      console.log('Output is array, length:', output.length)
      
      // Find first valid URL
      for (const item of output) {
        if (typeof item === 'string' && item.startsWith('http')) {
          imageUrl = item
          console.log('Found URL in array:', imageUrl)
          break
        }
      }
    } else if (output && typeof output === 'object') {
      console.log('Output is object, keys:', Object.keys(output))
      
      const obj = output as Record<string, unknown>
      
      // Try common output keys
      const keys = ['output', 'image', 'url', 'result', '0']
      
      for (const key of keys) {
        if (key in obj) {
          const value = obj[key]
          
          if (typeof value === 'string' && value.startsWith('http')) {
            imageUrl = value
            console.log('Found URL at key:', key)
            break
          } else if (Array.isArray(value) && value.length > 0) {
            const first = value[0]
            if (typeof first === 'string' && first.startsWith('http')) {
              imageUrl = first
              console.log('Found URL in array at key:', key)
              break
            }
          }
        }
      }
    }

    if (!imageUrl || !imageUrl.startsWith('http')) {
      console.error('FAILED TO EXTRACT IMAGE URL')
      console.error('Output:', JSON.stringify(output, null, 2))
      throw new Error('SD Lineart model did not return a valid image URL')
    }

    console.log('✓ Successfully extracted image URL:', imageUrl)

    // Download AI-generated image
    console.log('Downloading generated coloring page...')
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download: ${imageResponse.statusText}`)
    }

    const aiBuffer = Buffer.from(await imageResponse.arrayBuffer())
    await updateJobProgress(supabase, jobId, 60)

    // Post-process: clean up and enforce quality
    console.log('Post-processing coloring page...')
    const processedBuffer = await cleanupAndFormatColoringPage(aiBuffer)
    await updateJobProgress(supabase, jobId, 75)

    // Layout to A4
    console.log('Creating A4 layout...')
    const a4Buffer = await layoutToA4(processedBuffer)
    await updateJobProgress(supabase, jobId, 90)

    // Upload result
    const resultFileName = `results/${nanoid()}.png`
    console.log('Uploading final result:', resultFileName)
    
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(resultFileName, a4Buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    await updateJobProgress(supabase, jobId, 98)

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

    console.log('=== JOB COMPLETED SUCCESSFULLY ===')

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('=== JOB FAILED ===')
    console.error('Error:', error)
    
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