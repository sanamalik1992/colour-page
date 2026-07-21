/**
 * Topic -> image-prompt construction for the "What are they learning today?"
 * feature.
 *
 * This is the make-or-break of the feature: it turns whatever a parent types
 * ("letter B", "numbers to 10", "minibeasts") into a text-to-image prompt that
 * reliably produces a clean, child-friendly, colour-in-able line-art sheet that
 * genuinely matches the topic.
 *
 * Design goals:
 *  - One pure function, `buildTopicPrompt()`, easy to iterate on.
 *  - Detect the common primary-school topic *categories* first, then apply a
 *    category-specific "layout brief" template.
 *  - A shared STYLE_SUFFIX pins the output to the same look as the existing
 *    photo colouring pages (clean closed contours, no shading) so it flows
 *    through the same PDF + dot-to-dot steps.
 *  - Return a `glyph` descriptor for letter/number topics. Flux renders text
 *    unreliably, so those glyphs are drawn deterministically by us on top of
 *    the generated objects (wired in a later stage); the field is populated
 *    now so the shape is stable.
 */

export type TopicCategory =
  | 'letter'
  | 'words'
  | 'composed'
  | 'number'
  | 'sequence'
  | 'shapes'
  | 'animals'
  | 'space'
  | 'colours'
  | 'minibeasts'
  | 'generic'

export type Difficulty = {
  detailLevel: 'low' | 'medium' | 'high'
  lineThickness: 'thin' | 'medium' | 'thick'
  dotCount: number
}

export interface GlyphSpec {
  kind: 'letter' | 'numberRange'
  // For 'letter': the single character (e.g. "B"). For 'numberRange': "1-10".
  value: string
}

// A composable palette of activity blocks the planner can arrange into ONE
// sheet, in order. This is what lets the tool handle open-ended requests
// ("an interactive sheet about nouns") — the AI designs the sheet from these
// building blocks instead of being forced into a fixed template. Every block
// except `pictures` renders deterministically (our glyph font), so text is
// always correct; `pictures` uses the image model for the named objects.
export type ActivityKind =
  | { type: 'note'; text: string } // a short caption / definition line
  | { type: 'pictures'; instruction: string; items: string[]; label?: boolean } // colour (and optionally label) each object
  | { type: 'circleWords'; instruction: string; words: string[] } // circle the ones that match the rule
  | { type: 'traceWords'; instruction: string; words: string[] } // trace dotted words
  | { type: 'wordSearch'; instruction: string; words: string[] }
  | { type: 'readWords'; instruction: string; words: string[] }
  | { type: 'writeLines'; instruction: string; count: number } // numbered write-in lines
  | { type: 'sentence'; instruction: string; lines: number } // ruled sentence lines
  // Deterministic maths: correct sums generated in code (never the image model).
  | { type: 'sums'; instruction: string; op: 'add' | 'subtract' | 'mixed'; maxValue: number; count: number; dots?: boolean }
  | { type: 'countObjects'; instruction: string; count: number; maxCount: number } // colour & count groups of dots, write how many
  | { type: 'traceNumbers'; instruction: string; upTo: number } // trace dotted numerals 1..N

// `pro: true` blocks only render on Pro sheets; free sheets show the rest.
export type Activity = ActivityKind & { pro?: boolean }

export interface TopicPlan {
  category: TopicCategory
  subject: string // cleaned, human-readable topic
  prompt: string // the text-to-image prompt
  title?: string // a friendly heading printed on the sheet (CAPS, A–Z only)
  glyph?: GlyphSpec // deterministic overlay for letters/numbers (later stage)
  numbers?: number[] // for 'sequence' — the exact numbers to render (e.g. multiples)
  objects?: string[] // for letter/pictorial — generate each separately, then grid
  activities?: Activity[] // for 'composed' — a designed sequence of activity blocks
  difficulty: Difficulty
}

