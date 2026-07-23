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
  | { type: 'countPictures'; instruction: string; items: string[] } // count & colour groups of the topic's own pictures, write how many
  | { type: 'traceNumbers'; instruction: string; upTo: number } // trace dotted numerals 1..N
  // Deterministic clocks: correct analogue faces drawn in code (never the image model).
  | { type: 'clocks'; instruction: string; mode: 'read' | 'draw'; level: 'oclock' | 'half' | 'quarter' | 'five'; count: number }
  // Deterministic times table: `table × k = ?` (or ÷), correct by construction.
  | { type: 'timesTable'; instruction: string; table: number; upTo: number; op: 'multiply' | 'divide'; shuffle: boolean }
  // Visual multiplication for the youngest: k groups of `table` countable circles.
  | { type: 'multiplyGroups'; instruction: string; table: number; upTo: number }
  // Number bonds — deterministic, correct by construction.
  | { type: 'tenFrame'; instruction: string; whole: number; count: number } // make-N ten-frame visual
  | { type: 'partWhole'; instruction: string; whole: number; count: number } // part-whole model
  | { type: 'bonds'; instruction: string; whole: number; count: number; style: 'missing' | 'subtract' } // missing-number / inverse sentences
  // Shapes — deterministic 2D/3D drawings + properties + sorting.
  | { type: 'shapeGallery'; instruction: string; shapes: string[]; label: boolean } // name &/or colour shapes
  | { type: 'shapeProps'; instruction: string; shapes: string[]; dims: string[] } // count sides/corners or faces/edges/vertices
  | { type: 'shapeSort'; instruction: string; shapes: string[] } // sort into 2D / 3D
  // Reusable, deterministic sorters/matchers (unlock many topics: odd/even,
  // grammar word-class sorts, synonym/antonym matching, etc.).
  | { type: 'sortTwoGroups'; instruction: string; items: string[]; labelA: string; labelB: string } // word bank → two labelled bins
  | { type: 'matchLines'; instruction: string; left: string[]; right: string[] } // draw a line to join each pair
  // Fractions — deterministic shaded shapes and fractions of amounts.
  | { type: 'fractionShade'; instruction: string; fractions: { n: number; d: number }[]; mode: 'shade' | 'write' } // colour the fraction / name the shaded fraction
  | { type: 'fractionOf'; instruction: string; problems: { n: number; d: number; whole: number }[] } // n/d of an amount, with countable dots
  // Comparing numbers with < > =.
  | { type: 'compareNumbers'; instruction: string; pairs: { a: number; b: number }[] }
  // Place value — base-10 tens rods + unit cubes, write the number.
  | { type: 'placeValue'; instruction: string; numbers: number[] }
  // Counting / skip-counting: a track of numbers with blanks to fill.
  | { type: 'numberTrack'; instruction: string; start: number; step: number; count: number }
  // Money — draw UK coins, total them into a box.
  | { type: 'coins'; instruction: string; groups: number[][] }

// `pro` is retained on the type for schema stability but is no longer used to
// gate content — every sheet renders all of its activities (free == Pro).
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

// Some object names are ambiguous to a diffusion model and come back as a vague
// blob (e.g. "moon" → a plain disc that reads as a planet). Map those to the
// single, iconic, instantly-nameable form a child would recognise so every
// picture is clear. Only add entries where the plain word is genuinely unclear.
const OBJECT_CLARITY: Record<string, string> = {
  moon: 'crescent moon',
  star: 'five-pointed star',
  sun: 'bright sun with rays',
  cloud: 'fluffy cloud',
  heart: 'love heart',
  snowflake: 'six-point snowflake',
  leaf: 'single leaf',
  flower: 'daisy flower',
  tree: 'leafy tree',
  fish: 'side-view fish',
  bird: 'small side-view bird',
  butterfly: 'symmetrical butterfly',
}
export function clarifyObject(obj: string): string {
  const key = obj.trim().toLowerCase()
  return OBJECT_CLARITY[key] || obj.trim()
}

// A clean, instruction-free prompt for a set of objects (used by letter and
// phonics sheets, where we stamp the letter ourselves and only need the model
// to draw the objects).
export function objectsPrompt(objs: string[]): string {
  return `Coloring book line art of ${objs.length} separate simple objects, each ` +
    `drawn large with space around it: ${objs.map(clarifyObject).join(', ')}. ${STYLE_SUFFIX}`
}

