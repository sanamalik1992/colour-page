import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase/auth-server'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    // Only ever open the billing portal for the SIGNED-IN user's own account —
    // never an email taken from the request (which would let anyone open another
    // customer's billing).
    const authUser = await getServerUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })
    }
    const email = authUser.email

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.colour.page'

    // Get customer ID from database
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('email', email)
      .maybeSingle()

    if (!customer?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${appUrl}/account`
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal session error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create portal session' 
    }, { status: 500 })
  }
}
