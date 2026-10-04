import type { ApiError, DownloadProgress, ProgressBatch } from '../../../shared/ipc-types'

const POLL_INTERVAL_MS = 500
const BACKEND_DOWN = 'No se pudo conectar con el backend'

export type ActiveStatus = Exclude<DownloadProgress['status'], 'completed' | 'error'>
export type ActiveProgress = DownloadProgress & { status: ActiveStatus }

export interface TaskHandlers {
  onProgress: (update: ActiveProgress) => void
  onCompleted: (update: DownloadProgress) => void
  onError: (message: string) => void
}

export interface TaskTracker {
  /** Follows a task until it completes or fails. Returns a function that stops following it. */
  track: (taskId: string, handlers: TaskHandlers) => () => void
}

/**
 * Follows download tasks until each one completes or fails. All tracked
 * tasks are polled together in a single request, so queueing a whole
 * playlist doesn't flood the backend, and queueing a new download never
 * stops following earlier ones. The next poll is scheduled only after the
 * previous response arrives, so slow responses never overlap or report a
 * result twice.
 */
export function createTaskTracker(
  fetchProgress: (taskIds: string[]) => Promise<ProgressBatch | ApiError>,
  intervalMs = POLL_INTERVAL_MS
): TaskTracker {
  const active = new Map<string, TaskHandlers>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let polling = false

  const schedule = (): void => {
    if (timer === undefined && !polling && active.size > 0) {
      timer = setTimeout(poll, intervalMs)
    }
  }

  const failAll = (message: string): void => {
    for (const [taskId, handlers] of [...active]) {
      active.delete(taskId)
      handlers.onError(message)
    }
  }

  const dispatch = (update: DownloadProgress): void => {
    const handlers = active.get(update.task_id)
    if (!handlers) return // stopped while the request was in flight

    if (update.status === 'completed') {
      active.delete(update.task_id)
      handlers.onCompleted(update)
    } else if (update.status === 'error') {
      active.delete(update.task_id)
      handlers.onError(update.error ?? 'La descarga falló')
    } else {
      handlers.onProgress({ ...update, status: update.status })
    }
  }

  const poll = async (): Promise<void> => {
    timer = undefined
    if (active.size === 0) return

    polling = true
    let result: ProgressBatch | ApiError
    try {
      result = await fetchProgress([...active.keys()])
    } catch {
      result = { error: BACKEND_DOWN }
    }
    polling = false

    if ('error' in result) failAll(result.error)
    else result.tasks.forEach(dispatch)
    schedule()
  }

  return {
    track: (taskId, handlers) => {
      active.set(taskId, handlers)
      schedule()
      return () => {
        active.delete(taskId)
      }
    }
  }
}