// One clear, whole object filling the frame — used per sticker cell so each
// picture is instantly recognisable and never merged with another (no puns).
export function singleObjectPrompt(obj: string): string {
  const o = clarifyObject(obj)
  return `Coloring book line art of one single ${o}. A whole, complete, well-formed ${o} ` +
    `shown in full — the entire ${o} clearly visible including its head, body and legs, ` +
    `nothing cut off or cropped — big and bold, centred and filling the frame, with a simple, ` +
    `clean, unmistakable outline that a small child could name at a glance, cheerful friendly ` +
    `cartoon style with a happy face if it is a creature. Correct, recognisable anatomy; not ` +
    `a blob. Only one ${o} and nothing else in the picture. ${STYLE_SUFFIX}`
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
// Each concept is a CONNECTED lesson: the picture set, the word bank and the
// final writing task all reference each other. The labelling task tests the
// actual concept (describe for adjectives, the action for verbs, the name for
// nouns), and the circle word-bank is built from words that genuinely apply to
// the pictured items (plus off-type distractors), so the activities reinforce
// one another instead of being disconnected.
const CONCEPTS: Record<string, {
  title: string
  note: string
  pics: string[]
  mixed: string[]
  picInstruction: string
  circleInstruction: string
  writeInstruction: string
}> = {
  noun: {
    title: 'Nouns are naming words',
    note: 'A NOUN NAMES A PERSON PLACE OR THING',
    picInstruction: 'Colour and name',
    pics: ['dog', 'house', 'ball', 'apple'],
    circleInstruction: 'Circle the nouns',
    // the pictured nouns + verb/adjective distractors
    mixed: ['dog', 'run', 'house', 'happy', 'ball', 'jump', 'apple', 'fast'],
    writeInstruction: 'Write three naming words above',
  },
  verb: {
    title: 'Verbs are doing words',
    note: 'A VERB IS AN ACTION WORD',
    picInstruction: 'Colour and label the action',
    pics: ['running', 'jumping', 'swimming', 'hopping'],
    circleInstruction: 'Circle the verbs',
    // the pictured actions + noun distractors
    mixed: ['run', 'cat', 'jump', 'table', 'swim', 'happy', 'hop', 'tree'],
    writeInstruction: 'Write three action words above',
  },
  adjective: {
    title: 'Adjectives describe things',
    note: 'AN ADJECTIVE IS A DESCRIBING WORD',
    picInstruction: 'Colour and describe',
    pics: ['apple', 'mouse', 'tree', 'balloon'],
    circleInstruction: 'Circle the adjectives',
    // adjectives that describe the pictured items (red/shiny apple, tiny mouse,
    // tall tree, soft/round balloon) + non-adjective distractors
    mixed: ['red', 'run', 'tiny', 'dog', 'tall', 'jump', 'shiny', 'soft'],
    writeInstruction: 'Describe a picture above',
  },
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
    ? { type: 'sums', instruction: `More ${mainInstr.toLowerCase()}`, op: main, maxValue, count: n }
    : { type: 'sums', instruction: otherInstr, op: other, maxValue, count: n }
  return [note, warmUp, { type: 'sums', instruction: mainInstr, op: main, maxValue, count: n }, second]
}

// "Telling the time" topics. The clock level scales with age: o'clock & half
// past for the youngest, quarter times next, any 5-minute interval for the
// oldest. Read-the-clock is free for everyone; draw-the-hands is a Pro block
// for 9–10s. Fully deterministic — the clocks are drawn in code.
function detectClocks(topic: string): boolean {
  return /\b(telling|tell|read\w*)\s+the\s+time\b|\bclock\s?faces?\b|\bclocks?\b|\bo'?clock\b|\bhalf\s+past\b|\bquarter\s+(past|to)\b|\bwhat.?s?\s+the\s+time\b/i.test(topic)
}

export function clockActivities(d: Difficulty): Activity[] {
  const band = d.detailLevel
  const level: 'half' | 'quarter' | 'five' = band === 'low' ? 'half' : band === 'medium' ? 'quarter' : 'five'
  const acts: Activity[] = [
    { type: 'note', text: 'Look at each clock and write the time it shows.' },
    { type: 'clocks', instruction: 'What time is it?', mode: 'read', level, count: band === 'low' ? 4 : 6 },
  ]
  // Draw-the-hands: a Pro challenge for the oldest band.
  if (band === 'high') acts.push({ type: 'clocks', instruction: 'Draw the hands on each clock', mode: 'draw', level, count: 6 })
  return acts
}

// Turn a theme's drawable objects into a VARIED sheet rather than a plain
// colour page: colour & label the pictures → a puzzle/trace → count / write.
export function pictorialActivities(objects: string[], d: Difficulty): Activity[] {
  const objs = objects.map((o) => o.trim()).filter(Boolean).slice(0, 4)
  const names = [...new Set(objects.map((o) => o.toUpperCase().replace(/[^A-Z]/g, '')).filter((w) => w.length >= 2 && w.length <= 8))].slice(0, 4)
  const acts: Activity[] = [{ type: 'pictures', instruction: 'Colour and label', items: objs, label: true }]
  if (d.detailLevel === 'low') {
    // Count the topic's OWN pictures (moons, lanterns…) — stays on-topic instead
    // of counting abstract dots.
    acts.push({ type: 'countPictures', instruction: 'Count and colour', items: objs })
    if (names.length) acts.push({ type: 'traceWords', instruction: 'Trace the words', words: names })
  } else {
    if (names.length >= 2) acts.push({ type: 'wordSearch', instruction: 'Find the words', words: names })
    else acts.push({ type: 'countPictures', instruction: 'Count and colour', items: objs })
    acts.push({ type: 'sentence', instruction: 'Write a sentence', lines: 2 })
  }
  return acts
}

// Concrete drawable objects for the common themes (used by the offline fallback;
// the AI planner supplies its own, better-tailored object lists).
const THEME_SETS: { re: RegExp; title: string; objects: string[] }[] = [
  { re: /\bfarm\b/i, title: 'Farm animals', objects: ['cow', 'pig', 'sheep', 'horse', 'duck', 'hen'] },
  { re: /\b(jungle|rainforest)\b/i, title: 'Jungle animals', objects: ['lion', 'tiger', 'monkey', 'elephant', 'snake', 'parrot'] },
  { re: /\bzoo\b/i, title: 'Zoo animals', objects: ['lion', 'giraffe', 'zebra', 'monkey', 'penguin', 'bear'] },
  { re: /\b(sea creatures|ocean|under the sea|sea life)\b/i, title: 'Under the sea', objects: ['fish', 'crab', 'octopus', 'turtle', 'starfish', 'whale'] },
  { re: /\b(pets?)\b/i, title: 'Pets', objects: ['dog', 'cat', 'rabbit', 'fish', 'hamster', 'bird'] },
  { re: /\b(dinosaur|dinosaurs)\b/i, title: 'Dinosaurs', objects: ['t rex', 'triceratops', 'stegosaurus', 'brachiosaurus'] },
  { re: /\b(space|planet|planets|rocket|solar system|astronaut|galaxy)\b/i, title: 'Space', objects: ['rocket', 'planet', 'star', 'moon', 'astronaut', 'comet'] },
  { re: /\b(minibeast|minibeasts|bug|bugs|insect|insects|creepy crawl)/i, title: 'Minibeasts', objects: ['ladybird', 'snail', 'bee', 'caterpillar', 'butterfly', 'spider'] },
  { re: /\b(farm animals?|animals?)\b/i, title: 'Animals', objects: ['dog', 'cat', 'rabbit', 'duck', 'lion', 'bear'] },
]

// A varied counting sheet: count & colour groups → trace the numerals → a few
// simple sums. Mixes colour/count, write and do families in one page.
export function numberActivities(maxN: number): Activity[] {
  const n = Math.max(3, Math.min(20, Math.round(maxN)))
  return [
    { type: 'note', text: 'Count, trace and add.' },
    { type: 'countObjects', instruction: 'Count and colour', count: n <= 5 ? 4 : 6, maxCount: n },
    { type: 'traceNumbers', instruction: 'Trace the numbers', upTo: n },
    { type: 'sums', instruction: 'Add them up', op: 'add', maxValue: Math.min(10, n), count: 6, dots: n <= 10 },
  ]
}

function conceptActivities(key: string): Activity[] {
  const c = CONCEPTS[key]
  return [
    { type: 'note', text: c.note },
    // Colour the pictures and write a word of the RIGHT type for each (describe
    // for adjectives, the action for verbs, the name for nouns).
    { type: 'pictures', instruction: c.picInstruction, items: c.pics, label: true },
    // Circle the target type from a bank whose examples describe/relate to those
    // pictures, mixed with off-type distractors.
    { type: 'circleWords', instruction: c.circleInstruction, words: c.mixed },
    // A contextual writing task that points back at the pictures above.
    { type: 'writeLines', instruction: c.writeInstruction, count: 3 },
  ]
}

/**
 * A reliable deterministic plan for the common grammar concepts (nouns, verbs,
 * adjectives). Used BEFORE the AI planner so these always come out correct and
 * connected — the planner previously mislabelled adjectives as "name" and used
 * an unrelated word bank. Returns null for anything that isn't a known concept.
 */
export function conceptPlan(rawTopic: string, age?: number): TopicPlan | null {
  const ck = conceptKey(clean(rawTopic))
  if (!ck) return null
  return {
    category: 'composed',
    subject: CONCEPTS[ck].title,
    title: sheetTitle(CONCEPTS[ck].title),
    activities: conceptActivities(ck),
    prompt: '',
    difficulty: difficultyForAge(age),
  }
}

// A specific times table ("3 times table", "times table of 4", "6x table",
// "multiplication of 7", "multiply by 8"). Returns the table (2–12) or null.
// Deliberately does NOT match "counting in 3s" / "multiples of 3" — those stay
// skip-counting sequences.
function detectTimesTable(topic: string): number | null {
  const t = topic.toLowerCase()
  const m =
    t.match(/\b(\d{1,2})\s*(?:x|times?)\s*tables?\b/) ||
    t.match(/\btimes?\s*tables?\s*(?:of|for)?\s*(\d{1,2})\b/) ||
    t.match(/\bmultiplication\s*(?:table\s*)?(?:of\s*)?(\d{1,2})\b/) ||
    t.match(/\bmultiply(?:ing)?\s*by\s*(\d{1,2})\b/) ||
    t.match(/\b(\d{1,2})\s*times?\s*tables?\b/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return n >= 2 && n <= 12 ? n : null
}

/**
 * A deterministic times-table sheet: the table in order to learn, mixed
 * multiplication practice, and (for the oldest) the inverse division facts —
 * NOT skip-counting. Age-scaled. Returns null if the topic isn't a times table.
 */
export function timesTablePlan(rawTopic: string, age?: number): TopicPlan | null {
  const table = detectTimesTable(clean(rawTopic))
  if (table == null) return null
  const d = difficultyForAge(age)

  // Age bands change the whole SHAPE, not just which section is present:
  //  • 5–7 (young): short + VISUAL — groups of countable circles show what
  //    multiplication means, over a small range (×1–5, or ×1–3 for big tables),
  //    then a short write-the-answer ladder. No abstract shuffled drill.
  //  • 8–9 (mid): the ladder to ×12 + modest mixed practice. No division.
  //  • 10+ (old): full ladder + full mixed practice + inverse division.
  const band = age == null ? 'mid' : age <= 7 ? 'young' : age <= 9 ? 'mid' : 'old'

  let acts: Activity[]
  if (band === 'young') {
    const upTo = table >= 6 ? 3 : 5
    acts = [
      { type: 'note', text: 'Count the groups to multiply' },
      { type: 'multiplyGroups', instruction: 'Count the groups', table, upTo },
      { type: 'timesTable', instruction: 'Write the answers', table, upTo, op: 'multiply', shuffle: false },
    ]
  } else if (band === 'mid') {
    acts = [
      { type: 'note', text: 'Multiply to find each answer' },
      { type: 'timesTable', instruction: 'The table in order', table, upTo: 12, op: 'multiply', shuffle: false },
      { type: 'timesTable', instruction: 'Mixed practice', table, upTo: 8, op: 'multiply', shuffle: true },
    ]
  } else {
    acts = [
      { type: 'note', text: 'Multiply and divide' },
      { type: 'timesTable', instruction: 'The table in order', table, upTo: 12, op: 'multiply', shuffle: false },
      { type: 'timesTable', instruction: 'Mixed practice', table, upTo: 12, op: 'multiply', shuffle: true },
      { type: 'timesTable', instruction: 'Division facts', table, upTo: 12, op: 'divide', shuffle: true },
    ]
  }
  return {
    category: 'composed',
    subject: `${table} times table`,
    title: sheetTitle(`${table} times table`),
    activities: acts,
    prompt: '',
    difficulty: d,
  }
}

// Number bonds ("number bonds to 10", "bonds to 20", "ways to make 10",
// "make ten"). Returns the whole (5/10/20/100), or null. Must be checked BEFORE
// detectSums (which also matches "number bonds").
function detectNumberBonds(topic: string): number | null {
  const t = topic.toLowerCase()
  if (!/\b(number\s*bonds?|bonds?\s+(?:to|of|within|for)\b|ways?\s+to\s+make|make\s+(?:a\s+)?(?:ten|\d{1,3})\b)\b/.test(t)) return null
  const m = t.match(/\b(?:to|of|within|for|make)\s+(?:a\s+)?(\d{1,3})\b/)
  if (m) { const v = parseInt(m[1], 10); return v <= 7 ? Math.max(5, v) : v <= 12 ? 10 : v <= 20 ? 20 : 100 }
  if (/\bten\b/.test(t)) return 10
  return 10
}

/**
 * A deterministic number-bonds sheet — the part-whole pairs that make N, NOT
 * generic addition. Age-shaped: 5–7 gets a visual make-N (ten-frame + part-whole
 * model), 8–9 gets the model + missing-number sentences, 10+ gets fact families.
 */
export function numberBondsPlan(rawTopic: string, age?: number): TopicPlan | null {
  const W = detectNumberBonds(clean(rawTopic))
  if (W == null) return null
  const d = difficultyForAge(age)
  const band = age == null ? 'mid' : age <= 7 ? 'young' : age <= 9 ? 'mid' : 'old'
  let acts: Activity[]
  if (band === 'young') {
    const w = Math.min(W, 20)
    acts = [
      { type: 'note', text: 'Fill the pairs that make the whole' },
      { type: 'tenFrame', instruction: 'How many make the whole', whole: w, count: 4 },
      { type: 'partWhole', instruction: 'Write the missing part', whole: w, count: 3 },
    ]
  } else if (band === 'mid') {
    acts = [
      { type: 'note', text: 'Find the missing part' },
      { type: 'partWhole', instruction: 'Write the missing part', whole: W, count: 3 },
      { type: 'bonds', instruction: 'Find the missing number', whole: W, count: 10, style: 'missing' },
    ]
  } else {
    acts = [
      { type: 'note', text: 'Complete the number facts' },
      { type: 'bonds', instruction: 'Missing numbers', whole: W, count: 8, style: 'missing' },
      { type: 'bonds', instruction: 'Subtraction facts', whole: W, count: 8, style: 'subtract' },
    ]
  }
  return {
    category: 'composed',
    subject: `Number bonds to ${W}`,
    title: sheetTitle(`Number bonds to ${W}`),
    activities: acts,
    prompt: '',
    difficulty: d,
  }
}

// Shapes: "2d shapes", "3d shapes", "shapes", or a named non-trivial shape.
function detectShapes(topic: string): '2d' | '3d' | 'both' | null {
  const t = topic.toLowerCase()
  const has3d = /\b3\s*-?\s*d\b|three[\s-]?dimensional/.test(t)
  const has2d = /\b2\s*-?\s*d\b|two[\s-]?dimensional/.test(t)
  const hasShapes = /\bshapes?\b/.test(t) || /\b(triangle|rectangle|pentagon|hexagon|octagon|cuboid|cylinder|sphere|pyramid|prism)s?\b/.test(t)
  if (has2d && has3d) return 'both'
  if (has3d) return '3d'
  if (has2d) return '2d'
  if (hasShapes) return 'both'
  return null
}

/**
 * A deterministic shapes sheet that actually TEACHES shapes — name & colour,
 * count sides/corners (2D) or faces/edges/vertices (3D), and sort 2D vs 3D —
 * instead of the old "colour a picture of some shapes". Age-shaped and correct.
 */
export function shapesPlan(rawTopic: string, age?: number): TopicPlan | null {
  const kind = detectShapes(clean(rawTopic))
  if (!kind) return null
  const d = difficultyForAge(age)
  const band = age == null ? 'mid' : age <= 7 ? 'young' : age <= 9 ? 'mid' : 'old'
  const use3d = kind === '3d'
  const title = kind === '2d' ? '2D shapes' : kind === '3d' ? '3D shapes' : 'Shapes'
  const sortSet = ['square', 'cube', 'circle', 'sphere', 'triangle', 'cone']

  let acts: Activity[]
  if (band === 'young') {
    const shapes = use3d ? ['cube', 'sphere', 'cylinder', 'cone'] : ['circle', 'triangle', 'square', 'rectangle']
    acts = [
      { type: 'note', text: 'Colour each shape and write its name' },
      { type: 'shapeGallery', instruction: 'Name and colour the shapes', shapes, label: true },
      use3d
        ? { type: 'shapeProps', instruction: 'Count the faces on each shape', shapes: ['cube', 'cylinder', 'cone', 'sphere'], dims: ['faces'] }
        : { type: 'shapeProps', instruction: 'Count the sides on each shape', shapes: ['triangle', 'square', 'rectangle', 'pentagon'], dims: ['sides'] },
    ]
  } else if (band === 'mid') {
    acts = use3d
      ? [
          { type: 'note', text: 'Write how many faces and edges each shape has' },
          { type: 'shapeGallery', instruction: 'Name each 3D shape', shapes: ['cube', 'cylinder', 'cone', 'sphere'], label: true },
          { type: 'shapeProps', instruction: 'Count the faces and edges', shapes: ['cube', 'cylinder', 'cone', 'pyramid'], dims: ['faces', 'edges'] },
          { type: 'shapeSort', instruction: 'Sort each shape into 2D or 3D', shapes: sortSet },
        ]
      : [
          { type: 'note', text: 'Write how many sides and corners each shape has' },
          { type: 'shapeProps', instruction: 'Count the sides and corners', shapes: ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'circle'], dims: ['sides', 'corners'] },
          { type: 'shapeSort', instruction: 'Sort each shape into 2D or 3D', shapes: sortSet },
        ]
  } else {
    acts = use3d
      ? [
          { type: 'note', text: 'Write how many faces, edges and vertices each shape has' },
          { type: 'shapeGallery', instruction: 'Name each 3D shape', shapes: ['cube', 'cylinder', 'cone', 'pyramid'], label: true },
          { type: 'shapeProps', instruction: 'Count the faces, edges and vertices', shapes: ['cube', 'cuboid', 'cylinder', 'cone', 'pyramid', 'sphere'], dims: ['faces', 'edges', 'vertices'] },
        ]
      : [
          { type: 'note', text: 'Write the properties of each shape' },
          { type: 'shapeProps', instruction: 'Count the sides and corners', shapes: ['triangle', 'square', 'pentagon', 'hexagon'], dims: ['sides', 'corners'] },
          { type: 'shapeProps', instruction: 'Count the faces, edges and vertices', shapes: ['cube', 'cuboid', 'cylinder', 'cone'], dims: ['faces', 'edges', 'vertices'] },
        ]
  }
  return {
    category: 'composed',
    subject: title,
    title: sheetTitle(title),
    activities: acts,
    prompt: '',
    difficulty: d,
  }
}

// ---- Fractions -------------------------------------------------------------

function detectFractions(topic: string): boolean {
  return /\bfractions?\b|\bhalf\b|\bhalves\b|\bquarters?\b|\bthirds?\b|\bfifths?\b|\bsixths?\b|\bequivalent fraction/i.test(topic)
}

/**
 * A deterministic fractions sheet — shaded shapes and fractions of amounts,
 * correct by construction. Age-shaped: 5–7 colour halves/quarters, 8–9 name the
 * shaded fraction and find simple fractions of amounts, 10+ harder denominators
 * and non-unit fractions of amounts (the biggest KS2 parent worry).
 */
export function fractionsPlan(rawTopic: string, age?: number): TopicPlan | null {
  if (!detectFractions(clean(rawTopic))) return null
  const d = difficultyForAge(age)
  const band = age == null ? 'mid' : age <= 7 ? 'young' : age <= 9 ? 'mid' : 'old'
  let acts: Activity[]
  if (band === 'young') {
    acts = [
      { type: 'note', text: 'Colour the fraction shown under each bar' },
      { type: 'fractionShade', instruction: 'Colour the fraction', mode: 'shade', fractions: [{ n: 1, d: 2 }, { n: 1, d: 2 }, { n: 1, d: 4 }, { n: 3, d: 4 }] },
      { type: 'fractionShade', instruction: 'Write the fraction that is shaded', mode: 'write', fractions: [{ n: 1, d: 2 }, { n: 1, d: 4 }] },
    ]
  } else if (band === 'mid') {
    acts = [
      { type: 'note', text: 'Name the shaded fraction, then find fractions of amounts' },
      { type: 'fractionShade', instruction: 'Write the shaded fraction', mode: 'write', fractions: [{ n: 1, d: 2 }, { n: 1, d: 3 }, { n: 1, d: 4 }, { n: 2, d: 3 }, { n: 3, d: 4 }, { n: 2, d: 5 }] },
      { type: 'fractionShade', instruction: 'Colour the fraction', mode: 'shade', fractions: [{ n: 1, d: 3 }, { n: 3, d: 4 }, { n: 2, d: 5 }, { n: 5, d: 6 }] },
      { type: 'fractionOf', instruction: 'Find the fraction of each amount', problems: [{ n: 1, d: 2, whole: 8 }, { n: 1, d: 4, whole: 8 }, { n: 1, d: 3, whole: 9 }, { n: 1, d: 2, whole: 10 }] },
    ]
  } else {
    acts = [
      { type: 'note', text: 'Name each shaded fraction and find fractions of amounts' },
      { type: 'fractionShade', instruction: 'Write the shaded fraction', mode: 'write', fractions: [{ n: 2, d: 3 }, { n: 3, d: 4 }, { n: 3, d: 5 }, { n: 5, d: 6 }, { n: 2, d: 4 }, { n: 4, d: 8 }] },
      { type: 'fractionOf', instruction: 'Find the fraction of each amount', problems: [{ n: 1, d: 2, whole: 12 }, { n: 1, d: 4, whole: 12 }, { n: 2, d: 3, whole: 12 }, { n: 3, d: 4, whole: 16 }, { n: 2, d: 5, whole: 10 }] },
      { type: 'fractionOf', instruction: 'More fractions of amounts', problems: [{ n: 3, d: 5, whole: 20 }, { n: 5, d: 6, whole: 18 }, { n: 3, d: 8, whole: 16 }, { n: 2, d: 7, whole: 14 }, { n: 4, d: 9, whole: 18 }] },
    ]
  }
  return { category: 'composed', subject: 'Fractions', title: sheetTitle('Fractions'), activities: acts, prompt: '', difficulty: d }
}

// ---- Comparing numbers < > = ----------------------------------------------

function detectCompare(topic: string): boolean {
  return /\bcompar\w+\b|\bgreater than\b|\bless than\b|\bmore than\b|\bfewer than\b|\bbigger (?:or|than)\b|\bsmaller (?:or|than)\b|\border\w* numbers?\b|greater or less/i.test(topic)
}

// Age-scaled ranges of number pairs to compare with < > =. Deterministic pairs
// (index-seeded) so the sheet is stable and always has a defined answer.
export function comparePlan(rawTopic: string, age?: number): TopicPlan | null {
  if (!detectCompare(clean(rawTopic))) return null
  const d = difficultyForAge(age)
  const band = age == null ? 'mid' : age <= 7 ? 'young' : age <= 9 ? 'mid' : 'old'
  const maxV = band === 'young' ? 20 : band === 'mid' ? 100 : 1000
  const rng = mkRng(maxV * 7 + 13)
  const ri = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1))
  const lo = band === 'young' ? 1 : 10
  const makePairs = (count: number, hi: number): { a: number; b: number }[] => {
    const out: { a: number; b: number }[] = []
    for (let i = 0; i < count; i++) {
      const a = ri(lo, hi)
      let b = ri(lo, hi)
      if (i % 6 === 5) b = a // ~1 in 6 equal, so = is genuinely needed
      out.push({ a, b })
    }
    return out
  }
  const n = band === 'young' ? 6 : 12
  // Two blocks so the page fills; the second block steps the range up.
  const hi2 = band === 'young' ? 20 : band === 'mid' ? 100 : 1000
  const acts: Activity[] = [
    { type: 'note', text: 'Write the sign in each box' },
    { type: 'compareNumbers', instruction: 'Greater than, less than or equal', pairs: makePairs(n, band === 'young' ? 10 : 50) },
    { type: 'compareNumbers', instruction: band === 'old' ? 'Compare the larger numbers' : 'Keep going', pairs: makePairs(n, hi2) },
  ]
  return { category: 'composed', subject: 'Comparing numbers', title: sheetTitle('Comparing numbers'), activities: acts, prompt: '', difficulty: d }
}

