/**
 * Blocklist check for typed topics.
 *
 * The `blocked_terms` table (Disney, Pokémon, brands, etc.) already exists but
 * was unused. Topic generation runs the parent's text through it so we never
 * generate copyrighted characters. Kept as a simple substring match against the
 * (small) term list, loaded once per call.
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Returns the matched blocked term, or null if the text is clean. Fails open
// (returns null) if the table can't be read — the feature shouldn't hard-break
// on a transient DB error, and the model prompt itself is child-safe.
export async function findBlockedTerm(text: string): Promise<string | null> {
  // Normalise to " word word " so we can match whole terms (single or multi
  // word) without tripping on substrings inside unrelated words.
  const haystack = ` ${text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `
  try {
    const { data, error } = await supabase.from('blocked_terms').select('term')
    if (error || !data) return null
    for (const row of data) {
      const term = String(row.term || '').toLowerCase().trim()
      if (term && haystack.includes(` ${term} `)) return term
    }
    return null
  } catch {
    return null
  }
}
