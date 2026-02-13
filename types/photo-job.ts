export type PhotoJobStatus = 'queued' | 'processing' | 'rendering' | 'done' | 'failed'
export type Orientation = 'portrait' | 'landscape'
export type LineThickness = 'thin' | 'medium' | 'thick'
export type DetailLevel = 'low' | 'medium' | 'high'

export interface PhotoJobSettings {
  orientation: Orientation
  lineThickness: LineThickness
  detailLevel: DetailLevel
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
  input_storage_path: string
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
