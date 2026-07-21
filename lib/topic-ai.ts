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

const SYSTEM = `You plan ONE printable A4 activity sheet for a child (UK primary school) from a topic a parent typed. Reply with ONLY a compact JSON object, no prose.

Pick "kind":
- "sequence": skip-counting / multiples / times tables (e.g. "multiples of 10", "counting in 5s", "3 times table"). Include "numbers": the exact ordered list (max 12) and a short "title".
- "counting": learning to count 1..N (e.g. "numbers to 10"). Include "maxCount" (2-20).
- "letter": a single letter or a phonics sound/digraph (e.g. "letter b", "phonics sh"). Include "grapheme" (1-3 lowercase letters) and "objects": 4-6 concrete, child-recognisable nouns that start with / use that sound.
- "pictorial": everything else (animals, space, science, seasons, jobs, etc.). Include a short "title" and "objects": 3-6 concrete, drawable, child-recognisable things that represent the topic. Make them age-appropriate: simpler for younger children.

Rules: objects must be concrete nouns that are easy to draw as a colouring picture (no abstract concepts, no text/labels). Never use copyrighted characters or brands. Keep it clean and child-safe.

Example: {"kind":"sequence","title":"Counting in 10s","numbers":[10,20,30,40,50,60,70,80,90,100]}`

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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
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
        return {
          category: 'letter',
          subject: g.length > 1 ? `Sound "${g}"` : `Letter ${g.toUpperCase()}`,
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
