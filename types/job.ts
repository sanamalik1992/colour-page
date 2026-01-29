export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type Complexity = 'simple' | 'detailed'

export interface JobOptions {
  complexity: Complexity
  instructions?: string
  customText?: string
  addTextOverlay?: boolean
}

export interface Job {
  id: string
  status: JobStatus
  progress: number
  uploadPath: string
  originalFilename?: string
  complexity: Complexity
  instructions?: string
  customText?: string
  addTextOverlay?: boolean
  previewUrl?: string
  resultUrl?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  errorMessage?: string
}

export interface CreateJobResponse {
  jobId: string
  uploadUrl: string
}

export interface JobStatusResponse {
  job: Job
  signedPreviewUrl?: string
  signedResultUrl?: string
}

export interface EmailDeliveryRequest {
  jobId: string
  email: string
}

export interface EmailDeliveryResponse {
  success: boolean
  message: string
}
