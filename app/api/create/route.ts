import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const complexity = formData.get('complexity') as string || 'simple'
    const instructions = formData.get('instructions') as string || ''
    const customText = formData.get('customText') as string || ''
    const addTextOverlay = formData.get('addTextOverlay') === 'true'
    const sessionId = formData.get('sessionId') as string

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WEBP are allowed' },
        { status: 400 }
      )
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${nanoid()}.${fileExt}`
    const filePath = `uploads/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        session_id: sessionId,
        upload_path: filePath,
        original_filename: file.name,
        status: 'pending',
        complexity,
        instructions: instructions || null,
        custom_text: customText || null,
        add_text_overlay: addTextOverlay,
        progress: 0
      })
      .select()
      .single()

    if (jobError) {
      console.error('Job creation error:', jobError)
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      )
    }

    // Trigger background processing
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id })
    }).catch(err => console.error('Failed to trigger processing:', err))

    return NextResponse.json({
      jobId: job.id,
      status: 'success'
    })

  } catch (error) {
    console.error('Create job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}