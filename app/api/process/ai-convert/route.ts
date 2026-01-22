import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@0/lib/supabase/server'
import OpenAI from 'openai'
import { nanoid } from 'nanoid'

export const runtime = 'nodejs'

const openaiApiKey = process.env.OPENAI_API_KEY
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  try {
    const body = await request.json().catch(() => ({}))
    const jobId = body?.jobId

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    const { data: job, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json({ status: job.status, message: 'Job already processed' })
    }

    await supabase.from('jobs').update({ status: 'processing', progress: 10 }).eq('id', jobId)

    // Your create route stores the uploaded image path in preview_url
    const uploadPath: string | undefined = job.preview_url || job.upload_path
    if (!uploadPath) {
      await supabase
        .from('jobs')
        .update({ status: 'failed', error_message: 'No upload path on job (missing preview_url)' })
        .eq('id', jobId)
      return NextResponse.json({ error: 'No upload path on job' }, { status: 500 })
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('images')
      .download(uploadPath)

    if (downloadError || !fileData) {
      await supabase
        .from('jobs')
        .update({ status: 'failed', error_message: 'Failed to download uploaded image' })
        .eq('id', jobId)
      return NextResponse.json({ error: 'Failed to download uploaded image' }, { status: 500 })
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = (fileData as any).type || 'image/jpeg'
    const base64Image = buffer.toString('base64')

    if (!openai) {
      await supabase
        .from('jobs')
        .update({ status: 'failed', error_message: 'OPENAI_API_KEY not configured' })
        .eq('id', jobId)
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // 1) Prompt from GPT-4o vision
    await supabase.from('jobs').update({ progress: 25 }).eq('id', jobId)

    const visionResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'low' },
            },
            {
              type: 'text',
              text:
                `Analyze this photo and write a prompt to generate a black-and-white colouring page version.\n` +
                `Requirements:\n` +
                `- Bold black outlines on white background\n` +
                `- No shading/grey/gradients\n` +
                `- Keep key features, simplify details\n` +
                `- Suitable for kids to colour\n` +
                `Return ONLY the prompt text.`,
            },
          ],
        },
      ],
      max_tokens: 300,
    })

    const prompt = visionResponse.choices?.[0]?.message?.content?.trim()
    if (!prompt) {
      await supabase
        .from('jobs')
        .update({ status: 'failed', error_message: 'No prompt returned from GPT-4o' })
        .eq('id', jobId)
      return NextResponse.json({ error: 'No prompt returned from GPT-4o' }, { status: 500 })
    }

    await supabase.from('jobs').update({ progress: 55 }).eq('id', jobId)

    // 2) Generate colouring page image
    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1-mini',
      prompt:
        `${prompt}\n\nCRITICAL:\n` +
        `- Pure black lines on pure white background\n` +
        `- No grey tones, no shading, no gradients\n` +
        `- Bold outlines, clean line art only\n` +
        `- A4 printable colouring book style`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    })

    const generatedImageUrl = imageResponse.data?.[0]?.url
    if (!generatedImageUrl) {
      await supabase
        .from('jobs')
        .update({ status: 'failed', error_message: 'OpenAI returned no image URL' })
        .eq('id', jobId)
      return NextResponse.json({ error: 'OpenAI returned no image URL' }, { status: 500 })
    }

    const res = await fetch(generatedImageUrl)
    const arrBuf = await res.arrayBuffer()
    const generatedBuffer = Buffer.from(arrBuf)

    await supabase.from('jobs').update({ progress: 85 }).eq('id', jobId)

    // Store result
    const resultPath = `results/${nanoid()}.png`
    const { error: uploadError } = await supabase.storage.from('images').upload(resultPath, generatedBuffer, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false,
    })

    if (uploadError) {
      await supabase
        .from('jobs')
        .update({ status: 'failed', error_message: `Failed to upload result: ${uploadError.message}` })
        .eq('id', jobId)
      return NextResponse.json({ error: 'Failed to upload result image' }, { status: 500 })
    }

    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        result_url: resultPath,
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return NextResponse.json({ success: true, jobId, resultPath })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    console.error('Process job error:', error)
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 })
  }
}
