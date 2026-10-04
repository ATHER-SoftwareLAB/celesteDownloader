import { contextBridge, ipcRenderer } from 'electron'
import type {
  MediaMetadata,
  ApiError,
  DownloadResponse,
  DownloadProgress,
  ProgressBatch,
  QueueStatus,
  Config
} from '../shared/ipc-types'

const api = {
  ping: (): Promise<{ message: string } | ApiError> => ipcRenderer.invoke('ping'),
  getInfo: (url: string): Promise<MediaMetadata | ApiError> =>
    ipcRenderer.invoke('getInfo', url),
  download: (
    url: string,
    format: string,
    quality: string,
    title: string
  ): Promise<DownloadResponse | ApiError> =>
    ipcRenderer.invoke('download', { url, format, quality, title }),
  getProgress: (taskId: string): Promise<DownloadProgress | ApiError> =>
    ipcRenderer.invoke('getProgress', taskId),
  getProgressBatch: (taskIds: string[]): Promise<ProgressBatch | ApiError> =>
    ipcRenderer.invoke('getProgressBatch', taskIds),
  getQueue: (): Promise<QueueStatus | ApiError> => ipcRenderer.invoke('getQueue'),
  pauseQueue: (): Promise<{ paused: boolean } | ApiError> => ipcRenderer.invoke('pauseQueue'),
  resumeQueue: (): Promise<{ paused: boolean } | ApiError> => ipcRenderer.invoke('resumeQueue'),
  getConfig: (): Promise<Config | ApiError> => ipcRenderer.invoke('getConfig'),
  setConfig: (updates: Partial<Config>): Promise<Config | ApiError> =>
    ipcRenderer.invoke('setConfig', updates),
  chooseDownloadPath: (): Promise<string | null> => ipcRenderer.invoke('chooseDownloadPath'),
  openInFolder: (filePath: string): Promise<void> => ipcRenderer.invoke('openInFolder', filePath)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
