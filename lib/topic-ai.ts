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
  type Activity,
  type TopicPlan,
} from './topic-prompt'

// Validate/coerce the AI's freeform activity list into supported blocks. Unknown
// block types are dropped; each block keeps only its expected fields.
function normalizeActivities(raw: RawActivity[]): Activity[] {
  const out: Activity[] = []
  const words = (a: RawActivity) => (a.words || []).map((w) => String(w)).filter(Boolean).slice(0, 8)
  for (const a of raw.slice(0, 6)) {
    const instr = String(a.instruction || '').slice(0, 40)
    const pro = a.pro === true
    switch (a.type) {
      case 'note':
        if (a.text) out.push({ type: 'note', text: String(a.text).slice(0, 90), pro })
        break
      case 'pictures': {
        const items = (a.items || []).map((s) => String(s)).filter(Boolean).slice(0, 4)
        if (items.length) out.push({ type: 'pictures', instruction: instr, items, label: a.label !== false, pro })
        break
      }
      case 'circleWords':
        if (words(a).length >= 3) out.push({ type: 'circleWords', instruction: instr, words: words(a), pro })
        break
      case 'traceWords':
        if (words(a).length) out.push({ type: 'traceWords', instruction: instr, words: words(a), pro })
        break
      case 'wordSearch':
        if (words(a).length >= 2) out.push({ type: 'wordSearch', instruction: instr, words: words(a), pro })
        break
      case 'readWords':
        if (words(a).length) out.push({ type: 'readWords', instruction: instr, words: words(a), pro })
        break
      case 'writeLines':
        out.push({ type: 'writeLines', instruction: instr, count: Math.max(1, Math.min(6, Math.round(a.count || 3))), pro })
        break
      case 'sentence':
        out.push({ type: 'sentence', instruction: instr, lines: Math.max(1, Math.min(5, Math.round(a.lines || 2))), pro })
        break
      case 'sums': {
        const op = a.op === 'subtract' || a.op === 'mixed' ? a.op : 'add'
        out.push({ type: 'sums', instruction: instr, op, maxValue: Math.max(5, Math.min(100, Math.round(a.maxValue || 20))), count: Math.max(4, Math.min(15, Math.round(a.count || 10))), dots: a.dots === true, pro })
        break
      }
    }
  }
  return out
}

interface AiRaw {
  kind: 'sequence' | 'counting' | 'letter' | 'words' | 'pictorial' | 'composed'
  title?: string
  numbers?: number[]
  maxCount?: number
  grapheme?: string
  objects?: string[]
  words?: string[]
  activities?: RawActivity[]
}

interface RawActivity {
  type: string
  text?: string
  instruction?: string
  items?: string[]
  words?: string[]
  count?: number
  lines?: number
  label?: boolean
  pro?: boolean
  op?: string
  maxValue?: number
  dots?: boolean
}

