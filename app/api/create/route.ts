import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const complexity = formData.get('complexity') as string || 'medium'
    const sessionId = formData.get('sessionId') as string
    const jobType = formData.get('type') as string || 'coloring'
    const dotCount = formData.get('dotCount') as string || '50'

    if (!file || !sessionId) {
      return NextResponse.json({ error: 'Missing file or session' }, { status: 400 })
    }

    const jobId = crypto.randomUUID()
    const fileExt = file.name.split('.').pop() || 'png'
    const uploadPath = `uploads/${jobId}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(uploadPath, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      await supabase.storage.from('uploads').upload(uploadPath, buffer, { contentType: file.type, upsert: true })
    }

    const { error: insertError } = await supabase.from('jobs').insert({
      id: jobId,
      session_id: sessionId,
      status: 'pending',
      upload_path: uploadPath,
      complexity: complexity,
      job_type: jobType,
      dot_count: parseInt(dotCount),
      progress: 0,
      created_at: new Date().toISOString()
    })

    if (insertError) throw insertError

    const processEndpoint = jobType === 'dot-to-dot' ? '/api/process/dot-to-dot' : '/api/process/ai-convert'
    
    fetch(new URL(processEndpoint, request.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    }).catch(console.error)

    return NextResponse.json({ jobId, status: 'pending' })
  } catch (error) {
    console.error('Create error:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
