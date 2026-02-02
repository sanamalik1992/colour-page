import { createClient } from '@supabase/supabase-js'

// Service role client for server-side operations (webhooks, admin)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper to create service client
export function createServiceClient() {
  return supabaseAdmin
}
