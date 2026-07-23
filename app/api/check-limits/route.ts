import { NextRequest, NextResponse } from 'next/server'
import { USAGE_LIMITS_DISABLED, FREE_LIMITS, getUserPlan, countTodaysUsage } from '@/lib/pro-gating'
import { getServerUser } from '@/lib/supabase/auth-server'

// Reports today's remaining free allowance per mode, counted directly from the
// jobs actually created (same source the create routes gate on — so the counter
// the parent sees always matches what will actually be enforced).
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  // Prefer the VERIFIED session email (Pro follows the account) so a logged-in
  // Pro user is correctly detected without the client having to send an email.
  const authed = await getServerUser()
  const email = authed?.email || request.nextUrl.searchParams.get('email')?.toLowerCase() || null

  const isPro = (await getUserPlan(email)).isPro
  const limitsEnforced = !USAGE_LIMITS_DISABLED && !isPro

  // Pro or limits-off → unlimited; the UI hides the counter (no placeholder).
  if (!limitsEnforced) {
    return NextResponse.json({
      isPro,
      limitsEnforced: false,
      photo: { used: 0, limit: null, remaining: null },
      topic: { used: 0, limit: null, remaining: null },
    })
  }

  const [photoUsed, topicUsed] = await Promise.all([
    countTodaysUsage(sessionId || '', 'photo'),
    countTodaysUsage(sessionId || '', 'topic'),
  ])
  const photoLimit = FREE_LIMITS.photo_coloring
  const topicLimit = FREE_LIMITS.topic_sheet

  return NextResponse.json({
    isPro,
    limitsEnforced: true,
    photo: { used: photoUsed, limit: photoLimit, remaining: Math.max(0, photoLimit - photoUsed) },
    topic: { used: topicUsed, limit: topicLimit, remaining: Math.max(0, topicLimit - topicUsed) },
  })
}
