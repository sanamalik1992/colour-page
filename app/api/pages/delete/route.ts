import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase/auth-server'
import { deleteJobStorage } from '@/lib/storage-cleanup'

// Delete one saved page (a photo_jobs row: photo colouring OR learning sheet),
// removing its actual input + output files from storage, then the row. Verifies
// ownership: the signed-in account's email must match the job, or the caller's
// session id must match. Backs the "delete a page" privacy promise.
export const maxDuration = 30

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const jobId = String(body?.jobId || '')
    const sessionId = body?.sessionId ? String(body.sessionId) : ''
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    const { data: job } = await supabase
      .from('photo_jobs')
      .select('id, user_id, email, input_storage_path, output_pdf_path, output_png_path')
      .eq('id', jobId)
      .maybeSingle()
    if (!job) return NextResponse.json({ ok: true }) // already gone

    // Ownership — never trust a client id alone: a signed-in user's verified
    // email must match, OR the anonymous session that created it must match.
    const authed = await getServerUser()
    const ownsByAccount = !!(authed?.email && job.email && authed.email === job.email.toLowerCase())
    const ownsBySession = !!(sessionId && job.user_id === sessionId)
    if (!ownsByAccount && !ownsBySession) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }

    await deleteJobStorage(job)
    await supabase.from('photo_jobs').delete().eq('id', jobId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Page delete error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
