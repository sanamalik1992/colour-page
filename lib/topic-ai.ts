/**
 * AI topic planner.
 *
 * Turns an open-ended topic a parent typed ("multiples of 10", "the water
 * cycle", "phonics sh", "life cycle of a frog") into a structured, age-
 * appropriate plan for a single printable sheet. This handles the long tail
 * that keyword matching can't. Falls back (returns null) when no API key is
 * configured or anything goes wrong, so the deterministic builder can take over.
 */
import Anthropic from '@anthropic-ai/sdk'
import {
  difficultyForAge,
  objectsPrompt,
  pictorialPrompt,
  sheetTitle,
  type TopicPlan,
} from './topic-prompt'

interface AiRaw {
  kind: 'sequence' | 'counting' | 'letter' | 'words' | 'pictorial'
  title?: string
  numbers?: number[]
  maxCount?: number
  grapheme?: string
  objects?: string[]
  words?: string[]
}

const SYSTEM = `You are an early-years teacher designing ONE delightful, printable A4 activity sheet for a child (UK primary school / EYFS) from whatever a parent types. Your job is to UNDERSTAND EXACTLY what they mean — read their words carefully, infer intent, and pick the single most appropriate kind of sheet and the best content for it. Be as thoughtful as a great human teacher. Reply with ONLY a compact JSON object, no prose.

Decide "kind" by what the child is really meant to practise:

- "counting": learning to count 1..N (e.g. "numbers to 10", "count to 5"). Include "maxCount" (2-20).

- "sequence": skip-counting / multiples / times tables (e.g. "multiples of 10", "counting in 5s", "3 times table"). Include "numbers" (exact ordered list, max 12) and a short "title".

- "letter": a letter-sound / phonics lesson WHERE THE EXAMPLE WORDS ARE CONCRETE, DRAWABLE NOUNS — a single letter or a digraph practised through pictures (e.g. "letter b", "the sh sound", "words starting with t" → ship/shark, ball/bat). Include "grapheme" (1-3 lowercase letters) and "objects": 4-6 excellent, iconic, drawable picture-nouns that genuinely use that sound. Only use this when the words can be drawn.

- "words": a set of SPECIFIC WORDS to read / spell / write that are NOT easily drawn — high-frequency / sight / tricky / "common exception" words, spelling lists, or when the parent NAMES or IMPLIES particular words. This is the right choice for function words. Examples that MUST be "words", not "letter": "words like there, then, that", "th words such as there then that this", "sight words", "tricky words", "spellings: because friend said", "the ir words: bird girl shirt" (if they clearly mean word-reading not pictures). Include "title" and "words": the exact 4-8 words to feature (use the parent's own words if they gave them; otherwise pick the classic ones for that group). No pictures are used — these become read/trace/find/write activities.

- "pictorial": everything else — themes and topics (animals, space, science, seasons, jobs, the body, weather, festivals…). Include a short "title" and "objects": 4-6 concrete, drawable things that best tell the topic's story, age-appropriate.

Key judgement: if a phonics request's natural examples are DRAWABLE (thumb, ship, cat) → "letter". If they are FUNCTION/SIGHT words or the parent lists specific non-picture words (there, then, that, was, said) → "words". When the parent names words explicitly, always feature THOSE exact words.

Rules: content must be age-appropriate and child-safe; never use copyrighted characters or brands; "objects" must be drawable nouns; always give a warm, specific "title" (a few words).

Examples:
{"kind":"words","title":"Tricky th words","words":["there","then","that","this","them","they"]}
{"kind":"letter","grapheme":"th","title":"Words beginning with th","objects":["thumb","thermometer","thunder","throne","thread","thorn"]}
{"kind":"sequence","title":"Counting in 10s","numbers":[10,20,30,40,50,60,70,80,90,100]}
{"kind":"pictorial","title":"Under the Sea","objects":["fish","octopus","crab","seahorse","starfish","turtle"]}`

function extractJson(text: string): AiRaw | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function aiPlanTopic(topic: string, age?: number): Promise<TopicPlan | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const difficulty = difficultyForAge(age)

  try {
    const client = new Anthropic({ apiKey })
    const res = await client.messages.create({
      // A stronger model plans richer, more pedagogically-sound sheets and
      // reads intent (e.g. "words beginning with th") far more reliably.
      model: 'claude-sonnet-5',
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Topic: "${topic}"\nChild age: ${age ?? 'unknown'}` }],
    })
    const text = res.content.find((c) => c.type === 'text')?.text || ''
    const raw = extractJson(text)
    if (!raw) return null

    switch (raw.kind) {
      case 'sequence': {
        const numbers = (raw.numbers || []).filter((n) => Number.isFinite(n)).slice(0, 12)
        if (numbers.length < 2) return null
        return { category: 'sequence', subject: raw.title || topic, prompt: '', numbers, difficulty }
      }
      case 'counting': {
        const maxN = Math.max(2, Math.min(20, Math.round(raw.maxCount || 10)))
        return {
          category: 'number',
          subject: `Numbers 1–${maxN}`,
          prompt: '',
          glyph: { kind: 'numberRange', value: `1-${maxN}` },
          difficulty,
        }
      }
      case 'letter': {
        const g = (raw.grapheme || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 3)
        const objs = (raw.objects || []).filter(Boolean).slice(0, 6)
        if (!g || objs.length < 2) return null
        const isSound = g.length > 1
        return {
          category: 'letter',
          subject: isSound ? `Sound "${g}"` : `Letter ${g.toUpperCase()}`,
          title: sheetTitle(raw.title || (isSound ? `Words with ${g}` : `The letter ${g}`)),
          objects: objs,
          prompt: objectsPrompt(objs),
          glyph: { kind: 'letter', value: g.toUpperCase() },
          difficulty,
        }
      }
      case 'words': {
        const ws = (raw.words || [])
          .map((w) => String(w).toLowerCase().replace(/[^a-z]/g, ''))
          .filter(Boolean)
          .slice(0, 8)
        if (ws.length < 2) return null
        return {
          category: 'words',
          subject: raw.title || topic,
          title: sheetTitle(raw.title || topic),
          objects: ws, // reused array field: the words to practise (no pictures)
          prompt: '',
          difficulty,
        }
      }
      case 'pictorial': {
        const objs = (raw.objects || []).filter(Boolean).slice(0, 6)
        if (objs.length < 1) return null
        return {
          category: 'generic',
          subject: raw.title || topic,
          title: sheetTitle(raw.title || topic),
          prompt: pictorialPrompt(objs),
          difficulty,
        }
      }
      default:
        return null
    }
  } catch (err) {
    console.error('aiPlanTopic failed, falling back:', err)
    return null
  }
}
