import { Resend } from 'resend'

// Emails for physical-product orders: a "new order" alert to the shop inbox,
// and a "your order has shipped" notification to the customer with tracking.
// Resend needs a verified-domain `from`; replies route to the contact inbox.
const FROM = 'Colour.page <noreply@colour.page>'
const SHOP_INBOX = 'colour.page123@gmail.com'

export interface OrderRow {
  id: string
  product: string
  product_name?: string | null
  quantity?: number | null
  amount_total?: number | null
  currency?: string | null
  email?: string | null
  phone?: string | null
  ship_name?: string | null
  ship_address?: Record<string, string | null> | null
  carrier?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
}

function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}

function money(amount?: number | null, currency?: string | null): string {
  if (typeof amount !== 'number') return '—'
  const sym = (currency || 'gbp').toUpperCase() === 'GBP' ? '£' : ''
  return `${sym}${(amount / 100).toFixed(2)}`
}

function addressLines(a?: Record<string, string | null> | null): string[] {
  if (!a) return []
  return [a.line1, a.line2, a.city, a.state, a.postal_code, a.country]
    .map((s) => (s || '').trim())
    .filter(Boolean)
}

// Best-effort public tracking URL for common UK carriers, given a number.
export function trackingUrlFor(carrier?: string | null, tracking?: string | null): string | null {
  if (!tracking) return null
  const c = (carrier || '').toLowerCase()
  const n = encodeURIComponent(tracking.trim())
  if (c.includes('royal')) return `https://www.royalmail.com/track-your-item#/tracking-results/${n}`
  if (c.includes('evri') || c.includes('hermes')) return `https://www.evri.com/track/parcel/${n}`
  if (c.includes('dpd')) return `https://track.dpd.co.uk/search/${n}`
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${n}`
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${n}`
  if (c.includes('parcelforce')) return `https://www.parcelforce.com/track-trace?trackNumber=${n}`
  if (c.includes('yodel')) return `https://www.yodel.co.uk/tracking/${n}`
  if (c.includes('dhl')) return `https://www.dhl.com/gb-en/home/tracking.html?tracking-id=${n}`
  return null
}

