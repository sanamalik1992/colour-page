import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')?.toLowerCase()

    if (!email) {
      return NextResponse.json({ isPro: false, status: 'free' })
    }

    // Get customer with subscription info
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('is_pro, stripe_customer_id')
      .eq('email', email)
      .maybeSingle()

    if (!customer) {
      return NextResponse.json({ isPro: false, status: 'free' })
    }

    // Get active subscription details
    const { data: subscription } = await supabase
      .from('stripe_subscriptions')
      .select('*')
      .eq('stripe_customer_id', customer.stripe_customer_id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const isPro = customer.is_pro === true
    let status = 'free'
    let renewalDate = null
    let cancelAtPeriodEnd = false

    if (subscription) {
      status = subscription.status
      renewalDate = subscription.current_period_end
      cancelAtPeriodEnd = subscription.cancel_at_period_end
    }

    return NextResponse.json({
      isPro,
      status,
      renewalDate,
      cancelAtPeriodEnd,
      plan: isPro ? 'Pro' : 'Free'
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ isPro: false, status: 'free' })
  }
}