// ---- Odd and even ---------------------------------------------------------

function detectOddEven(topic: string): boolean {
  return /\bodd\b|\beven\b|odd (?:and|or) even|odd numbers?|even numbers?/i.test(topic)
}

export function oddEvenPlan(rawTopic: string, age?: number): TopicPlan | null {
  if (!detectOddEven(clean(rawTopic))) return null
  const d = difficultyForAge(age)
  const band = age == null ? 'mid' : age <= 7 ? 'young' : age <= 9 ? 'mid' : 'old'
  const hi = band === 'young' ? 12 : band === 'mid' ? 30 : 100
  const rng = mkRng(hi * 11 + 5)
  const pick = (lo: number, up: number) => lo + Math.floor(rng() * (up - lo + 1))
  const bank = Array.from(new Set(Array.from({ length: 10 }, () => pick(band === 'young' ? 1 : 10, hi)))).slice(0, 8).map(String)
  const circleMix = Array.from(new Set(Array.from({ length: 8 }, () => pick(1, hi)))).slice(0, 8).map(String)
  const acts: Activity[] = [
    { type: 'note', text: 'An even number ends in 0 2 4 6 or 8' },
    { type: 'circleWords', instruction: 'Circle the even numbers', words: circleMix },
    { type: 'sortTwoGroups', instruction: 'Sort each number', items: bank, labelA: 'ODD', labelB: 'EVEN' },
  ]
  return { category: 'composed', subject: 'Odd and even', title: sheetTitle('Odd and even numbers'), activities: acts, prompt: '', difficulty: d }
}

