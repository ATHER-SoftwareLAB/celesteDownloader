import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

type Handler = (event: unknown, ...args: unknown[]) => unknown

const handlers = vi.hoisted(() => new Map<string, Handler>())

vi.mock('electron', () => ({
  app: { whenReady: () => new Promise(() => {}), on: vi.fn() },
  BrowserWindow: vi.fn(),
  dialog: {},
  shell: {},
  ipcMain: { handle: (channel: string, fn: Handler) => handlers.set(channel, fn) }
}))

const BACKEND_DOWN = { error: 'No se pudo conectar con el backend' }

// Every channel that talks to the backend, with sample arguments.
const BACKEND_CHANNELS: [string, unknown[]][] = [
  ['ping', []],
  ['getInfo', ['https://www.youtube.com/watch?v=x']],
  ['getConfig', []],
  ['setConfig', [{ theme: 'dark' }]],
  ['download', [{ url: 'u', format: 'video', quality: '1080', title: 't' }]],
  ['getProgress', ['task-1']],
  ['getQueue', []],
  ['pauseQueue', []],
  ['resumeQueue', []]
]

function invoke(channel: string, args: unknown[]): Promise<unknown> {
  const handler = handlers.get(channel)
  if (!handler) throw new Error(`no handler registered for ${channel}`)
  return Promise.resolve(handler({}, ...args))
}

describe('IPC handlers', () => {
  beforeAll(async () => {
    await import('./index')
  })

  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it.each(BACKEND_CHANNELS)('%s returns an error when the backend is unreachable', async (channel, args) => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

    await expect(invoke(channel, args)).resolves.toEqual(BACKEND_DOWN)
  })

  it.each(BACKEND_CHANNELS)('%s returns an error when the backend answers non-JSON', async (channel, args) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Internal Server Error', { status: 500 }))
    )

    await expect(invoke(channel, args)).resolves.toEqual(BACKEND_DOWN)
  })

  it('passes backend JSON through unchanged', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ paused: true })))

    await expect(invoke('pauseQueue', [])).resolves.toEqual({ paused: true })
  })
})
