import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/auth-server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

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

  // Find the customer row by linked user_id, else by verified email.
  type CustRow = { is_pro: boolean | null; stripe_customer_id: string | null; email: string | null }
  const sel = 'is_pro, stripe_customer_id, email'
  let row: CustRow | null = null
  const byId = await supabaseAdmin.from('stripe_customers').select(sel).eq('user_id', user.id).maybeSingle()
  row = (byId.data as CustRow | null) ?? null
  if (!row) {
    const byEmail = await supabaseAdmin.from('stripe_customers').select(sel).eq('email', user.email).maybeSingle()
    row = (byEmail.data as CustRow | null) ?? null
  }

  let isPro = row?.is_pro === true

  // Self-heal: if the DB doesn't show Pro but the customer actually has an
  // active subscription in Stripe (e.g. a webhook failed to flip is_pro), trust
  // Stripe, persist is_pro=true, and return Pro. Gated on the customer having a
  // Stripe customer id, so genuinely-free logged-in users never hit Stripe here.
  if (!isPro && row?.stripe_customer_id) {
    try {
      const subs = await stripe.subscriptions.list({ customer: row.stripe_customer_id, status: 'all', limit: 10 })
      const active = subs.data.some((s) => ['active', 'trialing', 'past_due'].includes(s.status))
      if (active) {
        isPro = true
        await supabaseAdmin.from('stripe_customers').upsert({
          email: (row.email || user.email).toLowerCase(),
          stripe_customer_id: row.stripe_customer_id,
          user_id: user.id,
          is_pro: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' })
      }
    } catch (e) {
      console.error('me: Stripe Pro reconcile failed', e)
    }
  }

  return NextResponse.json({ user: { id: user.id, email: user.email }, isPro })
}
