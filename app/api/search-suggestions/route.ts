import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Blocked terms – copyrighted/trademarked names.
 * If user searches for these, we suggest safe alternatives.
 */
const BLOCKED_TERMS: Record<string, string[]> = {
  'spiderman': ['web-slinger superhero', 'city hero', 'comic hero'],
  'spider-man': ['web-slinger superhero', 'city hero', 'comic hero'],
  'batman': ['dark knight hero', 'night hero', 'caped crusader'],
  'superman': ['flying hero', 'super strength hero', 'caped hero'],
  'frozen': ['ice princess', 'snow queen', 'winter magic'],
  'elsa': ['ice princess', 'snow queen', 'winter princess'],
  'disney': ['fairy tale princess', 'enchanted castle', 'magic kingdom'],
  'pokemon': ['pocket creatures', 'cute monsters', 'creature collection'],
  'pikachu': ['electric mouse creature', 'cute yellow creature', 'lightning animal'],
  'peppa pig': ['cute pig family', 'farm animals', 'piglet adventures'],
  'paw patrol': ['rescue puppies', 'brave dogs', 'puppy heroes'],
  'bluey': ['playful blue dog', 'dog family', 'puppy adventures'],
  'minecraft': ['block world', 'pixel adventure', 'building blocks'],
  'roblox': ['block characters', 'game world', 'virtual adventure'],
  'fortnite': ['battle adventure', 'action hero', 'adventure warrior'],
  'sonic': ['fast hedgehog', 'speedy animal', 'running adventure'],
  'barbie': ['fashion doll', 'glamour girl', 'style princess'],
  'lego': ['building blocks', 'construction toys', 'brick builder'],
  'mario': ['plumber hero', 'mushroom kingdom', 'adventure hero'],
  'hello kitty': ['cute cat', 'kawaii kitty', 'adorable cat'],
  'cocomelon': ['nursery rhyme', 'baby songs', 'toddler fun'],
  'minions': ['funny yellow helpers', 'silly creatures', 'wacky assistants'],
  'shrek': ['green ogre', 'swamp fairy tale', 'friendly monster'],
  'taylor swift': ['pop star stage', 'music concert', 'singer performance'],
  'bts': ['k-pop stage', 'boy band concert', 'music performance'],
  'blackpink': ['k-pop girls', 'girl group concert', 'dance performance'],
}

/**
 * GET /api/search-suggestions?q=...
 * Returns search suggestions (typeahead) + copyright detection.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.toLowerCase().trim() || ''

  // Check for blocked terms
  for (const [blocked, alternatives] of Object.entries(BLOCKED_TERMS)) {
    if (query.includes(blocked)) {
      return NextResponse.json({
        blocked: true,
        message: "We can't provide copyrighted characters. Try these instead:",
        alternatives,
        suggestions: [],
      })
    }
  }

  // If no query, return curated + popular suggestions
  if (!query || query.length < 2) {
    const { data: curated } = await supabase
      .from('search_terms')
      .select('term, category')
      .eq('is_suggested', true)
      .order('count', { ascending: false })
      .limit(12)

    const { data: popular } = await supabase
      .from('search_terms')
      .select('term')
      .eq('is_suggested', false)
      .order('count', { ascending: false })
      .limit(6)

    return NextResponse.json({
      blocked: false,
      suggestions: (curated || []).map(s => s.term),
      popular: (popular || []).map(s => s.term),
    })
  }

  // Search suggestions matching query
  const { data: matches } = await supabase
    .from('search_terms')
    .select('term, is_suggested')
    .ilike('term', `%${query}%`)
    .order('is_suggested', { ascending: false })
    .order('count', { ascending: false })
    .limit(8)

  // Also search print_pages titles
  const { data: pages } = await supabase
    .from('print_pages')
    .select('title')
    .eq('is_published', true)
    .ilike('title', `%${query}%`)
    .limit(5)

  const suggestions = [
    ...(matches || []).map(m => m.term),
    ...(pages || []).map(p => p.title.toLowerCase()),
  ]

  // Deduplicate
  const unique = [...new Set(suggestions)].slice(0, 10)

  return NextResponse.json({
    blocked: false,
    suggestions: unique,
  })
}

/**
 * POST /api/search-suggestions – track a search term.
 */
export async function POST(request: NextRequest) {
  try {
    const { term } = await request.json()
    if (!term || typeof term !== 'string' || term.length < 2) {
      return NextResponse.json({ ok: true })
    }

    // Don't track blocked terms
    const lower = term.toLowerCase().trim()
    for (const blocked of Object.keys(BLOCKED_TERMS)) {
      if (lower.includes(blocked)) {
        return NextResponse.json({ ok: true })
      }
    }

    await supabase.rpc('track_search', { p_term: lower })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
