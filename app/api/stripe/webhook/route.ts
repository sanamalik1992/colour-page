import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendNewOrderEmail, sendNewProEmail, type OrderRow } from '@/lib/order-email'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// current_period_start/end sit on the Subscription in older Stripe API versions
// and on the first subscription ITEM in newer ones (2025-03-31.basil+). Read
// whichever is present, and NEVER throw on a missing/NaN value — the previous
// `new Date(undefined * 1000).toISOString()` was throwing RangeError and 500ing
// the whole webhook, so paying customers never got Pro.
function subPeriod(sub: Stripe.Subscription): { start: string | null; end: string | null } {
  const s = sub as unknown as { current_period_start?: number; current_period_end?: number }
  const item = sub.items?.data?.[0] as unknown as { current_period_start?: number; current_period_end?: number } | undefined
  const iso = (v?: number) => (typeof v === 'number' && Number.isFinite(v) ? new Date(v * 1000).toISOString() : null)
  return { start: iso(s.current_period_start ?? item?.current_period_start), end: iso(s.current_period_end ?? item?.current_period_end) }
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    const signature = request.headers.get('stripe-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    const body = await request.text()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('Webhook event received:', event.type)

    switch (event.type) {
      // Checkout completed - create/update customer and subscription
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.customer && session.subscription) {
          const customerId = session.customer as string
          const subscriptionId = session.subscription as string
          const email = session.customer_email || session.metadata?.email

          console.log('Checkout completed for:', email, 'Customer:', customerId)

          // Update or create customer record, linking the auth user when the
          // checkout carried one (so Pro follows the account, not just the email).
          const userId = session.metadata?.userId
          if (email) {
            const { error: custErr } = await supabase.from('stripe_customers').upsert({
              email: email.toLowerCase(),
              stripe_customer_id: customerId,
              ...(userId ? { user_id: userId } : {}),
              is_pro: true}, { onConflict: 'email' })
            if (custErr) console.error('stripe_customers is_pro upsert FAILED:', custErr)
          }

          // Fetch full subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const { start, end } = subPeriod(subscription)

          const { error: subErr } = await supabase.from('stripe_subscriptions').upsert({
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status: subscription.status,
            plan_id: subscription.items.data[0]?.price.id || 'pro',
            ...(start ? { current_period_start: start } : {}),
            ...(end ? { current_period_end: end } : {}),
            cancel_at_period_end: subscription.cancel_at_period_end}, { onConflict: 'stripe_subscription_id' })
          // Never let a subscription-detail write failure undo the Pro grant
          // above — is_pro is already set; just log and carry on.
          if (subErr) console.error('stripe_subscriptions upsert failed (is_pro already set):', subErr)

          // Notify the shop inbox of the new Pro subscriber. Fires once per
          // checkout (checkout.session.completed isn't redelivered once we
          // return 200); best-effort so a mail hiccup never fails the webhook.
          await sendNewProEmail({
            email: email || undefined,
            plan: session.metadata?.plan,
            name: session.customer_details?.name,
          })
        }

        // Physical order (portable printer or everything bundle) — a one-off
        // payment, NOT a subscription, so no Pro is granted. Persist it so it
        // shows on the admin Orders page, and email the shop inbox right away.
        const PHYSICAL: Record<string, string> = {
          'portable-printer': 'Portable Colouring Printer',
          'everything-bundle': 'Everything Bundle',
        }
        const product = session.metadata?.product
        if (session.mode === 'payment' && product && PHYSICAL[product]) {
          const ship = session.shipping_details || session.customer_details
          const cust = session.customer_details
          const a = ship?.address
          const orderRow = {
            stripe_session_id: session.id,
            product,
            product_name: PHYSICAL[product],
            quantity: 1,
            amount_total: session.amount_total,
            currency: session.currency || 'gbp',
            email: cust?.email || session.customer_email || null,
            phone: cust?.phone || null,
            ship_name: ship?.name || cust?.name || null,
            ship_address: a
              ? { line1: a.line1, line2: a.line2, city: a.city, state: a.state, postal_code: a.postal_code, country: a.country }
              : null,
            status: 'paid',
          }
          // Idempotent on the Stripe session id (webhooks can be redelivered).
          // `ignoreDuplicates` so a redelivery doesn't re-notify.
          const { data: inserted, error: orderErr } = await supabase
            .from('orders')
            .upsert(orderRow, { onConflict: 'stripe_session_id', ignoreDuplicates: true })
            .select()
            .maybeSingle()
          if (orderErr) {
            console.error('Order insert failed:', orderErr)
          } else if (inserted) {
            // Only email on a genuinely new row (redelivery returns null).
            await sendNewOrderEmail(inserted as OrderRow)
          }
        }
        break
      }

      // Subscription created or updated
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const isActive = ['active', 'trialing'].includes(subscription.status)

        console.log('Subscription updated:', subscription.id, 'Status:', subscription.status)

        const { start: subStart, end: subEnd } = subPeriod(subscription)
        const { error: subUpsertErr } = await supabase.from('stripe_subscriptions').upsert({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          plan_id: subscription.items.data[0]?.price.id || 'pro',
          ...(subStart ? { current_period_start: subStart } : {}),
          ...(subEnd ? { current_period_end: subEnd } : {}),
          cancel_at_period_end: subscription.cancel_at_period_end}, { onConflict: 'stripe_subscription_id' })
        if (subUpsertErr) console.error('stripe_subscriptions upsert failed:', subUpsertErr)

        // Update is_pro flag on customer, and link the auth user if the
        // subscription carried one in metadata.
        const subUserId = subscription.metadata?.userId
        await supabase
          .from('stripe_customers')
          .update({
            is_pro: isActive,
            ...(subUserId ? { user_id: subUserId } : {})})
          .eq('stripe_customer_id', customerId)

        break
      }

      // Subscription deleted/canceled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('Subscription deleted:', subscription.id)

        await supabase
          .from('stripe_subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: true})
          .eq('stripe_subscription_id', subscription.id)

        // Check if customer has any other active subscriptions
        const { data: otherSubs } = await supabase
          .from('stripe_subscriptions')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .in('status', ['active', 'trialing'])

        if (!otherSubs || otherSubs.length === 0) {
          await supabase
            .from('stripe_customers')
            .update({ is_pro: false})
            .eq('stripe_customer_id', customerId)
        }
        break
      }

      // Invoice paid - good for renewal tracking
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          console.log('Invoice paid for subscription:', invoice.subscription)
          
          // Ensure customer is marked as pro
          if (invoice.customer) {
            await supabase
              .from('stripe_customers')
              .update({ is_pro: true})
              .eq('stripe_customer_id', invoice.customer as string)
          }
        }
        break
      }

      // Invoice payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.error('Invoice payment failed:', invoice.id)
        
        // Update subscription status if it exists
        if (invoice.subscription) {
          await supabase
            .from('stripe_subscriptions')
            .update({ 
              status: 'past_due'})
            .eq('stripe_subscription_id', invoice.subscription as string)
        }
        break
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
