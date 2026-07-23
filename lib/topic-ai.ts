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
  numberActivities,
  objectsPrompt,
  pictorialActivities,
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
      case 'countObjects':
        out.push({ type: 'countObjects', instruction: instr, count: Math.max(2, Math.min(8, Math.round(a.count || 4))), maxCount: Math.max(2, Math.min(12, Math.round(a.maxCount || 5))), pro })
        break
      case 'countPictures': {
        const items = (a.items || []).map((s) => String(s)).filter(Boolean).slice(0, 4)
        if (items.length) out.push({ type: 'countPictures', instruction: instr, items, pro })
        break
      }
      case 'clocks': {
        const mode = a.mode === 'draw' ? 'draw' : 'read'
        const level = (['oclock', 'half', 'quarter', 'five'] as const).includes(a.level as 'oclock' | 'half' | 'quarter' | 'five') ? (a.level as 'oclock' | 'half' | 'quarter' | 'five') : 'half'
        out.push({ type: 'clocks', instruction: instr, mode, level, count: Math.max(2, Math.min(6, Math.round(a.count || 4))), pro })
        break
      }
      case 'traceNumbers':
        out.push({ type: 'traceNumbers', instruction: instr, upTo: Math.max(3, Math.min(20, Math.round(a.upTo || 10))), pro })
        break
    }
  }
  // Variety guard: keep the sheet a MIX, never one repeated task. Cap any single
  // block type at 2 so the planner can't return "all sums" or "all circle".
  const seen: Record<string, number> = {}
  return out.filter((a) => {
    seen[a.type] = (seen[a.type] || 0) + 1
    return a.type === 'note' || seen[a.type] <= 2
  })
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
  maxCount?: number
  upTo?: number
  mode?: string
  level?: string
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
    • {"type":"sums","instruction":"Add these","op":"add"|"subtract"|"mixed","maxValue":20,"count":10,"dots":false}  — correct addition/subtraction sums drawn in code; use for maths topics ("adding to 10", "subtraction", "sums to 20"). Set dots:true only for the youngest (maxValue ≤ 10).
    • {"type":"countObjects","instruction":"Count and colour","count":5,"maxCount":10}  — groups of dots to colour in and count, writing how many. A colour+count block for number topics.
    • {"type":"countPictures","instruction":"Count and colour","items":["moon","lantern",...]}  — count-and-colour using the topic's OWN pictures (each group is copies of one object). USE THIS INSTEAD OF countObjects on a picture THEME so the counting stays on-topic. items must be the same drawable nouns used in the pictures block.
    • {"type":"traceNumbers","instruction":"Trace the numbers","upTo":10}  — dotted numerals 1..N to write over.
    • {"type":"clocks","instruction":"What time is it?","mode":"read"|"draw","level":"half"|"quarter"|"five","count":6}  — correct analogue clock faces drawn in code, for telling-the-time topics. mode:read shows the time to write down (free, all ages); mode:draw prints the time for the child to draw the hands (ages 9-10 only). level scales with age: half=o'clock & half past (youngest), quarter=quarter times, five=any 5-minute interval (oldest).

  VARIETY IS THE POINT — a single-skill sheet bores a child. Every sheet MUST mix 3-4 DIFFERENT activity FAMILIES; never repeat one task:
    COLOUR = pictures/countObjects/countPictures · WRITE = traceWords/traceNumbers/writeLines/sentence · PUZZLE = circleWords/wordSearch/readWords · DO = sums/countObjects/clocks
  EVERY activity MUST relate to the requested topic — never drop in an off-topic filler (e.g. abstract dot-counting on a Ramadan sheet). On a picture theme, count the theme's OWN pictures with countPictures.
  EVERY activity MUST genuinely TEST THE STATED CONCEPT, and the labelling task must ask for the RIGHT KIND of word: for adjectives the child WRITES A WORD THAT DESCRIBES each picture (instruction "Colour and describe" — NOT "name"); for verbs, the action word; for nouns, the name; for opposites, the opposite; for rhymes, a rhyming word. Never set a labelling task that tests a different word class than the topic.
  The circleWords / word bank MUST be built from words that actually apply to the pictures on THIS sheet (e.g. adjectives that describe those exact pictured items) mixed with off-type distractors — not random unrelated words. Any writeLines/sentence task MUST point back at the sheet (e.g. instruction "Describe a picture above" or "Write three adjectives above"), never a bare "Write adjectives" with no context.
  ALWAYS include a colour or count-and-colour block for ages 3-5. Age 3-5 → mostly colour/trace/count with ONE easy puzzle, bigger and fewer. Age 6-10 → more write/puzzle/challenge, less colouring.
  Numbers example: {countObjects} + {traceNumbers} + {sums} (colour+count → write → do). Concept example: {pictures} + {circleWords} + {sentence}.
  DESIGN A FULL, CONNECTED LESSON — not a few disconnected mini-exercises:
  - Use 4 activities (plus a short "note" definition first) so the whole A4 page is full, not sparse.
  - Make them PROGRESS: recognise → apply → create. e.g. first look at/colour examples, then use them, then write your own.
  - LINK the activities to each other: reuse the SAME nouns/words/pictures across blocks so it reads as one lesson. If block 1 pictures a balloon, mouse, apple and tree, then the "circleWords"/"wordSearch"/"writeLines"/"sentence" blocks should be about describing or using THOSE things — not unrelated words.
  - Prefer this arc for a concept: {note definition} → {pictures of 4 real things to colour, label:true so the child writes a word for each} → {circleWords: a word bank mixing the target type with others} → {sentence: write a sentence using one}. Adapt the blocks to the topic.
  Keep every "instruction" very short — 2 to 5 words, like a worksheet heading. Include a warm "title" (max 4 words).

