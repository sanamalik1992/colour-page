import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const jobId = String(body?.jobId || '')
    const email = String(body?.email || '').trim().toLowerCase()

    if (!jobId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    if (!priceId || !appUrl) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      )
    }

    // Get existing Stripe customer mapping (if any)
    const { data: existingCustomer, error: existingErr } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('email', email)
      .maybeSingle()

    if (existingErr) {
      console.error('Stripe customer lookup error:', existingErr)
      return NextResponse.json(
        { error: 'Failed to look up customer' },
        { status: 500 }
      )
    }

    let stripeCustomerId: string

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({ email })
      stripeCustomerId = customer.id

      const { error: insertErr } = await supabaseAdmin
        .from('stripe_customers')
        .insert({
          email,
          stripe_customer_id: stripeCustomerId,
        })

      if (insertErr) {
        console.error('Stripe customer insert error:', insertErr)
        return NextResponse.json(
          { error: 'Failed to create customer mapping' },
          { status: 500 }
        )
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${appUrl}/result/${jobId}?payment=success`,
      cancel_url: `${appUrl}/?payment=canceled`,
      metadata: { jobId, email },
    })

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Checkout failed' },
      { status: 500 }
    )
  }
}
