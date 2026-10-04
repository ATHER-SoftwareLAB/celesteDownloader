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
import AboutPage from './pages/AboutPage'
import HowToPage from './pages/HowToPage'
import type { VideoMetadata } from '../../shared/ipc-types'
import { trackTask } from './services/downloadTracker'
import './App.css'

// Session-only history (no persistence): cleared whenever the app restarts.
const MAX_HISTORY_ENTRIES = 20

type View = 'main' | 'about' | 'howto'

function App(): JSX.Element {
  const [view, setView] = useState<View>('main')
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [taskStatus, setTaskStatus] = useState<'pending' | 'downloading' | 'processing'>(
    'downloading'
  )
  const [error, setError] = useState('')
  const [downloadPath, setDownloadPath] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const [mode, setMode] = useState<DownloadMode>('sencilla')
  const [format, setFormat] = useState('video')
  const [quality, setQuality] = useState('1080')

  const [queuePaused, setQueuePaused] = useState(false)
  const [queuePendingCount, setQueuePendingCount] = useState(0)
  const [queueCurrentProgress, setQueueCurrentProgress] = useState<number | null>(null)

  const latestTaskRef = useRef<string | null>(null)
  const queueWatcherRef = useRef<number | null>(null)

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      if (!('error' in cfg)) setDownloadPath(cfg.download_path)
    })
  }, [])

  const handleChoosePath = async (): Promise<void> => {
    const chosen = await window.api.chooseDownloadPath()
    if (!chosen) return
    const result = await window.api.setConfig({ download_path: chosen })
    if (!('error' in result)) setDownloadPath(result.download_path)
  }

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

  // Every queued download is followed until it finishes, so each one lands in
  // history (or shows its error) even after newer downloads are queued. The
  // progress bar shows the most recently queued download.
  const pollProgress = (taskId: string, entry: HistoryEntry): void => {
    latestTaskRef.current = taskId
    const isLatest = (): boolean => latestTaskRef.current === taskId

    trackTask(taskId, window.api.getProgress, {
      onProgress: (status, pct) => {
        if (!isLatest()) return
        setProgress(pct)
        setTaskStatus(status)
      },
      onCompleted: (update) => {
        if (isLatest()) {
          setProgress(update.progress)
          setDownloading(false)
        }
        const finalEntry = update.path ? { ...entry, path: update.path } : entry
        setHistory((prev) => [finalEntry, ...prev].slice(0, MAX_HISTORY_ENTRIES))
      },
      onError: (message) => {
        if (isLatest()) setDownloading(false)
        setError(message)
      }
    })
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

  const handleOpenFolder = (path: string): void => {
    window.api.openInFolder(path)
  }

  const handleDownload = async (): Promise<void> => {
    if (!metadata) return
    setDownloading(true)
    setError('')
    setProgress(0)
    setTaskStatus('pending')

    const resolvedQuality = mode === 'avanzada' ? quality : '1080'
    const result = await window.api.download(metadata.url, format, resolvedQuality, metadata.title)

    if ('error' in result || !result.success) {
      setDownloading(false)
      setError('error' in result ? result.error : 'La descarga falló')
      return
    }

    const entry: HistoryEntry = {
      title: metadata.title,
      format: format === 'audio' ? 'Audio' : `Video ${resolvedQuality}p`,
      path: downloadPath,
      thumbnail: metadata.thumbnail
    }
    pollProgress(result.task_id, entry)
    ensureQueueWatcher()
  }

  const progressLabel = downloading
    ? taskStatus === 'pending'
      ? 'En cola...'
      : progress >= 100
        ? 'Procesando...'
        : `Descargando... ${progress}%`
    : `${progress}%`

  if (view === 'about') {
    return (
      <div className="app">
        <Header />
        <AboutPage onBack={() => setView('main')} />
      </div>
    )
  }

  if (view === 'howto') {
    return (
      <div className="app">
        <Header />
        <HowToPage onBack={() => setView('main')} />
      </div>
    )
  }

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

      <DownloadPathRow path={downloadPath} onChoosePath={handleChoosePath} />

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

      <HistorySection items={history} onOpenFolder={handleOpenFolder} />

      <Footer onAboutClick={() => setView('about')} onHowToClick={() => setView('howto')} />
    </div>
  )
}

export default App
