import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const plan = body?.plan || 'monthly'

    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })

    const priceId = plan === 'annual' 
      ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID 
      : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!priceId || !appUrl) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const { data: existingCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('email', email)
      .maybeSingle()

    let stripeCustomerId: string
    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({ email })
      stripeCustomerId = customer.id
      await supabaseAdmin.from('stripe_customers').insert({ email, stripe_customer_id: stripeCustomerId })
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/pro/success`,
      cancel_url: `${appUrl}/pro`,
      metadata: { email },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
