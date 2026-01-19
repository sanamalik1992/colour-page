import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Replicate from 'replicate'
import sharp from 'sharp'
import { nanoid } from 'nanoid'
import type { SupabaseClient } from '@supabase/supabase-js'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

// A4 dimensions at 300 DPI
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

async function validateColoringPage(buffer: Buffer): Promise<{ valid: boolean; reason?: string }> {
  try {
    const { data, info } = await sharp(buffer)
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixels = new Uint8Array(data.buffer)
    let blackPixels = 0
    let whitePixels = 0
    let greyPixels = 0
    const totalPixels = pixels.length

    for (let i = 0; i < pixels.length; i++) {
      const value = pixels[i]
      if (value < 40) {
        blackPixels++
      } else if (value > 220) {
        whitePixels++
      } else {
        greyPixels++
      }
    }

    const greyRatio = greyPixels / totalPixels
    const blackRatio = blackPixels / totalPixels

    console.log('Quality check:', {
      blackRatio: (blackRatio * 100).toFixed(2) + '%',
      whiteRatio: (whitePixels / totalPixels * 100).toFixed(2) + '%',
      greyRatio: (greyRatio * 100).toFixed(2) + '%'
    })

    if (greyRatio > 0.15) {
      return { valid: false, reason: 'Too much grey/stippling detected' }
    }

    if (blackRatio < 0.01) {
      return { valid: false, reason: 'Lines too faint or missing' }
    }

    return { valid: true }
  } catch (error) {
    console.error('Quality validation error:', error)
    return { valid: false, reason: 'Validation failed' }
  }
}

async function cleanupColoringPage(inputBuffer: Buffer, complexity: string): Promise<Buffer> {
  console.log('Post-processing: cleaning up coloring page...')

  let processed = await sharp(inputBuffer)
    .greyscale()
    .normalize()
    .toBuffer()

  processed = await sharp(processed)
    .median(complexity === 'detailed' ? 1 : 2)
    .toBuffer()

  const dilationKernel = complexity === 'detailed'
    ? { width: 3, height: 3, kernel: [0, 1, 0, 1, 1, 1, 0, 1, 0], scale: 1, offset: 0 }
    : { width: 5, height: 5, kernel: [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0], scale: 1, offset: 0 }

  processed = await sharp(processed)
    .convolve(dilationKernel)
    .toBuffer()

  processed = await sharp(processed)
    .threshold(140, { greyscale: false })
    .toBuffer()

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

  const smoothed = await sharp(cleanBuffer)
    .blur(0.3)
    .threshold(128)
    .toBuffer()

  return smoothed
}

async function layoutToA4(contentBuffer: Buffer): Promise<Buffer> {
  console.log('Laying out on A4 canvas with margins...')

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

    console.log('=== STARTING PROFESSIONAL COLORING PAGE GENERATION ===')
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

    const { data: signedUpload } = await supabase.storage
      .from('images')
      .createSignedUrl(job.upload_path, 3600)

    if (!signedUpload) {
      throw new Error('Failed to get upload URL')
    }

    await updateJobProgress(supabase, jobId, 10)

    console.log('Calling Replicate AI for professional coloring page conversion...')

    const isDetailed = job.complexity === 'detailed'

    const output = await replicate.run(
      "jagilley/controlnet-scribble:435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488595a2de23e143fdb0117",
      {
        input: {
          image: signedUpload.signedUrl,
          prompt: isDetailed
            ? "professional children's coloring book page, thick clean black outlines, detailed line art, cartoon style, high quality printable coloring sheet, white background, bold lines"
            : "simple children's coloring book page, very thick bold black outlines, simple cartoon style, easy for kids, high quality printable coloring sheet, white background, bold lines",
          a_prompt: "best quality, extremely detailed, thick black lines, white background, clean outlines, professional coloring book, smooth lines, continuous strokes, high contrast, sharp, bold outlines",
          n_prompt: "shading, grayscale, pencil, sketch, stippling, dots, noise, faded, low contrast, texture, background details, photograph, realistic, grey, gradient, blur, messy, broken lines, thin lines, hatching, crosshatch, watermark, signature",
          num_samples: "1",
          image_resolution: "768",
          detect_resolution: "768",
          ddim_steps: 30,
          guess_mode: false,
          strength: 2.0,
          scale: 12.0,
          seed: -1,
          eta: 0.0
        }
      }
    )

    console.log('AI generation complete')
    console.log('Output type:', typeof output)
    console.log('Output value:', JSON.stringify(output, null, 2))

    await updateJobProgress(supabase, jobId, 50)

    let imageUrl: string | undefined

    try {
      if (typeof output === 'string') {
        imageUrl = output
      } else if (Array.isArray(output)) {
        imageUrl = output.find((item): item is string => typeof item === 'string')
      } else if (output && typeof output === 'object') {
        const obj = output as Record<string, unknown>
        
        for (const key of ['output', 'image', 'url', '0']) {
          if (key in obj) {
            const value = obj[key]
            if (typeof value === 'string') {
              imageUrl = value
              break
            } else if (Array.isArray(value) && value.length > 0) {
              imageUrl = value.find((item): item is string => typeof item === 'string')
              if (imageUrl) break
            }
          }
        }
      }
    } catch (parseError) {
      console.error('Error parsing output:', parseError)
    }

    if (!imageUrl) {
      console.error('FAILED TO EXTRACT IMAGE URL')
      console.error('Full output:', JSON.stringify(output, null, 2))
      throw new Error('AI model did not return a valid image URL. Check Vercel logs for details.')
    }

    console.log('Successfully extracted image URL:', imageUrl)

    console.log('Downloading AI output...')
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download: ${imageResponse.statusText}`)
    }

    const aiBuffer = Buffer.from(await imageResponse.arrayBuffer())
    await updateJobProgress(supabase, jobId, 60)

    console.log('Post-processing AI output...')
    let processedBuffer = await cleanupColoringPage(aiBuffer, job.complexity || 'simple')
    await updateJobProgress(supabase, jobId, 75)

    const validation = await validateColoringPage(processedBuffer)
    
    if (!validation.valid) {
      console.warn('Quality check FAILED:', validation.reason)
      console.log('Applying stronger cleanup...')
      
      processedBuffer = await cleanupColoringPage(aiBuffer, 'simple')
      
      const secondValidation = await validateColoringPage(processedBuffer)
      if (!secondValidation.valid) {
        console.error('Quality check failed again - using best effort output')
      }
    } else {
      console.log('Quality check PASSED ✓')
    }

    await updateJobProgress(supabase, jobId, 85)

    const a4Buffer = await layoutToA4(processedBuffer)
    await updateJobProgress(supabase, jobId, 92)

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