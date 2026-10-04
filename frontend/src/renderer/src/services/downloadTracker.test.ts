import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiError, DownloadProgress, ProgressBatch } from '../../../shared/ipc-types'
import { createTaskTracker, TaskHandlers } from './downloadTracker'

function progress(taskId: string, status: DownloadProgress['status'], pct: number): DownloadProgress {
  return { task_id: taskId, status, progress: pct }
}

/** Fake backend: answers each requested task with its next scripted update. */
function fakeBackend(script: Record<string, DownloadProgress[]>) {
  return vi.fn(async (taskIds: string[]): Promise<ProgressBatch | ApiError> => ({
    tasks: taskIds.map((id) => {
      const updates = script[id]
      return updates.length > 1 ? updates.shift()! : updates[0]
    })
  }))
}

function spyHandlers(): TaskHandlers & {
  onProgress: ReturnType<typeof vi.fn>
  onCompleted: ReturnType<typeof vi.fn>
  onError: ReturnType<typeof vi.fn>
} {
  return { onProgress: vi.fn(), onCompleted: vi.fn(), onError: vi.fn() }
}

describe('createTaskTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reports progress until completion, then stops polling', async () => {
    const fetchProgress = fakeBackend({
      a: [progress('a', 'downloading', 40), progress('a', 'completed', 100)]
    })
    const handlers = spyHandlers()

    createTaskTracker(fetchProgress, 500).track('a', handlers)
    await vi.advanceTimersByTimeAsync(500)
    expect(handlers.onProgress).toHaveBeenCalledWith(progress('a', 'downloading', 40))

    await vi.advanceTimersByTimeAsync(500)
    expect(handlers.onCompleted).toHaveBeenCalledWith(progress('a', 'completed', 100))

    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchProgress).toHaveBeenCalledTimes(2)
  })

  it('polls every tracked task in a single request', async () => {
    const fetchProgress = fakeBackend({
      a: [progress('a', 'downloading', 10)],
      b: [progress('b', 'pending', 0)],
      c: [progress('c', 'pending', 0)]
    })
    const tracker = createTaskTracker(fetchProgress, 500)

    tracker.track('a', spyHandlers())
    tracker.track('b', spyHandlers())
    tracker.track('c', spyHandlers())
    await vi.advanceTimersByTimeAsync(500)

    expect(fetchProgress).toHaveBeenCalledTimes(1)
    expect(fetchProgress).toHaveBeenCalledWith(['a', 'b', 'c'])
  })

  it('passes retry information through with progress updates', async () => {
    const retrying: DownloadProgress = {
      task_id: 'a',
      status: 'downloading',
      progress: 0,
      retry: 1,
      max_retries: 3
    }
    const fetchProgress = fakeBackend({ a: [retrying, progress('a', 'completed', 100)] })
    const handlers = spyHandlers()

    createTaskTracker(fetchProgress, 500).track('a', handlers)
    await vi.advanceTimersByTimeAsync(500)

    expect(handlers.onProgress).toHaveBeenCalledWith(retrying)
  })

  it('keeps following an earlier task after a new one is tracked', async () => {
    const fetchProgress = fakeBackend({
      a: [progress('a', 'downloading', 50), progress('a', 'completed', 100)],
      b: [
        progress('b', 'pending', 0),
        progress('b', 'pending', 0),
        progress('b', 'downloading', 10),
        progress('b', 'completed', 100)
      ]
    })
    const first = spyHandlers()
    const second = spyHandlers()
    const tracker = createTaskTracker(fetchProgress, 500)

    tracker.track('a', first)
    await vi.advanceTimersByTimeAsync(250)
    tracker.track('b', second)
    await vi.advanceTimersByTimeAsync(5000)

    expect(first.onCompleted).toHaveBeenCalledTimes(1)
    expect(second.onCompleted).toHaveBeenCalledTimes(1)
    expect(first.onError).not.toHaveBeenCalled()
    expect(second.onError).not.toHaveBeenCalled()
  })

  it('reports a failed download with the backend message', async () => {
    const fetchProgress = fakeBackend({
      a: [{ task_id: 'a', status: 'error', progress: 0, error: 'El video no está disponible' }]
    })
    const handlers = spyHandlers()

    createTaskTracker(fetchProgress, 500).track('a', handlers)
    await vi.advanceTimersByTimeAsync(5000)

    expect(handlers.onError).toHaveBeenCalledExactlyOnceWith('El video no está disponible')
    expect(fetchProgress).toHaveBeenCalledTimes(1)
  })

  it('fails every tracked task when the backend is unreachable', async () => {
    const fetchProgress = vi.fn(
      async (): Promise<ProgressBatch | ApiError> => ({ error: 'No se pudo conectar con el backend' })
    )
    const first = spyHandlers()
    const second = spyHandlers()
    const tracker = createTaskTracker(fetchProgress, 500)

    tracker.track('a', first)
    tracker.track('b', second)
    await vi.advanceTimersByTimeAsync(5000)

    expect(first.onError).toHaveBeenCalledExactlyOnceWith('No se pudo conectar con el backend')
    expect(second.onError).toHaveBeenCalledExactlyOnceWith('No se pudo conectar con el backend')
    expect(fetchProgress).toHaveBeenCalledTimes(1)
  })

  it('keeps working after a request rejects', async () => {
    const fetchProgress = vi
      .fn()
      .mockRejectedValueOnce(new Error('ipc failed'))
      .mockResolvedValue({ tasks: [progress('b', 'completed', 100)] })
    const first = spyHandlers()
    const second = spyHandlers()
    const tracker = createTaskTracker(fetchProgress, 500)

    tracker.track('a', first)
    await vi.advanceTimersByTimeAsync(500)
    tracker.track('b', second)
    await vi.advanceTimersByTimeAsync(500)

    expect(first.onError).toHaveBeenCalledExactlyOnceWith('No se pudo conectar con el backend')
    expect(second.onCompleted).toHaveBeenCalledTimes(1)
  })

  it('does not overlap polls while a response is slow', async () => {
    let resolveSlow: (r: ProgressBatch) => void = () => {}
    const fetchProgress = vi.fn(
      () => new Promise<ProgressBatch | ApiError>((resolve) => (resolveSlow = resolve))
    )
    const handlers = spyHandlers()
    const tracker = createTaskTracker(fetchProgress, 500)

    tracker.track('a', handlers)
    await vi.advanceTimersByTimeAsync(500)
    tracker.track('b', spyHandlers())
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchProgress).toHaveBeenCalledTimes(1)

    resolveSlow({ tasks: [progress('a', 'completed', 100)] })
    await vi.advanceTimersByTimeAsync(0)
    expect(handlers.onCompleted).toHaveBeenCalledTimes(1)
  })

  it('ignores a response that arrives after stop() and stops polling', async () => {
    let resolveSlow: (r: ProgressBatch) => void = () => {}
    const fetchProgress = vi.fn(
      () => new Promise<ProgressBatch | ApiError>((resolve) => (resolveSlow = resolve))
    )
    const handlers = spyHandlers()

    const stop = createTaskTracker(fetchProgress, 500).track('a', handlers)
    await vi.advanceTimersByTimeAsync(500)
    stop()
    resolveSlow({ tasks: [progress('a', 'completed', 100)] })
    await vi.advanceTimersByTimeAsync(5000)

    expect(handlers.onCompleted).not.toHaveBeenCalled()
    expect(fetchProgress).toHaveBeenCalledTimes(1)
  })
})
