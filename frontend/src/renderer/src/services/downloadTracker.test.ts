import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApiError, DownloadProgress } from '../../../shared/ipc-types'
import { trackTask, TaskHandlers } from './downloadTracker'

type Response = DownloadProgress | ApiError

function progress(taskId: string, status: DownloadProgress['status'], pct: number): DownloadProgress {
  return { task_id: taskId, status, progress: pct }
}

/** Fake backend that answers each task with its scripted responses, in order. */
function fakeBackend(script: Record<string, Response[]>) {
  const calls: string[] = []
  const fetchProgress = vi.fn(async (taskId: string): Promise<Response> => {
    calls.push(taskId)
    const responses = script[taskId]
    return responses.length > 1 ? responses.shift()! : responses[0]
  })
  return { fetchProgress, calls }
}

function spyHandlers(): TaskHandlers & {
  onProgress: ReturnType<typeof vi.fn>
  onCompleted: ReturnType<typeof vi.fn>
  onError: ReturnType<typeof vi.fn>
} {
  return { onProgress: vi.fn(), onCompleted: vi.fn(), onError: vi.fn() }
}

describe('trackTask', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reports progress until completion, then stops polling', async () => {
    const { fetchProgress } = fakeBackend({
      a: [progress('a', 'downloading', 40), progress('a', 'completed', 100)]
    })
    const handlers = spyHandlers()

    trackTask('a', fetchProgress, handlers, 500)
    await vi.advanceTimersByTimeAsync(500)
    expect(handlers.onProgress).toHaveBeenCalledWith(progress('a', 'downloading', 40))

    await vi.advanceTimersByTimeAsync(500)
    expect(handlers.onCompleted).toHaveBeenCalledWith(progress('a', 'completed', 100))

    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchProgress).toHaveBeenCalledTimes(2)
  })

  it('passes retry information through with progress updates', async () => {
    const retrying: DownloadProgress = {
      task_id: 'a',
      status: 'downloading',
      progress: 0,
      retry: 1,
      max_retries: 3
    }
    const { fetchProgress } = fakeBackend({ a: [retrying, progress('a', 'completed', 100)] })
    const handlers = spyHandlers()

    trackTask('a', fetchProgress, handlers, 500)
    await vi.advanceTimersByTimeAsync(500)

    expect(handlers.onProgress).toHaveBeenCalledWith(retrying)
  })

  it('keeps following an earlier task after a new one is tracked', async () => {
    const { fetchProgress } = fakeBackend({
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

    trackTask('a', fetchProgress, first, 500)
    await vi.advanceTimersByTimeAsync(250)
    trackTask('b', fetchProgress, second, 500)
    await vi.advanceTimersByTimeAsync(5000)

    expect(first.onCompleted).toHaveBeenCalledTimes(1)
    expect(second.onCompleted).toHaveBeenCalledTimes(1)
    expect(first.onError).not.toHaveBeenCalled()
    expect(second.onError).not.toHaveBeenCalled()
  })

  it('reports a failed download with the backend message', async () => {
    const { fetchProgress } = fakeBackend({
      a: [{ task_id: 'a', status: 'error', progress: 0, error: 'El video no está disponible' }]
    })
    const handlers = spyHandlers()

    trackTask('a', fetchProgress, handlers, 500)
    await vi.advanceTimersByTimeAsync(5000)

    expect(handlers.onError).toHaveBeenCalledExactlyOnceWith('El video no está disponible')
    expect(fetchProgress).toHaveBeenCalledTimes(1)
  })

  it('reports an API error (e.g. backend unreachable) and stops', async () => {
    const { fetchProgress } = fakeBackend({
      a: [{ error: 'No se pudo conectar con el backend' }]
    })
    const handlers = spyHandlers()

    trackTask('a', fetchProgress, handlers, 500)
    await vi.advanceTimersByTimeAsync(5000)

    expect(handlers.onError).toHaveBeenCalledExactlyOnceWith('No se pudo conectar con el backend')
    expect(fetchProgress).toHaveBeenCalledTimes(1)
  })

  it('does not overlap polls while a response is slow', async () => {
    let resolveSlow: (r: Response) => void = () => {}
    const fetchProgress = vi.fn(
      () => new Promise<Response>((resolve) => (resolveSlow = resolve))
    )
    const handlers = spyHandlers()

    trackTask('a', fetchProgress, handlers, 500)
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchProgress).toHaveBeenCalledTimes(1)

    resolveSlow(progress('a', 'completed', 100))
    await vi.advanceTimersByTimeAsync(5000)
    expect(handlers.onCompleted).toHaveBeenCalledTimes(1)
    expect(fetchProgress).toHaveBeenCalledTimes(1)
  })

  it('ignores a response that arrives after stop()', async () => {
    let resolveSlow: (r: Response) => void = () => {}
    const fetchProgress = vi.fn(
      () => new Promise<Response>((resolve) => (resolveSlow = resolve))
    )
    const handlers = spyHandlers()

    const stop = trackTask('a', fetchProgress, handlers, 500)
    await vi.advanceTimersByTimeAsync(500)
    stop()
    resolveSlow(progress('a', 'completed', 100))
    await vi.advanceTimersByTimeAsync(5000)

    expect(handlers.onCompleted).not.toHaveBeenCalled()
  })
})
