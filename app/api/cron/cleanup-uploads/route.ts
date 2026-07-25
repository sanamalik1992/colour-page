import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteInputStorage, DELETED_SENTINEL } from '@/lib/storage-cleanup'

// Retention: an uploaded photo only needs to exist long enough to generate the
// sheet. This cron deletes input photos from the uploads bucket 48h after they
// were created. Generated sheets (outputs) are kept — those are what users
// download. Runs a bounded batch each invocation; nulls the path to a sentinel
// so it's never reprocessed and can never point at a real file again.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const RETENTION_HOURS = 48
const BATCH = 500

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // Same protection as the other crons (Vercel sends the CRON_SECRET bearer).
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - RETENTION_HOURS * 3600_000).toISOString()
  let removed = 0

  // Photo colouring inputs live under `photo-jobs/…`; topic sheets use a
  // `topic/` sentinel with no upload, so the `like` filter naturally skips them.
  const { data: photoJobs } = await supabase
    .from('photo_jobs')
    .select('id, input_storage_path')
    .lt('created_at', cutoff)
    .like('input_storage_path', 'photo-jobs/%')
    .limit(BATCH)
  for (const job of photoJobs || []) {
    await deleteInputStorage(job.input_storage_path)
    await supabase.from('photo_jobs').update({ input_storage_path: DELETED_SENTINEL }).eq('id', job.id)
    removed++
  }

  const { data: dotJobs } = await supabase
    .from('dot_jobs')
    .select('id, input_storage_path')
    .lt('created_at', cutoff)
    .like('input_storage_path', 'dot-jobs/%')
    .limit(BATCH)
  for (const job of dotJobs || []) {
    await deleteInputStorage(job.input_storage_path)
    await supabase.from('dot_jobs').update({ input_storage_path: DELETED_SENTINEL }).eq('id', job.id)
    removed++
  }

  console.log(`[cleanup-uploads] removed ${removed} input photos older than ${RETENTION_HOURS}h`)
  return NextResponse.json({ ok: true, removed })
}
