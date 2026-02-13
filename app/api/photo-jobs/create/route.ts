import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isHeic, convertHeicToPng } from '@/lib/heic-convert'
import type { PhotoJobSettings } from '@/types/photo-job'

export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FREE_DAILY_LIMIT = 3

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string
    const email = (formData.get('email') as string)?.toLowerCase() || null

    if (!file || !sessionId) {
      return NextResponse.json({ error: 'Missing file or session' }, { status: 400 })
    }

    // Check Pro status
    let isPro = false
    if (email) {
      const { data: customer } = await supabase
        .from('stripe_customers')
        .select('is_pro')
        .eq('email', email)
        .maybeSingle()
      isPro = customer?.is_pro === true
    }

    // Rate limit for free users
    if (!isPro) {
      const { count } = await supabase
        .from('photo_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', sessionId)
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .in('status', ['queued', 'processing', 'rendering', 'done'])

      if ((count || 0) >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          { error: 'Daily limit reached. Upgrade to Pro for unlimited access.' },
          { status: 429 }
        )
      }
    }

    // Parse settings
    const settings: PhotoJobSettings = {
      orientation: (formData.get('orientation') as string) === 'landscape' ? 'landscape' : 'portrait',
      lineThickness: (['thin', 'medium', 'thick'].includes(formData.get('lineThickness') as string)
        ? formData.get('lineThickness')
        : 'medium') as PhotoJobSettings['lineThickness'],
      detailLevel: (['low', 'medium', 'high'].includes(formData.get('detailLevel') as string)
        ? formData.get('detailLevel')
        : 'medium') as PhotoJobSettings['detailLevel'],
    }

    // Read file buffer
    let buffer = Buffer.from(await file.arrayBuffer())
    let contentType = file.type
    const originalFilename = file.name

    // Convert HEIC to PNG
    if (isHeic(file.name, file.type)) {
      buffer = await convertHeicToPng(buffer)
      contentType = 'image/png'
    }

    // Generate job ID and upload
    const jobId = crypto.randomUUID()
    const ext = contentType === 'image/png' ? 'png' : 'jpg'
    const uploadPath = `photo-jobs/${jobId}/input.${ext}`

    // Try uploads bucket first, fall back to images bucket
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(uploadPath, buffer, { contentType, upsert: true })

    if (uploadError) {
      // Fallback to images bucket
      const { error: fallbackError } = await supabase.storage
        .from('images')
        .upload(uploadPath, buffer, { contentType, upsert: true })
      if (fallbackError) throw fallbackError
    }

    // Insert photo job
    const { error: insertError } = await supabase.from('photo_jobs').insert({
      id: jobId,
      user_id: sessionId,
      email,
      status: 'queued',
      input_storage_path: uploadPath,
      original_filename: originalFilename,
      settings,
      progress: 0,
      is_pro: isPro,
      is_watermarked: !isPro,
    })

    if (insertError) throw insertError

    // Trigger background processing (fire-and-forget)
    const baseUrl = request.nextUrl.origin
    fetch(`${baseUrl}/api/photo-jobs/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    }).catch(console.error)

    return NextResponse.json({
      jobId,
      status: 'queued',
      isPro,
    })
  } catch (error) {
    console.error('Photo job create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    )
  }
}
