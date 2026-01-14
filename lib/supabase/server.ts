import { createClient } from '@supabase/supabase-js'

const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKeyEnv = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrlEnv) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!anonKeyEnv) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
if (!serviceRoleKeyEnv) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

// ✅ these are now guaranteed strings (TypeScript knows it)
const supabaseUrl: string = supabaseUrlEnv
const anonKey: string = anonKeyEnv
const serviceRoleKey: string = serviceRoleKeyEnv

export function createSupabaseClient() {
  return createClient(supabaseUrl, anonKey)
}

export function createSupabaseAdmin() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

export const supabaseAdmin = createSupabaseAdmin()
