/**
 * Curated "ready-made" colouring gallery.
 *
 * A hand-picked, kid-friendly set of popular colouring pages grouped into
 * categories. Every item is a concrete, drawable, child-recognisable noun (no
 * brands, no puns) that flows straight into the existing topic pipeline — the
 * gallery links each pick to `/?topic=<title>`, which the home page auto-runs.
 *
 * This means the gallery is populated and browsable with zero database seeding:
 * children pick a category, choose a page, and it generates on demand.
 */

export interface GalleryCategory {
  /** Stable key (also used to look up the icon in the gallery component). */
  key: string
  /** Kid-facing label. */
  label: string
  /** One-line description shown under the label. */
  blurb: string
  /** Tailwind gradient classes for the category's accent. */
  accent: string
  /** Popular pages in this category — each is a ready-made topic. */
  items: string[]
}

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  {
    key: 'animals',
    label: 'Animals',
    blurb: 'Friendly creatures big and small',
    accent: 'from-amber-400 to-orange-500',
    items: ['Lion', 'Elephant', 'Cat', 'Dog', 'Rabbit', 'Monkey', 'Giraffe', 'Panda', 'Fox', 'Owl'],
  },
  {
    key: 'dinosaurs',
    label: 'Dinosaurs',
    blurb: 'Roar into prehistoric times',
    accent: 'from-lime-400 to-emerald-600',
    items: ['T-Rex', 'Triceratops', 'Stegosaurus', 'Brachiosaurus', 'Pterodactyl', 'Velociraptor'],
  },
  {
    key: 'sea',
    label: 'Under the Sea',
    blurb: 'Splash with ocean friends',
    accent: 'from-cyan-400 to-blue-600',
    items: ['Fish', 'Octopus', 'Dolphin', 'Whale', 'Turtle', 'Crab', 'Seahorse', 'Starfish'],
  },
  {
    key: 'space',
    label: 'Space',
    blurb: 'Blast off to the stars',
    accent: 'from-indigo-400 to-violet-600',
    items: ['Rocket', 'Planet', 'Astronaut', 'Moon', 'Star', 'Sun', 'Flying Saucer', 'Comet'],
  },
  {
    key: 'vehicles',
    label: 'Things That Go',
    blurb: 'Cars, trains and diggers',
    accent: 'from-rose-400 to-red-600',
    items: ['Car', 'Fire Engine', 'Train', 'Aeroplane', 'Digger', 'Tractor', 'Boat', 'Helicopter'],
  },
  {
    key: 'nature',
    label: 'Nature',
    blurb: 'Flowers, trees and minibeasts',
    accent: 'from-green-400 to-teal-600',
    items: ['Tree', 'Flower', 'Butterfly', 'Rainbow', 'Mushroom', 'Ladybird', 'Bee', 'Sunflower'],
  },
  {
    key: 'fantasy',
    label: 'Magic & Fantasy',
    blurb: 'Unicorns, dragons and castles',
    accent: 'from-fuchsia-400 to-purple-600',
    items: ['Unicorn', 'Dragon', 'Castle', 'Fairy', 'Mermaid', 'Wizard', 'Crown', 'Magic Wand'],
  },
  {
    key: 'fun',
    label: 'Fun & Treats',
    blurb: 'Cakes, toys and party fun',
    accent: 'from-pink-400 to-rose-500',
    items: ['Ice Cream', 'Cupcake', 'Birthday Cake', 'Apple', 'Balloon', 'Teddy Bear', 'Robot', 'Present'],
  },
]

/** Build the home-page link that auto-generates a ready-made page. */
export function galleryTopicHref(title: string): string {
  return `/?topic=${encodeURIComponent(title)}`
}
