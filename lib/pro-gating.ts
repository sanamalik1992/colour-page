/**
 * Server-side Pro gating and usage enforcement.
 *
 * All Pro checks and usage limits are enforced server-side.
 * Client UI should reflect these but never be the source of truth.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Master switch for daily usage limits.
// TEMPORARY: limits are OFF for testing (the `true ||`). Remove the `true ||`
// before launch to re-enable the 3/day photo · 30/day learning · 3/day dot-to-dot
// allowances. The env override also disables them without a deploy.
export const USAGE_LIMITS_DISABLED = true || process.env.DISABLE_USAGE_LIMITS === 'true'

// Free daily allowances, enforced by counting rows (no RPC dependency). Pro is
// unlimited. Tuned to cost: the image-model paths (photo, standalone dot-to-dot)
// are tightly capped; learning sheets are mostly deterministic (near-zero cost
// to serve), so their free allowance is generous — a real parent never hits it,
// and it still bounds a runaway loop of picture-heavy theme topics.
export const FREE_LIMITS = {
  photo_coloring: 3,
  topic_sheet: 30,
  dot_to_dot: 3,
}

// Only jobs that actually did work count against a free allowance. A job that
// failed, or was created but never started (e.g. a dropped trigger, later
// reaped to 'failed'), must NOT consume one of the user's daily generations —
// otherwise a flaky upload that makes someone tap three times would wipe out
// their whole allowance. 'queued' is excluded too: it either advances to
// 'processing' (and then counts) or is reaped to 'failed' (and never counts).
export const COUNTED_STATUSES = ['processing', 'rendering', 'done'] as const

/**
 * How many photo / topic jobs the user has genuinely used today, counted from
 * the rows themselves (no RPC dependency). `kind` splits the shared photo_jobs
 * table: topic sheets live under a `topic/` input path, photos do not.
 */
export async function countTodaysUsage(sessionId: string, kind: 'photo' | 'topic'): Promise<number> {
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
  let q = supabase
    .from('photo_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', sessionId)
    .gte('created_at', startOfDay)
    .in('status', COUNTED_STATUSES as unknown as string[])
  q = kind === 'topic'
    ? q.ilike('input_storage_path', 'topic/%')
    : q.not('input_storage_path', 'ilike', 'topic/%')
  const { count } = await q
  return count || 0
}

export interface UserPlan {
  isPro: boolean
  email: string | null
  stripeCustomerId: string | null
}

/**
 * Check whether a user (by email) is on the Pro plan.
 */
export async function getUserPlan(email?: string | null): Promise<UserPlan> {
  if (!email) {
    return { isPro: false, email: null, stripeCustomerId: null }
  }

  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('is_pro, stripe_customer_id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  return {
    isPro: customer?.is_pro === true,
    email: email.toLowerCase(),
    stripeCustomerId: customer?.stripe_customer_id || null,
  }
}

/**
 * Throw if the user is not Pro. Use in API routes that require Pro.
 */
export async function requirePro(email?: string | null): Promise<UserPlan> {
  const plan = await getUserPlan(email)
  if (!plan.isPro) {
    throw new ProRequiredError()
  }
  return plan
}

export class ProRequiredError extends Error {
  constructor() {
    super('Pro subscription required')
    this.name = 'ProRequiredError'
  }
}

// ----- Usage Limits -----

export interface UsageLimits {
  [key: string]: { free: number; pro: number; period: 'daily' | 'lifetime' }
}

export const FEATURE_LIMITS: UsageLimits = {
  photo_coloring: { free: 3, pro: 50, period: 'daily' },
  topic_sheet:    { free: 3, pro: 50, period: 'daily' },
  dot_to_dot:     { free: 1, pro: 50, period: 'lifetime' },
}

export interface UsageCheckResult {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  isPro: boolean
}

/**
 * Check whether a user can use a feature, based on their plan and usage.
 */
export async function checkUsage(
  userId: string,
  featureKey: string,
  email?: string | null
): Promise<UsageCheckResult> {
  const plan = await getUserPlan(email)

  if (USAGE_LIMITS_DISABLED) {
    return { allowed: true, used: 0, limit: 9999, remaining: 9999, isPro: plan.isPro }
  }

  const limits = FEATURE_LIMITS[featureKey]

  if (!limits) {
    return { allowed: true, used: 0, limit: 999, remaining: 999, isPro: plan.isPro }
  }

  const maxCount = plan.isPro ? limits.pro : limits.free

  let used: number
  if (limits.period === 'lifetime') {
    const { data } = await supabase.rpc('get_lifetime_usage', {
      p_user_id: userId,
      p_feature_key: featureKey,
    })
    used = data || 0
  } else {
    // Daily count
    const { data } = await supabase
      .from('usage_counters')
      .select('count')
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .eq('date', new Date().toISOString().split('T')[0])
      .maybeSingle()
    used = data?.count || 0
  }

  const remaining = Math.max(0, maxCount - used)

  return {
    allowed: remaining > 0,
    used,
    limit: maxCount,
    remaining,
    isPro: plan.isPro,
  }
}

/**
 * Record a usage and check if it was allowed (atomic).
 * Returns false if the user has exceeded their limit.
 */
export async function recordUsage(
  userId: string,
  featureKey: string,
  email?: string | null
): Promise<{ allowed: boolean; newCount: number }> {
  const plan = await getUserPlan(email)

  if (USAGE_LIMITS_DISABLED) {
    return { allowed: true, newCount: 0 }
  }

  const limits = FEATURE_LIMITS[featureKey]

  if (!limits) {
    return { allowed: true, newCount: 0 }
  }

  const maxCount = plan.isPro ? limits.pro : limits.free

  const { data, error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_feature_key: featureKey,
    p_max_count: maxCount,
  })

  if (error) {
    console.error('recordUsage error:', error)
    // Fail open for paid users, fail closed for free
    return { allowed: plan.isPro, newCount: 0 }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: row?.allowed ?? true,
    newCount: row?.new_count ?? 0,
  }
}
