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
  glyph?: GlyphSpec // deterministic overlay for letters/numbers (later stage)
  difficulty: Difficulty
}

// Pins every prompt to the existing colouring-page look. Tuning this affects
// all categories at once.
const STYLE_SUFFIX =
  'Black and white coloring book line art for young children. Bold, clean, ' +
  'evenly weighted black outlines on a pure white background. Every element is ' +
  'a simple closed shape with large open areas to colour inside the lines. ' +
  'Absolutely no shading, no grey tones, no colour, no fill, no cross-hatching, ' +
  'no photorealism. Friendly, rounded, cartoon style. Flat front-on view, ' +
  'centred composition, generous white margins.'

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

const clean = (s: string) => s.trim().replace(/\s+/g, ' ')

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

// ---- category detection ---------------------------------------------------

function detectLetter(topic: string): string | null {
  const m = topic.match(/\bletter\s+([a-z])\b/i) || topic.match(/^\s*([a-z])\s*$/i)
  if (m) return m[1].toLowerCase()
  return null
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

  // --- letters ---
  const letter = detectLetter(topic)
  if (letter) {
    const objs = (LETTER_OBJECTS[letter] || []).slice(0, Math.max(3, n))
    const upper = letter.toUpperCase()
    const objList = objs.join(', ')
    const prompt =
      `A children's alphabet learning worksheet for the letter "${upper}". ` +
      `Show a very large outlined capital letter ${upper} and lowercase letter ${letter} ` +
      `to trace and colour, and around them ${objs.length} simple separate pictures of ` +
      `things that start with ${upper}: ${objList}. Each picture clearly separated with ` +
      `space around it. ${STYLE_SUFFIX}`
    return {
      category: 'letter',
      subject: `Letter ${upper}`,
      prompt,
      glyph: { kind: 'letter', value: upper },
      difficulty,
    }
  }

  // --- numbers / counting ---
  const maxN = detectNumberMax(topic)
  if (maxN) {
    const prompt =
      `A children's counting worksheet for numbers 1 to ${maxN}. ` +
      `Show ${maxN} clearly separated groups, each group containing that many identical ` +
      `simple objects (for example ${Math.min(3, maxN)} apples, ${Math.min(4, maxN)} stars), ` +
      `arranged in a neat grid with a large outlined numeral beside each group to trace. ` +
      `${STYLE_SUFFIX}`
    return {
      category: 'number',
      subject: `Numbers 1–${maxN}`,
      prompt,
      glyph: { kind: 'numberRange', value: `1-${maxN}` },
      difficulty,
    }
  }

  // --- shapes ---
  if (/\bshapes?\b/i.test(topic) || /\b(circle|square|triangle|rectangle|star|oval|diamond)\b/i.test(topic)) {
    const prompt =
      `A children's learning worksheet about basic 2D shapes. Show large, clearly ` +
      `separated outlined shapes — circle, square, triangle, rectangle, star and oval — ` +
      `each a simple bold outline to colour, arranged neatly with space around each. ` +
      `${STYLE_SUFFIX}`
    return { category: 'shapes', subject: 'Shapes', prompt, difficulty }
  }

  // --- space ---
  if (/\b(space|planet|planets|rocket|solar system|astronaut|galaxy|stars?)\b/i.test(topic)) {
    const prompt =
      `A children's outer-space scene to colour: a friendly cartoon rocket, a big planet ` +
      `with rings, ${n} stars, a smiling crescent moon and a little astronaut. ` +
      `Large simple shapes, clearly separated. ${STYLE_SUFFIX}`
    return { category: 'space', subject: 'Space', prompt, difficulty }
  }

  // --- minibeasts / bugs ---
  if (/\b(minibeast|minibeasts|bug|bugs|insect|insects|creepy crawl)/i.test(topic)) {
    const beasts = ['a ladybird', 'a snail', 'a bumblebee', 'a caterpillar', 'a butterfly', 'a spider']
    const list = beasts.slice(0, n).join(', ')
    const prompt =
      `A children's minibeasts learning sheet. Show ${n} large, clearly identifiable and ` +
      `separated minibeasts to colour: ${list}. Each a simple bold cartoon outline with ` +
      `space around it. ${STYLE_SUFFIX}`
    return { category: 'minibeasts', subject: 'Minibeasts', prompt, difficulty }
  }

  // --- colours (rainbow) ---
  if (/\bcolou?rs?\b/i.test(topic) || /\brainbow\b/i.test(topic)) {
    const prompt =
      `A children's colours learning sheet featuring a large rainbow with clearly ` +
      `separated bands to colour, plus a few simple objects to colour in (a red apple, ` +
      `a yellow sun, a green leaf, a blue raindrop). Bold simple outlines. ${STYLE_SUFFIX}`
    return { category: 'colours', subject: 'Colours', prompt, difficulty }
  }

  // --- animals (broad) ---
  if (/\b(animal|animals|farm|jungle|zoo|pets?|dinosaur|dinosaurs|sea creatures|ocean)\b/i.test(topic)) {
    const subject = titleCase(topic)
    const prompt =
      `A children's animal learning sheet about "${subject}". Show ${n} large, clearly ` +
      `identifiable and separated ${subject.toLowerCase()} as simple bold cartoon outlines ` +
      `to colour, each with space around it. ${STYLE_SUFFIX}`
    return { category: 'animals', subject, prompt, difficulty }
  }

  // --- generic fallback ---
  const subject = titleCase(topic)
  const prompt =
    `A children's colouring page about "${subject}". Show ${n} large, simple, clearly ` +
    `separated pictures that a child would recognise for the topic "${subject}", each a ` +
    `bold cartoon outline to colour with space around it. ${STYLE_SUFFIX}`
  return { category: 'generic', subject, prompt, difficulty }
}
