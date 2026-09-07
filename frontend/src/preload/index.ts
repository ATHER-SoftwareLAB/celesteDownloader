import { contextBridge, ipcRenderer } from 'electron'
import type { VideoMetadata, ApiError, DownloadResponse } from '../shared/ipc-types'

const api = {
  ping: (): Promise<{ message: string }> => ipcRenderer.invoke('ping'),
  getInfo: (url: string): Promise<VideoMetadata | ApiError> =>
    ipcRenderer.invoke('getInfo', url),
  download: (url: string, quality: string): Promise<DownloadResponse | ApiError> =>
    ipcRenderer.invoke('download', { url, quality }),
  getDownloadPath: (): Promise<string> => ipcRenderer.invoke('getDownloadPath')
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