// ---- Place value ----------------------------------------------------------

function detectPlaceValue(topic: string): boolean {
  return /\bplace value\b|\btens and (?:units|ones)\b|\bhundreds tens\b|\bpartition\w*\b|\btens and units\b/i.test(topic)
}

export function placeValuePlan(rawTopic: string, age?: number): TopicPlan | null {
  if (!detectPlaceValue(clean(rawTopic))) return null
  const d = difficultyForAge(age)
  const band = age == null ? 'mid' : age <= 7 ? 'young' : age <= 9 ? 'mid' : 'old'
  const rng = mkRng(band.length * 31 + 7)
  const pick = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1))
  const lo = band === 'young' ? 10 : 20
  const set = () => Array.from({ length: 4 }, () => pick(lo, 99))
  const acts: Activity[] = [
    { type: 'note', text: 'Count the tens and units, then write the number' },
    { type: 'placeValue', instruction: 'How many tens and units', numbers: set() },
    { type: 'placeValue', instruction: 'Write each number', numbers: set() },
  ]
  return { category: 'composed', subject: 'Place value', title: sheetTitle('Place value'), activities: acts, prompt: '', difficulty: d }
}

// ---- Counting and skip-counting -------------------------------------------

// "counting to 50", "count to 100", "counting in 2s/5s/10s". Returns {to} for a
// 1-step count, or {step} for skip-counting. Kept separate from the picture
// "numbers to 10" flow so it produces a real number track, not a colour sheet.
function detectCounting(topic: string): { step: number; to: number } | null {
  const t = topic.toLowerCase()
  const skip = t.match(/\bcount(?:ing)?\s+(?:in|by)\s+(\d{1,2})s?\b/) || t.match(/\bskip\s+count(?:ing)?\s+(?:in|by)?\s*(\d{1,2})?/)
  if (skip && skip[1]) return { step: parseInt(skip[1], 10), to: 0 }
  const to = t.match(/\bcount(?:ing)?\s+(?:up\s+)?to\s+(\d{1,3})\b/) || t.match(/\bnumbers?\s+to\s+(\d{2,3})\b/)
  if (to) { const v = parseInt(to[1], 10); if (v >= 20) return { step: 1, to: Math.min(120, v) } }
  return null
}

