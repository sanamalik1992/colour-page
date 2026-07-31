import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase/auth-server'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Stripe checkout: STRIPE_SECRET_KEY is not set')
      return NextResponse.json(
        { error: "Payments aren't switched on yet. Please contact us and we'll sort it out.", code: 'no_secret_key' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const plan = body?.plan || 'monthly'

    // Pro requires a signed-in account. Use the VERIFIED session email (never a
    // client-supplied one) so the Stripe customer always matches the account and
    // Pro follows the user across devices.
    const authUser = await getServerUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Please sign in to subscribe.' }, { status: 401 })
    }
    const email = authUser.email
    const userId = authUser.id

    const monthlyPriceId =
      process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY ||
      process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ||
      process.env.STRIPE_PRO_PRICE_ID
    const annualPriceId =
      process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL || process.env.STRIPE_PRICE_ANNUAL

    // Pick the price that matches the selected plan so the customer is
    // charged the correct amount (previously both plans used one price).
    const priceId = plan === 'annual' ? annualPriceId : monthlyPriceId
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.colour.page'

    if (!priceId) {
      console.error(`Missing Stripe price ID for plan: ${plan}`)
      return NextResponse.json(
        { error: "That plan isn't available right now. Please try again later." },
        { status: 500 }
      )
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

      // Create customer record in database (created_at has a DB default; don't
      // set timestamp columns from the app — the deployed schema may not have
      // them, and a missing column makes the whole write fail).
      await supabase.from('stripe_customers').upsert({
        email,
        stripe_customer_id: customerId,
        user_id: userId,
        is_pro: false,
      }, { onConflict: 'email' })
    }

    // Ensure the auth user link is stamped on the customer row (covers the
    // existing-customer branches above too).
    await supabase.from('stripe_customers').update({ user_id: userId }).eq('email', email)

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: undefined, // Don't set this when customer is provided
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pro`,
      metadata: { email, plan, userId },
      subscription_data: {
        metadata: { email, plan, userId }
      },
      allow_promotion_codes: true
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    // Log the specific Stripe failure server-side (type/code/requestId) so a
    // config problem is diagnosable — but never leak keys to the customer.
    const e = error as Stripe.errors.StripeError
    console.error('Stripe checkout error:', {
      type: e?.type,
      code: e?.code,
      statusCode: e?.statusCode,
      message: e?.message,
      requestId: e?.requestId,
    })
    // A missing price/customer or an auth/key error is a configuration problem
    // (commonly a live-key-with-test-price mismatch), not a transient blip — say
    // so instead of telling the user to "try again", which will never work.
    const configProblem =
      e?.type === 'StripeAuthenticationError' ||
      e?.type === 'StripePermissionError' ||
      e?.code === 'resource_missing' ||
      e?.code === 'api_key_expired'
    return NextResponse.json(
      {
        error: configProblem
          ? "Payments aren't set up correctly yet. Please contact us and we'll sort it out."
          : "We couldn't start checkout. Please try again in a moment.",
        code: e?.code || e?.type || 'unknown',
      },
      { status: 500 }
    )
  }
}