// Turn any topic label into a clean CAPS heading our glyph font can render
// (it draws A–Z and 0–9 only, so drop everything else). Trims to a whole-word
// boundary so a long title never loses its last letter mid-word.
export function sheetTitle(s: string): string {
  const clean = s.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  if (clean.length <= 30) return clean
  const cut = clean.slice(0, 30)
  const sp = cut.lastIndexOf(' ')
  return (sp > 12 ? cut.slice(0, sp) : cut).trim()
}

// Pins every prompt to the existing colouring-page look. Tuning this affects
// all categories at once. Deliberately avoids instruction-like wording
// ("worksheet", "show 3…") because diffusion models render those words as
// garbled text in the picture — hence the explicit no-text ban.
const STYLE_SUFFIX =
  'Simple bold black and white coloring book line art for young children. ' +
  'Thick clean outlines, large friendly cartoon shapes filling the page, plenty ' +
  'of white space inside each shape to colour. Pure white background. No shading, ' +
  'no grey, no colour, no photorealism. IMPORTANT: absolutely no text, no words, ' +
  'no letters, no numbers, no captions, no title, no labels, no writing and no ' +
  'border frame anywhere in the image — pictures only.'

// A clean, instruction-free prompt for a set of objects (used by letter and
// phonics sheets, where we stamp the letter ourselves and only need the model
// to draw the objects).
export function objectsPrompt(objs: string[]): string {
  return `Coloring book line art of ${objs.length} separate simple objects, each ` +
    `drawn large with space around it: ${objs.join(', ')}. ${STYLE_SUFFIX}`
}

// One clear, whole object filling the frame — used per sticker cell so each
// picture is instantly recognisable and never merged with another (no puns).
export function singleObjectPrompt(obj: string): string {
  return `Coloring book line art of one single ${obj}. A whole ${obj}, big and bold, ` +
    `centred and filling the frame, instantly recognisable to a small child, cheerful ` +
    `friendly cartoon style with a happy face if it is a creature. Only one ${obj} and ` +
    `nothing else in the picture. ${STYLE_SUFFIX}`
}

// A pictorial colouring prompt for a set of concrete subjects.
export function pictorialPrompt(items: string[]): string {
  return `Coloring book line art of ${items.length} large separate simple pictures: ` +
    `${items.join(', ')}. ${STYLE_SUFFIX}`
}

/**
 * Map an optional child age (3-10) to generation + dot-to-dot difficulty.
 * Younger -> simpler and bolder; older -> more detail and more dots.
 */
export function difficultyForAge(age?: number): Difficulty {
  if (typeof age !== 'number' || Number.isNaN(age)) {
    return { detailLevel: 'medium', lineThickness: 'medium', dotCount: 50 }
  }
  if (age <= 5) return { detailLevel: 'low', lineThickness: 'thick', dotCount: 32 }
  if (age <= 8) return { detailLevel: 'medium', lineThickness: 'medium', dotCount: 50 }
  return { detailLevel: 'high', lineThickness: 'thin', dotCount: 72 }
}

// How many distinct elements to ask for, by age band. Younger children get
// fewer, bigger things on the page.
function elementCount(d: Difficulty): number {
  return d.detailLevel === 'low' ? 3 : d.detailLevel === 'high' ? 6 : 4
}

// A few colour-in-friendly objects per letter (kept deliberately concrete and
// child-recognisable). Used for "letter X" sheets.
const LETTER_OBJECTS: Record<string, string[]> = {
  a: ['apple', 'ant', 'aeroplane'],
  b: ['ball', 'bear', 'banana'],
  c: ['cat', 'car', 'cake'],
  d: ['dog', 'duck', 'drum'],
  e: ['egg', 'elephant', 'envelope'],
  f: ['fish', 'flower', 'frog'],
  g: ['goat', 'grapes', 'guitar'],
  h: ['hat', 'house', 'horse'],
  i: ['igloo', 'ice cream', 'insect'],
  j: ['jam jar', 'jellyfish', 'jug'],
  k: ['kite', 'key', 'kangaroo'],
  l: ['lion', 'leaf', 'ladder'],
  m: ['mouse', 'moon', 'mushroom'],
  n: ['nest', 'nut', 'net'],
  o: ['orange', 'owl', 'octopus'],
  p: ['pig', 'pear', 'pencil'],
  q: ['queen', 'quilt', 'question mark'],
  r: ['rabbit', 'rocket', 'ring'],
  s: ['sun', 'snake', 'star'],
  t: ['tree', 'train', 'turtle'],
  u: ['umbrella', 'unicorn', 'cup'],
  v: ['van', 'violin', 'vase'],
  w: ['whale', 'watch', 'wheel'],
  x: ['fox', 'box', 'xylophone'],
  y: ['yo-yo', 'yacht', 'yogurt pot'],
  z: ['zebra', 'zip', 'zigzag'],
}

