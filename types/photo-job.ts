export type PhotoJobStatus = 'queued' | 'processing' | 'rendering' | 'done' | 'failed'
export type Orientation = 'portrait' | 'landscape'
export type LineThickness = 'thin' | 'medium' | 'thick'
export type DetailLevel = 'low' | 'medium' | 'high'

export type JobSource = 'photo' | 'topic'

export interface PhotoJobSettings {
  orientation: Orientation
  lineThickness: LineThickness
  detailLevel: DetailLevel
  // Topic-generation extras (only present when source === 'topic')
  source?: JobSource
  topic?: string
  age?: number
  category?: string
  prompt?: string
  title?: string // friendly CAPS heading printed on the sheet
  numbers?: number[] // for 'sequence' sheets (multiples / times tables)
  objects?: string[] // for 'letter'/pictorial — generate each separately, then grid
  // Deterministic glyph to draw ourselves for letter/number sheets:
  //  { kind: 'letter', value: 'B' } | { kind: 'numberRange', value: '1-10' }
  glyph?: { kind: 'letter' | 'numberRange'; value: string }
}

export const DEFAULT_SETTINGS: PhotoJobSettings = {
  orientation: 'portrait',
  lineThickness: 'medium',
  detailLevel: 'medium',
}

export interface PhotoJob {
  id: string
  user_id: string
  email?: string
  status: PhotoJobStatus
  source?: JobSource
  topic?: string
  input_storage_path?: string
  original_filename?: string
  output_pdf_path?: string
  output_png_path?: string
  settings: PhotoJobSettings
  prediction_id?: string
  progress: number
  processing_started_at?: string
  error?: string
  is_pro: boolean
  is_watermarked: boolean
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface PrintPage {
  id: string
  title: string
  slug: string
  description?: string
  category: string
  tags: string[]
  season?: string
  age_range: string
  source_storage_path?: string
  pdf_storage_path?: string
  preview_png_path?: string
  featured: boolean
  is_published: boolean
  sort_order: number
  download_count: number
  view_count: number
  created_at: string
  updated_at: string
  published_at?: string
  // Computed on read
  preview_url?: string
  pdf_url?: string
}

export const PRINT_PAGE_CATEGORIES = [
  'Animals',
  'Vehicles',
  'Dinosaurs',
  'Fantasy',
  'Nature',
  'Space',
  'Ocean',
  'Food',
  'Sports',
  'People',
  'Buildings',
  'Patterns',
] as const

export const SEASONS = [
  'ramadan',
  'eid',
  'christmas',
  'halloween',
  'easter',
  'winter',
  'spring',
  'summer',
  'autumn',
  'diwali',
  'new-year',
  'valentines',
  'mothers-day',
  'fathers-day',
] as const

export type PrintPageCategory = (typeof PRINT_PAGE_CATEGORIES)[number]
export type Season = (typeof SEASONS)[number]
