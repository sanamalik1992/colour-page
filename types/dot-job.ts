export type DotJobStatus = 'queued' | 'processing' | 'rendering' | 'done' | 'failed'
export type DotDifficulty = 'easy' | 'medium' | 'hard'

export interface DotJobSettings {
  dotCount: number        // 50 | 100 | 150 | 200
  showGuideLines: boolean // faint connecting lines
  difficulty: DotDifficulty
}

export const DEFAULT_DOT_SETTINGS: DotJobSettings = {
  dotCount: 100,
  showGuideLines: false,
  difficulty: 'medium',
}

export const DOT_COUNT_OPTIONS = [
  { value: 50, label: '50 dots', description: 'Easy - Ages 3-5' },
  { value: 100, label: '100 dots', description: 'Medium - Ages 5-8' },
  { value: 150, label: '150 dots', description: 'Hard - Ages 8-12' },
  { value: 200, label: '200 dots', description: 'Expert - Ages 12+' },
] as const

export interface DotJob {
  id: string
  user_id: string
  email?: string
  status: DotJobStatus
  input_storage_path: string
  original_filename?: string
  output_pdf_path?: string
  output_png_path?: string
  settings: DotJobSettings
  progress: number
  processing_started_at?: string
  error?: string
  is_pro: boolean
  created_at: string
  updated_at: string
  completed_at?: string
}
