import type { ActiveStatus } from '../services/downloadTracker'

export interface ProgressState {
  downloading: boolean
  status: ActiveStatus
  progress: number
  retry: number
  maxRetries: number
  /** Set while the bar follows a queued playlist instead of a single video. */
  batch?: { done: number; total: number } | null
}

export function progressLabel({
  downloading,
  status,
  progress,
  retry,
  maxRetries,
  batch
}: ProgressState): string {
  if (batch) return `Playlist: ${batch.done} de ${batch.total}`
  if (!downloading) return `${progress}%`
  if (status === 'pending') return 'En cola...'
  if (progress >= 100) return 'Procesando...'
  if (retry > 0) return `Reintento ${retry} de ${maxRetries}... ${progress}%`
  return `Descargando... ${progress}%`
}
