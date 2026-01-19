import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import sharp from 'sharp'
import { nanoid } from 'nanoid'
import type { SupabaseClient } from '@supabase/supabase-js'

// A4 dimensions at 300 DPI
const A4_WIDTH = 2480
const A4_HEIGHT = 3508
const MARGIN = 100 // ~8.5mm margin at 300 DPI
const PRINT_WIDTH = A4_WIDTH - (MARGIN * 2)
const PRINT_HEIGHT = A4_HEIGHT - (MARGIN * 2)

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

// Quality gate: Check if output has proper contrast
async function validateOutput(buffer: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = new Uint8Array(data.buffer)
  let blackPixels = 0
  let greyPixels = 0
  const totalPixels = info.width * info.height

  for (let i = 0; i < pixels.length; i += info.channels) {
    const value = pixels[i]
    if (value < 50) blackPixels++ // Pure black
    else if (value > 200) continue // White
    else greyPixels++ // Grey (bad!)
  }

  const greyRatio = greyPixels / totalPixels
  const blackRatio = blackPixels / totalPixels

  console.log('Quality check - Black ratio:', blackRatio, 'Grey ratio:', greyRatio)

  // Fail if too much grey or too little black
  return greyRatio < 0.1 && blackRatio > 0.02
}

async function createColoringPage(
  inputBuffer: Buffer,
  complexity: 'simple' | 'detailed'
): Promise<Buffer> {
  
  console.log('Starting professional coloring page pipeline...')

  // STEP 1: PREPROCESSING - Enhance and prepare
  console.log('Step 1: Preprocessing - enhance contrast and denoise')
  
  let preprocessed = await sharp(inputBuffer)
    .resize(PRINT_WIDTH, PRINT_HEIGHT, { 
      fit: 'inside',
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3
    })
    .greyscale()
    .normalize() // Auto-contrast
    .modulate({ brightness: 1.1, saturation: 0 })
    .sharpen({ sigma: 1 })
    .toBuffer()

  // STEP 2: EDGE DETECTION - Extract clean outlines
  console.log('Step 2: Edge detection (Canny-style)')
  
  if (complexity === 'detailed') {
    // Detailed: Fine edge detection
    preprocessed = await sharp(preprocessed)
      .convolve({
        width: 3,
        height: 3,
        kernel: [
          -1, -1, -1,
          -1,  8, -1,
          -1, -1, -1
        ],
        scale: 1,
        offset: 0
      })
      .linear(1.5, 0) // Increase contrast
      .toBuffer()
  } else {
    // Simple: Stronger edge detection + thicker lines
    preprocessed = await sharp(preprocessed)
      .blur(0.5) // Slight blur to reduce noise
      .convolve({
        width: 5,
        height: 5,
        kernel: [
          -1, -1, -1, -1, -1,
          -1, -1, -1, -1, -1,
          -1, -1, 24, -1, -1,
          -1, -1, -1, -1, -1,
          -1, -1, -1, -1, -1
        ],
        scale: 1,
        offset: 0
      })
      .linear(2, 0) // Strong contrast boost
      .toBuffer()
  }

  // STEP 3: THRESHOLD - Pure black and white only
  console.log('Step 3: Threshold to pure black/white')
  
  const threshold = complexity === 'detailed' ? 120 : 140
  
  let blackAndWhite = await sharp(preprocessed)
    .threshold(threshold, { greyscale: false })
    .negate() // Invert so lines are black
    .toBuffer()

  // STEP 4: MORPHOLOGICAL OPERATIONS - Clean up
  console.log('Step 4: Morphological operations - remove noise, connect lines')
  
  // Remove small noise specks (opening operation)
  blackAndWhite = await sharp(blackAndWhite)
    .median(complexity === 'detailed' ? 1 : 2)
    .toBuffer()

  // Thicken lines slightly for printability (dilation)
  const dilationKernel = complexity === 'detailed'
    ? { width: 3, height: 3, kernel: [0, 1, 0, 1, 1, 1, 0, 1, 0] }
    : { width: 3, height: 3, kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1] }

  blackAndWhite = await sharp(blackAndWhite)
    .convolve(dilationKernel)
    .threshold(200) // Re-threshold after dilation
    .toBuffer()

  // STEP 5: FORCE PURE COLORS - Ensure #000000 and #FFFFFF only
  console.log('Step 5: Force pure black (#000000) and white (#FFFFFF)')
  
  const { data, info } = await sharp(blackAndWhite)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = new Uint8Array(data.buffer)
  
  // Force every pixel to pure black or pure white
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = pixels[i] < 128 ? 0 : 255
  }

  const cleanedBuffer = await sharp(Buffer.from(pixels), {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
    .png()
    .toBuffer()

  // STEP 6: VALIDATE OUTPUT - Quality gate
  console.log('Step 6: Validating output quality')
  
  const isValid = await validateOutput(cleanedBuffer)
  
  if (!isValid) {
    console.warn('Quality check failed - regenerating with stronger settings')
    // Recursively try again with stronger threshold
    return createColoringPage(inputBuffer, 'simple')
  }

  // STEP 7: LAYOUT TO A4 - Center on canvas with margins
  console.log('Step 7: Layout to A4 with margins')
  
  const metadata = await sharp(cleanedBuffer).metadata()
  const contentWidth = metadata.width || PRINT_WIDTH
  const contentHeight = metadata.height || PRINT_HEIGHT

  // Calculate centering
  const xOffset = Math.floor((A4_WIDTH - contentWidth) / 2)
  const yOffset = Math.floor((A4_HEIGHT - contentHeight) / 2)

  const a4Canvas = await sharp({
    create: {
      width: A4_WIDTH,
      height: A4_HEIGHT,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
    .composite([{
      input: cleanedBuffer,
      left: xOffset,
      top: yOffset
    }])
    .png({ 
      quality: 100, 
      compressionLevel: 9,
      palette: true // Force pure black/white palette
    })
    .toBuffer()

  console.log('Coloring page generation complete!')
  return a4Canvas
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

    console.log('Starting professional coloring page pipeline')
    
    await supabase
      .from('jobs')
      .update({ 
        status: 'processing',
        progress: 10,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    // Download original image
    console.log('Downloading original image...')
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('images')
      .download(job.upload_path)

    if (downloadError || !imageData) {
      throw new Error('Failed to download image')
    }

    const buffer = await imageData.arrayBuffer()
    console.log('Image downloaded, size:', buffer.byteLength, 'bytes')

    await updateJobProgress(supabase, jobId, 25)

    // Generate coloring page with professional pipeline
    const coloringPageBuffer = await createColoringPage(
      Buffer.from(buffer),
      job.complexity || 'simple'
    )

    await updateJobProgress(supabase, jobId, 85)

    // Upload result
    const resultFileName = `results/${nanoid()}.png`
    
    console.log('Uploading result to storage:', resultFileName)
    
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(resultFileName, coloringPageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to save result: ${uploadError.message}`)
    }

    await updateJobProgress(supabase, jobId, 95)

    // Mark as completed
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

export const maxDuration = 60