import { EventEmitter } from 'events'
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const spawnMock = vi.hoisted(() => vi.fn())
vi.mock('child_process', () => ({ spawn: spawnMock }))

import { pythonCommand, startBackend, stopBackend } from './backend'

class FakeProcess extends EventEmitter {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  exitCode: number | null = null
  kill = vi.fn(() => {
    this.exitCode = 1
    this.emit('exit', 1)
    return true
  })
}

const FAST = { timeoutMs: 200, intervalMs: 1 }
const pingOk = (): Promise<Response> => Promise.resolve(new Response('{}', { status: 200 }))
const pingDown = (): Promise<Response> => Promise.reject(new TypeError('fetch failed'))

let proc: FakeProcess

beforeEach(() => {
  proc = new FakeProcess()
  spawnMock.mockReset().mockImplementation(() => proc)
})

afterEach(() => {
  stopBackend()
  vi.unstubAllGlobals()
})

describe('startBackend', () => {
  it('reuses a backend that is already running', async () => {
    vi.stubGlobal('fetch', vi.fn(pingOk))

    await startBackend('/app/backend', FAST)

    expect(spawnMock).not.toHaveBeenCalled()
  })

  it('spawns main.py in the backend folder and resolves once it answers', async () => {
    const fetchMock = vi.fn().mockImplementationOnce(pingDown).mockImplementationOnce(pingDown)
    fetchMock.mockImplementation(pingOk)
    vi.stubGlobal('fetch', fetchMock)

    await startBackend('/app/backend', FAST)

    expect(spawnMock).toHaveBeenCalledWith(
      expect.stringMatching(/python/),
      ['main.py'],
      expect.objectContaining({ cwd: '/app/backend' })
    )
  })

  it('fails if the backend exits before answering', async () => {
    vi.stubGlobal('fetch', vi.fn(pingDown))
    spawnMock.mockImplementation(() => {
      setTimeout(() => proc.emit('exit', 1), 5)
      return proc
    })

    await expect(startBackend('/app/backend', FAST)).rejects.toThrow(
      'El backend se cerró al iniciar (código 1)'
    )
  })

  it('fails if Python cannot be launched', async () => {
    vi.stubGlobal('fetch', vi.fn(pingDown))
    spawnMock.mockImplementation(() => {
      setTimeout(() => proc.emit('error', new Error('spawn python ENOENT')), 5)
      return proc
    })

    await expect(startBackend('/app/backend', FAST)).rejects.toThrow(
      'No se pudo iniciar Python: spawn python ENOENT'
    )
  })

  it('gives up and stops the process if it never answers', async () => {
    vi.stubGlobal('fetch', vi.fn(pingDown))

    await expect(startBackend('/app/backend', { timeoutMs: 50, intervalMs: 5 })).rejects.toThrow(
      'El backend no respondió a tiempo'
    )
    expect(proc.kill).toHaveBeenCalledTimes(1)
  })
})

describe('stopBackend', () => {
  it('kills the backend it started, once', async () => {
    const fetchMock = vi.fn().mockImplementationOnce(pingDown).mockImplementation(pingOk)
    vi.stubGlobal('fetch', fetchMock)
    await startBackend('/app/backend', FAST)

    stopBackend()
    stopBackend()

    expect(proc.kill).toHaveBeenCalledTimes(1)
  })

  it('leaves a reused backend running', async () => {
    vi.stubGlobal('fetch', vi.fn(pingOk))
    await startBackend('/app/backend', FAST)

    stopBackend()

    expect(proc.kill).not.toHaveBeenCalled()
  })
})

describe('pythonCommand', () => {
  function backendWithVenv(...pythonPath: string[]): string {
    const dir = mkdtempSync(join(tmpdir(), 'celeste-backend-'))
    mkdirSync(join(dir, 'venv', ...pythonPath.slice(0, -1)), { recursive: true })
    writeFileSync(join(dir, 'venv', ...pythonPath), '')
    return dir
  }

  it('uses the venv interpreter on Windows when present', () => {
    const dir = backendWithVenv('Scripts', 'python.exe')
    expect(pythonCommand(dir, 'win32')).toBe(join(dir, 'venv', 'Scripts', 'python.exe'))
  })

  it('uses the venv interpreter on Linux when present', () => {
    const dir = backendWithVenv('bin', 'python')
    expect(pythonCommand(dir, 'linux')).toBe(join(dir, 'venv', 'bin', 'python'))
  })

  it('falls back to Python from PATH without a venv', () => {
    const dir = mkdtempSync(join(tmpdir(), 'celeste-backend-'))
    expect(pythonCommand(dir, 'win32')).toBe('python')
    expect(pythonCommand(dir, 'linux')).toBe('python3')
  })
})
