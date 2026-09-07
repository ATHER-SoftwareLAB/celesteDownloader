import { contextBridge, ipcRenderer } from 'electron'
import type {
  VideoMetadata,
  ApiError,
  DownloadResponse,
  DownloadProgress,
  QueueStatus
} from '../shared/ipc-types'

const api = {
  ping: (): Promise<{ message: string }> => ipcRenderer.invoke('ping'),
  getInfo: (url: string): Promise<VideoMetadata | ApiError> =>
    ipcRenderer.invoke('getInfo', url),
  download: (url: string, format: string, quality: string): Promise<DownloadResponse | ApiError> =>
    ipcRenderer.invoke('download', { url, format, quality }),
  getProgress: (taskId: string): Promise<DownloadProgress | ApiError> =>
    ipcRenderer.invoke('getProgress', taskId),
  getQueue: (): Promise<QueueStatus | ApiError> => ipcRenderer.invoke('getQueue'),
  pauseQueue: (): Promise<{ paused: boolean }> => ipcRenderer.invoke('pauseQueue'),
  resumeQueue: (): Promise<{ paused: boolean }> => ipcRenderer.invoke('resumeQueue'),
  getDownloadPath: (): Promise<string> => ipcRenderer.invoke('getDownloadPath')
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
