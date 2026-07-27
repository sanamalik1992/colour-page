import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/supabase/auth-server'
import { isAdmin } from '@/lib/admin'
import { OrdersDashboard } from '@/components/admin/orders-dashboard'

export const metadata = { title: 'Orders · colour.page' }
export const dynamic = 'force-dynamic'

// Server-side gate: must be a SIGNED-IN admin. Non-admins never see the page.
export default async function OrdersPage() {
  const user = await getServerUser()
  if (!user) redirect('/login?next=/admin/orders')
  if (!(await isAdmin(user.email))) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">Not authorised</h1>
          <p className="text-gray-400 text-sm">This area is for administrators only.</p>
        </div>
      </div>
    )
  }
  return <OrdersDashboard />
}
