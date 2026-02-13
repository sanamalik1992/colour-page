/**
 * Admin authentication helper.
 * Checks email against the profiles table for is_admin flag.
 */

import { createServiceClient } from '@/lib/supabase/server'

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
