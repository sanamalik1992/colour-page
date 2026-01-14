import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    // Look up Stripe customer id (if exists)
    const { data: customer, error: customerErr } = await supabaseAdmin
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('email', email)
      .maybeSingle()

    if (customerErr) {
      console.error('stripe_customers lookup error:', customerErr)
      return NextResponse.json({ error: 'Failed to check limits' }, { status: 500 })
    }

    // If customer exists, check active subscription
    if (customer?.stripe_customer_id) {
      const { data: subscription, error: subErr } = await supabaseAdmin
        .from('stripe_subscriptions')
        .select('status')
        .eq('stripe_customer_id', customer.stripe_customer_id)
        .eq('status', 'active')
        .maybeSingle()

      if (subErr) {
        console.error('stripe_subscriptions lookup error:', subErr)
        return NextResponse.json({ error: 'Failed to check limits' }, { status: 500 })
      }

      if (subscription) {
        return NextResponse.json(
          { isPro: true, canDownload: true, downloadsRemaining: null },
          { status: 200 }
        )
      }
    }

    // Free tier: 3 downloads per week
    const { data: usage, error: usageErr } = await supabaseAdmin
      .from('usage_tracking')
      .select('downloads_this_week')
      .eq('email', email)
      .maybeSingle()

    if (usageErr) {
      console.error('usage_tracking lookup error:', usageErr)
      return NextResponse.json({ error: 'Failed to check limits' }, { status: 500 })
    }

    const downloadsThisWeek = usage?.downloads_this_week ?? 0
    const limit = 3
    const canDownload = downloadsThisWeek < limit

    return NextResponse.json(
      {
        isPro: false,
        canDownload,
        downloadsRemaining: Math.max(0, limit - downloadsThisWeek),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Check limits error:', error)
    return NextResponse.json({ error: 'Failed to check limits' }, { status: 500 })
  }
}
