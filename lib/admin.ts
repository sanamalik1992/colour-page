/**
 * Admin authentication helper.
 * Checks email against the profiles table for is_admin flag.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/auth-server'

export async function isAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  return data?.is_admin === true
}

/**
 * The verified admin for this request, or null. Combines the SIGNED session
 * (getServerUser — can't be spoofed) with the is_admin flag, so admin access
 * requires actually being logged in as an admin, not just knowing an admin
 * email. Use this to gate admin pages and API routes.
 */
export async function requireAdmin(): Promise<{ id: string; email: string } | null> {
  const user = await getServerUser()
  if (!user) return null
  return (await isAdmin(user.email)) ? user : null
}
