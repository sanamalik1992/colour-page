import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Issues a one-time signed URL so the browser can upload the photo DIRECTLY to
 * Supabase Storage — the file never passes through this serverless function, so
 * the request-body limit and function timeout are removed from the upload path
 * entirely. That eliminates the intermittent, size/time-dependent upload
 * failures that a through-the-function upload is prone to.
 *
 * We deliberately do NOT gate usage here — a signed URL is cheap and scoped to a
 * single random path. The daily allowance is enforced when the job is actually
 * registered (/api/photo-jobs/create), so an over-limit or abandoned upload
 * never consumes one of the user's free generations.
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawExt = String(body?.ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const ext = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(rawExt) ? rawExt : 'jpg'

    const jobId = crypto.randomUUID()
    const path = `photo-jobs/${jobId}/input.${ext}`

    const { data, error } = await supabase.storage.from('uploads').createSignedUploadUrl(path)
    if (error || !data) {
      console.error('sign-upload createSignedUploadUrl failed:', error)
      return NextResponse.json({ error: 'Could not start the upload. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ jobId, path, token: data.token })
  } catch (error) {
    console.error('sign-upload error:', error)
    return NextResponse.json({ error: 'Could not start the upload. Please try again.' }, { status: 500 })
  }
}
