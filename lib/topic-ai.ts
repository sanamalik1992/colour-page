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
  kind: 'sequence' | 'counting' | 'letter' | 'pictorial'
  title?: string
  numbers?: number[]
  maxCount?: number
  grapheme?: string
  objects?: string[]
}

const SYSTEM = `You are an early-years teacher designing ONE delightful, printable A4 activity sheet for a child (UK primary school / EYFS) from a topic a parent typed. Think like a great teacher: understand what the child is really meant to learn, then choose the richest, most engaging, age-appropriate content for it. Reply with ONLY a compact JSON object, no prose.

Pick "kind":
- "sequence": skip-counting / multiples / times tables (e.g. "multiples of 10", "counting in 5s", "3 times table"). Include "numbers": the exact ordered list (max 12) and a short "title".
- "counting": learning to count 1..N (e.g. "numbers to 10", "count to 5"). Include "maxCount" (2-20).
- "letter": ANY letter-sound or phonics lesson — a single letter, a digraph, OR phrasings like "words beginning with th", "th words", "the sh sound", "initial sound b", "cvc words with a". Include "grapheme" (1-3 lowercase letters, e.g. "t","th","sh") and "objects": 4-6 EXCELLENT, concrete, child-recognisable nouns that genuinely begin with / use that exact sound. Choose the clearest classic phonics picture-words (e.g. th → thumb, thermometer, thunder, throne; sh → ship, shark, shell, shoe). Avoid abstract or hard-to-draw words.
- "pictorial": everything else (animals, space, science, seasons, jobs, the body, weather, etc.). Include a short "title" and "objects": 4-6 concrete, drawable, child-recognisable things that best represent the topic and tell its story. Make them age-appropriate: simpler and fewer for younger children.

Rules: objects MUST be concrete nouns that are easy and fun to draw as a colouring picture (no abstract concepts, no text/labels, no puns). Pick the most iconic, joyful examples a child would recognise instantly. Never use copyrighted characters or brands. Keep it clean and child-safe. Always give a warm, specific "title" (a few words).

Examples:
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
