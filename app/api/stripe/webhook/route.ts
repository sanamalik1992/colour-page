import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Stripe webhook secret not configured' }, { status: 500 })
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

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const isActive = ['active', 'trialing'].includes(subscription.status)

        await supabaseAdmin.from('stripe_subscriptions').upsert({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          plan_id: 'pro_monthly',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' })

        if (isActive) {
          await supabaseAdmin
            .from('stripe_customers')
            .update({ is_pro: true, updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', customerId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabaseAdmin
          .from('stripe_subscriptions')
          .update({ status: 'canceled', cancel_at_period_end: true, updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id)

        await supabaseAdmin
          .from('stripe_customers')
          .update({ is_pro: false, updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const jobId = paymentIntent.metadata?.jobId
        const email = paymentIntent.metadata?.email

        if (jobId) {
          await supabaseAdmin.from('stripe_payments').insert({
            stripe_payment_intent_id: paymentIntent.id,
            stripe_customer_id: typeof paymentIntent.customer === 'string' ? paymentIntent.customer : null,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: 'succeeded',
            job_id: jobId,
            email: email || null,
            metadata: paymentIntent.metadata || {},
          })

          await supabaseAdmin.from('jobs').update({
            is_paid: true,
            stripe_payment_id: paymentIntent.id,
            updated_at: new Date().toISOString(),
          }).eq('id', jobId)
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
