import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkUsage, recordUsage } from '@/lib/pro-gating'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sessionId = formData.get('sessionId') as string
    const email = formData.get('email') as string | null
    const dotCount = parseInt(formData.get('dotCount') as string) || 100
    const showGuideLines = formData.get('showGuideLines') === 'true'
    const difficulty = (formData.get('difficulty') as string) || 'medium'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Server-side usage check
    const userId = email || sessionId
    const usage = await checkUsage(userId, 'dot_to_dot', email)

    if (!usage.allowed) {
      const message = usage.isPro
        ? 'Daily limit reached. Try again tomorrow.'
        : 'You have used your free dot-to-dot try. Upgrade to Pro for unlimited access!'
      return NextResponse.json({
        error: message,
        isPro: usage.isPro,
        used: usage.used,
        limit: usage.limit,
      }, { status: 429 })
    }

    // Upload the file
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || 'jpg'
    const storagePath = `dot-jobs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      // Fallback to images bucket
      const { error: fallbackError } = await supabase.storage
        .from('images')
        .upload(storagePath, buffer, { contentType: file.type, upsert: true })
      if (fallbackError) throw new Error('Failed to upload file')
    }

    // Record usage (atomic increment)
    const { allowed } = await recordUsage(userId, 'dot_to_dot', email)
    if (!allowed) {
      return NextResponse.json({
        error: 'Usage limit reached',
        isPro: usage.isPro,
      }, { status: 429 })
    }

    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('dot_jobs')
      .insert({
        user_id: userId,
        email: email?.toLowerCase() || null,
        status: 'queued',
        input_storage_path: storagePath,
        original_filename: file.name,
        settings: { dotCount, showGuideLines, difficulty },
        is_pro: usage.isPro,
        progress: 0,
      })
      .select('id')
      .single()

    if (jobError || !job) {
      throw new Error('Failed to create job')
    }

    // Trigger background processing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    fetch(`${appUrl}/api/dot-jobs/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    }).catch((err) => {
      console.error('Failed to trigger dot-jobs/process:', err)
      supabase.from('dot_jobs').update({
        status: 'failed',
        error: 'Processing failed to start. Please try again.',
        updated_at: new Date().toISOString(),
      }).eq('id', job.id)
    })

    return NextResponse.json({
      jobId: job.id,
      remaining: usage.remaining - 1,
      isPro: usage.isPro,
    })
  } catch (error) {
    console.error('Dot job create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    )
  }
}