// Common phonics digraphs → objects that use that sound. Kept concrete, whole
// and easy for a small child to recognise and colour (no abstract words).
const DIGRAPH_OBJECTS: Record<string, string[]> = {
  sh: ['ship', 'shark', 'shoe', 'shell', 'sheep', 'shed'],
  ch: ['chair', 'cheese', 'cherry', 'chick', 'chips', 'chain'],
  th: ['thumb', 'thermometer', 'thunder', 'throne', 'thread', 'thorn'],
  ng: ['ring', 'king', 'swing', 'wing', 'sting', 'kangaroo'],
  oo: ['moon', 'boot', 'spoon', 'balloon', 'broom', 'igloo'],
  ee: ['bee', 'tree', 'sheep', 'feet', 'queen', 'wheel'],
  ai: ['rain', 'train', 'snail', 'tail', 'sail', 'nail'],
  oa: ['boat', 'goat', 'coat', 'soap', 'toast', 'road'],
  ck: ['duck', 'sock', 'clock', 'rock', 'truck', 'brick'],
  qu: ['queen', 'quilt', 'quill', 'squid'],
  ph: ['phone', 'photo', 'dolphin', 'elephant'],
  wh: ['whale', 'wheel', 'whisk', 'wheat'],
  ar: ['star', 'car', 'jar', 'shark'],
  or: ['fork', 'corn', 'horse', 'fort'],
  ir: ['bird', 'girl', 'shirt', 'skirt'],
  ur: ['nurse', 'turtle', 'purse', 'burger'],
  ow: ['cow', 'owl', 'flower', 'crown'],
  ou: ['house', 'mouse', 'cloud', 'mouth'],
  oy: ['boy', 'toy', 'oyster'],
  oi: ['coin', 'soil', 'foil'],
  ay: ['tray', 'crayon', 'hay', 'spray'],
  ea: ['leaf', 'seal', 'peach', 'bead'],
  igh: ['light', 'knight', 'kite'],
  aw: ['saw', 'claw', 'straw', 'paw'],
}

const clean = (s: string) =>
  s.replace(/[‘’“”]/g, "'").trim().replace(/\s+/g, ' ')

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---- category detection ---------------------------------------------------

function detectLetter(topic: string): string | null {
  const m = topic.match(/\bletter\s+([a-z])\b/i) || topic.match(/^\s*([a-z])\s*$/i)
  if (m) return m[1].toLowerCase()
  return null
}

// Phonics / letter-sound topics: "phonics h", "sh sound", "the 'ch' sound",
// "phoneme s", "digraph sh". Returns the grapheme (1-3 letters) or null.
// Parses by stripping keywords/punctuation (robust to straight and curly
// quotes) and taking the remaining short letter token — so "phonics 'sh'"
// yields "sh", not the trailing "s" of "phonics".
const PHONICS_STOP = new Set([
  'phonics', 'phonic', 'phoneme', 'phonemes', 'digraph', 'digraphs', 'grapheme',
  'sound', 'sounds', 'the', 'of', 'for', 'and', 'a', 'letter', 'letters',
  'practice', 'practise', 'writing', 'handwriting', 'today', 'learning', 'learn',
])
function detectPhonics(topic: string): string | null {
  if (!/\b(phonic|phonics|phoneme|digraph|grapheme|sound)\b/i.test(topic)) return null
  const words = topic
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ') // drop quotes/punctuation (incl. curly ')
    .split(/\s+/)
    .filter(Boolean)
  const grapheme = words.find((w) => !PHONICS_STOP.has(w) && w.length >= 1 && w.length <= 3)
  return grapheme || null
}

