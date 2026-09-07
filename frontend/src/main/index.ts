import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'

const BACKEND_URL = 'http://127.0.0.1:5000'

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
  const win = new BrowserWindow({
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
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('ping', async () => {
  const res = await backendFetch('/ping', 5_000)
  return res.json()
})

ipcMain.handle('getInfo', async (_event, url: string) => {
  try {
    const res = await backendFetch(`/info?url=${encodeURIComponent(url)}`, 20_000)
    return res.json()
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError'
    return {
      error: timedOut
        ? 'El video tardó demasiado en responder. Intenta de nuevo'
        : 'No se pudo conectar con el backend'
    }
  }
})

ipcMain.handle('getDownloadPath', () => app.getPath('downloads'))

ipcMain.handle(
  'download',
  async (_event, opts: { url: string; format: string; quality: string }) => {
    try {
      const res = await backendFetch('/download', 10_000, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts)
      })
      return res.json()
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
    return res.json()
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
