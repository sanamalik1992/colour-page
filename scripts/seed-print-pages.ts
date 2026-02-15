/**
 * Seed script for the Print Library.
 *
 * Generates 24 SVG colouring pages with actual simple line art,
 * uploads to Supabase storage, and inserts into the print_pages table.
 *
 * Usage:
 *   npx tsx scripts/seed-print-pages.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ------------------------------------------------------------------
// SVG Colouring Page Templates
// Each returns an A4-ratio SVG (744 x 1052) with black outlines on white
// ------------------------------------------------------------------

interface PageDef {
  title: string
  slug: string
  category: string
  tags: string[]
  age_range: string
  svg: string
  featured: boolean
}

function wrap(title: string, inner: string): string {
  const escaped = title.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="744" height="1052" viewBox="0 0 744 1052">
  <rect width="744" height="1052" fill="white"/>
  <text x="372" y="60" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="#222">${escaped}</text>
  <g transform="translate(372,530)" fill="none" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    ${inner}
  </g>
  <text x="372" y="1030" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#ccc">colour.page</text>
</svg>`
}

const PAGES: PageDef[] = [
  // ---- ANIMALS ----
  {
    title: 'Happy Cat', slug: 'happy-cat-colouring-page', category: 'Animals',
    tags: ['cat', 'pet', 'cute', 'animal'], age_range: '2-6', featured: true,
    svg: wrap('Happy Cat', `
      <ellipse cx="0" cy="30" rx="120" ry="140"/>
      <ellipse cx="-50" cy="-80" rx="35" ry="50"/>
      <ellipse cx="50" cy="-80" rx="35" ry="50"/>
      <circle cx="-40" cy="0" r="18"/>
      <circle cx="40" cy="0" r="18"/>
      <circle cx="-40" cy="-4" r="8" fill="black"/>
      <circle cx="40" cy="-4" r="8" fill="black"/>
      <ellipse cx="0" cy="40" rx="12" ry="8"/>
      <line x1="0" y1="48" x2="0" y2="65"/>
      <path d="M -8,60 Q 0,72 8,60"/>
      <line x1="-60" y1="30" x2="-120" y2="20"/>
      <line x1="-60" y1="38" x2="-120" y2="42"/>
      <line x1="-60" y1="46" x2="-120" y2="60"/>
      <line x1="60" y1="30" x2="120" y2="20"/>
      <line x1="60" y1="38" x2="120" y2="42"/>
      <line x1="60" y1="46" x2="120" y2="60"/>
      <path d="M -40,120 Q -60,200 -20,240 Q 0,260 20,240 Q 60,200 40,120"/>
    `),
  },
  {
    title: 'Playful Puppy', slug: 'playful-puppy-colouring-page', category: 'Animals',
    tags: ['dog', 'puppy', 'pet', 'cute'], age_range: '2-6', featured: true,
    svg: wrap('Playful Puppy', `
      <ellipse cx="0" cy="20" rx="110" ry="130"/>
      <ellipse cx="-80" cy="-60" rx="50" ry="70"/>
      <ellipse cx="80" cy="-60" rx="50" ry="70"/>
      <circle cx="-35" cy="-10" r="20"/>
      <circle cx="35" cy="-10" r="20"/>
      <circle cx="-35" cy="-14" r="9" fill="black"/>
      <circle cx="35" cy="-14" r="9" fill="black"/>
      <ellipse cx="0" cy="30" rx="30" ry="20" fill="black"/>
      <path d="M -15,55 Q 0,75 15,55" stroke="black" fill="none" stroke-width="4"/>
      <path d="M -30,80 Q -50,100 -30,120"/>
      <path d="M 30,80 Q 50,100 30,120"/>
      <path d="M -50,140 Q -80,250 0,280 Q 80,250 50,140"/>
      <path d="M 50,200 Q 100,220 130,190 Q 150,170 140,150 Q 130,200 100,210"/>
    `),
  },
  {
    title: 'Friendly Fish', slug: 'friendly-fish-colouring-page', category: 'Ocean',
    tags: ['fish', 'ocean', 'sea', 'water'], age_range: '2-6', featured: true,
    svg: wrap('Friendly Fish', `
      <ellipse cx="0" cy="0" rx="180" ry="120"/>
      <path d="M 150,-80 Q 250,-120 250,0 Q 250,120 150,80"/>
      <circle cx="-80" cy="-20" r="25"/>
      <circle cx="-80" cy="-24" r="12" fill="black"/>
      <path d="M -40,30 Q -10,50 20,30"/>
      <path d="M -120,-60 Q -140,-120 -80,-100"/>
      <path d="M -120,60 Q -140,120 -80,100"/>
      <path d="M 0,-120 Q -20,-180 40,-160 Q 60,-180 20,-120"/>
      <line x1="-100" y1="0" x2="100" y2="0" stroke-dasharray="15,10"/>
      <path d="M -60,-60 Q -30,-80 0,-60" stroke-width="2"/>
      <path d="M -60,60 Q -30,80 0,60" stroke-width="2"/>
      <circle cx="-150" cy="-180" r="15" stroke-width="2"/>
      <circle cx="150" cy="-200" r="10" stroke-width="2"/>
      <circle cx="-200" cy="150" r="12" stroke-width="2"/>
    `),
  },
  {
    title: 'Beautiful Butterfly', slug: 'beautiful-butterfly-colouring-page', category: 'Nature',
    tags: ['butterfly', 'insect', 'nature', 'garden'], age_range: '4-8', featured: true,
    svg: wrap('Beautiful Butterfly', `
      <ellipse cx="0" cy="0" rx="12" ry="80"/>
      <circle cx="0" cy="-90" r="20"/>
      <circle cx="-6" cy="-94" r="5" fill="black"/>
      <circle cx="6" cy="-94" r="5" fill="black"/>
      <path d="M -6,-110 Q -30,-150 -10,-140"/>
      <path d="M 6,-110 Q 30,-150 10,-140"/>
      <ellipse cx="-100" cy="-40" rx="100" ry="70" transform="rotate(-15,-100,-40)"/>
      <ellipse cx="100" cy="-40" rx="100" ry="70" transform="rotate(15,100,-40)"/>
      <ellipse cx="-80" cy="60" rx="70" ry="50" transform="rotate(-20,-80,60)"/>
      <ellipse cx="80" cy="60" rx="70" ry="50" transform="rotate(20,80,60)"/>
      <circle cx="-100" cy="-40" r="30"/>
      <circle cx="100" cy="-40" r="30"/>
      <circle cx="-80" cy="60" r="20"/>
      <circle cx="80" cy="60" r="20"/>
      <ellipse cx="-130" cy="-60" rx="20" ry="15"/>
      <ellipse cx="130" cy="-60" rx="20" ry="15"/>
    `),
  },
  {
    title: 'Cute Bunny Rabbit', slug: 'cute-bunny-rabbit-colouring-page', category: 'Animals',
    tags: ['bunny', 'rabbit', 'pet', 'cute', 'easter'], age_range: '2-6', featured: true,
    svg: wrap('Cute Bunny Rabbit', `
      <ellipse cx="0" cy="40" rx="100" ry="120"/>
      <ellipse cx="-40" cy="-130" rx="30" ry="90"/>
      <ellipse cx="40" cy="-130" rx="30" ry="90"/>
      <ellipse cx="-40" cy="-130" rx="15" ry="60"/>
      <ellipse cx="40" cy="-130" rx="15" ry="60"/>
      <circle cx="-35" cy="0" r="16"/>
      <circle cx="35" cy="0" r="16"/>
      <circle cx="-35" cy="-3" r="7" fill="black"/>
      <circle cx="35" cy="-3" r="7" fill="black"/>
      <path d="M -8,30 L 0,38 L 8,30"/>
      <line x1="0" y1="38" x2="0" y2="50"/>
      <path d="M -12,50 Q 0,60 12,50"/>
      <line x1="-50" y1="30" x2="-100" y2="22"/>
      <line x1="-50" y1="38" x2="-100" y2="40"/>
      <line x1="50" y1="30" x2="100" y2="22"/>
      <line x1="50" y1="38" x2="100" y2="40"/>
      <circle cx="-50" cy="70" r="15" stroke-width="2" stroke-dasharray="4,3"/>
      <circle cx="50" cy="70" r="15" stroke-width="2" stroke-dasharray="4,3"/>
      <circle cx="0" cy="200" r="30"/>
    `),
  },
  // ---- DINOSAURS ----
  {
    title: 'Baby T-Rex', slug: 'baby-t-rex-colouring-page', category: 'Dinosaurs',
    tags: ['dinosaur', 't-rex', 'baby', 'prehistoric'], age_range: '2-6', featured: true,
    svg: wrap('Baby T-Rex', `
      <ellipse cx="0" cy="0" rx="80" ry="70"/>
      <ellipse cx="-60" cy="-80" rx="60" ry="50"/>
      <circle cx="-80" cy="-90" r="14"/>
      <circle cx="-80" cy="-93" r="6" fill="black"/>
      <path d="M -80,-50 Q -60,-40 -40,-50"/>
      <path d="M -90,-42 L -85,-35 L -78,-42 L -72,-35 L -66,-42 L -60,-35 L -55,-42"/>
      <path d="M 70,-20 Q 120,-30 130,0 Q 120,30 70,20"/>
      <path d="M -40,60 L -50,180 L -20,180 L -10,100"/>
      <path d="M 20,60 L 10,180 L 40,180 L 50,100"/>
      <path d="M -60,-10 L -80,10 L -70,20"/>
      <path d="M -50,0 L -70,20 L -60,30"/>
      <path d="M 0,-60 Q 5,-75 10,-60 Q 15,-75 20,-60 Q 25,-75 30,-60"/>
      <path d="M 70,0 Q 140,0 180,20 Q 200,30 190,40 Q 170,30 140,20 Q 100,10 70,20"/>
    `),
  },
  {
    title: 'Friendly Stegosaurus', slug: 'friendly-stegosaurus-colouring-page', category: 'Dinosaurs',
    tags: ['dinosaur', 'stegosaurus', 'prehistoric', 'gentle'], age_range: '4-8', featured: false,
    svg: wrap('Friendly Stegosaurus', `
      <ellipse cx="0" cy="20" rx="150" ry="90"/>
      <path d="M -150,0 Q -220,-20 -230,-60 Q -230,-80 -210,-70 Q -200,-50 -180,-30 Q -160,-10 -150,0"/>
      <circle cx="-210" cy="-65" r="8"/>
      <circle cx="-210" cy="-68" r="4" fill="black"/>
      <path d="M -60,-70 L -50,-130 L -40,-70"/>
      <path d="M -20,-70 L -10,-140 L 0,-70"/>
      <path d="M 20,-70 L 30,-140 L 40,-70"/>
      <path d="M 60,-70 L 70,-130 L 80,-70"/>
      <path d="M 100,-60 L 110,-110 L 120,-60"/>
      <path d="M -100,90 L -110,200 L -80,200 L -70,110"/>
      <path d="M -30,90 L -40,200 L -10,200 L 0,110"/>
      <path d="M 50,90 L 40,200 L 70,200 L 80,110"/>
      <path d="M 120,70 L 110,200 L 140,200 L 150,90"/>
      <path d="M 130,10 Q 160,20 170,40 Q 180,50 160,50 Q 180,60 160,70 Q 140,60 130,40"/>
    `),
  },
  // ---- VEHICLES ----
  {
    title: 'Fire Truck', slug: 'fire-truck-colouring-page', category: 'Vehicles',
    tags: ['fire truck', 'vehicle', 'emergency', 'firefighter'], age_range: '2-6', featured: true,
    svg: wrap('Fire Truck', `
      <rect x="-250" y="-60" width="200" height="120" rx="10"/>
      <rect x="-50" y="-100" width="300" height="160" rx="8"/>
      <rect x="-220" y="-40" width="60" height="40" rx="5" stroke-width="2"/>
      <rect x="-140" y="-40" width="60" height="40" rx="5" stroke-width="2"/>
      <circle cx="-180" cy="80" r="35"/>
      <circle cx="-180" cy="80" r="18"/>
      <circle cx="-80" cy="80" r="35"/>
      <circle cx="-80" cy="80" r="18"/>
      <circle cx="100" cy="80" r="35"/>
      <circle cx="100" cy="80" r="18"/>
      <circle cx="200" cy="80" r="35"/>
      <circle cx="200" cy="80" r="18"/>
      <rect x="-30" y="-130" width="280" height="30" rx="4"/>
      <rect x="0" y="-80" width="40" height="40" rx="3"/>
      <rect x="60" y="-80" width="40" height="40" rx="3"/>
      <rect x="120" y="-80" width="40" height="40" rx="3"/>
      <circle cx="260" cy="-120" r="15" fill="none" stroke="black" stroke-width="3"/>
      <circle cx="260" cy="-120" r="5"/>
    `),
  },
  {
    title: 'Rocket Ship', slug: 'rocket-ship-colouring-page', category: 'Space',
    tags: ['rocket', 'space', 'launch', 'astronaut'], age_range: '4-8', featured: true,
    svg: wrap('Rocket Ship', `
      <path d="M 0,-250 Q -60,-150 -60,50 L 60,50 Q 60,-150 0,-250"/>
      <circle cx="0" cy="-100" r="30"/>
      <circle cx="0" cy="-100" r="20" stroke-width="2"/>
      <rect x="-40" y="-20" width="80" height="40" rx="5" stroke-width="2"/>
      <path d="M -60,50 L -120,130 L -60,100 Z"/>
      <path d="M 60,50 L 120,130 L 60,100 Z"/>
      <path d="M -30,50 L -30,80 L 30,80 L 30,50"/>
      <path d="M -40,100 Q -60,160 -30,160"/>
      <path d="M 0,100 Q 0,180 20,180"/>
      <path d="M 40,100 Q 60,160 30,160"/>
      <path d="M -20,100 Q -40,200 -10,190"/>
      <path d="M 20,100 Q 40,200 10,190"/>
      <circle cx="-180" cy="-100" r="8" stroke-width="2"/>
      <circle cx="200" cy="-150" r="5" stroke-width="2"/>
      <circle cx="-150" cy="50" r="6" stroke-width="2"/>
      <circle cx="180" cy="0" r="4" stroke-width="2"/>
      <path d="M 160,-80 L 170,-70 M 165,-80 L 165,-65 M 170,-80 L 160,-70"/>
    `),
  },
  {
    title: 'School Bus', slug: 'school-bus-colouring-page', category: 'Vehicles',
    tags: ['bus', 'school', 'yellow', 'transport'], age_range: '2-6', featured: false,
    svg: wrap('School Bus', `
      <rect x="-250" y="-80" width="500" height="160" rx="15"/>
      <rect x="-230" y="-60" width="80" height="60" rx="5"/>
      <rect x="-120" y="-60" width="60" height="60" rx="5"/>
      <rect x="-40" y="-60" width="60" height="60" rx="5"/>
      <rect x="40" y="-60" width="60" height="60" rx="5"/>
      <rect x="120" y="-60" width="60" height="60" rx="5"/>
      <circle cx="-170" cy="100" r="40"/>
      <circle cx="-170" cy="100" r="20"/>
      <circle cx="170" cy="100" r="40"/>
      <circle cx="170" cy="100" r="20"/>
      <rect x="-250" y="-100" width="500" height="20" rx="5"/>
      <rect x="200" y="-60" width="50" height="60" rx="3"/>
      <text x="0" y="20" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" font-weight="bold" fill="none" stroke="black" stroke-width="2">SCHOOL BUS</text>
      <line x1="-260" y1="80" x2="-250" y2="80" stroke-width="6"/>
      <line x1="250" y1="80" x2="270" y2="80" stroke-width="6"/>
    `),
  },
  // ---- FANTASY ----
  {
    title: 'Magical Unicorn', slug: 'magical-unicorn-colouring-page', category: 'Fantasy',
    tags: ['unicorn', 'magical', 'fantasy', 'horse'], age_range: '4-8', featured: true,
    svg: wrap('Magical Unicorn', `
      <ellipse cx="20" cy="40" rx="130" ry="90"/>
      <path d="M -100,-10 Q -150,-40 -160,-90 Q -150,-100 -130,-80 Q -120,-40 -100,-10"/>
      <circle cx="-120" cy="-50" r="10"/>
      <circle cx="-120" cy="-53" r="4" fill="black"/>
      <path d="M -140,-90 L -120,-180 L -100,-90"/>
      <path d="M -130,-140 L -110,-135" stroke-width="2"/>
      <path d="M -132,-120 L -108,-115" stroke-width="2"/>
      <path d="M -134,-100 L -106,-95" stroke-width="2"/>
      <path d="M -150,-80 Q -180,-60 -170,-40 Q -190,-30 -180,-20 Q -200,-10 -190,0 Q -170,-10 -160,-30"/>
      <path d="M -60,120 L -80,260 L -50,260 L -30,150"/>
      <path d="M 20,120 L 0,260 L 30,260 L 50,150"/>
      <path d="M 80,110 L 60,260 L 90,260 L 110,140"/>
      <path d="M 130,80 L 120,260 L 150,260 L 160,110"/>
      <path d="M 140,30 Q 200,20 240,40 Q 260,60 240,70 Q 260,80 240,90 Q 220,80 200,50 Q 180,40 140,30"/>
      <circle cx="-200" cy="-150" r="20" stroke-width="2"/>
      <circle cx="180" cy="-120" r="15" stroke-width="2"/>
      <path d="M -170,-200 L -160,-180 L -180,-180 Z" stroke-width="2"/>
      <path d="M 210,-180 L 220,-160 L 200,-160 Z" stroke-width="2"/>
    `),
  },
  {
    title: 'Friendly Dragon', slug: 'friendly-dragon-colouring-page', category: 'Fantasy',
    tags: ['dragon', 'fantasy', 'cute', 'wings'], age_range: '4-8', featured: true,
    svg: wrap('Friendly Dragon', `
      <ellipse cx="0" cy="30" rx="100" ry="110"/>
      <ellipse cx="-30" cy="-80" rx="70" ry="55"/>
      <circle cx="-60" cy="-90" r="16"/>
      <circle cx="-20" cy="-90" r="16"/>
      <circle cx="-60" cy="-93" r="7" fill="black"/>
      <circle cx="-20" cy="-93" r="7" fill="black"/>
      <path d="M -50,-50 Q -30,-38 -10,-50"/>
      <path d="M -20,-130 L -10,-160 L 0,-130 L 10,-155 L 20,-125"/>
      <path d="M -100,-20 Q -200,-80 -220,-30 Q -230,0 -200,10 Q -190,-20 -160,-40 Q -130,-50 -100,-20"/>
      <path d="M -100,0 Q -200,0 -210,30 Q -220,60 -190,50 Q -180,20 -150,0"/>
      <path d="M 100,-20 Q 200,-80 220,-30 Q 230,0 200,10 Q 190,-20 160,-40 Q 130,-50 100,-20"/>
      <path d="M 100,0 Q 200,0 210,30 Q 220,60 190,50 Q 180,20 150,0"/>
      <path d="M -40,130 L -60,220 L -30,220 L -10,150"/>
      <path d="M 30,130 L 10,220 L 40,220 L 60,150"/>
      <path d="M 0,50 Q -20,80 0,100 Q 20,80 0,50" stroke-width="2"/>
      <path d="M 80,100 Q 120,120 140,160 Q 150,180 130,170 Q 120,140 100,120"/>
    `),
  },
  // ---- OCEAN ----
  {
    title: 'Happy Dolphin', slug: 'happy-dolphin-colouring-page', category: 'Ocean',
    tags: ['dolphin', 'ocean', 'sea', 'swimming'], age_range: '4-8', featured: false,
    svg: wrap('Happy Dolphin', `
      <path d="M -200,0 Q -100,-120 0,-100 Q 100,-80 150,-40 Q 200,0 180,20 Q 150,0 100,20 Q 50,40 0,30 Q -50,20 -100,40 Q -150,60 -200,40 Q -230,30 -200,0"/>
      <circle cx="-100" cy="-40" r="10" fill="black"/>
      <path d="M -140,-20 Q -130,-10 -120,-20"/>
      <path d="M 150,-40 Q 200,-80 230,-100 Q 250,-110 240,-80 Q 220,-60 180,-30"/>
      <path d="M -40,30 Q -20,80 0,60 Q 20,80 40,30"/>
      <path d="M 100,20 Q 130,60 120,80 Q 110,60 100,20"/>
      <path d="M -200,100 Q -150,80 -100,100 Q -50,120 0,100 Q 50,80 100,100 Q 150,120 200,100" stroke-width="2" stroke-dasharray="8,6"/>
      <path d="M -250,150 Q -200,130 -150,150 Q -100,170 -50,150 Q 0,130 50,150 Q 100,170 150,150 Q 200,130 250,150" stroke-width="1.5" stroke-dasharray="6,5"/>
    `),
  },
  {
    title: 'Sea Turtle', slug: 'sea-turtle-colouring-page', category: 'Ocean',
    tags: ['turtle', 'sea', 'ocean', 'shell'], age_range: '4-8', featured: false,
    svg: wrap('Sea Turtle', `
      <ellipse cx="0" cy="0" rx="160" ry="120"/>
      <ellipse cx="0" cy="0" rx="130" ry="95"/>
      <line x1="-130" y1="0" x2="130" y2="0" stroke-width="2"/>
      <line x1="0" y1="-95" x2="0" y2="95" stroke-width="2"/>
      <path d="M -90,-65 Q 0,-95 90,-65" stroke-width="2" fill="none"/>
      <path d="M -90,65 Q 0,95 90,65" stroke-width="2" fill="none"/>
      <path d="M 130,-30 Q 200,-80 230,-50 Q 240,-30 220,-20 Q 200,-30 180,-40"/>
      <circle cx="200" cy="-50" r="8" fill="black"/>
      <path d="M -140,-60 Q -220,-100 -240,-60 Q -240,-30 -200,-40 Q -180,-50 -140,-60"/>
      <path d="M -140,60 Q -220,100 -240,60 Q -240,30 -200,40 Q -180,50 -140,60"/>
      <path d="M 140,-50 Q 200,-80 220,-50 Q 220,-30 200,-30"/>
      <path d="M 140,50 Q 200,80 220,50 Q 220,30 200,30"/>
      <path d="M -160,0 Q -200,10 -220,40 Q -220,60 -200,50"/>
    `),
  },
  // ---- NATURE ----
  {
    title: 'Sunny Rainbow', slug: 'sunny-rainbow-colouring-page', category: 'Nature',
    tags: ['rainbow', 'sun', 'clouds', 'sky'], age_range: '2-6', featured: true,
    svg: wrap('Sunny Rainbow', `
      <path d="M -220,80 Q -220,-120 0,-120 Q 220,-120 220,80" fill="none" stroke-width="8"/>
      <path d="M -190,80 Q -190,-90 0,-90 Q 190,-90 190,80" fill="none" stroke-width="8"/>
      <path d="M -160,80 Q -160,-60 0,-60 Q 160,-60 160,80" fill="none" stroke-width="8"/>
      <path d="M -130,80 Q -130,-30 0,-30 Q 130,-30 130,80" fill="none" stroke-width="8"/>
      <circle cx="200" cy="-180" r="60"/>
      <line x1="200" y1="-260" x2="200" y2="-280" stroke-width="4"/>
      <line x1="200" y1="-100" x2="200" y2="-80" stroke-width="4"/>
      <line x1="120" y1="-180" x2="100" y2="-180" stroke-width="4"/>
      <line x1="280" y1="-180" x2="300" y2="-180" stroke-width="4"/>
      <line x1="143" y1="-237" x2="130" y2="-250" stroke-width="4"/>
      <line x1="257" y1="-123" x2="270" y2="-110" stroke-width="4"/>
      <line x1="143" y1="-123" x2="130" y2="-110" stroke-width="4"/>
      <line x1="257" y1="-237" x2="270" y2="-250" stroke-width="4"/>
      <ellipse cx="-230" cy="110" rx="80" ry="40"/>
      <ellipse cx="-200" cy="90" rx="50" ry="35"/>
      <ellipse cx="-260" cy="95" rx="45" ry="30"/>
      <ellipse cx="230" cy="120" rx="70" ry="35"/>
      <ellipse cx="200" cy="100" rx="45" ry="30"/>
      <ellipse cx="260" cy="105" rx="40" ry="28"/>
    `),
  },
  {
    title: 'Big Sunflower', slug: 'big-sunflower-colouring-page', category: 'Nature',
    tags: ['sunflower', 'flower', 'garden', 'nature'], age_range: '2-6', featured: false,
    svg: wrap('Big Sunflower', `
      <circle cx="0" cy="-80" r="60"/>
      <circle cx="0" cy="-80" r="40" stroke-width="2"/>
      <circle cx="-15" cy="-90" r="8" fill="black"/>
      <circle cx="15" cy="-90" r="8" fill="black"/>
      <path d="M -10,-60 Q 0,-50 10,-60"/>
      ${Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30) * Math.PI / 180
        const cx = Math.cos(angle) * 100
        const cy = -80 + Math.sin(angle) * 100
        return `<ellipse cx="${cx}" cy="${cy}" rx="35" ry="18" transform="rotate(${i * 30},${cx},${cy})"/>`
      }).join('\n      ')}
      <line x1="0" y1="20" x2="0" y2="300" stroke-width="8"/>
      <path d="M 0,100 Q -80,80 -100,120 Q -80,100 0,100" stroke-width="3"/>
      <path d="M 0,180 Q 80,160 100,200 Q 80,180 0,180" stroke-width="3"/>
    `),
  },
  {
    title: 'Spring Flowers', slug: 'spring-flowers-colouring-page', category: 'Nature',
    tags: ['flowers', 'spring', 'garden', 'pretty'], age_range: '4-8', featured: false,
    svg: wrap('Spring Flowers', `
      <circle cx="-140" cy="-100" r="25"/>
      <circle cx="-165" cy="-130" r="20"/>
      <circle cx="-115" cy="-130" r="20"/>
      <circle cx="-170" cy="-100" r="20"/>
      <circle cx="-110" cy="-100" r="20"/>
      <circle cx="-155" cy="-75" r="20"/>
      <circle cx="-125" cy="-75" r="20"/>
      <line x1="-140" y1="-75" x2="-140" y2="200" stroke-width="5"/>
      <path d="M -140,0 Q -190,-20 -200,10 Q -190,0 -140,0" stroke-width="3"/>
      <path d="M -140,80 Q -90,60 -80,90 Q -90,80 -140,80" stroke-width="3"/>
      <path d="M 0,-140 Q -20,-160 0,-180 Q 20,-160 0,-140" stroke-width="3"/>
      <path d="M 0,-140 Q -25,-140 -30,-160 Q -20,-145 0,-140" stroke-width="3"/>
      <path d="M 0,-140 Q 25,-140 30,-160 Q 20,-145 0,-140" stroke-width="3"/>
      <path d="M 0,-140 Q -15,-125 -25,-130 Q -15,-130 0,-140" stroke-width="3"/>
      <path d="M 0,-140 Q 15,-125 25,-130 Q 15,-130 0,-140" stroke-width="3"/>
      <line x1="0" y1="-115" x2="0" y2="200" stroke-width="5"/>
      <path d="M 0,50 Q 50,30 60,60 Q 50,50 0,50" stroke-width="3"/>
      <circle cx="140" cy="-80" r="30"/>
      <ellipse cx="110" cy="-110" rx="22" ry="16" transform="rotate(-40,110,-110)"/>
      <ellipse cx="170" cy="-110" rx="22" ry="16" transform="rotate(40,170,-110)"/>
      <ellipse cx="110" cy="-60" rx="22" ry="16" transform="rotate(40,110,-60)"/>
      <ellipse cx="170" cy="-60" rx="22" ry="16" transform="rotate(-40,170,-60)"/>
      <ellipse cx="140" cy="-120" rx="18" ry="14"/>
      <ellipse cx="140" cy="-45" rx="18" ry="14"/>
      <line x1="140" y1="-45" x2="140" y2="200" stroke-width="5"/>
    `),
  },
  // ---- SEASONAL ----
  {
    title: 'Christmas Tree', slug: 'christmas-tree-colouring-page', category: 'Seasonal',
    tags: ['christmas', 'tree', 'holiday', 'festive', 'winter'], age_range: '2-6', featured: true,
    svg: wrap('Christmas Tree', `
      <polygon points="0,-260 -80,-140 -60,-140 -140,-20 -100,-20 -180,100 180,100 100,-20 140,-20 60,-140 80,-140" fill="none" stroke="black" stroke-width="3"/>
      <rect x="-35" y="100" width="70" height="80" rx="5"/>
      <polygon points="0,-290 -15,-260 15,-260" fill="none" stroke="black" stroke-width="3"/>
      <circle cx="-40" cy="-100" r="15"/>
      <circle cx="30" cy="-60" r="15"/>
      <circle cx="-60" cy="10" r="15"/>
      <circle cx="50" cy="30" r="15"/>
      <circle cx="-20" cy="60" r="15"/>
      <circle cx="80" cy="70" r="15"/>
      <circle cx="-100" cy="70" r="15"/>
      <path d="M -100,200 Q -80,180 -50,190 Q -30,200 -10,190 Q 10,180 30,190 Q 50,200 70,190 Q 90,180 100,200" stroke-width="2"/>
    `),
  },
  {
    title: 'Halloween Pumpkin', slug: 'halloween-pumpkin-colouring-page', category: 'Seasonal',
    tags: ['halloween', 'pumpkin', 'spooky', 'autumn'], age_range: '4-8', featured: false,
    svg: wrap('Halloween Pumpkin', `
      <ellipse cx="0" cy="0" rx="180" ry="150"/>
      <path d="M 0,-150 Q -10,-120 0,0 Q 10,-120 0,-150" stroke-width="2"/>
      <path d="M -90,-140 Q -80,-120 -80,0 Q -80,-120 -70,-140" stroke-width="2"/>
      <path d="M 90,-140 Q 80,-120 80,0 Q 80,-120 70,-140" stroke-width="2"/>
      <path d="M 0,-150 Q -20,-180 -10,-220 Q 0,-240 20,-230 Q 30,-220 20,-200 Q 10,-180 0,-150"/>
      <polygon points="-70,-40 -50,-90 -30,-40" fill="black"/>
      <polygon points="30,-40 50,-90 70,-40" fill="black"/>
      <path d="M -80,40 L -50,20 L -20,50 L 0,20 L 20,50 L 50,20 L 80,40" stroke="black" stroke-width="5" fill="black"/>
      <path d="M -80,40 L -50,70 L -20,40 L 0,70 L 20,40 L 50,70 L 80,40" stroke="black" stroke-width="5" fill="black"/>
    `),
  },
  {
    title: 'Easter Egg', slug: 'easter-egg-colouring-page', category: 'Seasonal',
    tags: ['easter', 'egg', 'spring', 'decorated'], age_range: '2-6', featured: false,
    svg: wrap('Easter Egg', `
      <path d="M 0,-200 Q -150,-100 -150,50 Q -150,200 0,200 Q 150,200 150,50 Q 150,-100 0,-200 Z"/>
      <path d="M -130,-60 Q -60,-90 0,-60 Q 60,-90 130,-60" stroke-width="4" fill="none"/>
      <path d="M -140,0 Q -70,30 0,0 Q 70,30 140,0" stroke-width="4" fill="none"/>
      <path d="M -135,60 Q -60,30 0,60 Q 60,30 135,60" stroke-width="4" fill="none"/>
      <path d="M -120,120 Q -50,90 0,120 Q 50,90 120,120" stroke-width="4" fill="none"/>
      <circle cx="-60" cy="-130" r="15"/>
      <circle cx="60" cy="-130" r="15"/>
      <circle cx="0" cy="-150" r="12"/>
      <path d="M -80,160 L -60,140 L -40,160 L -20,140 L 0,160 L 20,140 L 40,160 L 60,140 L 80,160" stroke-width="3"/>
      <circle cx="-90" cy="30" r="10"/>
      <circle cx="90" cy="30" r="10"/>
      <circle cx="-60" cy="-30" r="8"/>
      <circle cx="60" cy="-30" r="8"/>
    `),
  },
  // ---- SPACE ----
  {
    title: 'Astronaut in Space', slug: 'astronaut-in-space-colouring-page', category: 'Space',
    tags: ['astronaut', 'space', 'spacesuit', 'stars'], age_range: '4-8', featured: false,
    svg: wrap('Astronaut in Space', `
      <circle cx="0" cy="-120" r="70"/>
      <rect x="-20" y="-160" width="40" height="80" rx="20" fill="none" stroke="none"/>
      <ellipse cx="0" cy="-120" rx="50" ry="45"/>
      <circle cx="-15" cy="-130" r="6" fill="black"/>
      <circle cx="15" cy="-130" r="6" fill="black"/>
      <path d="M -10,-105 Q 0,-95 10,-105"/>
      <rect x="-80" y="-50" width="160" height="180" rx="30"/>
      <rect x="-60" y="-20" width="30" height="30" rx="5" stroke-width="2"/>
      <rect x="-15" y="-20" width="30" height="30" rx="5" stroke-width="2"/>
      <rect x="30" y="-20" width="30" height="30" rx="5" stroke-width="2"/>
      <path d="M -80,20 Q -140,40 -150,80 Q -140,100 -120,90 Q -100,70 -80,50"/>
      <path d="M 80,20 Q 140,40 150,80 Q 140,100 120,90 Q 100,70 80,50"/>
      <path d="M -40,130 L -50,250 L -20,250 L -10,160"/>
      <path d="M 40,130 L 50,250 L 20,250 L 10,160"/>
      <rect x="-60" y="245" width="50" height="20" rx="5"/>
      <rect x="10" y="245" width="50" height="20" rx="5"/>
      <circle cx="-200" cy="-200" r="5" fill="black"/>
      <circle cx="200" cy="-180" r="4" fill="black"/>
      <circle cx="-180" cy="100" r="3" fill="black"/>
      <circle cx="190" cy="50" r="6" fill="black"/>
      <path d="M 150,-250 L 160,-240 M 155,-250 L 155,-235 M 160,-250 L 150,-240"/>
      <path d="M -220,0 L -210,10 M -215,0 L -215,15 M -210,0 L -220,10"/>
    `),
  },
  // ---- FOOD ----
  {
    title: 'Ice Cream Cone', slug: 'ice-cream-cone-colouring-page', category: 'Food',
    tags: ['ice cream', 'cone', 'sweet', 'summer'], age_range: '2-6', featured: false,
    svg: wrap('Ice Cream Cone', `
      <path d="M -80,-20 L 0,250 L 80,-20"/>
      <line x1="-70,-5" y1="-5" x2="35" y2="130" stroke-width="2"/>
      <line x1="70" y1="-5" x2="-35" y2="130" stroke-width="2"/>
      <line x1="-55" y1="30" x2="55" y2="30" stroke-width="1.5"/>
      <line x1="-40" y1="70" x2="40" y2="70" stroke-width="1.5"/>
      <line x1="-25" y1="110" x2="25" y2="110" stroke-width="1.5"/>
      <circle cx="0" cy="-60" r="80"/>
      <circle cx="-70" cy="-100" r="65"/>
      <circle cx="70" cy="-100" r="65"/>
      <circle cx="0" cy="-160" r="55"/>
      <circle cx="-15" cy="-200" r="10" stroke-width="2"/>
      <circle cx="20" cy="-180" r="8" stroke-width="2"/>
      <circle cx="-30" cy="-120" r="7" stroke-width="2"/>
      <circle cx="40" cy="-60" r="9" stroke-width="2"/>
      <circle cx="-50" cy="-70" r="6" stroke-width="2"/>
    `),
  },
  {
    title: 'Birthday Cake', slug: 'birthday-cake-colouring-page', category: 'Food',
    tags: ['cake', 'birthday', 'candles', 'celebration'], age_range: '2-6', featured: false,
    svg: wrap('Birthday Cake', `
      <rect x="-180" y="-40" width="360" height="100" rx="10"/>
      <rect x="-160" y="-140" width="320" height="100" rx="10"/>
      <rect x="-130" y="-220" width="260" height="80" rx="10"/>
      <path d="M -180,-40 Q -120,-60 -60,-40 Q 0,-20 60,-40 Q 120,-60 180,-40" stroke-width="3"/>
      <path d="M -160,-140 Q -100,-160 -40,-140 Q 20,-120 80,-140 Q 140,-160 160,-140" stroke-width="3"/>
      <path d="M -130,-220 Q -70,-240 0,-220 Q 70,-200 130,-220" stroke-width="3"/>
      <line x1="-80" y1="-220" x2="-80" y2="-280" stroke-width="4"/>
      <line x1="0" y1="-220" x2="0" y2="-280" stroke-width="4"/>
      <line x1="80" y1="-220" x2="80" y2="-280" stroke-width="4"/>
      <path d="M -85,-280 Q -80,-300 -75,-280" stroke-width="2" fill="none"/>
      <path d="M -5,-280 Q 0,-300 5,-280" stroke-width="2" fill="none"/>
      <path d="M 75,-280 Q 80,-300 85,-280" stroke-width="2" fill="none"/>
      <ellipse cx="-85" cy="-283" rx="8" ry="12" fill="none" stroke-width="1.5"/>
      <ellipse cx="5" cy="-283" rx="8" ry="12" fill="none" stroke-width="1.5"/>
      <ellipse cx="85" cy="-283" rx="8" ry="12" fill="none" stroke-width="1.5"/>
      <circle cx="-120" cy="-180" r="8"/>
      <circle cx="0" cy="-170" r="8"/>
      <circle cx="120" cy="-180" r="8"/>
      <circle cx="-100" cy="-80" r="10"/>
      <circle cx="100" cy="-80" r="10"/>
    `),
  },
  // ---- PEOPLE ----
  {
    title: 'Superhero Kid', slug: 'superhero-kid-colouring-page', category: 'People',
    tags: ['superhero', 'kid', 'cape', 'hero'], age_range: '4-8', featured: false,
    svg: wrap('Superhero Kid', `
      <circle cx="0" cy="-150" r="55"/>
      <circle cx="-18" cy="-160" r="8" fill="black"/>
      <circle cx="18" cy="-160" r="8" fill="black"/>
      <path d="M -12,-130 Q 0,-120 12,-130"/>
      <path d="M -40,-170 L -55,-180 L -55,-165 Z" fill="black"/>
      <rect x="-50" y="-95" width="100" height="130" rx="15"/>
      <path d="M 0,-80 L -15,-60 L 0,-40 L 15,-60 Z" stroke-width="3"/>
      <path d="M -50,-80 Q -100,-60 -110,0 Q -100,20 -80,10 Q -60,-20 -50,-50"/>
      <path d="M 50,-80 Q 100,-60 110,0 Q 100,20 80,10 Q 60,-20 50,-50"/>
      <path d="M -25,35 L -35,180 L -5,180 L 5,55"/>
      <path d="M 25,35 L 35,180 L 5,180 L -5,55"/>
      <rect x="-45" y="175" width="40" height="15" rx="5"/>
      <rect x="5" y="175" width="40" height="15" rx="5"/>
      <path d="M 50,-90 Q 100,-110 150,-80 Q 200,-50 220,0 Q 200,-20 150,-40 Q 100,-60 80,-30 Q 100,-50 50,-90" stroke-width="2"/>
      <path d="M 50,-70 Q 100,-90 140,-60 Q 180,-30 200,20 Q 180,0 140,-20 Q 100,-40 80,-10 Q 100,-30 50,-70" stroke-width="2"/>
    `),
  },
  // ---- LEARNING ----
  {
    title: 'Number Fun 1-2-3', slug: 'number-fun-123-colouring-page', category: 'Learning',
    tags: ['numbers', 'counting', 'learning', 'math', 'educational'], age_range: '2-6', featured: false,
    svg: wrap('Number Fun 1-2-3', `
      <text x="-200" y="-60" font-family="Arial,sans-serif" font-size="220" font-weight="bold" fill="none" stroke="black" stroke-width="4">1</text>
      <text x="-50" y="-60" font-family="Arial,sans-serif" font-size="220" font-weight="bold" fill="none" stroke="black" stroke-width="4">2</text>
      <text x="100" y="-60" font-family="Arial,sans-serif" font-size="220" font-weight="bold" fill="none" stroke="black" stroke-width="4">3</text>
      <circle cx="-180" cy="200" r="25"/>
      <circle cx="-100" cy="200" r="25"/>
      <circle cx="-140" cy="260" r="25"/>
      <rect x="-30" y="175" width="50" height="50" rx="5"/>
      <rect x="40" y="175" width="50" height="50" rx="5"/>
      <rect x="5" y="235" width="50" height="50" rx="5"/>
      <path d="M 130,180 L 165,250 L 200,180 Z" fill="none" stroke="black" stroke-width="3"/>
      <path d="M 150,220 L 185,290 L 220,220 Z" fill="none" stroke="black" stroke-width="3"/>
      <path d="M 110,260 L 145,330 L 180,260 Z" fill="none" stroke="black" stroke-width="3"/>
    `),
  },
]

async function seed() {
  console.log(`Seeding ${PAGES.length} colouring pages...`)

  let success = 0
  let skipped = 0
  let failed = 0

  for (const page of PAGES) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('print_pages')
      .select('id')
      .eq('slug', page.slug)
      .maybeSingle()

    if (existing) {
      console.log(`  SKIP: ${page.title} (already exists)`)
      skipped++
      continue
    }

    try {
      // Convert SVG to PNG
      const sharp = (await import('sharp')).default
      const pngBuffer = await sharp(Buffer.from(page.svg))
        .resize(744, 1052)
        .png()
        .toBuffer()

      const storagePath = `previews/${page.slug}.png`

      // Upload to storage (try print-pages bucket, fall back to images)
      const { error: upErr } = await supabase.storage
        .from('print-pages')
        .upload(storagePath, pngBuffer, { contentType: 'image/png', upsert: true })

      if (upErr) {
        const { error: fbErr } = await supabase.storage
          .from('images')
          .upload(storagePath, pngBuffer, { contentType: 'image/png', upsert: true })
        if (fbErr) {
          console.error(`  FAIL upload: ${page.title}:`, fbErr.message)
          failed++
          continue
        }
      }

      // Determine season from tags
      let season: string | null = null
      if (page.tags.some(t => ['christmas', 'winter'].includes(t))) season = 'winter'
      else if (page.tags.some(t => ['easter', 'spring'].includes(t))) season = 'spring'
      else if (page.tags.some(t => ['halloween', 'autumn'].includes(t))) season = 'autumn'
      else if (page.tags.some(t => ['summer'].includes(t))) season = 'summer'

      // Insert into database
      const { error: insertErr } = await supabase.from('print_pages').insert({
        title: page.title + ' Colouring Page',
        slug: page.slug,
        description: `Free printable ${page.title.toLowerCase()} colouring page for kids aged ${page.age_range}.`,
        category: page.category,
        tags: page.tags,
        age_range: page.age_range,
        season,
        preview_png_path: storagePath,
        source_storage_path: storagePath,
        featured: page.featured,
        sort_order: success,
        download_count: 0,
        view_count: 0,
        is_published: true,
      })

      if (insertErr) {
        console.error(`  FAIL insert: ${page.title}:`, insertErr.message)
        failed++
        continue
      }

      console.log(`  OK: ${page.title}`)
      success++
    } catch (err) {
      console.error(`  FAIL: ${page.title}:`, err)
      failed++
    }
  }

  console.log(`\nDone! ${success} created, ${skipped} skipped, ${failed} failed`)
}

seed().catch(console.error)
