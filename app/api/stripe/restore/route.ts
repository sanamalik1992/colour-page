import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase/auth-server'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * User-triggered "Restore Pro". Reconciles the signed-in account against Stripe
 * and, if an active subscription exists, sets is_pro=true. Returns a detailed
 * report so we can see EXACTLY where activation is breaking (not logged in, no
 * Stripe customer for this email, no active subscription, or a DB write error).
 */
export async function POST() {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { ok: false, loggedIn: false, message: 'You are not signed in. Log in first, then try Restore Pro again.' },
      { status: 401 }
    )
  }

  const email = (user.email || '').toLowerCase()
  const report: Record<string, unknown> = { loggedIn: true, email, userId: user.id }

  // DB row (by linked account, then by email)
  const { data: rowById } = await supabase.from('stripe_customers').select('is_pro, stripe_customer_id, email').eq('user_id', user.id).maybeSingle()
  const { data: rowByEmail } = await supabase.from('stripe_customers').select('is_pro, stripe_customer_id, email').eq('email', email).maybeSingle()
  const row = rowById || rowByEmail
  report.dbRow = row ? { is_pro: row.is_pro, stripe_customer_id: row.stripe_customer_id, matchedBy: rowById ? 'user_id' : 'email' } : null

  // Find the Stripe customer id (from the row, else look up by email)
  let customerId = (row?.stripe_customer_id as string) || null
  if (!customerId) {
    try {
      const found = await stripe.customers.list({ email, limit: 5 })
      report.stripeCustomersByEmail = found.data.map((c) => c.id)
      customerId = found.data[0]?.id || null
    } catch (e) {
      report.stripeLookupError = e instanceof Error ? e.message : String(e)
    }
  }
  report.customerId = customerId

  if (!customerId) {
    return NextResponse.json({
      ok: false, isPro: false, report,
      message: 'No Stripe customer found for your account email. Your payment may have used a different email than the one you are signed in with. Check which email you paid with vs the one you are logged in as.',
    })
  }

  // Any active subscription?
  let active = false
  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })
    report.subscriptions = subs.data.map((s) => ({ id: s.id, status: s.status }))
    active = subs.data.some((s) => ['active', 'trialing', 'past_due'].includes(s.status))
  } catch (e) {
    report.subsError = e instanceof Error ? e.message : String(e)
  }

  if (!active) {
    return NextResponse.json({
      ok: false, isPro: false, report,
      message: 'Found your Stripe customer, but no active subscription on it. If you just paid, wait a few seconds and retry. Otherwise the successful payment is on a different customer/email.',
    })
  }

  // Grant Pro.
  const { error: upErr } = await supabase.from('stripe_customers').upsert({
    email, stripe_customer_id: customerId, user_id: user.id, is_pro: true
  }, { onConflict: 'email' })
  if (upErr) {
    report.dbWriteError = upErr.message
    return NextResponse.json({
      ok: false, isPro: false, report,
      message: `Found your active subscription, but saving Pro status failed: ${upErr.message}`,
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true, isPro: true, report, message: 'Pro restored! Reload the page to see Pro features.' })
}
