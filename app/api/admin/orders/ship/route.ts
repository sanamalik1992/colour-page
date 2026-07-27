import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin'
import { sendShippedEmail, trackingUrlFor, type OrderRow } from '@/lib/order-email'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mark an order shipped and notify the customer with tracking details.
// Body: { orderId, carrier?, trackingNumber?, resend? }
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { orderId?: string; carrier?: string; trackingNumber?: string; resend?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const orderId = String(body.orderId || '')
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  const carrier = body.carrier?.trim() || null
  const tracking = body.trackingNumber?.trim() || null
  const tracking_url = trackingUrlFor(carrier, tracking)

  const { data: updated, error } = await supabase
    .from('orders')
    .update({
      status: 'shipped',
      carrier,
      tracking_number: tracking,
      tracking_url,
      shipped_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .maybeSingle()

  if (error || !updated) {
    console.error('Mark shipped failed:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }

  // Notify the customer (best-effort — the status change still stands if the
  // email hiccups; the admin can re-send from the page).
  await sendShippedEmail(updated as OrderRow)

  return NextResponse.json({ ok: true, order: updated })
}
