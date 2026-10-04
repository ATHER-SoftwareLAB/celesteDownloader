import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'path'

const BACKEND_URL = 'http://127.0.0.1:5000'

let mainWindow: BrowserWindow | null = null

async function backendFetch(path: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${BACKEND_URL}${path}`, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Handlers `return await res.json()` (not just `return res.json()`) so a
// non-JSON body - e.g. a plain-text 500 from the backend - is caught by the
// surrounding try instead of rejecting the renderer's invoke().

ipcMain.handle('ping', async () => {
  try {
    const res = await backendFetch('/ping', 5_000)
    return await res.json()
  } catch {
    return { error: 'No se pudo conectar con el backend' }
  }
})

ipcMain.handle('getInfo', async (_event, url: string) => {
  try {
    const res = await backendFetch(`/info?url=${encodeURIComponent(url)}`, 20_000)
    return await res.json()
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError'
    return {
      error: timedOut
        ? 'El video tardó demasiado en responder. Intenta de nuevo'
        : 'No se pudo conectar con el backend'
    }
  }
})

ipcMain.handle('getConfig', async () => {
  try {
    const res = await backendFetch('/config', 5_000)
    return await res.json()
  } catch {
    return { error: 'No se pudo conectar con el backend' }
  }
})

ipcMain.handle('setConfig', async (_event, updates: Record<string, unknown>) => {
  try {
    const res = await backendFetch('/config', 5_000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    return await res.json()
  } catch {
    return { error: 'No se pudo conectar con el backend' }
  }
})

ipcMain.handle('chooseDownloadPath', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('openInFolder', (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
})

ipcMain.handle(
  'download',
  async (_event, opts: { url: string; format: string; quality: string; title: string }) => {
    try {
      const res = await backendFetch('/download', 10_000, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts)
      })
      return await res.json()
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'AbortError'
      return {
        error: timedOut ? 'No se pudo iniciar la descarga' : 'No se pudo conectar con el backend'
      }
    }
  }
)

ipcMain.handle('getProgress', async (_event, taskId: string) => {
  try {
    const res = await backendFetch(`/progress/${taskId}`, 5_000)
    return await res.json()
  } catch {
    return { error: 'No se pudo conectar con el backend' }
  }
})

ipcMain.handle('getProgressBatch', async (_event, taskIds: string[]) => {
  try {
    const res = await backendFetch('/progress/batch', 5_000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_ids: taskIds })
    })
    return await res.json()
  } catch {
    return { error: 'No se pudo conectar con el backend' }
  }
})

ipcMain.handle('getQueue', async () => {
  try {
    const res = await backendFetch('/queue', 5_000)
    return await res.json()
  } catch {
    return { error: 'No se pudo conectar con el backend' }
  }
})

ipcMain.handle('pauseQueue', async () => {
  try {
    const res = await backendFetch('/queue/pause', 5_000, { method: 'POST' })
    return await res.json()
  } catch {
    return { error: 'No se pudo conectar con el backend' }
  }
})

ipcMain.handle('resumeQueue', async () => {
  try {
    const res = await backendFetch('/queue/resume', 5_000, { method: 'POST' })
    return await res.json()
  } catch {
    return { error: 'No se pudo conectar con el backend' }
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
