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

    // Resolve a USABLE Stripe customer for this email. A stored id can be stale
    // in three ways — it was created in a different mode (test vs live), it was
    // deleted, or it belongs to another Stripe account — and any of those broke
    // checkout for accounts that existed before we went live ("the previous
    // email wouldn't check out, a new one worked"). In every one of those cases
    // we simply mint a fresh customer and re-point the row, so an existing
    // account can always subscribe.
    let customerId: string | null = null

    if (existingCustomer?.stripe_customer_id) {
      try {
        const c = await stripe.customers.retrieve(existingCustomer.stripe_customer_id)
        if (!(c as Stripe.DeletedCustomer).deleted) customerId = existingCustomer.stripe_customer_id
      } catch {
        // resource_missing (wrong mode/account/deleted) → fall through and recreate.
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({ email })
      customerId = customer.id
      // Upsert on email so a pre-existing row is re-pointed rather than duplicated.
      // No timestamp columns (the deployed schema may not have them).
      await supabase.from('stripe_customers').upsert({
        email,
        stripe_customer_id: customerId,
        user_id: userId,
        is_pro: false,
      }, { onConflict: 'email' })
    }

    // Stamp the verified customer id + auth link onto the row (covers the reuse
    // branch too, so the stored id always matches the one we're checking out).
    await supabase.from('stripe_customers').update({ user_id: userId, stripe_customer_id: customerId }).eq('email', email)

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
