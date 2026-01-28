import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
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

    const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
    const annualPriceId = process.env.STRIPE_PRO_ANNUAL_PRICE_ID || monthlyPriceId
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://colour.page'

    const priceId = plan === 'annual' ? annualPriceId : monthlyPriceId

    if (!priceId) {
      console.error('Missing Stripe price ID')
      return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
    }

    // Check for existing customer
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('email', email)
      .maybeSingle()

    let customerId: string

    if (existingCustomer?.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({ email })
      customerId = customer.id
      
      await supabase.from('stripe_customers').insert({
        email,
        stripe_customer_id: customerId
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: appUrl + '/pro/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: appUrl + '/pro',
      metadata: { email, plan }
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
