import type { ActiveStatus } from '../services/downloadTracker'

export interface ProgressState {
  downloading: boolean
  status: ActiveStatus
  progress: number
  retry: number
  maxRetries: number
}

export function progressLabel({ downloading, status, progress, retry, maxRetries }: ProgressState): string {
  if (!downloading) return `${progress}%`
  if (status === 'pending') return 'En cola...'
  if (progress >= 100) return 'Procesando...'
  if (retry > 0) return `Reintento ${retry} de ${maxRetries}... ${progress}%`
  return `Descargando... ${progress}%`
}
