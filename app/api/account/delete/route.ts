import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerUser } from '@/lib/supabase/auth-server'
import { deleteJobStorage } from '@/lib/storage-cleanup'
import { stripe } from '@/lib/stripe'

// Full account deletion ("right to erasure"): removes every image file the user
// created (inputs + outputs) from storage, deletes their job rows, cancels any
// active subscription, removes the billing record, and deletes the auth user.
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  try {
    const authed = await getServerUser()
    if (!authed) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    const email = authed.email

    // Delete every stored file for this account's jobs, then the rows.
    for (const table of ['photo_jobs', 'dot_jobs'] as const) {
      const { data: jobs } = await supabase
        .from(table)
        .select('id, input_storage_path, output_pdf_path, output_png_path')
        .eq('email', email)
      for (const job of jobs || []) await deleteJobStorage(job)
      await supabase.from(table).delete().eq('email', email)
    }

    // Cancel any active subscription and remove the billing record (best-effort;
    // never block data deletion on a billing hiccup).
    try {
      const { data: cust } = await supabase
        .from('stripe_customers')
        .select('stripe_customer_id')
        .eq('email', email)
        .maybeSingle()
      if (cust?.stripe_customer_id) {
        const subs = await stripe.subscriptions.list({ customer: cust.stripe_customer_id, status: 'active' })
        for (const sub of subs.data) await stripe.subscriptions.cancel(sub.id)
      }
    } catch (err) {
      console.error('account delete: stripe cancel failed', err)
    }
    await supabase.from('stripe_customers').delete().eq('email', email)

    // Finally remove the auth user itself.
    try {
      await supabase.auth.admin.deleteUser(authed.id)
    } catch (err) {
      console.error('account delete: auth user delete failed', err)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Account delete error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