const shell = (heading: string, bodyHtml: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#F2A81E 0%,#E08A00 100%);padding:32px 20px;text-align:center;border-radius:12px 12px 0 0;">
    <tr><td><h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;">${heading}</h1></td></tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;padding:32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
    <tr><td>${bodyHtml}</td></tr>
  </table>
  <p style="text-align:center;color:#999;font-size:12px;margin:16px 0;">colour.page — Ozeco Ltd</p>
</body></html>`

// Alert the shop inbox that a new order has come in (as soon as it's paid).
export async function sendNewOrderEmail(order: OrderRow): Promise<void> {
  const client = resend()
  if (!client) { console.warn('sendNewOrderEmail: RESEND_API_KEY not set'); return }
  const addr = addressLines(order.ship_address)
  const rows: [string, string][] = [
    ['Item', `${order.product_name || order.product}${order.quantity && order.quantity > 1 ? ` × ${order.quantity}` : ''}`],
    ['Total', money(order.amount_total, order.currency)],
    ['Customer', order.ship_name || '—'],
    ['Email', order.email || '—'],
    ['Phone', order.phone || '—'],
    ['Ship to', addr.length ? addr.join(', ') : '—'],
  ]
  const body = `
    <p style="font-size:16px;margin:0 0 16px;">A new order just came in and has been paid. 🎉</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;border-collapse:collapse;">
      ${rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#666;width:110px;vertical-align:top;">${k}</td><td style="padding:8px 0;font-weight:600;">${v}</td></tr>`).join('')}
    </table>
    <p style="font-size:13px;color:#888;margin:20px 0 0;">Mark it shipped and add a tracking number from the admin Orders page — the customer is notified automatically.</p>`
  try {
    await client.emails.send({
      from: FROM,
      replyTo: SHOP_INBOX,
      to: SHOP_INBOX,
      subject: `🛎️ New order — ${order.product_name || order.product} (${money(order.amount_total, order.currency)})`,
      html: shell('New order received', body),
    })
  } catch (e) {
    console.error('sendNewOrderEmail failed:', e)
  }
}

// Alert the shop inbox that someone just subscribed to Pro.
export async function sendNewProEmail(info: { email?: string | null; plan?: string | null; name?: string | null }): Promise<void> {
  const client = resend()
  if (!client) { console.warn('sendNewProEmail: RESEND_API_KEY not set'); return }
  const planLabel = info.plan === 'annual' ? 'Annual · £39.99/year' : 'Monthly · £4.99/month'
  const rows: [string, string][] = [
    ['Plan', `Pro Family — ${planLabel}`],
    ['Email', info.email || '—'],
    ...(info.name ? [['Name', info.name] as [string, string]] : []),
  ]
  const body = `
    <p style="font-size:16px;margin:0 0 16px;">🎉 You have a new Pro Family subscriber!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;border-collapse:collapse;">
      ${rows.map(([k, v]) => `<tr><td style="padding:8px 0;color:#666;width:90px;vertical-align:top;">${k}</td><td style="padding:8px 0;font-weight:600;">${v}</td></tr>`).join('')}
    </table>`
  try {
    await client.emails.send({
      from: FROM,
      replyTo: SHOP_INBOX,
      to: SHOP_INBOX,
      subject: `🎉 New Pro subscriber — ${info.email || 'colour.page'}`,
      html: shell('New Pro subscriber', body),
    })
  } catch (e) {
    console.error('sendNewProEmail failed:', e)
  }
}

// Tell the customer their order has shipped, with tracking details.
export async function sendShippedEmail(order: OrderRow): Promise<void> {
  const client = resend()
  if (!client) { console.warn('sendShippedEmail: RESEND_API_KEY not set'); return }
  if (!order.email) { console.warn('sendShippedEmail: order has no customer email'); return }
  const url = order.tracking_url || trackingUrlFor(order.carrier, order.tracking_number)
  const trackBlock = order.tracking_number
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#FFF7E8;border-radius:10px;">
        <tr><td style="padding:18px 20px;">
          <p style="margin:0 0 4px;font-size:13px;color:#8a6d1e;font-weight:700;text-transform:uppercase;letter-spacing:.5px;">Tracking</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#222;">${order.tracking_number}</p>
          ${order.carrier ? `<p style="margin:4px 0 0;font-size:13px;color:#666;">${order.carrier}</p>` : ''}
        </td></tr>
      </table>
      ${url ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;"><tr><td align="center">
        <table cellpadding="0" cellspacing="0"><tr><td style="background:#F2A81E;border-radius:8px;">
          <a href="${url}" style="display:inline-block;color:#2A1E00;text-decoration:none;padding:14px 34px;font-weight:700;font-size:15px;">Track your parcel</a>
        </td></tr></table>
      </td></tr></table>` : ''}`
    : ''
  const body = `
    <p style="font-size:16px;margin:0 0 12px;">Good news${order.ship_name ? `, ${order.ship_name.split(' ')[0]}` : ''} — your order is on its way! 📦</p>
    <p style="font-size:15px;color:#444;margin:0 0 8px;">We've shipped your <strong>${order.product_name || order.product}</strong>.</p>
    ${trackBlock}
    <p style="font-size:13px;color:#888;margin:20px 0 0;">If you have any questions, just reply to this email.</p>`
  try {
    await client.emails.send({
      from: FROM,
      replyTo: SHOP_INBOX,
      to: order.email,
      subject: '📦 Your colour.page order has shipped',
      html: shell('Your order has shipped', body),
    })
  } catch (e) {
    console.error('sendShippedEmail failed:', e)
  }
}