// Everyday phrasings for a beginning-sound lesson that don't use the words
// "phonics"/"sound"/"digraph": "words beginning with th", "words that start
// with s", "th words", "initial sound b". Returns the grapheme or null.
function detectBeginningSound(topic: string): string | null {
  const t = topic.toLowerCase()
  let m = t.match(/\bwords?\s+(?:that\s+)?(?:begin|beginning|start|starting)\s+with\s+(?:the\s+)?(?:letter\s+|sound\s+)?['"]?([a-z]{1,3})['"]?/)
  if (m) return m[1]
  m = t.match(/\b(?:begin|beginning|initial|start|starting)\s+(?:sound|letter)s?\s+(?:of\s+)?['"]?([a-z]{1,3})['"]?/)
  if (m) return m[1]
  m = t.match(/\bwords?\s+with\s+(?:the\s+)?['"]?([a-z]{1,3})['"]?\s+sound\b/)
  if (m) return m[1]
  // "th words" / "sh words" — require a known grapheme so we don't misread
  // things like "sight words" or "tricky words".
  m = t.match(/\b['"]?([a-z]{1,3})['"]?\s+words\b/)
  if (m && (m[1].length === 1 || m[1] in DIGRAPH_OBJECTS)) return m[1]
  return null
}

// Sight / tricky / high-frequency / spelling words, or an explicit list the
// parent gave ("words like there, then, that", "sight words: was said the").
// These are read/traced/written, not drawn — so they get a word-practice sheet.
const WORD_CUES = /\b(sight|tricky|high[- ]?frequency|hfw|common(?:\s+exception)?|spelling|spellings)\b/i
const WORD_STOP = new Set([
  'words', 'word', 'like', 'such', 'as', 'including', 'sight', 'tricky', 'high',
  'frequency', 'hfw', 'common', 'exception', 'exceptions', 'spelling', 'spellings',
  'reading', 'read', 'practice', 'practise', 'list', 'the', 'and', 'or', 'of', 'for',
  'my', 'these', 'today', 'learning', 'learn', 'that', 'begin', 'beginning', 'start',
  'starting', 'with', 'ending', 'end',
])
function detectWordPractice(topic: string): { words: string[]; title: string } | null {
  const t = topic.toLowerCase()
  const listMatch = t.match(/(?:like|such as|including|:|-|—)\s*(.+)$/)
  const source = listMatch ? listMatch[1] : t
  const tokens = source
    .split(/[,/]|\band\b|\bor\b|\s+/)
    .map((s) => s.replace(/[^a-z]/g, ''))
    .filter(Boolean)
  // Keep the actual words (allow "that" etc. through only as list content).
  const words = tokens.filter((w) => w.length >= 2 && w.length <= 12 && !WORD_STOP.has(w))
  const explicitList = /\bwords?\s+(?:like|such as|including)\b/.test(t) || /:/.test(t)
  const hasCue = WORD_CUES.test(t) || explicitList
  if (hasCue && words.length >= 2) {
    return { words: words.slice(0, 8), title: WORD_CUES.test(t) ? 'My tricky words' : 'My words' }
  }
  return null
}

// Grammar / literacy concepts a colouring page can't represent as a single
// picture. Each becomes a designed, multi-activity "composed" sheet. The AI
// planner handles the long tail; this keeps the common ones working offline.
// Connected 4-activity lessons: colour real examples → sort/apply → create.
// The pictures and the word bank relate to each other so it reads as one lesson.
const CONCEPTS: Record<string, { title: string; note: string; pics: string[]; mixed: string[]; word: string; verb: string }> = {
  noun: { word: 'NOUN', verb: 'NAME', title: 'Nouns are naming words', note: 'A NOUN IS A PERSON PLACE OR THING', pics: ['dog', 'house', 'ball', 'apple'], mixed: ['dog', 'run', 'house', 'happy', 'ball', 'jump', 'apple', 'fast'] },
  verb: { word: 'VERB', verb: 'NAME', title: 'Verbs are doing words', note: 'A VERB IS AN ACTION WORD', pics: ['running', 'jumping', 'swimming', 'hopping'], mixed: ['run', 'cat', 'jump', 'table', 'swim', 'happy', 'hop', 'tree'] },
  adjective: { word: 'ADJECTIVE', verb: 'DESCRIBE', title: 'Adjectives describe things', note: 'AN ADJECTIVE IS A DESCRIBING WORD', pics: ['balloon', 'mouse', 'apple', 'tree'], mixed: ['big', 'dog', 'red', 'run', 'tall', 'jump', 'soft', 'shiny'] },
}
function conceptKey(topic: string): string | null {
  const t = topic.toLowerCase()
  if (/\bnouns?\b|naming words?\b/.test(t)) return 'noun'
  if (/\bverbs?\b|doing words?\b|action words?\b/.test(t)) return 'verb'
  if (/\badjectives?\b|describing words?\b/.test(t)) return 'adjective'
  return null
}
// Simple arithmetic topics ("adding to 10", "subtraction", "sums to 20").
// Builds a full page: a note + two sums blocks, scaled by age band.
function detectSums(topic: string, d: Difficulty): Activity[] | null {
  const t = topic.toLowerCase()
  if (!/\b(sums?|adding|addition|add up|plus|subtract\w*|minus|take[\s-]?aways?|number bonds?|maths? problems?)\b/.test(t)) return null
  const mv = t.match(/\b(?:to|within|up to)\s+(\d{1,3})\b/) || t.match(/\b(\d{1,3})\b/)
  const band = d.detailLevel
  const defMax = band === 'low' ? 10 : band === 'high' ? 50 : 20
  const maxValue = mv ? Math.max(5, Math.min(100, parseInt(mv[1], 10))) : defMax
  const wantsAdd = /\b(add|adding|addition|plus|bond)/.test(t)
  const wantsSub = /\b(subtract|minus|take|less)/.test(t)
  const note: Activity = { type: 'note', text: 'Count, then work out each sum.' }
  // A count-and-colour warm-up gives the maths page some variety before the sums.
  const warmUp: Activity = { type: 'countObjects', instruction: 'Count and colour', count: band === 'low' ? 4 : 6, maxCount: Math.min(10, maxValue) }
  if (band === 'low') {
    return [note, warmUp, { type: 'sums', instruction: 'Count and add', op: wantsSub && !wantsAdd ? 'subtract' : 'add', maxValue: Math.min(10, maxValue), count: 8, dots: true }]
  }
  const n = band === 'high' ? 10 : 12
  const main = wantsSub && !wantsAdd ? 'subtract' : 'add'
  const other = main === 'add' ? 'subtract' : 'add'
  const mainInstr = main === 'add' ? 'Addition' : 'Subtraction'
  const otherInstr = other === 'add' ? 'Addition' : 'Subtraction'
  const second: Activity = wantsAdd !== wantsSub
    ? { type: 'sums', instruction: `More ${mainInstr.toLowerCase()}`, op: main, maxValue, count: n, pro: true }
    : { type: 'sums', instruction: otherInstr, op: other, maxValue, count: n, pro: true }
  return [note, warmUp, { type: 'sums', instruction: mainInstr, op: main, maxValue, count: n }, second]
}

// A varied counting sheet: count & colour groups → trace the numerals → a few
// simple sums. Mixes colour/count, write and do families in one page.
export function numberActivities(maxN: number): Activity[] {
  const n = Math.max(3, Math.min(20, Math.round(maxN)))
  return [
    { type: 'note', text: 'Count, trace and add.' },
    { type: 'countObjects', instruction: 'Count and colour', count: n <= 5 ? 4 : 6, maxCount: n },
    { type: 'traceNumbers', instruction: 'Trace the numbers', upTo: n },
    { type: 'sums', instruction: 'Add them up', op: 'add', maxValue: Math.min(10, n), count: 6, dots: n <= 10, pro: true },
  ]
}

function conceptActivities(key: string): Activity[] {
  const c = CONCEPTS[key]
  return [
    { type: 'note', text: c.note },
    { type: 'pictures', instruction: `Colour and ${c.verb.toLowerCase()}`, items: c.pics, label: true },
    { type: 'circleWords', instruction: `Circle the ${c.word.toLowerCase()}s`, words: c.mixed },
    { type: 'sentence', instruction: 'Write a sentence', lines: 2, pro: true },
  ]
}

// Objects that begin with (or use) a grapheme.
function objectsForGrapheme(g: string): string[] {
  if (g.length === 1) return LETTER_OBJECTS[g] || []
  return DIGRAPH_OBJECTS[g] || LETTER_OBJECTS[g[0]] || []
}

// Maths sequences: "multiples of 10", "counting in 5s", "count by 2",
// "2 times table", "times table of 3". Returns the numbers + a title, or null.
function detectSequence(topic: string): { numbers: number[]; title: string } | null {
  const m =
    topic.match(/\bmultiples?\s+of\s+(\d{1,2})\b/i) ||
    topic.match(/\bcount(?:ing)?\s+(?:in|by)\s+(\d{1,2})s?\b/i) ||
    topic.match(/\b(\d{1,2})\s*(?:x|times)\s*table\b/i) ||
    topic.match(/\btimes\s*tables?\s+(?:of\s+|for\s+)?(\d{1,2})\b/i)
  if (!m) return null
  const step = parseInt(m[1], 10)
  if (!step || step < 1 || step > 20) return null
  const numbers = Array.from({ length: 10 }, (_, i) => step * (i + 1))
  return { numbers, title: `Counting in ${step}s` }
}

function detectNumberMax(topic: string): number | null {
  if (!/\b(number|numbers|counting|count)\b/i.test(topic) && !/\bto\s+\d+\b/i.test(topic)) {
    // Also accept a bare "1-10" / "1 to 20"
    const bare = topic.match(/\b(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\b/i)
    if (bare) return Math.min(20, parseInt(bare[2], 10))
    return null
  }
  const to = topic.match(/\bto\s+(\d{1,2})\b/i) || topic.match(/\b(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\b/i)
  if (to) return Math.min(20, parseInt(to[to.length - 1], 10))
  return 10 // "numbers" / "counting" with no explicit max
}

/**
 * Build the full topic plan (prompt + metadata) from a typed topic and age.
 */
export function buildTopicPrompt(rawTopic: string, age?: number): TopicPlan {
  const topic = clean(rawTopic)
  const difficulty = difficultyForAge(age)
  const n = elementCount(difficulty)

  // --- letters & phonics (we stamp the grapheme; model draws objects only) ---
  const letter = detectLetter(topic)
  const phonics = letter ? null : detectPhonics(topic)
  const beginning = letter || phonics ? null : detectBeginningSound(topic)
  const grapheme = letter || phonics || beginning
  if (grapheme) {
    // Fill the sticker grid: 4 pictures for younger, up to 6 for older.
    const want = difficulty.detailLevel === 'high' ? 6 : 4
    const pool = objectsForGrapheme(grapheme)
    const objs = (pool.length ? pool : ['ball', 'cat', 'star', 'sun']).slice(0, want)
    const value = grapheme.toUpperCase()
    const isSound = !!(phonics || beginning) || grapheme.length > 1
    return {
      category: 'letter',
      subject: isSound ? `Sound "${grapheme}"` : `Letter ${value}`,
      title: isSound ? sheetTitle(`Words with ${value}`) : sheetTitle(`The letter ${value}`),
      objects: objs,
      prompt: objectsPrompt(objs), // fallback single-image prompt
      glyph: { kind: 'letter', value },
      difficulty,
    }
  }

  // --- grammar / literacy concepts (nouns, verbs, adjectives…) ---
  const ck = conceptKey(topic)
  if (ck) {
    return {
      category: 'composed',
      subject: CONCEPTS[ck].title,
      title: sheetTitle(CONCEPTS[ck].title),
      activities: conceptActivities(ck),
      prompt: '',
      difficulty,
    }
  }

  // --- simple sums (addition / subtraction), drawn deterministically ---
  const sums = detectSums(topic, difficulty)
  if (sums) {
    return { category: 'composed', subject: 'Sums', title: sheetTitle('Sums'), activities: sums, prompt: '', difficulty }
  }

  // --- sight / tricky / specific words (read-trace-write, no pictures) ---
  const wp = detectWordPractice(topic)
  if (wp) {
    return {
      category: 'words',
      subject: wp.title,
      title: sheetTitle(wp.title),
      objects: wp.words,
      prompt: '',
      difficulty,
    }
  }

  // --- maths sequences: multiples / counting in Ns / times tables ---
  const seq = detectSequence(topic)
  if (seq) {
    return {
      category: 'sequence',
      subject: seq.title,
      prompt: '',
      numbers: seq.numbers,
      difficulty,
    }
  }

  // --- numbers / counting (drawn deterministically; prompt unused) ---
  const maxN = detectNumberMax(topic)
  if (maxN) {
    return {
      category: 'composed',
      subject: `Numbers 1–${maxN}`,
      title: sheetTitle(`Numbers to ${maxN}`),
      activities: numberActivities(maxN),
      prompt: '',
      difficulty,
    }
  }

  // --- shapes ---
  if (/\bshapes?\b/i.test(topic) || /\b(circle|square|triangle|rectangle|star|oval|diamond)\b/i.test(topic)) {
    const prompt =
      `Coloring book line art of large separate basic shapes: a circle, a square, a ` +
      `triangle, a rectangle, a star and an oval. ${STYLE_SUFFIX}`
    return { category: 'shapes', subject: 'Shapes', prompt, difficulty }
  }

  // --- space ---
  if (/\b(space|planet|planets|rocket|solar system|astronaut|galaxy|stars?)\b/i.test(topic)) {
    const prompt =
      `Coloring book line art of a friendly rocket, a planet with rings, ${n} stars, a ` +
      `smiling crescent moon and a little astronaut, each large and separate. ${STYLE_SUFFIX}`
    return { category: 'space', subject: 'Space', prompt, difficulty }
  }

  // --- minibeasts / bugs ---
  if (/\b(minibeast|minibeasts|bug|bugs|insect|insects|creepy crawl)/i.test(topic)) {
    const beasts = ['a ladybird', 'a snail', 'a bumblebee', 'a caterpillar', 'a butterfly', 'a spider']
    const prompt =
      `Coloring book line art of ${n} large separate minibeasts: ${beasts.slice(0, n).join(', ')}. ` +
      `${STYLE_SUFFIX}`
    return { category: 'minibeasts', subject: 'Minibeasts', prompt, difficulty }
  }

  // --- colours (rainbow) ---
  if (/\bcolou?rs?\b/i.test(topic) || /\brainbow\b/i.test(topic)) {
    const prompt =
      `Coloring book line art of a large rainbow with an apple, a sun, a leaf and a ` +
      `raindrop, each large and separate. ${STYLE_SUFFIX}`
    return { category: 'colours', subject: 'Colours', prompt, difficulty }
  }

  // --- animals (broad) ---
  if (/\b(animal|animals|farm|jungle|zoo|pets?|dinosaur|dinosaurs|sea creatures|ocean)\b/i.test(topic)) {
    const subject = titleCase(topic)
    const prompt =
      `Coloring book line art of ${n} large separate ${subject.toLowerCase()}, friendly ` +
      `cartoon outlines. ${STYLE_SUFFIX}`
    return { category: 'animals', subject, prompt, difficulty }
  }

  // --- generic fallback ---
  const subject = titleCase(topic)
  const prompt =
    `Coloring book line art of ${n} large separate simple pictures of ${subject.toLowerCase()}. ` +
    `${STYLE_SUFFIX}`
  return { category: 'generic', subject, prompt, difficulty }
}
