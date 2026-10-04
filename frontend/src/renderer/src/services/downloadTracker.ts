import type { ApiError, DownloadProgress } from '../../../shared/ipc-types'

const POLL_INTERVAL_MS = 500

export type ActiveStatus = Exclude<DownloadProgress['status'], 'completed' | 'error'>

export interface TaskHandlers {
  onProgress: (status: ActiveStatus, progress: number) => void
  onCompleted: (update: DownloadProgress) => void
  onError: (message: string) => void
}

/**
 * Polls one download task until it completes or fails. Each task gets its
 * own tracker, so queueing a new download never stops following earlier
 * ones. The next poll is scheduled only after the previous response
 * arrives, so slow responses never overlap or report a result twice.
 *
 * Returns a function that stops tracking.
 */
export function trackTask(
  taskId: string,
  fetchProgress: (taskId: string) => Promise<DownloadProgress | ApiError>,
  handlers: TaskHandlers,
  intervalMs = POLL_INTERVAL_MS
): () => void {
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const poll = async (): Promise<void> => {
    const update = await fetchProgress(taskId)
    if (stopped) return

    if (!('status' in update)) {
      stopped = true
      handlers.onError(update.error)
    } else if (update.status === 'completed') {
      stopped = true
      handlers.onCompleted(update)
    } else if (update.status === 'error') {
      stopped = true
      handlers.onError(update.error ?? 'La descarga falló')
    } else {
      handlers.onProgress(update.status, update.progress)
      timer = setTimeout(poll, intervalMs)
    }
  }

  timer = setTimeout(poll, intervalMs)

  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