export function countingPlan(rawTopic: string, age?: number): TopicPlan | null {
  const det = detectCounting(clean(rawTopic))
  if (!det) return null
  const d = difficultyForAge(age)
  if (det.step > 1) {
    const k = det.step
    const rng = mkRng(k * 97 + 3)
    const mix = Array.from(new Set([...[1, 2, 3, 4, 5, 6].map((m) => k * m), ...Array.from({ length: 6 }, () => k * (1 + Math.floor(rng() * 6)) + (rng() < 0.5 ? 1 : -1))])).slice(0, 8).map(String)
    const acts: Activity[] = [
      { type: 'note', text: `Count in ${k}s and fill the missing numbers` },
      { type: 'numberTrack', instruction: `Count in ${k}s`, start: k, step: k, count: 24 },
      { type: 'circleWords', instruction: `Circle the numbers you say counting in ${k}s`, words: mix },
    ]
    return { category: 'composed', subject: `Counting in ${k}s`, title: sheetTitle(`Counting in ${k}s`), activities: acts, prompt: '', difficulty: d }
  }
  const N = det.to
  const acts: Activity[] = [
    { type: 'note', text: `Fill in the missing numbers to ${N}` },
    { type: 'numberTrack', instruction: 'Fill the missing numbers', start: 1, step: 1, count: Math.min(N, 20) },
  ]
  if (N > 20) acts.push({ type: 'numberTrack', instruction: 'Keep going', start: 21, step: 1, count: Math.min(N - 20, 20) })
  if (N > 40) acts.push({ type: 'numberTrack', instruction: 'Count in tens', start: 10, step: 10, count: Math.min(Math.floor(N / 10), 12) })
  return { category: 'composed', subject: `Counting to ${N}`, title: sheetTitle(`Counting to ${N}`), activities: acts, prompt: '', difficulty: d }
}