Key judgement: understand the REAL learning goal, then choose the format that teaches it best — don't force a concept into a colouring grid. Phonics with drawable examples → "letter"; sight/function/named words → "words"; a theme to colour → "pictorial"; a concept or open-ended "make me an activity sheet" → "composed". When the parent names specific words/examples, use THOSE.

Rules: age-appropriate and child-safe; no copyrighted characters or brands; "items"/"objects" must be drawable nouns; text blocks may use any words. Always give a warm, specific "title".

Examples:
{"kind":"composed","title":"Nouns are naming words","activities":[{"type":"note","text":"A noun is a person, place or thing"},{"type":"pictures","instruction":"Colour and name","items":["dog","house","ball","apple"],"label":true},{"type":"circleWords","instruction":"Circle the nouns","words":["dog","run","house","happy","ball","jump"]},{"type":"writeLines","instruction":"Write three naming words above","count":3}]}
{"kind":"composed","title":"Adjectives describe things","activities":[{"type":"note","text":"An adjective is a describing word"},{"type":"pictures","instruction":"Colour and describe","items":["apple","mouse","tree","balloon"],"label":true},{"type":"circleWords","instruction":"Circle the adjectives","words":["red","run","tiny","dog","tall","jump","shiny","soft"]},{"type":"writeLines","instruction":"Describe a picture above","count":3}]}
{"kind":"composed","title":"Numbers to 10","activities":[{"type":"note","text":"Count, trace and add."},{"type":"countObjects","instruction":"Count and colour","count":6,"maxCount":10},{"type":"traceNumbers","instruction":"Trace the numbers","upTo":10},{"type":"sums","instruction":"Add them up","op":"add","maxValue":10,"count":6,"dots":true}]}
{"kind":"composed","title":"Adding to 20","activities":[{"type":"note","text":"Work out each sum."},{"type":"countObjects","instruction":"Count and colour","count":6,"maxCount":20},{"type":"sums","instruction":"Add and subtract","op":"mixed","maxValue":20,"count":10}]}
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
        const maxN = Math.max(3, Math.min(20, Math.round(raw.maxCount || 10)))
        return {
          category: 'composed',
          subject: `Numbers 1–${maxN}`,
          title: sheetTitle(`Numbers to ${maxN}`),
          activities: numberActivities(maxN),
          prompt: '',
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
        // A theme is a VARIED sheet now, not just a colour page: colour & label
        // the pictures, then a puzzle / count / write on the same objects.
        return {
          category: 'composed',
          subject: raw.title || topic,
          title: sheetTitle(raw.title || topic),
          objects: objs,
          activities: pictorialActivities(objs, difficulty),
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
