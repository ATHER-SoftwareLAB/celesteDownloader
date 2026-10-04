import { spawn, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

export const BACKEND_URL = 'http://127.0.0.1:5000'

const STARTUP_TIMEOUT_MS = 20_000
const PING_INTERVAL_MS = 250

let backendProcess: ChildProcess | null = null

/** The backend's virtualenv interpreter if it exists, else Python from PATH. */
export function pythonCommand(backendDir: string, platform: NodeJS.Platform = process.platform): string {
  const venvPython =
    platform === 'win32'
      ? join(backendDir, 'venv', 'Scripts', 'python.exe')
      : join(backendDir, 'venv', 'bin', 'python')
  if (existsSync(venvPython)) return venvPython
  return platform === 'win32' ? 'python' : 'python3'
}

async function isBackendUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/ping`, { signal: AbortSignal.timeout(1_000) })
    return res.ok
  } catch {
    return false
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Starts the Python backend and resolves once it answers /ping. If a backend
 * is already running (e.g. started by hand during development) it is reused
 * and left alone on quit.
 */
export async function startBackend(
  backendDir: string,
  { timeoutMs = STARTUP_TIMEOUT_MS, intervalMs = PING_INTERVAL_MS } = {}
): Promise<void> {
  if (await isBackendUp()) return

  const proc = spawn(pythonCommand(backendDir), ['main.py'], {
    cwd: backendDir,
    windowsHide: true
  })
  backendProcess = proc

  // Backend logs stay visible in the Electron main process output.
  const prefixed = (chunk: Buffer): string => chunk.toString().replace(/^(?=.)/gm, '[backend] ')
  proc.stdout?.on('data', (chunk: Buffer) => process.stdout.write(prefixed(chunk)))
  proc.stderr?.on('data', (chunk: Buffer) => process.stderr.write(prefixed(chunk)))

  let startupFailure: string | null = null
  proc.on('error', (err) => {
    startupFailure = `No se pudo iniciar Python: ${err.message}`
  })
  proc.on('exit', (code) => {
    startupFailure ??= `El backend se cerró al iniciar (código ${code})`
    if (backendProcess === proc) backendProcess = null
  })

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (startupFailure) throw new Error(startupFailure)
    if (await isBackendUp()) return
    await sleep(intervalMs)
  }
  stopBackend()
  throw new Error('El backend no respondió a tiempo')
}

/**
 * Stops the backend this app started. On Windows the venv's python.exe is a
 * launcher that runs the real interpreter in a job object, so terminating
 * the launcher also ends the interpreter and frees the port.
 */
export function stopBackend(): void {
  if (backendProcess && backendProcess.exitCode === null) backendProcess.kill()
  backendProcess = null
}