// ---- Money ----------------------------------------------------------------

function detectMoney(topic: string): boolean {
  return /\bmoney\b|\bcoins?\b|\bpence\b|\bpennies\b|\bgiving change\b|\badding money\b/i.test(topic)
}

export function moneyPlan(rawTopic: string, age?: number): TopicPlan | null {
  if (!detectMoney(clean(rawTopic))) return null
  const d = difficultyForAge(age)
  const band = age == null ? 'mid' : age <= 7 ? 'young' : age <= 9 ? 'mid' : 'old'
  // UK pence coins only (no £ glyph); totals stay within age-appropriate ranges.
  const denoms = band === 'young' ? [1, 2, 5, 10] : band === 'mid' ? [1, 2, 5, 10, 20] : [2, 5, 10, 20, 50]
  const rng = mkRng(band.length * 53 + denoms.length)
  const nCoins = band === 'young' ? 3 : band === 'mid' ? 4 : 5
  const purse = () => Array.from({ length: nCoins }, () => denoms[Math.floor(rng() * denoms.length)]).sort((a, b) => b - a)
  const acts: Activity[] = [
    { type: 'note', text: 'Add up the coins and write the total in pence' },
    { type: 'coins', instruction: 'How much money', groups: Array.from({ length: band === 'young' ? 4 : 5 }, purse) },
    { type: 'coins', instruction: 'How much altogether', groups: Array.from({ length: band === 'young' ? 4 : 5 }, purse) },
  ]
  return { category: 'composed', subject: 'Money', title: sheetTitle('Money'), activities: acts, prompt: '', difficulty: d }
}

// ---- SPAG (grammar / spelling) --------------------------------------------

