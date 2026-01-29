import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const file = formData.get('file')
    const complexity = String(formData.get('complexity') || 'simple')
    const instructions = String(formData.get('instructions') || '')
    const customText = String(formData.get('customText') || '')
    const sessionId = String(formData.get('sessionId') || '')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // Generate safe filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${randomUUID()}.${fileExt}`
    const uploadPath = `${sessionId}/${fileName}`

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(uploadPath, arrayBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Upload failed' },
        { status: 500 }
      )
    }

    // Create job record
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .insert({
        session_id: sessionId,
        upload_path: uploadPath,
        original_filename: file.name,
        status: 'pending',
        complexity,
        instructions,
        custom_text: customText,
      })
      .select('id')
      .single()

    if (jobError) {
      console.error('Job insert error:', jobError)
      return NextResponse.json(
        { error: 'Job creation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        jobId: job.id,
        status: 'pending',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Generate API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
