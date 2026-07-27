import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Activate Pro immediately after checkout, from the success page, using the
 * Stripe checkout session id — WITHOUT depending on the webhook. The webhook
 * still runs as a backup, but this guarantees a paying customer is marked Pro
 * the moment they land back on the site (the "paid but still not Pro" fix).
 *
 * The session id is a capability: we retrieve it from Stripe, confirm it's a
 * paid subscription, and flip is_pro for that customer's email/account. You
 * can't activate Pro for an account you didn't pay for.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    })

    if (session.mode !== 'subscription') {
      return NextResponse.json({ isPro: false, error: 'Not a subscription checkout' }, { status: 400 })
    }

    const subscription = session.subscription as Stripe.Subscription | null
    const paid = session.payment_status === 'paid'
    const active = subscription && ['active', 'trialing', 'past_due'].includes(subscription.status)
    if (!paid && !active) {
      // Payment not settled yet — tell the client to keep waiting (webhook may
      // land shortly). Not an error.
      return NextResponse.json({ isPro: false, pending: true })
    }

    const email = (
      session.customer_details?.email ||
      session.metadata?.email ||
      (typeof session.customer === 'object' && session.customer && !('deleted' in session.customer)
        ? session.customer.email
        : null) ||
      ''
    ).toLowerCase()
    const userId = session.metadata?.userId || null
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null

    if (!email) {
      return NextResponse.json({ isPro: false, error: 'No email on session' }, { status: 400 })
    }

    // Mark the customer Pro (idempotent), linking the auth user when we have it.
    await supabase.from('stripe_customers').upsert({
      email,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
      ...(userId ? { user_id: userId } : {}),
      is_pro: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })

    // Record the subscription so /account shows the renewal date etc.
    if (subscription && customerId) {
      await supabase.from('stripe_subscriptions').upsert({
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        status: subscription.status,
        plan_id: subscription.items.data[0]?.price.id || 'pro',
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'stripe_subscription_id' })
    }

    return NextResponse.json({ isPro: true })
  } catch (error) {
    console.error('Confirm subscription error:', error)
    return NextResponse.json({ error: 'Could not confirm subscription' }, { status: 500 })
  }
}
