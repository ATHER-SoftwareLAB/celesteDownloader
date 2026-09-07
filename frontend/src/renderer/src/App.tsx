import { useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import UrlInput from './components/UrlInput'
import PreviewPanel from './components/PreviewPanel'
import ModeControls, { DownloadMode } from './components/ModeControls'
import DownloadPathRow from './components/DownloadPathRow'
import DownloadRow from './components/DownloadRow'
import QueueSection from './components/QueueSection'
import HistorySection, { HistoryEntry } from './components/HistorySection'
import Footer from './components/Footer'
import type { VideoMetadata } from '../../shared/ipc-types'
import './App.css'

const MOCK_HISTORY: HistoryEntry[] = [
  { title: 'TITULO DE VIDEO 1', format: 'Video 1080p', path: 'c:/descargas' },
  { title: 'TITULO DE VIDEO 2', format: 'Video 1080p', path: 'c:/videos' },
  { title: 'TITULO DE VIDEO 3', format: 'Video 1080p', path: 'c:/desktop' }
]

function App(): JSX.Element {
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [taskStatus, setTaskStatus] = useState<'pending' | 'downloading' | 'processing'>(
    'downloading'
  )
  const [error, setError] = useState('')
  const [downloadPath, setDownloadPath] = useState('')

  const [mode, setMode] = useState<DownloadMode>('sencilla')
  const [format, setFormat] = useState('video')
  const [quality, setQuality] = useState('1080')

  const [queuePaused, setQueuePaused] = useState(false)
  const [queuePendingCount, setQueuePendingCount] = useState(0)
  const [queueCurrentProgress, setQueueCurrentProgress] = useState<number | null>(null)

  const activePollRef = useRef<number | null>(null)
  const queueWatcherRef = useRef<number | null>(null)

  useEffect(() => {
    window.api.getDownloadPath().then(setDownloadPath)
  }, [])

  const handleGetInfo = async (url: string): Promise<void> => {
    setLoadingInfo(true)
    setError('')
    setMetadata(null)
    setProgress(0)

    const result = await window.api.getInfo(url)
    setLoadingInfo(false)

    if ('error' in result) {
      setError(result.error)
      return
    }
    setMetadata(result)
  }

  const pollProgress = (taskId: string): void => {
    if (activePollRef.current !== null) clearInterval(activePollRef.current)

    const stop = (): void => {
      clearInterval(interval)
      activePollRef.current = null
      setDownloading(false)
    }

    const interval = window.setInterval(async () => {
      const update = await window.api.getProgress(taskId)

      if (!('status' in update)) {
        stop()
        setError(update.error)
        return
      }

      setProgress(update.progress)

      if (update.status === 'completed') {
        stop()
      } else if (update.status === 'error') {
        stop()
        setError(update.error ?? 'La descarga falló')
      } else {
        setTaskStatus(update.status)
      }
    }, 500)
    activePollRef.current = interval
  }

  const ensureQueueWatcher = (): void => {
    if (queueWatcherRef.current !== null) return
    queueWatcherRef.current = window.setInterval(async () => {
      const status = await window.api.getQueue()
      if ('error' in status) return

      setQueuePendingCount(status.queue.length)
      setQueuePaused(status.paused)
      setQueueCurrentProgress(status.current ? status.current.progress : null)

      if (!status.current && status.queue.length === 0 && queueWatcherRef.current !== null) {
        clearInterval(queueWatcherRef.current)
        queueWatcherRef.current = null
      }
    }, 700)
  }

  const handleTogglePause = async (): Promise<void> => {
    if (queuePaused) await window.api.resumeQueue()
    else await window.api.pauseQueue()
  }

  const handleDownload = async (): Promise<void> => {
    if (!metadata) return
    setDownloading(true)
    setError('')
    setProgress(0)
    setTaskStatus('pending')

    const result = await window.api.download(
      metadata.url,
      format,
      mode === 'avanzada' ? quality : '1080'
    )

    if ('error' in result || !result.success) {
      setDownloading(false)
      setError('error' in result ? result.error : 'La descarga falló')
      return
    }
    pollProgress(result.task_id)
    ensureQueueWatcher()
  }

  const progressLabel = downloading
    ? taskStatus === 'pending'
      ? 'En cola...'
      : progress >= 100
        ? 'Procesando...'
        : `Descargando... ${progress}%`
    : `${progress}%`

  return (
    <div className="app">
      <Header />

      <UrlInput onSubmit={handleGetInfo} loading={loadingInfo} />

      <PreviewPanel metadata={metadata} />

      <ModeControls
        mode={mode}
        onModeChange={setMode}
        format={format}
        onFormatChange={setFormat}
        quality={quality}
        onQualityChange={setQuality}
      />

      <DownloadPathRow path={downloadPath} onChoosePath={() => {}} />

      <DownloadRow
        disabled={!metadata}
        progress={progress}
        progressLabel={progressLabel}
        onClick={handleDownload}
      />

      <QueueSection
        paused={queuePaused}
        pendingCount={queuePendingCount}
        currentProgress={queueCurrentProgress}
        onTogglePause={handleTogglePause}
      />

      {error && <p className="app__error">{error}</p>}

      <HistorySection items={MOCK_HISTORY} />

      <Footer />
    </div>
  )
}

export default App
