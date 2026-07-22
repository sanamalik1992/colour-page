import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/auth-server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * The current session's identity and Pro status, resolved SERVER-SIDE from the
 * signed cookie — so Pro follows the account across devices, and can't be
 * spoofed by a client-supplied email. Returns { user: null, isPro: false } for
 * logged-out visitors (the free-try flow stays open).
 */
export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ user: null, isPro: false })

  // Resolve Pro from Stripe: prefer the linked user_id, fall back to the
  // verified email (the account email always matches the Stripe customer email
  // because subscribe locks it — see checkout-subscription).
  let isPro = false
  const { data: byId } = await supabaseAdmin
    .from('stripe_customers')
    .select('is_pro')
    .eq('user_id', user.id)
    .maybeSingle()

  if (byId) {
    isPro = byId.is_pro === true
  } else {
    const { data: byEmail } = await supabaseAdmin
      .from('stripe_customers')
      .select('is_pro')
      .eq('email', user.email)
      .maybeSingle()
    isPro = byEmail?.is_pro === true
  }

  return NextResponse.json({ user: { id: user.id, email: user.email }, isPro })
}
