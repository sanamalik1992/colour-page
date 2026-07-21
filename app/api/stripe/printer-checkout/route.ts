import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

// One-off purchase of the portable printer (physical product). Unlike the Pro
// checkout this is `mode: 'payment'` (not a subscription), collects a UK
// shipping address, and offers free delivery — so the Stripe webhook's
// subscription/Pro logic never fires for it.
export async function POST() {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      return NextResponse.json({ error: 'Store is not configured' }, { status: 500 })
    }

    // Prefer the Stripe catalogue Price (set STRIPE_PRINTER_PRICE_ID to the
    // price on the "A4 thermal printer" product) so reporting and pricing live
    // in Stripe. Falls back to an inline £49.99 price if it isn't configured.
    const priceId = process.env.STRIPE_PRINTER_PRICE_ID
    // A hosted product image can be shown on the inline-price checkout once real
    // photos are uploaded; set NEXT_PUBLIC_PRINTER_IMAGE_URL to a public URL.
    // (When using a catalogue Price, set the image on the Stripe product itself.)
    const image = process.env.NEXT_PUBLIC_PRINTER_IMAGE_URL
    const images = image ? [image] : undefined

    const lineItem = priceId
      ? { price: priceId, quantity: 1, adjustable_quantity: { enabled: true, minimum: 1, maximum: 5 } }
      : {
          price_data: {
            currency: 'gbp' as const,
            unit_amount: 4999, // £49.99
            product_data: {
              name: 'Portable Bluetooth Colouring Printer',
              description:
                'Inkless thermal printer — print activity and colouring sheets straight from your phone over Bluetooth. A4 & 8.5×11.',
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
      success_url: `${appUrl}/printer?purchase=success`,
      cancel_url: `${appUrl}/printer?purchase=cancelled`,
      metadata: { product: 'portable-printer' },
    })

    return NextResponse.json({ url: session.url }, { status: 200 })
  } catch (error) {
    console.error('Printer checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
