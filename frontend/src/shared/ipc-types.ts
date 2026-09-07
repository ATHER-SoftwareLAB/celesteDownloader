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
}
