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

export interface TopicPlan {
  category: TopicCategory
  subject: string // cleaned, human-readable topic
  prompt: string // the text-to-image prompt
  title?: string // a friendly heading printed on the sheet (CAPS, A–Z only)
  glyph?: GlyphSpec // deterministic overlay for letters/numbers (later stage)
  numbers?: number[] // for 'sequence' — the exact numbers to render (e.g. multiples)
  objects?: string[] // for letter/pictorial — generate each separately, then grid
  difficulty: Difficulty
}

// Turn any topic label into a clean CAPS heading our glyph font can render
// (it draws A–Z and 0–9 only, so drop everything else).
export function sheetTitle(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 26)
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
      category: 'number',
      subject: `Numbers 1–${maxN}`,
      prompt: '',
      glyph: { kind: 'numberRange', value: `1-${maxN}` },
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
