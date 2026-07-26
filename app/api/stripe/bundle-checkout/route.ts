import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

// One-off purchase of the "Everything Bundle" (physical product): the portable
// thermal printer, a roll/pack of matching A4 thermal paper, a black A4
// clipboard and a felt-tip pen pack. Like the printer checkout this is
// `mode: 'payment'` (not a subscription), collects a UK shipping address and
// offers free delivery, so the webhook's subscription/Pro logic never fires.
export async function POST() {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      return NextResponse.json({ error: 'Store is not configured' }, { status: 500 })
    }

    // Prefer the Stripe catalogue Price (set STRIPE_BUNDLE_PRICE_ID to the price
    // on the bundle product) so reporting and pricing live in Stripe. Falls back
    // to an inline £59.99 price if it isn't configured.
    const priceId = process.env.STRIPE_BUNDLE_PRICE_ID
    // Optional hosted product image for the inline-price checkout; set the image
    // on the Stripe product itself when using a catalogue Price.
    const image = process.env.NEXT_PUBLIC_BUNDLE_IMAGE_URL
    const images = image ? [image] : undefined

    const lineItem = priceId
      ? { price: priceId, quantity: 1, adjustable_quantity: { enabled: true, minimum: 1, maximum: 5 } }
      : {
          price_data: {
            currency: 'gbp' as const,
            unit_amount: 5999, // £59.99
            product_data: {
              name: 'Everything Bundle — printer, paper, clipboard & felt tips',
              description:
                'The portable inkless thermal printer, a pack of matching A4 thermal paper, a black A4 clipboard and a felt-tip pen pack — everything you need to print and colour, in one box.',
              ...(images ? { images } : {}),
            },
          },
          quantity: 1,
          adjustable_quantity: { enabled: true, minimum: 1, maximum: 5 },
        }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [lineItem],
      shipping_address_collection: { allowed_countries: ['GB'] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'gbp' },
            display_name: 'Free delivery',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',
      success_url: `${appUrl}/bundle?purchase=success`,
      cancel_url: `${appUrl}/bundle?purchase=cancelled`,
      metadata: { product: 'everything-bundle' },
    })

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (error) {
    console.error('Bundle checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
