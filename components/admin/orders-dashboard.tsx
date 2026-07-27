'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Package, Truck, CheckCircle2, RefreshCw, Copy, Mail } from 'lucide-react'

interface Order {
  id: string
  product: string
  product_name: string | null
  quantity: number | null
  amount_total: number | null
  currency: string | null
  email: string | null
  phone: string | null
  ship_name: string | null
  ship_address: Record<string, string | null> | null
  status: string
  carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  shipped_at: string | null
  created_at: string
}

const CARRIERS = ['Royal Mail', 'Evri', 'DPD', 'Parcelforce', 'Yodel', 'UPS', 'DHL', 'FedEx']

function money(a: number | null, c: string | null): string {
  if (typeof a !== 'number') return '—'
  const sym = (c || 'gbp').toUpperCase() === 'GBP' ? '£' : ''
  return `${sym}${(a / 100).toFixed(2)}`
}
function when(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function addressText(a: Record<string, string | null> | null): string {
  if (!a) return '—'
  return [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].map((s) => (s || '').trim()).filter(Boolean).join(', ')
}

export function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState<Order | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders')
      if (!res.ok) throw new Error('Failed to load orders')
      const data = await res.json()
      setOrders(data.orders || [])
      // keep the open detail in sync with the refreshed list
      setActive((cur) => (cur ? (data.orders || []).find((o: Order) => o.id === cur.id) || cur : cur))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setOrders([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const paid = orders?.filter((o) => o.status !== 'shipped').length ?? 0
  const shipped = orders?.filter((o) => o.status === 'shipped').length ?? 0

  return (
    <div className="min-h-screen app-bg">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2"><Package className="w-6 h-6 text-brand-primary" /> Orders</h1>
            <p className="text-sm text-gray-500 mt-1">Printer &amp; bundle orders. Mark shipped with a tracking number and the customer is emailed automatically.</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin/analytics" className="text-xs font-semibold text-brand-primary hover:underline">Analytics →</a>
            <button onClick={load} className="h-9 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gray-200 text-sm font-semibold flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="To ship" value={paid} accent="text-amber-300" />
          <Stat label="Shipped" value={shipped} accent="text-emerald-300" />
          <Stat label="Total orders" value={orders?.length ?? 0} accent="text-white" />
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {orders === null ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-primary" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-left text-gray-400">
                <tr>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Item</th>
                  <th className="p-3 font-medium">Customer</th>
                  <th className="p-3 font-medium">Total</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-zinc-800 hover:bg-zinc-900/40">
                    <td className="p-3 text-gray-400 whitespace-nowrap">{when(o.created_at)}</td>
                    <td className="p-3 text-white">{o.product_name || o.product}{o.quantity && o.quantity > 1 ? ` ×${o.quantity}` : ''}</td>
                    <td className="p-3 text-gray-300">{o.ship_name || o.email || '—'}</td>
                    <td className="p-3 text-white font-semibold whitespace-nowrap">{money(o.amount_total, o.currency)}</td>
                    <td className="p-3"><OrderStatus status={o.status} /></td>
                    <td className="p-3 text-right">
                      <button onClick={() => setActive(o)} className="text-brand-primary hover:underline font-semibold">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {active && <OrderDrawer order={active} onClose={() => setActive(null)} onChanged={load} />}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-extrabold mt-0.5 ${accent}`}>{value}</p>
    </div>
  )
}

function OrderStatus({ status }: { status: string }) {
  if (status === 'shipped')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold"><Truck className="w-3 h-3" /> Shipped</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold">To ship</span>
}

function OrderDrawer({ order, onClose, onChanged }: { order: Order; onClose: () => void; onChanged: () => void }) {
  const shippedAlready = order.status === 'shipped'
  const [carrier, setCarrier] = useState(order.carrier || 'Royal Mail')
  const [tracking, setTracking] = useState(order.tracking_number || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/orders/ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, carrier, trackingNumber: tracking }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setMsg(shippedAlready ? 'Updated — customer re-notified.' : 'Marked shipped — customer emailed.')
      onChanged()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const copy = (t: string) => navigator.clipboard?.writeText(t)

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{order.product_name || order.product}</h2>
            <p className="text-xs text-gray-500">{when(order.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="mb-4"><OrderStatus status={order.status} /></div>

        <dl className="space-y-2.5 text-sm mb-6">
          <Row label="Total" value={money(order.amount_total, order.currency)} />
          <Row label="Customer" value={order.ship_name || '—'} />
          <Row label="Email" value={order.email || '—'} onCopy={order.email ? () => copy(order.email!) : undefined} />
          <Row label="Phone" value={order.phone || '—'} onCopy={order.phone ? () => copy(order.phone!) : undefined} />
          <Row label="Ship to" value={addressText(order.ship_address)} onCopy={() => copy(addressText(order.ship_address))} />
        </dl>

        <div className="border-t border-zinc-800 pt-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
            {shippedAlready ? <><Truck className="w-4 h-4 text-emerald-400" /> Shipping details</> : <><Truck className="w-4 h-4 text-brand-primary" /> Mark as shipped</>}
          </h3>
          <label className="block text-xs text-gray-500 mb-1">Carrier</label>
          <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="w-full mb-3 h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm">
            {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="block text-xs text-gray-500 mb-1">Tracking number</label>
          <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. AB123456789GB" className="w-full mb-4 h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm" />
          <button onClick={submit} disabled={saving} className="w-full h-11 rounded-xl bg-brand-primary text-[#2A1E00] font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : shippedAlready ? <><Mail className="w-4 h-4" /> Update &amp; re-send email</> : <><CheckCircle2 className="w-4 h-4" /> Mark shipped &amp; email customer</>}
          </button>
          {msg && <p className="text-xs text-gray-300 mt-2">{msg}</p>}
          {shippedAlready && order.shipped_at && <p className="text-xs text-gray-500 mt-2">Shipped {when(order.shipped_at)}.</p>}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-gray-500 w-20 flex-shrink-0">{label}</dt>
      <dd className="text-gray-200 text-right flex items-start gap-1.5 min-w-0">
        <span className="break-words">{value}</span>
        {onCopy && <button onClick={onCopy} className="text-gray-500 hover:text-white flex-shrink-0" title="Copy"><Copy className="w-3.5 h-3.5" /></button>}
      </dd>
    </div>
  )
}