// Word-level grammar and spelling concepts that render well with the deterministic
// text blocks (match, sort, circle, write) — no pictures, always-correct content.
// The all-caps glyph font can't show capital-vs-lowercase, so capitalisation and
// punctuation-correction sheets are deliberately NOT here (they'd be misleading).
type SpagBuild = (band: 'young' | 'mid' | 'old') => Activity[]
const SPAG: Record<string, { title: string; detect: RegExp; build: SpagBuild }> = {
  synonym: {
    title: 'Synonyms',
    detect: /\bsynonyms?\b|words? that mean the same|same meaning/i,
    build: (band) => {
      const a: Activity[] = [
        { type: 'note', text: 'A synonym is a word that means the same' },
        { type: 'matchLines', instruction: 'Match the words that mean the same', left: band === 'young' ? ['big', 'happy', 'fast', 'cold'] : ['big', 'happy', 'fast', 'cold', 'little', 'shut'], right: band === 'young' ? ['large', 'glad', 'quick', 'chilly'] : ['large', 'glad', 'quick', 'chilly', 'small', 'close'] },
        { type: 'matchLines', instruction: 'Match more synonyms', left: ['begin', 'end', 'look', 'shout'], right: ['start', 'finish', 'see', 'yell'] },
        { type: 'writeLines', instruction: 'Write a synonym for each: big, hot, sad', count: 3 },
      ]
      return a
    },
  },
  antonym: {
    title: 'Antonyms',
    detect: /\bantonyms?\b|\bopposites?\b|opposite words?/i,
    build: (band) => [
      { type: 'note', text: 'An antonym is the opposite' },
      { type: 'matchLines', instruction: 'Match the opposites', left: band === 'young' ? ['hot', 'big', 'up', 'day'] : ['hot', 'big', 'up', 'day', 'fast', 'happy'], right: band === 'young' ? ['cold', 'small', 'down', 'night'] : ['cold', 'small', 'down', 'night', 'slow', 'sad'] },
      { type: 'matchLines', instruction: 'Match more opposites', left: ['open', 'full', 'hard', 'light'], right: ['shut', 'empty', 'soft', 'dark'] },
      { type: 'writeLines', instruction: 'Write the opposite of: wet, tall, old', count: 3 },
    ],
  },
  homophone: {
    title: 'Homophones',
    detect: /\bhomophones?\b|sound the same|there their|to too two/i,
    build: () => [
      { type: 'note', text: 'Homophones sound the same but are spelled differently' },
      { type: 'matchLines', instruction: 'Match the homophones', left: ['sea', 'night', 'sun', 'blue', 'hear', 'bee'], right: ['see', 'knight', 'son', 'blew', 'here', 'be'] },
      { type: 'writeLines', instruction: 'Write the missing word: I can ___ the sea (hear/here)', count: 3 },
      { type: 'sentence', instruction: 'Write a sentence using here and hear', lines: 3 },
    ],
  },
  adverb: {
    title: 'Adverbs',
    detect: /\badverbs?\b/i,
    build: () => [
      { type: 'note', text: 'An adverb tells how something is done' },
      { type: 'circleWords', instruction: 'Circle the adverbs', words: ['quickly', 'dog', 'slowly', 'run', 'softly', 'blue', 'loudly', 'jump'] },
      { type: 'matchLines', instruction: 'Match the verb to an adverb', left: ['whisper', 'sprint', 'giggle', 'stamp'], right: ['quietly', 'fast', 'happily', 'loudly'] },
      { type: 'sentence', instruction: 'Write a sentence with an adverb', lines: 2 },
    ],
  },
  conjunction: {
    title: 'Conjunctions',
    detect: /\bconjunctions?\b|joining words?|\band but because so\b/i,
    build: () => [
      { type: 'note', text: 'Conjunctions join ideas: and but so because' },
      { type: 'circleWords', instruction: 'Circle the joining words', words: ['and', 'cat', 'but', 'jump', 'because', 'red', 'so', 'run'] },
      { type: 'matchLines', instruction: 'Join each sentence to its ending', left: ['I was cold', 'She ran fast', 'He was tired', 'It rained'], right: ['so I got a coat', 'but still lost', 'because it was late', 'so we stayed in'] },
      { type: 'sentence', instruction: 'Join each pair with and, but, so or because', lines: 3 },
    ],
  },
  plural: {
    title: 'Plurals',
    detect: /\bplurals?\b|\badd -?es\b|more than one|\b-?s or -?es\b/i,
    build: () => [
      { type: 'note', text: 'Words ending in s x ch sh add -es, others add -s' },
      { type: 'sortTwoGroups', instruction: 'Sort each word by its plural ending', items: ['cat', 'box', 'dog', 'fox', 'bus', 'brush', 'hat', 'church'], labelA: 'ADD S', labelB: 'ADD ES' },
      { type: 'writeLines', instruction: 'Write the plural of: dog, fox, bus', count: 3 },
    ],
  },
  prefix: {
    title: 'Prefixes',
    detect: /\bprefix(?:es)?\b|\bun-?\b|\bre-?\b/i,
    build: () => [
      { type: 'note', text: 'A prefix goes at the front of a word' },
      { type: 'matchLines', instruction: 'Match the prefix word to its meaning', left: ['unhappy', 'redo', 'unkind', 'untie'], right: ['not happy', 'do again', 'not kind', 'undo a tie'] },
      { type: 'writeLines', instruction: 'Add un- to: lock, well, fair', count: 3 },
    ],
  },
  suffix: {
    title: 'Suffixes',
    detect: /\bsuffix(?:es)?\b|-?ful\b|-?less\b|-?ing\b|-?ed\b/i,
    build: () => [
      { type: 'note', text: 'A suffix goes at the end of a word' },
      { type: 'matchLines', instruction: 'Match the word to its suffix meaning', left: ['helpful', 'hopeless', 'painful', 'fearless'], right: ['full of help', 'without hope', 'full of pain', 'without fear'] },
      { type: 'writeLines', instruction: 'Add -ful to: care, use, joy', count: 3 },
    ],
  },
}

function detectSpag(topic: string): string | null {
  const t = clean(topic)
  for (const key of Object.keys(SPAG)) if (SPAG[key].detect.test(t)) return key
  return null
}

/**
 * Deterministic grammar/spelling sheets (synonyms, antonyms, homophones,
 * adverbs, conjunctions, plurals, prefixes, suffixes). Every activity genuinely
 * tests the concept and the activities relate to each other.
 */
export function spagPlan(rawTopic: string, age?: number): TopicPlan | null {
  const key = detectSpag(rawTopic)
  if (!key) return null
  const c = SPAG[key]
  const band = age == null ? 'mid' : age <= 7 ? 'young' : age <= 9 ? 'mid' : 'old'
  return { category: 'composed', subject: c.title, title: sheetTitle(c.title), activities: c.build(band), prompt: '', difficulty: difficultyForAge(age) }
}

