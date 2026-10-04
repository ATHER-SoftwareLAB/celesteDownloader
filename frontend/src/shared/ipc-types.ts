export interface VideoFormat {
  height: number
  fps: number
}

export interface VideoMetadata {
  type: 'video'
  url: string
  title: string
  duration: number
  uploader: string
  upload_date: string
  thumbnail: string
  formats: VideoFormat[]
}

export interface PlaylistEntry {
  url: string
  title: string
  duration: number | null
  thumbnail: string | null
}

export interface PlaylistMetadata {
  type: 'playlist'
  url: string
  title: string
  uploader: string | null
  /** Channels list only their most recent videos. */
  is_channel: boolean
  /** Private or deleted videos left out of `entries`. */
  unavailable_count: number
  entries: PlaylistEntry[]
}

export type MediaMetadata = VideoMetadata | PlaylistMetadata

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
  /** Retries done so far for a recoverable error (0 on the first attempt). */
  retry?: number
  /** Retry limit for this task; present once processing has started. */
  max_retries?: number
  error?: string
  path?: string
}

export interface ProgressBatch {
  tasks: DownloadProgress[]
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

export interface Config {
  download_path: string
  theme: string
  auto_retries: boolean
  max_retries: number
  metadata_cache_ttl: number
}
