export interface VideoFormat {
  height: number
  fps: number
}

export interface VideoMetadata {
  url: string
  title: string
  duration: number
  uploader: string
  upload_date: string
  thumbnail: string
  formats: VideoFormat[]
}

export interface ApiError {
  error: string
}

export interface DownloadResponse {
  success: boolean
  task_id: string
  status: string
  position?: number
}

export interface DownloadProgress {
  task_id: string
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
}

export interface QueueItem {
  task_id: string
  status: string
  position: number
}

export interface QueueStatus {
  current: { task_id: string; status: string; progress: number } | null
  queue: QueueItem[]
  paused: boolean
}