// Small deterministic RNG shared by the maths plans (stable, no Math.random so
// a topic renders identically every time — important for eyeballing/tests).
function mkRng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
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
 * Vague, catch-all topics a parent might type ("alphabet", "phonics",
 * "letters") name a whole curriculum AREA, not one lesson. Left to the AI
 * planner they become a busy picture sheet (many model-generated objects) that
 * is slow and unfocused — the exact topics reported as stalling at ~86%.
 *
 * Narrow them to a FOCUSED, fully DETERMINISTIC sheet (no image model at all,
 * so zero Flux/vision calls) that teaches one clear thing — a few letters or
 * the first sounds, not all 26. These generate as fast as "letter b".
 *
 * Returns null for anything that isn't a recognised vague topic, so the normal
 * AI-planner / keyword path handles everything else unchanged. Runs BEFORE the
 * AI planner so it also saves that (blocking) model round-trip.
 */
export function narrowBroadTopic(rawTopic: string, age?: number): TopicPlan | null {
  const t = clean(rawTopic).toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const difficulty = difficultyForAge(age)

  // "alphabet" / "abc" / "abcs" / "the alphabet" / "learn the alphabet" / bare
  // "letters". (A SPECIFIC "letter b" is caught by detectLetter downstream and
  // never reaches here.)
  const isAlphabet =
    /\balphabet\b/.test(t) ||
    /^(the\s+)?a\s*b\s*c\s*s?$/.test(t) ||
    /^letters$/.test(t) ||
    /^learn(ing)?\s+(the\s+)?(alphabet|letters|abc)s?$/.test(t)
  if (isAlphabet) {
    const acts: Activity[] = [
      { type: 'note', text: 'Every letter from A to Z' },
      { type: 'traceWords', instruction: 'Trace the letters', words: ['ABCDEFG', 'HIJKLM', 'NOPQRS', 'TUVWXYZ'] },
      { type: 'circleWords', instruction: 'Circle every A', words: ['A', 'M', 'A', 'T', 'A', 'S', 'A', 'B'] },
      { type: 'writeLines', instruction: 'Write your letters', count: 3 },
    ]
    return { category: 'composed', subject: 'The Alphabet', title: sheetTitle('The Alphabet'), activities: acts, prompt: '', difficulty }
  }

  // Bare "phonics" / "letter sounds" / "initial sounds" with NO specific
  // grapheme. (A specific "phonics sh" is caught by detectPhonics downstream.)
  const isPhonics =
    /^(phonics|phonic)$/.test(t) ||
    /^(letter|initial|first|beginning)\s+sounds?$/.test(t) ||
    /^phonics\s+sounds?$/.test(t) ||
    /^(learn(ing)?\s+)?phonics$/.test(t)
  if (isPhonics) {
    // Focus on the first sounds taught in UK reception (s a t p i n).
    const acts: Activity[] = [
      { type: 'note', text: 'Sound out each word' },
      { type: 'traceWords', instruction: 'Trace the words', words: ['SAT', 'PIN', 'TAP', 'NIP'] },
      { type: 'wordSearch', instruction: 'Find the words', words: ['SAT', 'PIN', 'TAP', 'NIP'] },
      { type: 'writeLines', instruction: 'Write a word', count: 3 },
    ]
    return { category: 'composed', subject: 'First Sounds', title: sheetTitle('First Sounds'), activities: acts, prompt: '', difficulty }
  }

  return null
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
  const cp = conceptPlan(topic, age)
  if (cp) return cp

  // --- times tables (× / ÷ facts) — before the skip-count sequence detector ---
  const tt = timesTablePlan(topic, age)
  if (tt) return tt

  // --- number bonds (part-whole pairs) — before generic sums ---
  const nb = numberBondsPlan(topic, age)
  if (nb) return nb

  // --- shapes (2D/3D properties + sort) — before the shapes colour-page ---
  const sp = shapesPlan(topic, age)
  if (sp) return sp

  // --- new deterministic maths blocks (all correct by construction) ---
  const fr = fractionsPlan(topic, age); if (fr) return fr
  const cmp = comparePlan(topic, age); if (cmp) return cmp
  const oe = oddEvenPlan(topic, age); if (oe) return oe
  const pv = placeValuePlan(topic, age); if (pv) return pv
  const money = moneyPlan(topic, age); if (money) return money
  // counting / skip-counting — before the picture "sequence" detector, so
  // "counting in 5s" becomes a real number track rather than a colour sheet.
  const cnt = countingPlan(topic, age); if (cnt) return cnt

  // --- grammar / spelling (synonyms, antonyms, adverbs, plurals…) ---
  const spag = spagPlan(topic, age); if (spag) return spag

  // --- simple sums (addition / subtraction), drawn deterministically ---
  const sums = detectSums(topic, difficulty)
  if (sums) {
    return { category: 'composed', subject: 'Sums', title: sheetTitle('Sums'), activities: sums, prompt: '', difficulty }
  }

  // --- telling the time (analogue clock faces), drawn deterministically ---
  if (detectClocks(topic)) {
    return { category: 'composed', subject: 'Telling the time', title: sheetTitle('Telling the time'), activities: clockActivities(difficulty), prompt: '', difficulty }
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

  // --- themes (animals, space, minibeasts, sea…) → a VARIED sheet, not just a
  // colour page: colour & label the pictures, then a puzzle / count / write. ---
  const theme = THEME_SETS.find((s) => s.re.test(topic))
  if (theme) {
    return {
      category: 'composed',
      subject: theme.title,
      title: sheetTitle(theme.title),
      objects: theme.objects,
      activities: pictorialActivities(theme.objects, difficulty),
      prompt: '',
      difficulty,
    }
  }

  // --- colours (rainbow) — kept as a single themed colour page ---
  if (/\bcolou?rs?\b/i.test(topic) || /\brainbow\b/i.test(topic)) {
    const prompt =
      `Coloring book line art of a large rainbow with an apple, a sun, a leaf and a ` +
      `raindrop, each large and separate. ${STYLE_SUFFIX}`
    return { category: 'colours', subject: 'Colours', prompt, difficulty }
  }

  // --- generic fallback (unknown topic, AI off): single colour page ---
  const subject = titleCase(topic)
  const prompt =
    `Coloring book line art of ${n} large separate simple pictures of ${subject.toLowerCase()}. ` +
    `${STYLE_SUFFIX}`
  return { category: 'generic', subject, prompt, difficulty }
}