const SYSTEM = `You are an early-years teacher designing ONE delightful, printable A4 activity sheet for a child (UK primary school / EYFS) from whatever a parent types. Your job is to UNDERSTAND EXACTLY what they mean — read their words carefully, infer intent, and pick the single most appropriate kind of sheet and the best content for it. Be as thoughtful as a great human teacher. Reply with ONLY a compact JSON object, no prose.

Decide "kind" by what the child is really meant to practise:

- "counting": learning to count 1..N (e.g. "numbers to 10", "count to 5"). Include "maxCount" (2-20).

- "sequence": skip-counting / multiples / times tables (e.g. "multiples of 10", "counting in 5s", "3 times table"). Include "numbers" (exact ordered list, max 12) and a short "title".

- "letter": a letter-sound / phonics lesson WHERE THE EXAMPLE WORDS ARE CONCRETE, DRAWABLE NOUNS — a single letter or a digraph practised through pictures (e.g. "letter b", "the sh sound", "words starting with t" → ship/shark, ball/bat). Include "grapheme" (1-3 lowercase letters) and "objects": 4-6 excellent, iconic, drawable picture-nouns that genuinely use that sound. Only use this when the words can be drawn.

- "words": a set of SPECIFIC WORDS to read / spell / write that are NOT easily drawn — high-frequency / sight / tricky / "common exception" words, spelling lists, or when the parent NAMES or IMPLIES particular words. This is the right choice for function words. Examples that MUST be "words", not "letter": "words like there, then, that", "th words such as there then that this", "sight words", "tricky words", "spellings: because friend said", "the ir words: bird girl shirt" (if they clearly mean word-reading not pictures). Include "title" and "words": the exact 4-8 words to feature (use the parent's own words if they gave them; otherwise pick the classic ones for that group). No pictures are used — these become read/trace/find/write activities.

- "pictorial": a THEME to colour (animals, space, seasons, festivals…) where colouring pictures is the whole point. Include "title" and "objects": 4-6 concrete, drawable things that tell the topic's story.

- "composed": ANYTHING that needs a real, interactive worksheet rather than one fixed format — especially GRAMMAR/LITERACY CONCEPTS (nouns, verbs, adjectives, opposites, rhyming, plurals, syllables), maths concepts, or any request like "an interactive sheet about X", "activities for Y". You DESIGN the sheet by choosing an ordered list of "activities" (3-6 blocks) from this palette:
    • {"type":"note","text":"short caption or definition, CAPS-friendly"}
    • {"type":"pictures","instruction":"...","items":["dog","house",...],"label":true}  — colour (and label) drawable objects; ONLY use drawable nouns here
    • {"type":"circleWords","instruction":"Circle the nouns","words":["dog","run","cat","happy",...]}  — a mix; the child circles the ones that fit
    • {"type":"readWords","instruction":"Read these words","words":[...]}
    • {"type":"traceWords","instruction":"Trace the words","words":[...]}
    • {"type":"wordSearch","instruction":"Find the words","words":[...]}
    • {"type":"writeLines","instruction":"Write 3 nouns","count":3}
    • {"type":"sentence","instruction":"Write a sentence","lines":2}
    • {"type":"sums","instruction":"Add these","op":"add"|"subtract"|"mixed","maxValue":20,"count":10,"dots":false}  — correct addition/subtraction sums drawn in code; use for maths topics ("adding to 10", "subtraction", "sums to 20"). Set dots:true only for the youngest (maxValue ≤ 10). For a full maths page use TWO sums blocks (e.g. addition then subtraction).
  DESIGN A FULL, CONNECTED LESSON — not a few disconnected mini-exercises:
  - Use 4 activities (plus a short "note" definition first) so the whole A4 page is full, not sparse.
  - Make them PROGRESS: recognise → apply → create. e.g. first look at/colour examples, then use them, then write your own.
  - LINK the activities to each other: reuse the SAME nouns/words/pictures across blocks so it reads as one lesson. If block 1 pictures a balloon, mouse, apple and tree, then the "circleWords"/"wordSearch"/"writeLines"/"sentence" blocks should be about describing or using THOSE things — not unrelated words.
  - Prefer this arc for a concept: {note definition} → {pictures of 4 real things to colour, label:true so the child writes a word for each} → {circleWords: a word bank mixing the target type with others} → {sentence: write a sentence using one} (mark the last as "pro":true). Adapt the blocks to the topic.
  Add "pro":true to the LAST 1-2 blocks (Pro-only; free users still get the earlier ones). Keep every "instruction" very short — 2 to 5 words, like a worksheet heading. Include a warm "title" (max 4 words).

Key judgement: understand the REAL learning goal, then choose the format that teaches it best — don't force a concept into a colouring grid. Phonics with drawable examples → "letter"; sight/function/named words → "words"; a theme to colour → "pictorial"; a concept or open-ended "make me an activity sheet" → "composed". When the parent names specific words/examples, use THOSE.

Rules: age-appropriate and child-safe; no copyrighted characters or brands; "items"/"objects" must be drawable nouns; text blocks may use any words. Always give a warm, specific "title".

Examples:
{"kind":"composed","title":"Nouns are naming words","activities":[{"type":"note","text":"A noun is a person, place or thing"},{"type":"pictures","instruction":"Colour and name","items":["dog","house","ball","apple"],"label":true},{"type":"circleWords","instruction":"Circle the nouns","words":["dog","run","house","happy","ball","jump"]},{"type":"sentence","instruction":"Write a sentence","lines":2,"pro":true}]}
{"kind":"composed","title":"Adding to 20","activities":[{"type":"note","text":"Work out each sum. Write your answer."},{"type":"sums","instruction":"Addition","op":"add","maxValue":20,"count":9},{"type":"sums","instruction":"Subtraction","op":"subtract","maxValue":20,"count":9,"pro":true}]}
{"kind":"words","title":"Tricky th words","words":["there","then","that","this","them","they"]}
{"kind":"letter","grapheme":"th","title":"Words beginning with th","objects":["thumb","thermometer","thunder","throne"]}
{"kind":"sequence","title":"Counting in 10s","numbers":[10,20,30,40,50,60,70,80,90,100]}`

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
      // Sonnet 5 runs adaptive thinking by default, and max_tokens caps
      // thinking + output together — so thinking could eat the budget and
      // truncate the JSON. This is a fast classification/extraction task, so
      // turn thinking off and keep the whole budget for the plan.
      thinking: { type: 'disabled' },
      max_tokens: 800,
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
      case 'composed': {
        const activities = normalizeActivities(raw.activities || [])
        if (activities.length < 2) return null
        return {
          category: 'composed',
          subject: raw.title || topic,
          title: sheetTitle(raw.title || topic),
          activities,
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
