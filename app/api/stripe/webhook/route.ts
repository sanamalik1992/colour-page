import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

          // Update or create customer record
          if (email) {
            await supabase.from('stripe_customers').upsert({
              email: email.toLowerCase(),
              stripe_customer_id: customerId,
              is_pro: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'email' })
          }

          // Fetch full subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          
          await supabase.from('stripe_subscriptions').upsert({
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            status: subscription.status,
            plan_id: subscription.items.data[0]?.price.id || 'pro',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString()
          }, { onConflict: 'stripe_subscription_id' })
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

        await supabase.from('stripe_subscriptions').upsert({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          plan_id: subscription.items.data[0]?.price.id || 'pro',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString()
        }, { onConflict: 'stripe_subscription_id' })

        // Update is_pro flag on customer
        await supabase
          .from('stripe_customers')
          .update({ 
            is_pro: isActive, 
            updated_at: new Date().toISOString() 
          })
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
            cancel_at_period_end: true,
            updated_at: new Date().toISOString()
          })
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
            .update({ is_pro: false, updated_at: new Date().toISOString() })
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
              .update({ is_pro: true, updated_at: new Date().toISOString() })
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
              status: 'past_due',
              updated_at: new Date().toISOString() 
            })
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
