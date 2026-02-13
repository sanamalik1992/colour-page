import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Worker endpoint – called by Vercel cron or manual trigger.
 * Picks up queued photo_jobs and dispatches processing.
 *
 * Vercel cron config (add to vercel.json):
 * { "path": "/api/photo-jobs/worker", "schedule": "* * * * *" }
 *
 * This uses the claim_next_photo_job() Postgres function for
 * compare-and-swap locking to avoid double-processing.
 */

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // Verify cron secret (optional, for Vercel cron)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Try to claim up to 3 jobs per invocation
    const processed: string[] = []

    for (let i = 0; i < 3; i++) {
      const { data: jobId } = await supabase.rpc('claim_next_photo_job', {
        max_age_minutes: 10,
      })

      if (!jobId) break

      // Dispatch processing (fire-and-forget within this request)
      const baseUrl = request.nextUrl.origin
      fetch(`${baseUrl}/api/photo-jobs/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      }).catch(console.error)

      processed.push(jobId)
    }

    return NextResponse.json({
      processed: processed.length,
      jobIds: processed,
    })
  } catch (error) {
    console.error('Worker error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Worker failed' },
      { status: 500 }
    )
  }
}
