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
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const plan = body?.plan || 'monthly'

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.colour.page'

    if (!priceId) {
      console.error('Missing STRIPE_PRO_PRICE_ID')
      return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
    }

    // Check for existing Stripe customer
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('email', email)
      .maybeSingle()

    let customerId: string

    if (existingCustomer?.stripe_customer_id) {
      // Verify customer exists in Stripe
      try {
        await stripe.customers.retrieve(existingCustomer.stripe_customer_id)
        customerId = existingCustomer.stripe_customer_id
      } catch {
        // Customer doesn't exist in Stripe, create new
        const customer = await stripe.customers.create({ email })
        customerId = customer.id
        await supabase
          .from('stripe_customers')
          .update({ stripe_customer_id: customerId })
          .eq('email', email)
      }
    } else {
      // Create new customer in Stripe
      const customer = await stripe.customers.create({ email })
      customerId = customer.id

      // Create customer record in database
      await supabase.from('stripe_customers').upsert({
        email,
        stripe_customer_id: customerId,
        is_pro: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: undefined, // Don't set this when customer is provided
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pro`,
      metadata: { email, plan },
      subscription_data: {
        metadata: { email, plan }
      },
      allow_promotion_codes: true
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Checkout failed' 
    }, { status: 500 })
  }
}
